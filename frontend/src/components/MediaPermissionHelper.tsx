import React, { useState, useEffect } from 'react'
import { Camera, Mic, Shield, Check, X } from 'lucide-react'

interface MediaPermissionHelperProps {
  show: boolean
  onClose: () => void
}

const MediaPermissionHelper: React.FC<MediaPermissionHelperProps> = ({ show, onClose }) => {
  const [step, setStep] = useState(1)

  useEffect(() => {
    if (show) {
      setStep(1)
    }
  }, [show])

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background-secondary border border-white/10 rounded-2xl p-6 max-w-lg w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Разрешения для медиа устройств</h2>
          <p className="text-text-muted">
            Для участия в видео-собеседовании нужен доступ к камере и микрофону
          </p>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
              <h3 className="text-blue-400 font-medium mb-2 flex items-center space-x-2">
                <Camera className="w-4 h-4" />
                <span>Сейчас браузер запросит разрешения</span>
              </h3>
              <p className="text-blue-200 text-sm">
                В верхней части браузера появится запрос на доступ к камере и микрофону. Нажмите "Разрешить".
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-green-400">
                <Check className="w-4 h-4" />
                <span className="text-sm">Разрешить</span>
              </div>
              <div className="flex items-center space-x-2 text-red-400">
                <X className="w-4 h-4" />
                <span className="text-sm">Заблокировать (не выбирайте)</span>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setStep(2)}
                className="btn-primary flex-1"
              >
                Понятно, запросить разрешения
              </button>
              <button
                onClick={onClose}
                className="btn-secondary"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4">
              <h3 className="text-yellow-400 font-medium mb-2">Если разрешения заблокированы</h3>
              <ol className="text-yellow-200 text-sm space-y-1 list-decimal list-inside">
                <li>Нажмите на иконку замка/камеры в адресной строке</li>
                <li>Выберите "Разрешить" для камеры и микрофона</li>
                <li>Перезагрузите страницу</li>
              </ol>
            </div>

            <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4">
              <h3 className="text-green-400 font-medium mb-2 flex items-center space-x-2">
                <Mic className="w-4 h-4" />
                <span>Что мы будем использовать</span>
              </h3>
              <ul className="text-green-200 text-sm space-y-1 list-disc list-inside">
                <li>Камера: для видеосвязи с AI HR</li>
                <li>Микрофон: для общения и транскрипции речи</li>
                <li>Данные не записываются и не передаются третьим лицам</li>
              </ul>
            </div>

            <button
              onClick={onClose}
              className="btn-primary w-full"
            >
              Закрыть
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default MediaPermissionHelper
