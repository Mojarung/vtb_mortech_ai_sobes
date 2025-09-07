import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff,
  MessageSquare,
  Users,
  MoreHorizontal,
  Monitor,
  Hand,
  Link,
  X,
  Paperclip,
  Smile,
  Send
} from 'lucide-react'
import WhisperClient from '../services/WhisperClient'

interface Interview {
  id: number
  unique_link: string
  candidate_name: string
  position: string
  status: 'not_started' | 'started' | 'finished'
  started_at?: string
  finished_at?: string
}

interface Message {
  id: number
  content: string
  role: 'candidate' | 'ai_hr'
  timestamp: string
}

const InterviewRoom: React.FC = () => {
  const { interviewId } = useParams<{ interviewId: string }>()
  const [interview, setInterview] = useState<Interview | null>(null)
  const [isVideoEnabled, setIsVideoEnabled] = useState(false)
  const [isAudioEnabled, setIsAudioEnabled] = useState(false)
  const [isInterviewActive, setIsInterviewActive] = useState(false)
  const [, setStartTime] = useState<Date | null>(null)
  // const [elapsed] = useState(0) // Не используется в новом дизайне
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const whisperClient = useRef<WhisperClient | null>(null)

  // Таймер (отключен в новом дизайне)
  // useEffect(() => {
  //   let interval: number | null = null
  //   if (isInterviewActive && startTime) {
  //     interval = window.setInterval(() => {
  //       const now = new Date()
  //       const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000)
  //       // setElapsed(diff)
  //     }, 1000)
  //   }
  //   return () => {
  //     if (interval) clearInterval(interval)
  //   }
  // }, [isInterviewActive, startTime])

  // Автоскролл чата
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Загрузка данных интервью
  useEffect(() => {
    const fetchInterview = async () => {
      try {
        const response = await fetch(`/api/v1/interviews/${interviewId}`)
        if (response.ok) {
          const data = await response.json()
          setInterview(data)
          
          if (data.status === 'started' && data.started_at) {
            setStartTime(new Date(data.started_at))
            setIsInterviewActive(true)
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки интервью:', error)
      }
    }

    if (interviewId) {
      fetchInterview()
    }
  }, [interviewId])

  // WebSocket соединение для чата
  useEffect(() => {
    if (interview?.id) {
      const websocket = new WebSocket(`ws://localhost:8000/api/v1/chat/${interview.id}/ws`)
      
      websocket.onopen = () => {
        setWs(websocket)
      }
      
      websocket.onmessage = (event) => {
        const message = JSON.parse(event.data)
        if (!message.error) {
          setMessages(prev => [...prev, message])
        }
      }
      
      websocket.onclose = () => {
        setWs(null)
      }

      return () => {
        websocket.close()
      }
    }
  }, [interview?.id])

  // Инициализация Whisper клиента
  useEffect(() => {
    whisperClient.current = new WhisperClient('wss://mojarung-whisper-websocket-6dd5.twc1.net')
    
    whisperClient.current.onTranscription = (text: string) => {
      if (text && text.trim()) {
        sendMessage(text.trim(), 'candidate')
      }
    }

    return () => {
      whisperClient.current?.disconnect()
    }
  }, [])

  // Функция formatTime закомментирована, так как не используется
  // const formatTime = (seconds: number) => {
  //   const hours = Math.floor(seconds / 3600)
  //   const minutes = Math.floor((seconds % 3600) / 60)
  //   const secs = seconds % 60
  //   if (hours > 0) {
  //     return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  //   }
  //   return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  // }

  const startInterview = async () => {
    if (!interview) return
    try {
      const response = await fetch(`/api/v1/interviews/${interview.id}/start`, {
        method: 'PATCH'
      })
      if (response.ok) {
        setIsInterviewActive(true)
        setStartTime(new Date())
        setTimeout(() => {
          sendAIMessage(`Здравствуйте, ${interview.candidate_name}! Меня зовут AI HR, и сегодня я буду проводить с вами собеседование на позицию ${interview.position}. Готовы начать?`)
        }, 1000)
      }
    } catch (error) {
      console.error('Ошибка при начале интервью:', error)
    }
  }

  const endInterview = async () => {
    if (!interview) return
    try {
      const response = await fetch(`/api/v1/interviews/${interview.id}/finish`, {
        method: 'PATCH'
      })
      if (response.ok) {
        setIsInterviewActive(false)
        alert('Интервью завершено. Транскрипция сохранена.')
      }
    } catch (error) {
      console.error('Ошибка при завершении интервью:', error)
    }
  }

  const toggleVideo = async () => {
    if (!isVideoEnabled) {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        setStream(mediaStream)
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
        setIsVideoEnabled(true)
      } catch (error) {
        console.error('Ошибка доступа к камере:', error)
      }
    } else {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
        setStream(null)
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      setIsVideoEnabled(false)
    }
  }

  const toggleAudio = async () => {
    if (!isAudioEnabled) {
      const success = await whisperClient.current?.startRecording()
      if (success) {
        setIsAudioEnabled(true)
      }
    } else {
      whisperClient.current?.stopRecording()
      setIsAudioEnabled(false)
    }
  }

  const sendMessage = (content: string, role: 'candidate' | 'ai_hr') => {
    if (ws && content.trim()) {
      const messageData = {
        content: content.trim(),
        role
      }
      ws.send(JSON.stringify(messageData))
      setNewMessage('')
    }
  }

  const sendAIMessage = async (content: string) => {
    if (!interview) return
    try {
      await fetch(`/api/v1/chat/${interview.id}/ai-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: content }),
      })
    } catch (error) {
      console.error('Ошибка отправки AI сообщения:', error)
    }
  }

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      sendMessage(newMessage, 'candidate')
    }
  }

  if (!interview) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-xl text-white">Загрузка интервью...</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="flex flex-col h-screen w-screen"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      {/* Основной контент */}
      <div className="flex-grow flex">
        {/* Главная область */}
        <div 
          className={`flex-grow flex ${isChatOpen ? 'flex-col' : 'flex-row'} justify-center items-center gap-3 p-4`}
          style={{ 
            flexDirection: isChatOpen ? 'column' : 'row' 
          }}
        >
          {/* Участник 1 - Кандидат */}
          <div 
            className="relative flex flex-col justify-center items-center"
            style={{
              width: '450px',
              height: '300px',
              backgroundColor: 'var(--color-surface)',
              borderRadius: '8px'
            }}
          >
            {isVideoEnabled ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <>
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face"
                  alt="Candidate Avatar"
                  className="w-30 h-30 rounded-full"
                  style={{ width: '120px', height: '120px' }}
                />
              </>
            )}
            
            {/* Имя участника */}
            <div 
              className="absolute flex items-center gap-2"
              style={{
                bottom: '15px',
                left: '15px'
              }}
            >
              <span 
                className="font-medium"
                style={{
                  color: 'var(--color-primary-text)',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {interview?.candidate_name || 'Кандидат'}
              </span>
              {!isAudioEnabled && (
                <MicOff 
                  size={16} 
                  style={{ color: 'var(--color-primary-text)' }} 
                />
              )}
            </div>
          </div>

          {/* Участник 2 - AI HR */}
          <div 
            className="relative flex flex-col justify-center items-center"
            style={{
              width: '450px',
              height: '300px',
              backgroundColor: 'var(--color-surface)',
              borderRadius: '8px'
            }}
          >
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face"
              alt="AI HR Avatar"
              className="w-30 h-30 rounded-full"
              style={{ width: '120px', height: '120px' }}
            />
            
            {/* Имя участника */}
            <div 
              className="absolute flex items-center gap-2"
              style={{
                bottom: '15px',
                left: '15px'
              }}
            >
              <span 
                className="font-medium"
                style={{
                  color: 'var(--color-primary-text)',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                AI HR
              </span>
              <MicOff 
                size={16} 
                style={{ color: 'var(--color-primary-text)' }} 
              />
            </div>
          </div>
        </div>

        {/* Боковая панель чата */}
        {isChatOpen && (
          <div 
            className="flex flex-col border-l"
            style={{
              width: '360px',
              height: 'calc(100% - 70px)',
              backgroundColor: 'var(--color-chat-background)',
              borderLeftColor: 'var(--color-surface)'
            }}
          >
            {/* Заголовок чата */}
            <div className="p-2.5 text-right">
              <button
                onClick={() => setIsChatOpen(false)}
                className="p-1 hover:bg-gray-600 rounded"
              >
                <X size={16} style={{ color: 'var(--color-icon-default)' }} />
              </button>
            </div>

            {/* Область сообщений */}
            <div className="flex-grow flex justify-center items-center">
              <div 
                className="text-center"
                style={{
                  color: 'var(--color-secondary-text)',
                  fontSize: '13px',
                  whiteSpace: 'pre-wrap'
                }}
              >
                Сегодня{'\n'}Чат сохранится в Яндекс.Мессенджере, если вы авторизованы на Яндексе.
              </div>
            </div>

            {/* Область ввода */}
            <div 
              className="p-4 flex items-center gap-2.5"
              style={{ backgroundColor: 'var(--color-chat-input-bg)' }}
            >
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Сообщение..."
                className="flex-1 bg-transparent border-none outline-none"
                style={{ 
                  color: 'var(--color-primary-text)',
                  fontSize: '13px'
                }}
              />
              <button className="p-1 hover:bg-gray-600 rounded">
                <Paperclip size={16} style={{ color: 'var(--color-icon-default)' }} />
              </button>
              <button className="p-1 hover:bg-gray-600 rounded">
                <Smile size={16} style={{ color: 'var(--color-icon-default)' }} />
              </button>
              <button 
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="p-1 hover:bg-gray-600 rounded disabled:opacity-50"
              >
                <Send size={16} style={{ color: 'var(--color-icon-default)' }} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Панель управления */}
      <div 
        className="flex justify-between items-center p-4"
        style={{ height: '70px' }}
      >
        {/* Левые контролы */}
        <div className="flex items-center gap-3">
          <button 
            className="p-3 rounded-full hover:bg-gray-600 transition-colors"
            style={{ backgroundColor: 'var(--color-button-pill-bg)' }}
          >
            <Link size={16} style={{ color: 'var(--color-icon-default)' }} />
          </button>
          <button 
            onClick={toggleAudio}
            className="p-3 rounded-full hover:bg-gray-600 transition-colors"
            style={{ 
              backgroundColor: isAudioEnabled ? 'var(--color-button-pill-bg)' : 'var(--color-destructive)' 
            }}
          >
            {isAudioEnabled ? (
              <Mic size={16} style={{ color: 'var(--color-icon-default)' }} />
            ) : (
              <MicOff size={16} style={{ color: 'var(--color-icon-default)' }} />
            )}
          </button>
          <button 
            onClick={toggleVideo}
            className="p-3 rounded-full hover:bg-gray-600 transition-colors"
            style={{ 
              backgroundColor: isVideoEnabled ? 'var(--color-button-pill-bg)' : 'var(--color-destructive)' 
            }}
          >
            {isVideoEnabled ? (
              <Video size={16} style={{ color: 'var(--color-icon-default)' }} />
            ) : (
              <VideoOff size={16} style={{ color: 'var(--color-icon-default)' }} />
            )}
          </button>
        </div>

        {/* Центральные контролы */}
        <div className="flex items-center gap-3">
          <button 
            className="p-3 rounded-full hover:bg-gray-600 transition-colors"
            style={{ backgroundColor: 'var(--color-button-pill-bg)' }}
          >
            <Hand size={16} style={{ color: 'var(--color-icon-default)' }} />
          </button>
          <button 
            className="p-3 rounded-full hover:bg-gray-600 transition-colors"
            style={{ backgroundColor: 'var(--color-button-pill-bg)' }}
          >
            <Monitor size={16} style={{ color: 'var(--color-icon-default)' }} />
          </button>
          <button 
            className="p-3 rounded-full hover:bg-gray-600 transition-colors"
            style={{ backgroundColor: 'var(--color-button-pill-bg)' }}
          >
            <Users size={16} style={{ color: 'var(--color-icon-default)' }} />
          </button>
          <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="p-3 rounded-full hover:bg-gray-600 transition-colors"
            style={{ backgroundColor: 'var(--color-button-pill-bg)' }}
          >
            <MessageSquare size={16} style={{ color: 'var(--color-icon-default)' }} />
          </button>
          <button 
            className="p-3 rounded-full hover:bg-gray-600 transition-colors"
            style={{ backgroundColor: 'var(--color-button-pill-bg)' }}
          >
            <MoreHorizontal size={16} style={{ color: 'var(--color-icon-default)' }} />
          </button>
        </div>

        {/* Правые контролы */}
        <div className="flex items-center">
          {!isInterviewActive ? (
            <button
              onClick={startInterview}
              className="px-6 py-3 rounded-full font-medium transition-colors"
              style={{ 
                backgroundColor: 'var(--color-success)',
                color: 'var(--color-icon-default)'
              }}
            >
              <Phone size={16} className="inline mr-2" />
              Начать интервью
            </button>
          ) : (
            <button
              onClick={endInterview}
              className="px-6 py-3 rounded-full font-medium transition-colors"
              style={{ 
                backgroundColor: 'var(--color-destructive)',
                color: 'var(--color-icon-default)'
              }}
            >
              <PhoneOff size={16} className="inline mr-2" />
              Завершить
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default InterviewRoom
