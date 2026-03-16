import { matchPath, useLocation, useNavigate } from 'react-router-dom'

export function useAppRouting() {
  const navigate = useNavigate()
  const location = useLocation()

  const chatMatch = matchPath('/chat/:chatId', location.pathname)
  const activeChatId = chatMatch?.params.chatId ?? null
  const isChatView = location.pathname === '/chat' || Boolean(chatMatch)

  const openTemplates = () => {
    navigate('/templates')
  }

  const openChat = (chatId?: string) => {
    navigate(chatId ? '/chat/' + chatId : '/chat')
  }

  const openNewChat = () => {
    navigate('/chat')
  }

  return {
    activeChatId,
    isChatView,
    openTemplates,
    openChat,
    openNewChat,
  }
}