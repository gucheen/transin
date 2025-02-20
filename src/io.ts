import { Server } from 'socket.io'

export const io = new Server(9999, {
  cors: {
    origin: "http://localhost:5173"
  },
})
