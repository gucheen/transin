import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { Link } from 'wouter'
import './styles.css'
import { socket } from '../../io'

function Main() {
  const [connected, setConnected] = useState(false)
  const [originalText, setOriginalText] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  const [screenshot, setScreenshot] = useState(null)

  useEffect(() => {
    socket.once('connect', () => {
      setConnected(true)
    })
    socket.on('new-translation', (data) => {
      setOriginalText(data.original)
      setTranslatedText(data.translated)
      setScreenshot(data.screenshot)
    })
  }, [])

  return (
    <div className="container">

      <div className="card">
        <h3>翻译结果</h3>
        <p className="translation-text">{translatedText}</p>
      </div>

      <div className="card">
        <h3>原始文本</h3>
        <p className="original-text">{originalText}</p>
      </div>

      {screenshot && (
        <div className="card screenshot">
          <h3>截图预览</h3>
          <img src={screenshot} alt="screenshot" />
        </div>
      )}

      <div className="card connection-status">
        <p className={clsx('status', { connected: connected, disconnected: !connected })}>
          连接状态: {connected ? '已连接' : '未连接'}
        </p>
      </div>

      <div className='operations'>
        <button
          className="confirm-button"
          onClick={() => {
            socket.emit('trigger')
          }}
        >
          开始翻译
        </button>

        <button
          className="confirm-button"
          onClick={() => {
            socket.emit('stop')
          }}
        >
          停止翻译
        </button>

        <Link
          className="confirm-button"
          href='/image-region-marker'
        >
          OCR区域标记
        </Link>

        <Link
          className="confirm-button"
          href='/windows'
        >
          选择窗口
        </Link>
      </div>
    </div>
  )
}

export default Main
