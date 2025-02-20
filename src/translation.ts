import { Service } from '@volcengine/openapi'

const translateService = new Service({
  serviceName: 'translate',
  host: 'translate.volcengineapi.com',
  region: 'cn-north-1',
  defaultVersion: '2020-06-01',
  accessKeyId: process.env.VOLC_ACCESSKEY as unknown as string,
  secretKey: process.env.VOLC_SECRETKEY as unknown as string,
})

export const translateWithVolce = translateService.createJSONAPI('TranslateText', {
  Version: '2020-06-01',
  method: 'POST',
  contentType: 'json',
}) as unknown as (translateReqParams: {
  SourceLanguage: string,
  TargetLanguage: string,
  TextList: string[],
}) => Promise<{
  TranslationList: {
    Translation: string
    DetectedSourceLanguage: string
    Extra: string
  }[]
}>
