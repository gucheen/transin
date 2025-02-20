import { useEffect, useRef, useState } from 'react'
import './styles.css'
import { socket } from '../../io'

function ImageRegionMarker() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D>(null)
  const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0 })
  const isDrawing = useRef(false)
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 })
  const imageRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    // 绘制选择框
    const drawSelect = () => {
      if (ctxRef.current && canvasRef.current && imageRef.current) {
        ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        ctxRef.current.drawImage(imageRef.current, 0, 0, imageRef.current.width, imageRef.current.height)
        if (currentPosition.x && currentPosition.y) {
          const w = currentPosition.x - startPoint.x
          const h = currentPosition.y - startPoint.y
          if (w && h) {
            ctxRef.current.strokeStyle = '#38f'
            ctxRef.current.lineWidth = 2
            ctxRef.current.strokeRect(startPoint.x, startPoint.y, currentPosition.x - startPoint.x, currentPosition.y - startPoint.y)
          }
        }
      }
    }
    drawSelect()
  }, [startPoint, currentPosition])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // 创建一个2D绘图上下文
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctxRef.current = ctx

    // 加载图片
    const img = new Image()
    imageRef.current = img
    img.src = 'http://localhost:3000/screenshots/demo.jpg' // 替换为你的图片路径
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0, img.width, img.height)
    }

    const onMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      isDrawing.current = true
      setStartPoint({ x, y })
      setCurrentPosition({ x, y })
    }

    // 处理鼠标按下事件
    canvas.addEventListener('mousedown', onMouseDown)

    const onMouseMove = (e: MouseEvent) => {
      if (!isDrawing.current) return
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      setCurrentPosition({
        x,
        y,
      })
    }

    // 处理鼠标移动事件
    canvas.addEventListener('mousemove', onMouseMove)

    const onMouseUp = () => {
      isDrawing.current = false
    }

    // 处理鼠标释放事件
    canvas.addEventListener('mouseup', onMouseUp)

    socket.emit('settings:get-ocr-recognize-area', (response: {
      left: number,
      top: number,
      width: number,
      height: number,
    }) => {
      if (response) {
        setStartPoint({
          x: response.left,
          y: response.top,
        })
        setCurrentPosition({
          x: response.left + response.width,
          y: response.top + response.height,
        })
      }
    })

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseup', onMouseUp)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [])

  const submitAreaInfo = () => {
    const payload = {
      left: Math.min(startPoint.x, currentPosition.x),
      top: Math.min(startPoint.y, currentPosition.y),
      width: Math.abs(currentPosition.x - startPoint.x),
      height: Math.abs(currentPosition.y - startPoint.y),
    }
    console.log(payload)
    if (payload.width !== 0 && payload.height !== 0) {
      socket.emit('settings:update-ocr-recognize-area', payload)
    }
  }

  return (
    <div className='image-region-container'>
      <div className='canvas-wrapper'>
      <canvas ref={canvasRef} />
      </div>
      <div className='selection-info'>
        <span className='coordinate-text'>
        x: <span className='coordinate-x'>{startPoint.x}</span>, y: <span className='coordinate-y'>{startPoint.y}</span>, width: <span className='dimension-width'>{currentPosition.x - startPoint.x}</span>, height: <span className='dimension-height'>{currentPosition.y - startPoint.y}</span>
        </span>
      </div>

      <button className='confirm-button' onClick={submitAreaInfo}>提交区域信息</button>
    </div>
  )
}

export default ImageRegionMarker
