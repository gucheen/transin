import { serve } from 'bun'
import { expect, test } from 'bun:test'
import { FlatCache } from 'flat-cache'
import path from 'path'
import sharp from 'sharp'
import { attchOCRServiceToSocket, recognize, setRecogonizeOptions, worker } from '../src/ocr'
import { translateWithVolce, translateWithZhiPuGLM4Flash } from '../src/translation'
import { attachWindowServiceToSocket, captureWindow, currentTargetWindow } from '../src/capture'

// const TranslationCache = new FlatCache({
//   cacheId: 'translations',
// })

// TranslationCache.load()

setRecogonizeOptions({
  left: 440,
  top: 1043,
  width: 929,
  height: 201,
  scale: 0.5,
})

const testImg = Bun.file(path.join(__dirname, 'demo2.png'))
const testImgBuffer = Buffer.from(await testImg.arrayBuffer())
const { text } = await recognize(testImgBuffer)

console.log({text})

test('OCR', () => {
  expect(text).toBe('あら 、 王 子 様 !\nちょ っ と 勝負 し て いか な ぁ い ?\n')
})
console.time('translate')
const translateResult = await translateWithVolce([text.replaceAll('\n', '')])
console.timeEnd('translate')
console.log(translateResult)
test('Translation', () => {
  expect(translateResult.TranslationList[0].Translation).toBe('哎呀，王子殿下!要不要来一场比赛?')
})

await worker.terminate()
