// 在Windows组件中实现列表功能
import React, { useEffect, useState } from 'react'
import './styles.css'
import { socket } from '../../io'
import clsx from 'clsx'

interface Win {
  id: number
  title: string
}

export function Windows() {
  const [wins, setWins] = useState<Win[]>([])
  const [filterKeyword, setFilterKeyword] = useState('')
  const [selectedId, setSelectedId] = useState<number>(0)

  useEffect(() => {
    socket.emit('windows:get-windows', (response: {
      windows: Win[],
      selectedWinId: number,
    }) => {
      console.log(response)
      setWins(response.windows)
      setSelectedId(response.selectedWinId)
    })
  }, [])

  const filteredWins = wins.filter(win => 
    win.title.toLowerCase().includes(filterKeyword.toLowerCase())
  )

  return (
    <div className="windows-list">
      <input
        type="text"
        placeholder="搜索窗口..."
        className="search-input"
        value={filterKeyword}
        onChange={(e) => setFilterKeyword(e.target.value)}
      />
      {filteredWins.map(win => (
        <div 
          key={win.id}
          className={clsx('list-item', { selected: selectedId === win.id })}
          onClick={() => {
            socket.emit('windows:set-target-window', win)
            setSelectedId(win.id)
          }}
        >
          <div className="item-content">
            <div className="item-header">
              <h3>{win.title}</h3>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
