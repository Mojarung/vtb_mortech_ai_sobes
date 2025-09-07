import { useState, useEffect } from 'react'
import { Mic, MicOff, Wifi, WifiOff, Trash2, Volume2 } from 'lucide-react'
import useWhisperWebSocket from '../hooks/useWhisperWebSocket'

interface WhisperTranscriptionProps {
  onTranscription?: (text: string) => void
  className?: string
}

const WhisperTranscription = ({ onTranscription, className = '' }: WhisperTranscriptionProps) => {
  const [autoSendToChat, setAutoSendToChat] = useState(false)
  
  const {
    connectionStatus,
    isRecording,
    transcriptions,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    clearTranscriptions,
    error
  } = useWhisperWebSocket()

  // Отправка новых транскрипций в родительский компонент
  useEffect(() => {
    if (transcriptions.length > 0 && onTranscription && autoSendToChat) {
      const latestTranscription = transcriptions[0]
      console.log('🎤 [WHISPER-UI] 📤 Проверка отправки в чат:')
      console.log('🎤 [WHISPER-UI] ├─ Автоотправка включена:', autoSendToChat)
      console.log('🎤 [WHISPER-UI] ├─ Текст транскрипции:', `"${latestTranscription.text}"`)
      console.log('🎤 [WHISPER-UI] └─ Длина после trim:', latestTranscription.text.trim().length)
      
      if (latestTranscription.text.trim()) {
        console.log('🎤 [WHISPER-UI] ✅ ОТПРАВКА ТРАНСКРИПЦИИ В ЧАТ:', latestTranscription.text)
        onTranscription(latestTranscription.text)
      } else {
        console.log('🎤 [WHISPER-UI] ⚠️ Транскрипция пустая, не отправляем')
      }
    } else {
      if (transcriptions.length > 0) {
        console.log('🎤 [WHISPER-UI] ℹ️ Транскрипция получена, но автоотправка выключена')
      }
    }
  }, [transcriptions, onTranscription, autoSendToChat])

  const toggleConnection = () => {
    if (connectionStatus === 'connected') {
      disconnect()
    } else {
      connect()
    }
  }

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="w-4 h-4 text-green-500" />
      case 'connecting':
        return <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      default:
        return <WifiOff className="w-4 h-4 text-red-500" />
    }
  }

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Подключено'
      case 'connecting':
        return 'Подключение...'
      case 'error':
        return 'Ошибка'
      default:
        return 'Отключено'
    }
  }

  return (
    <div className={`bg-background-secondary border border-white/10 rounded-xl p-4 ${className}`}>
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Volume2 className="w-5 h-5 text-primary-500" />
          <h3 className="text-lg font-medium text-white">Whisper Транскрипция</h3>
        </div>
        <div className="flex items-center space-x-2 text-sm text-text-muted">
          {getConnectionStatusIcon()}
          <span>{getConnectionStatusText()}</span>
        </div>
      </div>

      {/* Ошибка */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Управление */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={toggleConnection}
            className={`btn-secondary flex items-center space-x-2 ${
              connectionStatus === 'connected' ? 'bg-red-600 hover:bg-red-700' : ''
            }`}
          >
            {getConnectionStatusIcon()}
            <span>
              {connectionStatus === 'connected' ? 'Отключиться' : 'Подключиться'}
            </span>
          </button>

          <button
            onClick={toggleRecording}
            disabled={connectionStatus !== 'connected'}
            className={`p-2 rounded-xl transition-all ${
              isRecording
                ? 'bg-red-600 text-white hover:bg-red-700 pulse-glow'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
        </div>

        <button
          onClick={clearTranscriptions}
          className="p-2 text-text-muted hover:text-white hover:bg-background-tertiary rounded-xl transition-all"
          title="Очистить транскрипции"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Настройки */}
      <div className="flex items-center space-x-3 mb-4 p-3 bg-background-tertiary rounded-lg">
        <input
          type="checkbox"
          id="autoSendToChat"
          checked={autoSendToChat}
          onChange={(e) => setAutoSendToChat(e.target.checked)}
          className="w-4 h-4 text-primary-600 bg-background-secondary border-white/20 rounded focus:ring-primary-500"
        />
        <label htmlFor="autoSendToChat" className="text-sm text-white cursor-pointer">
          Автоматически отправлять в чат
        </label>
      </div>

      {/* Индикатор записи */}
      {isRecording && (
        <div className="flex items-center space-x-2 mb-4 p-2 bg-red-900/20 border border-red-500/30 rounded-lg">
          <div className="w-3 h-3 bg-red-500 rounded-full recording-pulse"></div>
          <span className="text-red-400 text-sm font-medium">Идет запись и транскрипция...</span>
        </div>
      )}

      {/* История транскрипций */}
      <div className="space-y-3 max-h-60 overflow-y-auto">
        <h4 className="text-sm font-medium text-white">История транскрипций</h4>
        
        {transcriptions.length === 0 ? (
          <div className="text-center text-text-muted py-6">
            <Volume2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Транскрипций пока нет</p>
            <p className="text-xs">Подключитесь к серверу и начните запись</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transcriptions.map((transcription, index) => (
              <div
                key={index}
                className="bg-background-tertiary border border-white/5 rounded-lg p-3 hover:border-white/10 transition-all"
              >
                <p className="text-white text-sm mb-2">{transcription.text}</p>
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>Клиент: {transcription.client_id}</span>
                  <span>{new Date(transcription.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Инструкция */}
      <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <p className="text-blue-200 text-xs">
          💡 Whisper автоматически определяет паузы в речи и отправляет аудио на сервер для транскрипции.
          Включите "Автоматически отправлять в чат" чтобы транскрипции попадали в чат собеседования.
        </p>
      </div>
    </div>
  )
}

export default WhisperTranscription
