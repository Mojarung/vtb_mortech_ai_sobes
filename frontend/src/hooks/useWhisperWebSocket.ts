import { useState, useRef, useCallback, useEffect } from 'react'

interface TranscriptionResult {
  text: string
  timestamp: string
  client_id: string
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

interface UseWhisperWebSocketReturn {
  connectionStatus: ConnectionStatus
  isRecording: boolean
  transcriptions: TranscriptionResult[]
  connect: () => Promise<void>
  disconnect: () => void
  startRecording: () => Promise<void>
  stopRecording: () => void
  clearTranscriptions: () => void
  error: string | null
}

const useWhisperWebSocket = (serverUrl: string = 'wss://mojarung-whisper-websocket-6dd5.twc1.net'): UseWhisperWebSocketReturn => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [isRecording, setIsRecording] = useState(false)
  const [transcriptions, setTranscriptions] = useState<TranscriptionResult[]>([])
  const [error, setError] = useState<string | null>(null)

  console.log('🎤 [WHISPER] 🔄 Инициализация useWhisperWebSocket хука')
  console.log('🎤 [WHISPER] ├─ Сервер по умолчанию:', serverUrl)
  console.log('🎤 [WHISPER] ├─ Минимальная длительность тишины:', 1500, 'мс')
  console.log('🎤 [WHISPER] └─ Максимальный размер аудио файла: 10MB')

  const wsRef = useRef<WebSocket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const clientIdRef = useRef<string | null>(null)
  const isProcessingRef = useRef(false)
  const silenceStartRef = useRef(0)
  const voiceActivityTimerRef = useRef<number | null>(null)

