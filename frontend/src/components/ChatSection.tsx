import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Users } from 'lucide-react'

interface Message {
  id: number
  content: string
  role: 'ai_hr' | 'candidate' | 'recruiter'
  timestamp: string
  interview_id: number
}

interface ChatSectionProps {
  messages: Message[]
  onSendMessage: (content: string, role: 'candidate' | 'recruiter') => void
  interviewId: number
}

const ChatSection = ({ messages, onSendMessage, interviewId }: ChatSectionProps) => {
  const [newMessage, setNewMessage] = useState('')
  const [selectedRole, setSelectedRole] = useState<'candidate' | 'recruiter'>('candidate')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim(), selectedRole)
      setNewMessage('')
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ai_hr':
        return <Bot className="w-4 h-4" />
      case 'candidate':
        return <User className="w-4 h-4" />
      case 'recruiter':
        return <Users className="w-4 h-4" />
      default:
        return <User className="w-4 h-4" />
    }
  }

  const getRoleName = (role: string) => {
    switch (role) {
      case 'ai_hr':
        return 'AI HR'
      case 'candidate':
        return 'Кандидат'
      case 'recruiter':
        return 'Рекрутер'
      default:
        return 'Пользователь'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ai_hr':
        return 'text-primary-400'
      case 'candidate':
        return 'text-blue-400'
      case 'recruiter':
        return 'text-green-400'
      default:
        return 'text-gray-400'
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Заголовок чата */}
      <div className="p-4 border-b border-white/10">
        <h3 className="text-lg font-medium text-white flex items-center space-x-2">
          <Bot className="w-5 h-5 text-primary-500" />
          <span>Чат собеседования</span>
        </h3>
        <p className="text-xs text-text-muted mt-1">
          ID: {interviewId}
        </p>
      </div>

      {/* Сообщения */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-text-muted py-8">
            <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Сообщений пока нет</p>
            <p className="text-xs mt-1">Начните общение с AI HR или рекрутером</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start space-x-3 ${
                message.role === selectedRole ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                message.role === 'ai_hr' ? 'bg-primary-600' :
                message.role === 'candidate' ? 'bg-blue-600' :
                'bg-green-600'
              }`}>
                {getRoleIcon(message.role)}
              </div>
              
              <div className={`flex-1 ${message.role === selectedRole ? 'text-right' : ''}`}>
                <div className="flex items-center space-x-2 mb-1">
                  <span className={`text-sm font-medium ${getRoleColor(message.role)}`}>
                    {getRoleName(message.role)}
                  </span>
                  <span className="text-xs text-text-muted">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                
                <div className={`rounded-lg px-3 py-2 max-w-xs ${
                  message.role === selectedRole 
                    ? 'bg-primary-600 text-white ml-auto' 
                    : 'bg-background-tertiary text-white'
                }`}>
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Форма отправки */}
      <div className="p-4 border-t border-white/10">
        {/* Переключатель роли */}
        <div className="flex mb-3 bg-background-tertiary rounded-lg p-1">
          <button
            type="button"
            onClick={() => setSelectedRole('candidate')}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all ${
              selectedRole === 'candidate'
                ? 'bg-blue-600 text-white'
                : 'text-text-muted hover:text-white'
            }`}
          >
            <User className="w-3 h-3 inline mr-1" />
            Кандидат
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole('recruiter')}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all ${
              selectedRole === 'recruiter'
                ? 'bg-green-600 text-white'
                : 'text-text-muted hover:text-white'
            }`}
          >
            <Users className="w-3 h-3 inline mr-1" />
            Рекрутер
          </button>
        </div>

        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Сообщение от ${selectedRole === 'candidate' ? 'кандидата' : 'рекрутера'}...`}
            className="flex-1 bg-background-tertiary border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        
        <p className="text-xs text-text-muted mt-2">
          💡 Сообщения от AI HR появляются автоматически
        </p>
      </div>
    </div>
  )
}

export default ChatSection
