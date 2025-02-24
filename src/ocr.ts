import { createWorker } from 'tesseract.js'
import type { Socket } from 'socket.io'
import sharp from 'sharp'

// OCR recognition area configuration and scale factor
let rectangles: {
  top: number
  left: number
  width: number
  height: number
}[] = []
let scale = 1

// Configure OCR recognition area parameters
export function setRecogonizeOptions(payload: {
  regions: {
    top: number
    left: number
    width: number
    height: number
  }[]
  scale?: number
}) {
  scale = payload.scale ?? 1
  rectangles = payload.regions
}

// Attach OCR service to Socket.io communication
export function attachOCRServiceToSocket(socket: Socket) {
  socket.on('settings:update-ocr-recognize-area', (payload: {
    regions: {
      top: number
      left: number
      width: number
      height: number
    }[]
    scale?: number
  }) => {
    console.log('settings:update-ocr-recognize-area', payload)
    setRecogonizeOptions(payload)
  })

  socket.on('settings:get-ocr-recognize-area', (callback) => {
    callback({
      regions: rectangles,
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
  texts: string[]
  OCRSourceImages: Buffer[]
}> {
  const texts: string[] = []
  const OCRSourceImages: Buffer[] = []
  console.time('recognize')
  const sharpImg = sharp(img)
  if (Array.isArray(rectangles) && rectangles.length > 0) {
    for (const rectangle of rectangles) {
      const rectImage = await sharpImg
        .clone()
        .extract(rectangle)
        .resize(~~(rectangle.width * scale))
        .flatten()
        .normalise()
        .greyscale()
        .sharpen()
        .toBuffer()
      const { data: { text } } = await worker.recognize(rectImage)
      texts.push(text)
      OCRSourceImages.push(rectImage)
    }
  } else {
    const rectImage = await sharpImg
      .flatten()
      .normalise()
      .greyscale()
      .sharpen()
      .toBuffer()
    const { data: { text } } = await worker.recognize(rectImage)
    texts.push(text)
    OCRSourceImages.push(rectImage)
  }
  console.timeEnd('recognize')


  console.log('ocr result >>> ')
  console.log(texts)

  return {
    texts,
    OCRSourceImages,
  }
}