  const minSilenceDuration = 1500 // 1.5 секунды тишины

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    try {
      setConnectionStatus('connecting')
      setError(null)

      wsRef.current = new WebSocket(serverUrl)

      wsRef.current.onopen = () => {
        setConnectionStatus('connected')
        console.log('🎤 [WHISPER] WebSocket соединение установлено')
        console.log('🎤 [WHISPER] Сервер:', serverUrl)
      }

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('🎤 [WHISPER] Получено сообщение:', data)
          
          switch (data.type) {
            case 'connection_established':
              clientIdRef.current = data.client_id
              console.log(`🎤 [WHISPER] ✅ Подключен как клиент: ${data.client_id}`)
              console.log(`🎤 [WHISPER] Готов к приему аудио`)
              break
              
            case 'transcription':
              console.log('🎤 [WHISPER] 📝 ТРАНСКРИПЦИЯ ПОЛУЧЕНА:')
              console.log(`🎤 [WHISPER] ├─ Текст: "${data.text}"`)
              console.log(`🎤 [WHISPER] ├─ Клиент: ${data.client_id}`)
              console.log(`🎤 [WHISPER] └─ Время: ${new Date(data.timestamp).toLocaleTimeString()}`)
              
              setTranscriptions(prev => {
                const newTranscription = {
                  text: data.text,
                  timestamp: data.timestamp,
                  client_id: data.client_id
                }
                console.log('🎤 [WHISPER] 💾 Сохранена транскрипция, всего:', prev.length + 1)
                return [newTranscription, ...prev]
              })
              break
              
            case 'error':
              setError(data.message)
              console.error('🎤 [WHISPER] ❌ ОШИБКА СЕРВЕРА:', data.message)
              console.error('🎤 [WHISPER] Полные данные ошибки:', data)
              break
              
            case 'pong':
              console.log('🎤 [WHISPER] 🏓 Получен pong от сервера - соединение активно')
              break
              
            default:
              console.log('🎤 [WHISPER] ❓ Неизвестный тип сообщения:', data.type)
              console.log('🎤 [WHISPER] Данные:', data)
          }
        } catch (err) {
          console.error('🎤 [WHISPER] ❌ Ошибка парсинга JSON:', err)
          console.error('🎤 [WHISPER] Исходные данные:', event.data)
        }
      }

      wsRef.current.onclose = (event) => {
        setConnectionStatus('disconnected')
        console.log('🎤 [WHISPER] 🔌 WebSocket соединение закрыто')
        console.log('🎤 [WHISPER] Код:', event.code, 'Причина:', event.reason)
        if (isRecording) {
          console.log('🎤 [WHISPER] ⏹️ Останавливаем запись из-за закрытия соединения')
          stopRecording()
        }
      }

      wsRef.current.onerror = (error) => {
        console.error('🎤 [WHISPER] ❌ Ошибка WebSocket:', error)
        console.error('🎤 [WHISPER] Статус готовности:', wsRef.current?.readyState)
        setConnectionStatus('error')
        setError('Ошибка подключения к серверу транскрипции')
      }

    } catch (err) {
      console.error('Ошибка при подключении к Whisper:', err)
      setConnectionStatus('error')
      setError('Не удалось подключиться к серверу транскрипции')
    }
  }, [serverUrl])

  const disconnect = useCallback(() => {
    if (isRecording) {
      stopRecording()
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    setConnectionStatus('disconnected')
    clientIdRef.current = null
  }, [])

  const sendAudioForTranscription = useCallback(async (audioBlob: Blob) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('🎤 [WHISPER] ⚠️ WebSocket не подключен, пропускаем отправку аудио')
      console.warn('🎤 [WHISPER] Статус соединения:', wsRef.current?.readyState)
      return
    }

    try {
      console.log('🎤 [WHISPER] 📦 Подготовка аудио для отправки...')
      console.log('🎤 [WHISPER] ├─ Размер файла:', audioBlob.size, 'байт')
      console.log('🎤 [WHISPER] ├─ Тип:', audioBlob.type)
      
      // Проверяем размер
      if (audioBlob.size === 0) {
        console.warn('🎤 [WHISPER] ⚠️ Пустой аудио файл, пропускаем')
        return
      }
      
      if (audioBlob.size > 10 * 1024 * 1024) {
        console.warn('🎤 [WHISPER] ⚠️ Аудио файл слишком большой (>10MB), пропускаем')
        return
      }

      // Конвертируем в base64
      console.log('🎤 [WHISPER] 🔄 Конвертация в base64...')
      const startTime = performance.now()
      
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const result = reader.result as string
          const base64 = result.split(',')[1]
          resolve(base64)
        }
        reader.onerror = reject
        reader.readAsDataURL(audioBlob)
      })
      
      const conversionTime = performance.now() - startTime
      console.log('🎤 [WHISPER] ✅ Base64 конвертация завершена за', conversionTime.toFixed(1), 'мс')
      console.log('🎤 [WHISPER] ├─ Размер base64:', base64Audio.length, 'символов')

      const message = {
        type: 'audio',
        audio_data: base64Audio
      }

      console.log('🎤 [WHISPER] 📤 Отправка аудио на сервер...')
      wsRef.current.send(JSON.stringify(message))
      console.log('🎤 [WHISPER] ✅ Аудио успешно отправлено на Whisper сервер')
      console.log('🎤 [WHISPER] ├─ Исходный размер:', audioBlob.size, 'байт')
      console.log('🎤 [WHISPER] └─ Размер JSON:', JSON.stringify(message).length, 'символов')

    } catch (error) {
      console.error('🎤 [WHISPER] ❌ Ошибка при отправке аудио:', error)
      console.error('🎤 [WHISPER] Детали blob:', {
        size: audioBlob.size,
        type: audioBlob.type
      })
      setError('Ошибка при отправке аудио для транскрипции')
    }
  }, [])

  const startVoiceActivityDetection = useCallback(() => {
    if (!analyserRef.current) {
      console.error('🎤 [WHISPER] ❌ Анализатор аудио не инициализирован')
      return
    }

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    let lastVoiceLog = 0
    let voiceDetectionCount = 0

    console.log('🎤 [WHISPER] 🎙️ Запуск детекции голосовой активности')
    console.log('🎤 [WHISPER] ├─ Размер буфера анализа:', dataArray.length)
    console.log('🎤 [WHISPER] ├─ Порог детекции речи:', 20)
    console.log('🎤 [WHISPER] └─ Длительность паузы для остановки:', minSilenceDuration, 'мс')

    const detectVoiceActivity = () => {
      if (!isRecording || !analyserRef.current) return

      analyserRef.current.getByteFrequencyData(dataArray)

      // Вычисляем средний уровень громкости
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i]
      }
      const average = sum / dataArray.length
      voiceDetectionCount++

      const voiceThreshold = 20 // Порог для определения речи

      if (average > voiceThreshold) {
        // Обнаружена речь, сбрасываем таймер тишины
        if (silenceStartRef.current > 0) {
          const silenceDuration = Date.now() - silenceStartRef.current
          console.log('🎤 [WHISPER] 🗣️ Обнаружена речь после', silenceDuration, 'мс тишины')
        }
        silenceStartRef.current = 0

        // Логируем каждые 2 секунды при детекции речи
        if (Date.now() - lastVoiceLog > 2000) {
          console.log('🎤 [WHISPER] 🗣️ Активная речь | Громкость:', Math.round(average))
          lastVoiceLog = Date.now()
        }
      } else {
        // Тишина
        if (silenceStartRef.current === 0) {
          silenceStartRef.current = Date.now()
          console.log('🎤 [WHISPER] 🤫 Начало тишины | Громкость:', Math.round(average))
        } else if (Date.now() - silenceStartRef.current > minSilenceDuration) {
          // Достаточно долгая пауза - останавливаем текущую запись для обработки
          const silenceDuration = Date.now() - silenceStartRef.current
          console.log('🎤 [WHISPER] ⏸️ ДОЛГАЯ ПАУЗА ОБНАРУЖЕНА!')
          console.log('🎤 [WHISPER] ├─ Длительность тишины:', silenceDuration, 'мс')
          console.log('🎤 [WHISPER] ├─ Останавливаем запись для обработки...')
          
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            console.log('🎤 [WHISPER] ⏹️ Остановка MediaRecorder')
            mediaRecorderRef.current.stop()
          }
          silenceStartRef.current = 0
        }
      }

      // Продолжаем мониторинг
      if (isRecording) {
        voiceActivityTimerRef.current = requestAnimationFrame(detectVoiceActivity)
      } else {
        console.log('🎤 [WHISPER] 🛑 Остановка детекции голосовой активности')
        console.log('🎤 [WHISPER] Всего циклов анализа:', voiceDetectionCount)
      }
    }

    detectVoiceActivity()
  }, [isRecording, minSilenceDuration])

  const startRecording = useCallback(async () => {
    console.log('🎤 [WHISPER] 🎬 НАЧАЛО ЗАПИСИ...')
    
    try {
      // Получаем доступ к микрофону
      console.log('🎤 [WHISPER] 🎙️ Запрос доступа к микрофону...')
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      console.log('🎤 [WHISPER] ✅ Доступ к микрофону получен')
      console.log('🎤 [WHISPER] ├─ Количество треков:', stream.getAudioTracks().length)
      
      const audioTrack = stream.getAudioTracks()[0]
      if (audioTrack) {
        console.log('🎤 [WHISPER] ├─ Настройки аудио трека:', audioTrack.getSettings())
        console.log('🎤 [WHISPER] └─ Ограничения:', audioTrack.getConstraints())
      }

      streamRef.current = stream

      // Создаем AudioContext для анализа громкости
      console.log('🎤 [WHISPER] 🔊 Создание AudioContext...')
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      analyserRef.current = audioContextRef.current.createAnalyser()
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream)

      analyserRef.current.fftSize = 512
      analyserRef.current.smoothingTimeConstant = 0.3

      console.log('🎤 [WHISPER] ├─ Sample rate:', audioContextRef.current.sampleRate, 'Hz')
      console.log('🎤 [WHISPER] ├─ FFT size:', analyserRef.current.fftSize)
      console.log('🎤 [WHISPER] └─ Frequency bin count:', analyserRef.current.frequencyBinCount)

      microphoneRef.current.connect(analyserRef.current)

      // Настраиваем MediaRecorder
      console.log('🎤 [WHISPER] 📼 Настройка MediaRecorder...')
      
      let mimeType = 'audio/webm;codecs=opus'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm'
        console.log('🎤 [WHISPER] ⚠️ Opus не поддерживается, используем', mimeType)
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4'
        console.log('🎤 [WHISPER] ⚠️ WebM не поддерживается, используем', mimeType)
      }
      
      console.log('🎤 [WHISPER] ├─ Итоговый MIME type:', mimeType)

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType })
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('🎤 [WHISPER] 📦 Получен chunk аудио:', event.data.size, 'байт')
          audioChunksRef.current.push(event.data)
        } else {
          console.warn('🎤 [WHISPER] ⚠️ Получен пустой chunk')
        }
      }

      mediaRecorderRef.current.onstop = async () => {
        console.log('🎤 [WHISPER] ⏹️ MediaRecorder остановлен')
        console.log('🎤 [WHISPER] ├─ Chunks собрано:', audioChunksRef.current.length)
        console.log('🎤 [WHISPER] ├─ Обработка в процессе:', isProcessingRef.current)
        
        if (audioChunksRef.current.length > 0 && !isProcessingRef.current) {
          isProcessingRef.current = true
          console.log('🎤 [WHISPER] 🔄 Начинаем обработку аудио...')
          
          try {
            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
            console.log('🎤 [WHISPER] 📦 Создан blob:', audioBlob.size, 'байт,', audioBlob.type)
            await sendAudioForTranscription(audioBlob)
          } catch (error) {
            console.error('🎤 [WHISPER] ❌ Ошибка при обработке аудио:', error)
          } finally {
            isProcessingRef.current = false
            console.log('🎤 [WHISPER] ✅ Обработка аудио завершена')
          }
        }
        audioChunksRef.current = []

        // Если запись все еще активна, начинаем новый сегмент
        if (isRecording) {
          console.log('🎤 [WHISPER] 🔄 Запись продолжается, начинаем новый сегмент через 100мс...')
          setTimeout(() => {
            if (isRecording && mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
              console.log('🎤 [WHISPER] ▶️ Запуск нового сегмента записи')
              mediaRecorderRef.current.start()
            }
          }, 100)
        }
      }

      setIsRecording(true)
      console.log('🎤 [WHISPER] ▶️ Запуск MediaRecorder...')
      mediaRecorderRef.current.start()
      
      console.log('🎤 [WHISPER] 🎙️ Запуск детекции голосовой активности...')
      startVoiceActivityDetection()

      console.log('🎤 [WHISPER] ✅ ЗАПИСЬ И ТРАНСКРИПЦИЯ УСПЕШНО НАЧАТЫ!')

    } catch (error) {
      console.error('🎤 [WHISPER] ❌ ОШИБКА ПРИ ЗАПУСКЕ ЗАПИСИ:', error)
      console.error('🎤 [WHISPER] Детали ошибки:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
      setError('Не удалось получить доступ к микрофону')
    }
  }, [sendAudioForTranscription, startVoiceActivityDetection])

  const stopRecording = useCallback(() => {
    console.log('🎤 [WHISPER] 🛑 ОСТАНОВКА ЗАПИСИ...')
    
    setIsRecording(false)

    if (voiceActivityTimerRef.current) {
      console.log('🎤 [WHISPER] ⏹️ Остановка детекции голосовой активности')
      cancelAnimationFrame(voiceActivityTimerRef.current)
      voiceActivityTimerRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      console.log('🎤 [WHISPER] ⏹️ Остановка MediaRecorder, состояние:', mediaRecorderRef.current.state)
      mediaRecorderRef.current.stop()
    } else {
      console.log('🎤 [WHISPER] ℹ️ MediaRecorder уже неактивен или не существует')
    }

    if (streamRef.current) {
      const tracks = streamRef.current.getTracks()
      console.log('🎤 [WHISPER] 🔇 Остановка аудио треков, количество:', tracks.length)
      tracks.forEach((track, index) => {
        console.log(`🎤 [WHISPER] ├─ Остановка трека ${index + 1}: ${track.kind}, состояние:`, track.readyState)
        track.stop()
      })
      streamRef.current = null
    }

    if (audioContextRef.current) {
      console.log('🎤 [WHISPER] 🔊 Закрытие AudioContext, состояние:', audioContextRef.current.state)
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    // Сброс референсов анализатора
    analyserRef.current = null
    microphoneRef.current = null
    isProcessingRef.current = false
    audioChunksRef.current = []

    console.log('🎤 [WHISPER] ✅ ЗАПИСЬ ПОЛНОСТЬЮ ОСТАНОВЛЕНА И РЕСУРСЫ ОСВОБОЖДЕНЫ')
  }, [])

  const clearTranscriptions = useCallback(() => {
    console.log('🎤 [WHISPER] 🗑️ Очистка всех транскрипций')
    console.log('🎤 [WHISPER] ├─ Было транскрипций:', transcriptions.length)
    setTranscriptions([])
    console.log('🎤 [WHISPER] ✅ Транскрипции очищены')
  }, [transcriptions.length])

  // Ping для поддержания соединения
  useEffect(() => {
    if (connectionStatus !== 'connected') {
      console.log('🎤 [WHISPER] 🏓 Ping отключен - нет соединения')
      return
    }

    console.log('🎤 [WHISPER] 🏓 Запуск ping каждые 30 секунд для поддержания соединения')
    
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log('🎤 [WHISPER] 🏓 Отправка ping на сервер')
        wsRef.current.send(JSON.stringify({ type: 'ping' }))
      } else {
        console.warn('🎤 [WHISPER] ⚠️ Невозможно отправить ping - соединение не открыто')
        console.warn('🎤 [WHISPER] Состояние WebSocket:', wsRef.current?.readyState)
      }
    }, 30000)

    return () => {
      console.log('🎤 [WHISPER] 🏓 Остановка ping интервала')
      clearInterval(pingInterval)
    }
  }, [connectionStatus])

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      console.log('🎤 [WHISPER] 🧹 РАЗМОНТИРОВАНИЕ КОМПОНЕНТА - очистка ресурсов...')
      console.log('🎤 [WHISPER] ├─ Остановка записи...')
      stopRecording()
      console.log('🎤 [WHISPER] ├─ Отключение от сервера...')  
      disconnect()
      console.log('🎤 [WHISPER] ✅ Размонтирование завершено')
    }
  }, [stopRecording, disconnect])

  return {
    connectionStatus,
    isRecording,
    transcriptions,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    clearTranscriptions,
    error
  }
}

export default useWhisperWebSocket
