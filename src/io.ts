import { Server } from 'socket.io'
import { WEB_SERVER_PORT } from './constant'

export const io = new Server(9999, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? `http://localhost:${WEB_SERVER_PORT}` : '*'
  },
})
