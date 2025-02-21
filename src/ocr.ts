import { createWorker, type ImageLike } from 'tesseract.js'
import type { Socket } from 'socket.io'

let rectangle: {
  top: number
  left: number
  width: number
  height: number
}

const worker = await createWorker('jpn', 1, {
  logger: (m) => console.log(m),
})

export function attchOCRServiceToSocket(socket: Socket) {
  socket.on('settings:update-ocr-recognize-area', (payload: {
    top: number
    left: number
    width: number
    height: number
  }) => {
    console.log('settings:update-ocr-recognize-area', payload)
    rectangle = payload
  })
  
  socket.on('settings:get-ocr-recognize-area', (callback) => {
    callback(rectangle)
  })
}

export async function recognize(img: ImageLike): Promise<{
  text: string
}> {
  console.time('recognize')
  const { data: { text } } = await worker.recognize(img, {
    rectangle,
  })
  console.timeEnd('recognize')
  
  console.log('ocr result >>> ')
  console.log(text)
  
  return {
    text,
  }
}
