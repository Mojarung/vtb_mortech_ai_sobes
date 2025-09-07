import { RefObject } from 'react'
import { User, Bot, Camera, AlertTriangle } from 'lucide-react'

interface VideoSectionProps {
  videoRef: RefObject<HTMLVideoElement>
  isVideoOn: boolean
  isAudioOn: boolean
  interviewStarted: boolean
  mediaError?: string | null
  onRetryCamera?: () => void
}

const VideoSection = ({ videoRef, isVideoOn, isAudioOn, interviewStarted, mediaError, onRetryCamera }: VideoSectionProps) => {
  return (
    <div className="h-full bg-background-secondary relative">
      {/* Основная видео область */}
      <div className="h-full flex">
        {/* Видео кандидата */}
        <div className="flex-1 relative">
          {mediaError ? (
            <div className="w-full h-full bg-black flex items-center justify-center">
              <div className="text-center max-w-md p-4">
                <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-white font-medium mb-2">Проблема с камерой</h3>
                <p className="text-text-muted text-sm mb-4">{mediaError}</p>
                {onRetryCamera && (
                  <button
                    onClick={onRetryCamera}
                    className="btn-primary text-sm flex items-center space-x-2 mx-auto"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Повторить</span>
                  </button>
                )}
              </div>
            </div>
          ) : isVideoOn ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover bg-black rounded-l-none"
            />
          ) : (
            <div className="w-full h-full bg-black flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-10 h-10 text-white" />
                </div>
                <p className="text-text-muted">Камера выключена</p>
              </div>
            </div>
          )}
          
          {/* Индикаторы статуса */}
          <div className="absolute bottom-4 left-4 flex items-center space-x-2">
            <div className="bg-black/70 px-3 py-1 rounded-lg text-sm text-white flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isAudioOn ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>Вы</span>
            </div>
          </div>
        </div>
        
        {/* Видео AI HR (заглушка) */}
        <div className="flex-1 relative border-l border-white/10">
          <div className="w-full h-full bg-gradient-to-br from-primary-900/50 to-primary-800/30 flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4 pulse-glow">
                <Bot className="w-12 h-12 text-white" />
              </div>
              <p className="text-white font-medium mb-2">AI HR Assistant</p>
              <p className="text-text-muted text-sm">
                {interviewStarted ? 'Ведет собеседование...' : 'Ожидает начала собеседования'}
              </p>
            </div>
          </div>
          
          {/* Статус AI */}
          <div className="absolute bottom-4 right-4">
            <div className="bg-black/70 px-3 py-1 rounded-lg text-sm text-white flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${interviewStarted ? 'bg-green-500 recording-pulse' : 'bg-yellow-500'}`}></div>
              <span>AI HR</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Оверлей для статуса */}
      {!interviewStarted && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-white mb-2">Ожидание начала собеседования</h2>
            <p className="text-text-muted">Нажмите "Начать собеседование" для запуска</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default VideoSection
