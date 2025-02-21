import { Service } from '@volcengine/openapi'

const translateService = new Service({
  serviceName: 'translate',
  host: 'translate.volcengineapi.com',
  region: 'cn-north-1',
  defaultVersion: '2020-06-01',
  accessKeyId: process.env.VOLC_ACCESSKEY as unknown as string,
  secretKey: process.env.VOLC_SECRETKEY as unknown as string,
})

const volceTranslateAPI = translateService.createJSONAPI('TranslateText', {
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

export const translateWithVolce = (texts: string[]) => volceTranslateAPI({
  SourceLanguage: 'ja',
  TargetLanguage: 'zh',
  TextList: texts,
})

export interface GLM4Res {
  choices: Choice[]
  created: number
  id: string
  model: string
  request_id: string
  usage: Usage
}

export interface Choice {
  finish_reason: string
  index: number
  message: Message
}

export interface Message {
  content: string
  role: string
}

export interface Usage {
  completion_tokens: number
  prompt_tokens: number
  total_tokens: number
}

export const translateWithZhiPuGLM4Flash = async (text: string[]): Promise<GLM4Res> => (await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.ZHIPU_API_KEY}`,
  },
  body: JSON.stringify({
    model: 'glm-4-flash',
    messages: [
      {
        'role': 'system',
        'content': '你是一个日文翻译，翻译成简体中文',
      },
      ...text.map((t) => ({ role: 'user', content: t })),
    ],
    temperature: 0.95,
    top_p: 0.7,
    max_tokens: 1024,
    tools: [{ 'type': 'web_search', 'web_search': { 'search_result': true } }]
  }),
})).json()
