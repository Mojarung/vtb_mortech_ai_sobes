import React, { useState, useEffect, useRef } from 'react'
import { Eye, EyeOff, Terminal, Trash2 } from 'lucide-react'

interface WhisperDebugLogProps {
  show?: boolean
  className?: string
}

const WhisperDebugLog: React.FC<WhisperDebugLogProps> = ({ 
  show = false, 
  className = '' 
}) => {
  const [isVisible, setIsVisible] = useState(show)
  const [logs, setLogs] = useState<string[]>([])
  const logContainerRef = useRef<HTMLDivElement>(null)
  const originalConsoleLog = useRef<typeof console.log>()
  const originalConsoleWarn = useRef<typeof console.warn>()
  const originalConsoleError = useRef<typeof console.error>()

  useEffect(() => {
    // Сохраняем оригинальные методы
    originalConsoleLog.current = console.log
    originalConsoleWarn.current = console.warn
    originalConsoleError.current = console.error

    // Перехватываем console методы
    const interceptLog = (level: 'log' | 'warn' | 'error', originalMethod: any) => {
      return (...args: any[]) => {
        // Вызываем оригинальный метод
        originalMethod(...args)
        
        // Фильтруем только Whisper сообщения
        const message = args.join(' ')
        if (message.includes('[WHISPER]') || message.includes('[WHISPER-UI]') || message.includes('[INTERVIEW]')) {
          const timestamp = new Date().toLocaleTimeString()
          const levelIcon = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️'
          const logEntry = `[${timestamp}] ${levelIcon} ${message}`
          
          setLogs(prev => {
            const newLogs = [logEntry, ...prev.slice(0, 99)] // Максимум 100 записей
            return newLogs
          })
        }
      }
    }

    console.log = interceptLog('log', originalConsoleLog.current)
    console.warn = interceptLog('warn', originalConsoleWarn.current) 
    console.error = interceptLog('error', originalConsoleError.current)

    return () => {
      // Восстанавливаем оригинальные методы
      if (originalConsoleLog.current) console.log = originalConsoleLog.current
      if (originalConsoleWarn.current) console.warn = originalConsoleWarn.current
      if (originalConsoleError.current) console.error = originalConsoleError.current
    }
  }, [])

  // Автоскролл вниз при новых логах
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = 0 // Скролл к верху (новые сообщения вверху)
    }
  }, [logs])

  const clearLogs = () => {
    setLogs([])
    console.log('🎤 [WHISPER-DEBUG] 🗑️ Логи очищены пользователем')
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-primary-600 hover:bg-primary-700 text-white p-3 rounded-full shadow-lg transition-all z-50"
        title="Показать лог Whisper"
      >
        <Terminal className="w-5 h-5" />
      </button>
    )
  }

  return (
    <div className={`fixed bottom-4 right-4 w-96 max-w-[90vw] bg-black border border-white/20 rounded-xl shadow-2xl z-50 ${className}`}>
      {/* Заголовок */}
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-green-400" />
          <span className="text-green-400 font-medium text-sm">Whisper Debug Log</span>
          {logs.length > 0 && (
            <span className="bg-primary-600 text-xs px-2 py-1 rounded-full text-white">
              {logs.length}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={clearLogs}
            className="text-gray-400 hover:text-white p-1 rounded transition-colors"
            title="Очистить логи"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-white p-1 rounded transition-colors"
            title="Скрыть лог"
          >
            <EyeOff className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Лог контейнер */}
      <div
        ref={logContainerRef}
        className="h-64 overflow-y-auto p-2 text-xs font-mono"
        style={{ 
          scrollbarWidth: 'thin',
          scrollbarColor: '#4B5563 #1F2937' 
        }}
      >
        {logs.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Нет логов Whisper</p>
            <p className="text-xs mt-1">Попробуйте подключиться к серверу</p>
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((log, index) => (
              <div
                key={index}
                className={`p-1 rounded text-xs ${
                  log.includes('❌') ? 'text-red-300 bg-red-900/20' :
                  log.includes('⚠️') ? 'text-yellow-300 bg-yellow-900/20' :
                  log.includes('✅') ? 'text-green-300 bg-green-900/20' :
                  log.includes('📝') ? 'text-blue-300 bg-blue-900/20' :
                  log.includes('🎤') ? 'text-purple-300 bg-purple-900/20' :
                  'text-gray-300'
                }`}
              >
                {log}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Подсказка */}
      <div className="p-2 border-t border-white/10 text-xs text-gray-400">
        💡 Автоматически показывает только логи Whisper транскрипции
      </div>
    </div>
  )
}

export default WhisperDebugLog
