import { serve } from 'bun'
import { FlatCache } from 'flat-cache'
import { io } from './io'
import { attchOCRServiceToSocket, recognize } from './ocr'
import { translateWithVolce } from './translation'
import { attachWindowServiceToSocket, captureWindow, currentTargetWindow } from './capture'
import type { Socket } from 'socket.io'
import { WEB_SERVER_PORT } from './constant'

const TranslationCache = new FlatCache({
  cacheId: 'translations',
})

TranslationCache.load()

let captureJobTimer: ReturnType<typeof setTimeout>|null = null
let currentCaptureBuff: Buffer|null = null

async function processCaptureBuffer(captureBuffer: Buffer): Promise<{
  original: string,
  translated: string,
}> {
  const { text } = await recognize(captureBuffer)

  const unbreakText = text.replaceAll('\n', '')

  const translateCache = TranslationCache.get<string>(unbreakText)

  let translated = ''

  if (translateCache) {
    translated = translateCache
  } else {
    const translateReqParams = {
      SourceLanguage: 'ja',
      TargetLanguage: 'zh',
      TextList: [unbreakText],
    }
    
    const translateResult = await translateWithVolce(translateReqParams)
    
    console.log('translateResult >>>')
    console.log(translateResult)
    
    translated = translateResult.TranslationList.map(t => t.Translation).join('')
    
    TranslationCache.set(unbreakText, translated)

    TranslationCache.save()
  }

  return {
    original: unbreakText,
    translated,
  }
}

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

export function stopJob() {
  if (captureJobTimer) {
    clearTimeout(captureJobTimer)
  }
  currentCaptureBuff = null
}

const app = serve({
  port: WEB_SERVER_PORT,
  async fetch(req) {
    const { pathname } = new URL(req.url)
    if (pathname.startsWith('/screenshots')) {
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
    }

    // Return 404 for unmatched routes
    return new Response("Not Found", { status: 404 });
  },
})

console.log(`Listening on :${app.port}`)

io.on('connection', async (socket) => {
  console.log('new connected', socket.id)

  attchOCRServiceToSocket(socket)

  attachWindowServiceToSocket(socket)

  socket.on('trigger', async () => {
    startJob(socket)
  })

  socket.on('stop', async () => {
    stopJob()
  })
})
