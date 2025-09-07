class WhisperClient {
  private ws: WebSocket | null = null
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private isRecording = false
  private isConnected = false
  private clientId: string | null = null
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private microphone: MediaStreamAudioSourceNode | null = null
  private dataArray: Uint8Array | null = null
  private silenceStart = 0
  private minSilenceDuration = 1500 // 1.5 секунды тишины
  private isProcessing = false
  private voiceActivityTimer: number | null = null

  public onTranscription: ((text: string) => void) | null = null
  public onConnectionChange: ((connected: boolean) => void) | null = null

  constructor(private serverUrl: string) {
    // Автоматически подключаемся при создании
    this.connect()
  }

  async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(this.serverUrl)

        this.ws.onopen = () => {
          console.log('Подключение к Whisper серверу установлено')
          this.isConnected = true
          this.onConnectionChange?.(true)
          resolve(true)
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(JSON.parse(event.data))
        }

        this.ws.onclose = () => {
          console.log('Соединение с Whisper сервером закрыто')
          this.isConnected = false
          this.onConnectionChange?.(false)
          if (this.isRecording) {
            this.stopRecording()
          }
        }

        this.ws.onerror = (error) => {
          console.error('Ошибка WebSocket:', error)
          this.isConnected = false
          this.onConnectionChange?.(false)
          resolve(false)
        }
      } catch (error) {
        console.error('Ошибка при подключении к Whisper:', error)
        resolve(false)
      }
    })
  }

  private handleMessage(data: any) {
    console.log('Получено сообщение от Whisper:', data)

    switch (data.type) {
      case 'connection_established':
        this.clientId = data.client_id
        console.log(`Подключен как ${data.client_id}`)
        break

      case 'transcription':
        if (this.onTranscription && data.text && data.text.trim()) {
          this.onTranscription(data.text.trim())
        }
        break

      case 'error':
        console.error('Ошибка Whisper сервера:', data.message)
        break

      case 'pong':
        console.log('Получен pong от Whisper сервера')
        break
    }
  }

  async startRecording(): Promise<boolean> {
    if (!this.isConnected || this.isRecording) {
      return false
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      // Создаем AudioContext для анализа громкости
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      this.analyser = this.audioContext.createAnalyser()
      this.microphone = this.audioContext.createMediaStreamSource(stream)

      this.analyser.fftSize = 512
      this.analyser.smoothingTimeConstant = 0.3
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount)

      this.microphone.connect(this.analyser)

      // Настраиваем MediaRecorder
      let mimeType = 'audio/webm;codecs=opus'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm'
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4'
      }

      this.mediaRecorder = new MediaRecorder(stream, { mimeType })
      this.audioChunks = []

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }

      this.mediaRecorder.onstop = async () => {
        if (this.audioChunks.length > 0 && !this.isProcessing) {
          this.isProcessing = true
          try {
            const audioBlob = new Blob(this.audioChunks, { type: mimeType })
            await this.sendAudioForTranscription(audioBlob)
          } catch (error) {
            console.error('Ошибка при обработке аудио:', error)
          } finally {
            this.isProcessing = false
          }
        }
        this.audioChunks = []

        // Если запись все еще активна, начинаем новый сегмент
        if (this.isRecording) {
          setTimeout(() => {
            if (this.isRecording && this.mediaRecorder && this.mediaRecorder.state === 'inactive') {
              this.mediaRecorder.start()
            }
          }, 100)
        }
      }

      this.isRecording = true
      this.mediaRecorder.start()
      this.startVoiceActivityDetection()

      console.log('Непрерывная запись с обнаружением пауз началась')
      return true
    } catch (error) {
      console.error('Ошибка при запуске записи:', error)
      return false
    }
  }

  private startVoiceActivityDetection() {
    const detectVoiceActivity = () => {
      if (!this.isRecording || !this.analyser || !this.dataArray) return

      this.analyser.getByteFrequencyData(this.dataArray)

      // Вычисляем средний уровень громкости
      let sum = 0
      for (let i = 0; i < this.dataArray.length; i++) {
        sum += this.dataArray[i]
      }
      const average = sum / this.dataArray.length

      // Порог для определения речи
      const voiceThreshold = 20

      if (average > voiceThreshold) {
        // Обнаружена речь, сбрасываем таймер тишины
        this.silenceStart = 0
      } else {
        // Тишина
        if (this.silenceStart === 0) {
          this.silenceStart = Date.now()
        } else if (Date.now() - this.silenceStart > this.minSilenceDuration) {
          // Достаточно долгая пауза - останавливаем текущую запись для обработки
          if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop()
          }
          this.silenceStart = 0
        }
      }

      // Продолжаем мониторинг
      if (this.isRecording) {
        this.voiceActivityTimer = requestAnimationFrame(detectVoiceActivity)
      }
    }

    detectVoiceActivity()
  }

  stopRecording() {
    this.isRecording = false

    if (this.voiceActivityTimer) {
      cancelAnimationFrame(this.voiceActivityTimer)
      this.voiceActivityTimer = null
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop()
    }

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    console.log('Запись остановлена')
  }

  private async sendAudioForTranscription(audioBlob: Blob) {
    try {
      // Проверяем размер аудио файла
      if (audioBlob.size === 0) {
        console.log('Пустой аудио файл, пропускаем')
        return
      }

      if (audioBlob.size > 10 * 1024 * 1024) { // 10MB лимит
        console.warn('Аудио файл слишком большой, пропускаем')
        return
      }

      // Конвертируем blob в base64
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1]
          resolve(base64)
        }
        reader.onerror = reject
        reader.readAsDataURL(audioBlob)
      })

      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        console.warn('WebSocket не подключен, пропускаем отправку аудио')
        return
      }

      const message = {
        type: 'audio',
        audio_data: base64Audio
      }

      this.ws.send(JSON.stringify(message))
      console.log(`Аудио отправлено на сервер (размер: ${audioBlob.size} байт)`)
    } catch (error) {
      console.error('Ошибка при отправке аудио:', error)
    }
  }

  sendPing() {
    if (this.isConnected && this.ws) {
      this.ws.send(JSON.stringify({ type: 'ping' }))
    }
  }

  disconnect() {
    if (this.isRecording) {
      this.stopRecording()
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.isConnected = false
    this.clientId = null
  }

  get connected(): boolean {
    return this.isConnected
  }

  get recording(): boolean {
    return this.isRecording
  }
}

export default WhisperClient
