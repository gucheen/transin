import { serve } from 'bun'
import { Window } from 'node-screenshots'
import { FlatCache } from 'flat-cache'
import { io } from './io'
import { attchOCRServiceToSocket, recognize } from './ocr'
import { translateWithVolce } from './translation'

const TranslationCache = new FlatCache({
  cacheId: 'translations',
})

TranslationCache.load()

let screenshot: Buffer

const windows = Window.all()

for (const win of windows) {
  if (win.title === 'demo') {
    console.log(win.id)
    const captureImage = await win.captureImage()
    screenshot = await captureImage.toPng()
  }
}

const app = serve({
  async fetch(req) {
    const { pathname } = new URL(req.url)
    if (pathname.startsWith('/screenshots')) {
      return new Response(screenshot, {
        headers: {
          'Content-Type': 'image/jpeg',
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

  socket.on('trigger', async () => {
    const { text } = await recognize(screenshot)

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

    socket.emit('new-translation', {
      original: unbreakText,
      translated,
      screenshot: 'http://localhost:3000/screenshots/demo.jpg',
    })
  })
})
