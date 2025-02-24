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
let currentCaptureBuff: Buffer | null = null

// Core processing flow: Screenshot -> OCR -> Translation -> Caching
async function processCaptureBuffer(captureBuffer: Buffer): Promise<{
  original: string,
  translated: string,
}> {
  const { text } = await recognize(captureBuffer)

  const unbreakText = text.replaceAll('\n', '').trim()

  let translated = ''

  if (unbreakText.length > 0) {
    const translateCache = TranslationCache.get<string>(unbreakText)
    if (translateCache) {
      translated = translateCache
    } else {
      const translateResult = await translateWithVolce([unbreakText])

      console.log('translateResult >>>')
      console.log(translateResult)

      translated = translateResult.TranslationList.map(t => t.Translation).join('')

      TranslationCache.set(unbreakText, translated)

      TranslationCache.save()
    }
  }

  return {
    original: unbreakText,
    translated,
  }
}

// Scheduled task controls the screenshot capture and translation process
// Start timed capture-translate job
export async function startJob(socket: Socket) {
  if (captureJobTimer) {
    clearTimeout(captureJobTimer)
  }
  if (currentTargetWindow) {
    currentCaptureBuff = await captureWindow(currentTargetWindow)
    const result = await processCaptureBuffer(currentCaptureBuff)
    socket.emit('new-translation', {
      original: result.original,
      translated: result.translated,
      screenshot: `http://localhost:${WEB_SERVER_PORT}/screenshots/screenshots.png?t=${Date.now()}`,
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
  currentCaptureBuff = null
}

// Bun HTTP server configuration
// Handle static assets and screenshot requests
const app = serve({
  port: WEB_SERVER_PORT,
  routes: {
    '/screenshots/*': async (req) => {
      if (!currentCaptureBuff) {
        if (currentTargetWindow) {
          currentCaptureBuff = await captureWindow(currentTargetWindow)
        } else {
          return new Response('Not Found', { status: 404 });
        }
      }
      return new Response(currentCaptureBuff, {
        headers: {
          'Content-Type': 'image/png',
        },
      })
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
