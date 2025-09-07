import { useState, useEffect, useRef, useCallback } from 'react'

interface Message {
  id: number
  content: string
  role: 'ai_hr' | 'candidate' | 'recruiter'
  timestamp: string
  interview_id: number
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

interface UseWebSocketReturn {
  messages: Message[]
  sendMessage: (content: string, role: 'candidate' | 'recruiter') => void
  connectionStatus: ConnectionStatus
  error: string | null
}

const useWebSocket = (interviewId: number): UseWebSocketReturn => {
  const [messages, setMessages] = useState<Message[]>([])
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [error, setError] = useState<string | null>(null)
  
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5

  const connect = useCallback(() => {
    if (!interviewId || wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    try {
      setConnectionStatus('connecting')
      setError(null)

      const wsUrl = `ws://localhost:8000/api/v1/chat/${interviewId}/ws`
      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        setConnectionStatus('connected')
        reconnectAttemptsRef.current = 0
        console.log('WebSocket подключен для интервью:', interviewId)
      }

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          if (data.error) {
            setError(data.error)
            return
          }

          if (data.content && data.role) {
            setMessages(prev => [...prev, data])
          }
        } catch (err) {
          console.error('Ошибка парсинга сообщения:', err)
        }
      }

      wsRef.current.onclose = (event) => {
        setConnectionStatus('disconnected')
        console.log('WebSocket соединение закрыто:', event.code, event.reason)

        // Переподключение если не было намеренного закрытия
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++
          const timeout = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000)
          
          reconnectTimeoutRef.current = window.setTimeout(() => {
            console.log(`Попытка переподключения ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`)
            connect()
          }, timeout)
        }
      }

      wsRef.current.onerror = (error) => {
        console.error('Ошибка WebSocket:', error)
        setConnectionStatus('error')
        setError('Ошибка подключения к чату')
      }

    } catch (err) {
      console.error('Ошибка создания WebSocket:', err)
      setConnectionStatus('error')
      setError('Не удалось установить соединение')
    }
  }, [interviewId])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Закрытие соединения')
      wsRef.current = null
    }
    
    setConnectionStatus('disconnected')
  }, [])

  const sendMessage = useCallback((content: string, role: 'candidate' | 'recruiter') => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('Соединение не установлено')
      return
    }

    try {
      const message = {
        content,
        role,
        interview_id: interviewId
      }

      wsRef.current.send(JSON.stringify(message))
    } catch (err) {
      console.error('Ошибка отправки сообщения:', err)
      setError('Не удалось отправить сообщение')
    }
  }, [interviewId])

  // Загрузка существующих сообщений
  useEffect(() => {
    const loadMessages = async () => {
      if (!interviewId) return

      try {
        const response = await fetch(`http://localhost:8000/api/v1/chat/${interviewId}/messages`)
        if (response.ok) {
          const data = await response.json()
          setMessages(data)
        }
      } catch (err) {
        console.error('Ошибка загрузки сообщений:', err)
      }
    }

    loadMessages()
  }, [interviewId])

  // Установка соединения
  useEffect(() => {
    if (interviewId) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [interviewId, connect, disconnect])

  return {
    messages,
    sendMessage,
    connectionStatus,
    error
  }
}

export default useWebSocket
