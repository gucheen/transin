import { useEffect, useRef, useState } from 'react'
import './styles.css'
import { socket } from '../../io'
import { WEB_SERVER_PORT } from '../../../../src/constant'

interface Region {
  id: number
  x: number
  y: number
  width: number
  height: number
}

function ImageRegionMarker() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D>(null)
  const [regions, setRegions] = useState<Region[]>([])
  const isDrawing = useRef(false)
  const [activeRegion, setActiveRegion] = useState<{ start: { x: number, y: number }, current: { x: number, y: number } } | null>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const canvasScale = useRef(1)
  const [scaleValue, setScaleValue] = useState(1)
  const regionIdCounter = useRef(1)
  const lastActiveRegion = useRef<{ start: { x: number, y: number }, current: { x: number, y: number } } | null>(null)

  useEffect(() => {
    const drawSelect = () => {
      if (ctxRef.current && canvasRef.current && imageRef.current) {
        ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        ctxRef.current.drawImage(imageRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height)

        const fontSize = ~~(14 * canvasScale.current)
        
        // 绘制已存在的区域
        regions.forEach(region => {
          ctxRef.current!.strokeStyle = '#38f'
          ctxRef.current!.lineWidth = 2
          ctxRef.current!.strokeRect(region.x, region.y, region.width, region.height)
          ctxRef.current!.fillStyle = '#38f'
          ctxRef.current!.font = `${fontSize}px Arial`
          ctxRef.current!.fillText(`#${region.id}`, region.x + fontSize - 20, region.y + fontSize)
        })

        // 绘制当前正在绘制的区域
        if (activeRegion) {
          const w = activeRegion.current.x - activeRegion.start.x
          const h = activeRegion.current.y - activeRegion.start.y
          ctxRef.current!.strokeStyle = '#f00'
          ctxRef.current!.strokeRect(activeRegion.start.x, activeRegion.start.y, w, h)
          lastActiveRegion.current = activeRegion
        } else {
          lastActiveRegion.current = null
        }
      }
    }
    drawSelect()
  }, [activeRegion])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const getInitialSelection = () => {
      socket.emit('settings:get-ocr-recognize-area', (response: any[]) => {
        if (response) {
          const mapped = response.map(r => ({
            id: regionIdCounter.current++,
            x: r.left,
            y: r.top,
            width: r.width,
            height: r.height
          }))
          setRegions(mapped)
          setScaleValue(response[0]?.scale ?? 1)
        }
      })
    }

    ctxRef.current = ctx

    const img = new Image()
    imageRef.current = img
    img.src = process.env.NODE_ENV === 'production' 
      ? `/screenshots/screenshots.png?t=${Date.now()}` 
      : `http://localhost:${WEB_SERVER_PORT}/screenshots/screenshots.png?t=${Date.now()}`
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      const { width, height } = canvas.getBoundingClientRect()
      canvasScale.current = Math.min(img.width / width, img.height / height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      getInitialSelection()
    }

    const onMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = (e.clientX - rect.left) * canvasScale.current
      const y = (e.clientY - rect.top) * canvasScale.current
      isDrawing.current = true
      setActiveRegion({ start: { x, y }, current: { x, y } })
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!isDrawing.current) return
      const rect = canvas.getBoundingClientRect()
      const x = (e.clientX - rect.left) * canvasScale.current
      const y = (e.clientY - rect.top) * canvasScale.current
      setActiveRegion(prev => prev ? { ...prev, current: { x, y } } : null)
    }

    const onMouseUp = () => {
      if (lastActiveRegion.current) {
        const { start, current } = lastActiveRegion.current
        const newRegion = {
          id: regionIdCounter.current++,
          x: Math.min(start.x, current.x),
          y: Math.min(start.y, current.y),
          width: Math.abs(current.x - start.x),
          height: Math.abs(current.y - start.y)
        }
        setRegions(prev => [...prev, newRegion])
      }
      isDrawing.current = false
      setActiveRegion(null)
    }

    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseup', onMouseUp)

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const deleteRegion = (id: number) => {
    setRegions(prev => prev.filter(r => r.id !== id))
  }

  const submitAreaInfo = () => {
    if (regions.length > 0) {
      const payload = {
        regions: regions.map(region => ({
          left: ~~region.x,
          top: ~~region.y,
          width: ~~region.width,
          height: ~~region.height,
        })),
        scale: scaleValue,
      }
      socket.emit('settings:update-ocr-recognize-area', payload)
    }
  }

  return (
    <div className='image-region-container'>
      <div className='canvas-wrapper'>
        <canvas ref={canvasRef} />
      </div>
      <div className='side-info'>
        <div className='scale-control'>
          <label>
            缩放比例:
            <span className='scale-hint'>(0.1-5.0)</span>
          </label>
          <input
            type='number'
            value={scaleValue}
            onChange={(e) => setScaleValue(Number(e.target.value))}
            min='0.1'
            max='5'
          />
        </div>
        <div className='selection-info'>
          <div className='regions-list'>
            {regions.map(region => (
              <div key={region.id} className='region-item'>
                <span>区域 #{region.id}</span>
                <button 
                  className='delete-button'
                  onClick={() => deleteRegion(region.id)}
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        </div>
        <button className='confirm-button' onClick={submitAreaInfo}>提交区域信息</button>
      </div>
    </div>
  )
}

export default ImageRegionMarker
