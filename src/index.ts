import { serve } from 'bun'
import { FlatCache } from 'flat-cache'
import path from 'path'
import { io } from './io'
import { attachOCRServiceToSocket, recognize } from './ocr'
import { translateWithVolce } from './translation'
import { attachWindowServiceToSocket, captureWindow, currentTargetWindow } from './capture'
import type { Socket } from 'socket.io'
import { WEB_SERVER_PORT } from './constant'

// Local translation cache (using flat-cache)
const TranslationCache = new FlatCache({
  cacheId: 'translations',
})

TranslationCache.load()

let captureJobTimer: ReturnType<typeof setTimeout> | null = null
let currentCapture: Buffer | null = null
let currentOCRImages: Buffer[] | null = null

// Core processing flow: Screenshot -> OCR -> Translation -> Caching
async function processCaptureBuffer(captureBuffer: Buffer): Promise<{
  original: string[],
  translated: string[],
}> {
  const { texts, OCRSourceImages } = await recognize(captureBuffer)

  currentOCRImages = OCRSourceImages

  const unbreakTexts = texts.map(text => text.replaceAll('\n', '').trim()).filter(text => text.length > 0)

  const translatedTexts: string[] = Array(unbreakTexts.length)
  const untranslated: string[] = []
  const unTranslatedPositionIndex: number[] = []

  if (unbreakTexts.length > 0) {
    unbreakTexts.forEach((unbreakText, index) => {
      const translateCache = TranslationCache.get<string>(unbreakText)
      if (translateCache) {
        translatedTexts[index] = translateCache
      } else {
        untranslated.push(unbreakText)
        unTranslatedPositionIndex.push(index)
      }
    })
  }

  if (untranslated.length > 0) {
    const translateResult = await translateWithVolce(untranslated)

    console.log('translateResult >>>')
    console.log(translateResult)

    translateResult.TranslationList.forEach((t, index) => {
      translatedTexts[unTranslatedPositionIndex[index]] = t.Translation
      TranslationCache.set(unbreakTexts[unTranslatedPositionIndex[index]], t.Translation)
    })

    TranslationCache.save()
  }

  return {
    original: unbreakTexts,
    translated: translatedTexts,
  }
}

// Scheduled task controls the screenshot capture and translation process
// Start timed capture-translate job
export async function startJob(socket: Socket) {
  if (captureJobTimer) {
    clearTimeout(captureJobTimer)
  }
  if (currentTargetWindow) {
    currentCapture = await captureWindow(currentTargetWindow)
    const result = await processCaptureBuffer(currentCapture)
    socket.emit('new-translation', {
      original: result.original.join('\n\n'),
      translated: result.translated.join('\n\n'),
      screenshots: currentOCRImages?.map((_, index) => `http://localhost:${WEB_SERVER_PORT}/ocr-source/${index}?t=${Date.now()}`),
    })
  }
  captureJobTimer = setTimeout(() => {
    captureJobTimer = null
    startJob(socket)
  }, 5000)
}

// Stop scheduled job
export function stopJob() {
  if (captureJobTimer) {
    clearTimeout(captureJobTimer)
  }
  currentCapture = null
}

// Bun HTTP server configuration
// Handle static assets and screenshot requests
const app = serve({
  port: WEB_SERVER_PORT,
  routes: {
    '/screenshots/*': async () => {
      if (!currentCapture) {
        if (currentTargetWindow) {
          currentCapture = await captureWindow(currentTargetWindow)
        } else {
          return new Response('Not Found', { status: 404 });
        }
      }
      return new Response(currentCapture, {
        headers: {
          'Content-Type': 'image/png',
        },
      })
    },
    '/ocr-source/:imageIndex': async (req) => {
      const index = Number(req.params.imageIndex)
      if (Array.isArray(currentOCRImages) && index <= currentOCRImages.length) {
        return new Response(currentOCRImages[Number(req.params.imageIndex)], {
          headers: {
            'Content-Type': 'image/png',
          },
        })
      }
      return new Response('Not Found', { status: 404 })
    },
    '/assets/*': async (req) => {
      const { pathname } = new URL(req.url)
      const p = path.parse(pathname)
      return new Response(Bun.file(path.join('./web/dist/assets', p.base)))
    },
  },
  async fetch() {
    return new Response(Bun.file('./web/dist/index.html'))
  },
})

console.log(`Listening on :${app.port}`)

io.on('connection', async (socket) => {
  console.log('new connected', socket.id)

  attachOCRServiceToSocket(socket)

  attachWindowServiceToSocket(socket)

  socket.on('trigger', async () => {
    startJob(socket)
  })

  socket.on('stop', async () => {
    stopJob()
  })
})
