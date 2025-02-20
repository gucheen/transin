import { Window } from 'node-screenshots'
import type { Socket } from 'socket.io'

export function getWindows(): Window[] {
  return Window.all().filter(win => !win.isMinimized)
}

export async function captureWindow(win: Window): Promise<Buffer> {
  const captureImage = await win.captureImage()
  return captureImage.toPng()
}

export let currentTargetWindow: Window | null = null

export function attachWindowServiceToSocket(socket: Socket) {
  socket.on('windows:get-windows', (callback) => {
    const wins = getWindows().map(win => {
      return {
        id: win.id,
        title: win.title,
      }
    })
    callback({
      windows: wins,
      selectedWinId: currentTargetWindow?.id,
    })
  })

  socket.on('windows:set-target-window', (payload: {
    id: number
  }) => {
    const windows = getWindows()
    const target = windows.find(win => win.id === payload.id)
    if (target) {
      currentTargetWindow = target
      console.log('set target window:', currentTargetWindow.title)
    }
  })
}

