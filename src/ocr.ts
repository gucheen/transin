import { createWorker } from 'tesseract.js'
import type { Socket } from 'socket.io'
import sharp from 'sharp'

// OCR recognition area configuration and scale factor
let rectangle: {
  top: number
  left: number
  width: number
  height: number
}
let scale = 1

// Configure OCR recognition area parameters
export function setRecogonizeOptions(payload: {
  top: number
  left: number
  width: number
  height: number
  scale: number
}) {
  scale = payload.scale ?? 1
  rectangle = {
    top: payload.top,
    left: payload.left,
    width: payload.width,
    height: payload.height,
  }
}

// Attach OCR service to Socket.io communication
export function attachOCRServiceToSocket(socket: Socket) {
  socket.on('settings:update-ocr-recognize-area', (payload: {
    top: number
    left: number
    width: number
    height: number
    scale: number
  }) => {
    console.log('settings:update-ocr-recognize-area', payload)
    setRecogonizeOptions(payload)
  })

  socket.on('settings:get-ocr-recognize-area', (callback) => {
    callback({
      ...rectangle,
      scale,
    })
  })
}

// Initialize Tesseract OCR Worker (Japanese language)
export const worker = await createWorker('jpn', 1, {
  logger: (m) => console.log(m),
})

// Core OCR recognition with sharp image preprocessing
export async function recognize(img: Buffer): Promise<{
  text: string
  OCRSourceImage: Buffer
}> {
  console.time('recognize')
  const sharpImg = await sharp(img)
    .extract(rectangle)
    .resize(~~(rectangle.width * scale))
    .flatten()
    .normalise()
    .greyscale()
    .sharpen()
    .toBuffer()
  const { data: { text } } = await worker.recognize(sharpImg)
  console.timeEnd('recognize')


  console.log('ocr result >>> ')
  console.log(text)

  return {
    text,
    OCRSourceImage: sharpImg,
  }
}
