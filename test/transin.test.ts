import { serve } from 'bun'
import { expect, test } from 'bun:test'
import { FlatCache } from 'flat-cache'
import path from 'path'
import sharp from 'sharp'
import { attchOCRServiceToSocket, recognize, worker } from '../src/ocr'
import { translateWithVolce } from '../src/translation'
import { attachWindowServiceToSocket, captureWindow, currentTargetWindow } from '../src/capture'

// const TranslationCache = new FlatCache({
//   cacheId: 'translations',
// })

// TranslationCache.load()

const testImg = Bun.file(path.join(__dirname, 'demo2.png'))
const testImgBuffer = await testImg.arrayBuffer()
const testImgSharp = sharp(testImgBuffer)
const scaleByHalf = await testImgSharp
  .extract({
    left: 440,
    top: 1043,
    width: 929,
    height: 201,
  })
  .resize(Math.round(929 * 0.5))
  .toBuffer()
const { text } = await recognize(scaleByHalf)

console.log({text})

test('OCR', () => {
  expect(text).toBe('あら 、 王 子 様 !\nちょ っ と 勝負 し て いか な ぁ い ?\n')
})

const translateResult = await translateWithVolce({
  SourceLanguage: 'ja',
  TargetLanguage: 'zh',
  TextList: [text.replaceAll('\n', '')],
})
console.log(translateResult)

test('Translation', () => {
  expect(translateResult.TranslationList[0].Translation).toBe('哎呀，王子殿下!要不要来一场比赛?')
})

await worker.terminate()
