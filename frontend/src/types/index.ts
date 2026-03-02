import type { Chat, Message } from './models'

export type ChatMessage = Message
export type ChatThread = Chat

export type Model = {
  id: string
  name: string
  category: string
}
