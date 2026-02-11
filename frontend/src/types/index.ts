export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export type ChatThread = {
  id: string
  title: string
  messages: ChatMessage[]
}

export type Model = {
  id: string
  name: string
  category: string
}
