import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Camera,
  Mic,
  MicOff,
  VideoOff,
  Phone,
  Clock,
  Users,
  MessageCircle,
  AlertTriangle,
  Shield,
} from 'lucide-react';
import ChatSection from './ChatSection';
import InterviewTimer from './InterviewTimer';
import MediaPermissionHelper from './MediaPermissionHelper';
import useWebSocket from '../hooks/useWebSocket';
import { formatTime } from '../utils/time';
import {
  usePipecatClient,
  PipecatClientVideo,
  PipecatClientProvider,
  PipecatClientAudio, // Добавь это!
} from '@pipecat-ai/client-react';
import { PipecatClient } from '@pipecat-ai/client-js';
import { SmallWebRTCTransport } from '@pipecat-ai/small-webrtc-transport';

// Исправленный URL - убери /api/offer
const PIPECAT_BACKEND_URL = 'http://0.0.0.0:7860/api/offer';

interface InterviewData {
  id: number;
  candidate_name: string;
  position: string;
  status: string;
  started_at?: string;
}

const InterviewRoomInternal = () => {
  const { interviewId } = useParams<{ interviewId: string }>();
  const [interview, setInterview] = useState<InterviewData | null>(null);

  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { messages, sendMessage, connectionStatus } = useWebSocket(
    interview?.id || 0
  );

  const client = usePipecatClient();

  // Исправленная функция подключения
  const handleConnect = useCallback(async () => {
    if (!client || isConnecting || isConnected) {
      return;
    }

    try {
      setIsConnecting(true);
      setConnectionError(null);

      // Правильный способ подключения к SmallWebRTC
      await client.connect({
        webrtcUrl: PIPECAT_BACKEND_URL,
      });

      setIsConnected(true);
      console.log('Успешно подключен к Pipecat боту');
    } catch (error) {
      console.error('Ошибка подключения к боту:', error);
      setConnectionError('Не удалось подключиться к боту AI');
    } finally {
      setIsConnecting(false);
    }
  }, [client, isConnecting, isConnected, interviewId]);

  const handleDisconnect = useCallback(async () => {
    if (client && isConnected) {
      try {
        await client.disconnect();
        setIsConnected(false);
      } catch (error) {
        console.error('Ошибка отключения:', error);
      }
    }
  }, [client, isConnected]);

  // Отключение при размонтировании компонента
  useEffect(() => {
    return () => {
      handleDisconnect();
    };
  }, [handleDisconnect]);

  // Остальной код без изменений...
  useEffect(() => {
    const loadInterview = async () => {
      if (!interviewId) return;

      try {
        const response = await fetch(
          `http://localhost:8000/api/v1/interviews/${interviewId}`
        );
        if (response.ok) {
          const data = await response.json();
          setInterview(data);

          if (data.status === 'started' && data.started_at) {
            setInterviewStarted(true);
            setStartTime(new Date(data.started_at));
          }
        } else {
          setConnectionError('Собеседование не найдено');
        }
      } catch (error) {
        console.error('Ошибка загрузки интервью:', error);
        setConnectionError('Ошибка подключения к серверу');
      }
    };

    loadInterview();
  }, [interviewId]);

  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaPermissionDenied, setMediaPermissionDenied] = useState(false);
  const [showPermissionHelper, setShowPermissionHelper] = useState(false);

  // Остальные функции без изменений...
  const initCamera = async () => {
    try {
      setMediaError(null);
      setMediaPermissionDenied(false);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices API не поддерживается в этом браузере');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      console.log('Камера и микрофон успешно подключены');
    } catch (error: any) {
      console.error('Ошибка доступа к камере/микрофону:', error);

      let errorMessage = 'Неизвестная ошибка доступа к медиа устройствам';
      let isDenied = false;

      if (
        error.name === 'NotAllowedError' ||
        error.name === 'PermissionDeniedError'
      ) {
        errorMessage =
          'Доступ к камере и микрофону заблокирован. Разрешите доступ в браузере.';
        isDenied = true;
      } else if (
        error.name === 'NotFoundError' ||
        error.name === 'DevicesNotFoundError'
      ) {
        errorMessage =
          'Камера или микрофон не найдены. Проверьте подключение устройств.';
      } else if (
        error.name === 'NotReadableError' ||
        error.name === 'TrackStartError'
      ) {
        errorMessage =
          'Устройства заняты другим приложением. Закройте другие программы, использующие камеру/микрофон.';
      } else if (
        error.name === 'OverconstrainedError' ||
        error.name === 'ConstraintNotSatisfiedError'
      ) {
        errorMessage = 'Параметры камеры не поддерживаются устройством.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage =
          'HTTPS соединение требуется для доступа к камере в этом браузере.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setMediaError(errorMessage);
      setMediaPermissionDenied(isDenied);
    }
  };

  useEffect(() => {
    initCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const toggleVideo = useCallback(() => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  }, []);

  const toggleAudio = useCallback(() => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioOn(audioTrack.enabled);
      }
    }
  }, []);

  const startInterview = async () => {
    if (!interview) return;

    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/interviews/${interview.id}/start`,
        {
          method: 'PATCH',
        }
      );

      if (response.ok) {
        setInterviewStarted(true);
        setStartTime(new Date());
      }
    } catch (error) {
      console.error('Ошибка начала интервью:', error);
    }
  };

  const endInterview = async () => {
    if (!interview) return;

    try {
      await handleDisconnect();
      
      const response = await fetch(
        `http://localhost:8000/api/v1/interviews/${interview.id}/finish`,
        {
          method: 'PATCH',
        }
      );

      if (response.ok) {
        alert('Собеседование завершено. Транскрипция сохранена.');
      }
    } catch (error) {
      console.error('Ошибка завершения интервью:', error);
    }
  };

  // Остальной render код остается таким же, но добавь индикатор подключения к боту
  if (connectionError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card max-w-md text-center">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Ошибка</h2>
          <p className="text-text-muted mb-4">{connectionError}</p>
          {connectionError.includes('боту') && (
            <button
              onClick={handleConnect}
              className="btn-primary"
              disabled={isConnecting}
            >
              {isConnecting ? 'Переподключение...' : 'Переподключиться'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Остальной код остается без изменений, но добавь в header информацию о боте:
  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <header className="bg-background-secondary border-b border-white/10 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-xl font-semibold text-white">Собеседование</h1>
            <p className="text-text-muted text-sm">
              {interview?.candidate_name} • {interview?.position}
            </p>
          </div>

          {/* Статус подключения к боту */}
          <div className="flex items-center space-x-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected
                  ? 'bg-green-500'
                  : isConnecting
                  ? 'bg-yellow-500 animate-pulse'
                  : 'bg-red-500'
              }`}
            ></div>
            <span className="text-xs text-text-muted">
              AI бот: {isConnected ? 'Активен' : isConnecting ? 'Подключение...' : 'Отключен'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 text-text-muted">
            <Clock className="w-4 h-4" />
            <InterviewTimer startTime={startTime} isRunning={interviewStarted} />
          </div>

          <button
            onClick={() => setShowChat(!showChat)}
            className={`p-2 rounded-xl transition-all ${
              showChat
                ? 'bg-primary-600 text-white'
                : 'bg-background-tertiary text-text-muted hover:text-white hover:bg-background-tertiary/80'
            }`}
          >
            <MessageCircle className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div
          className={`${
            showChat ? 'w-2/3' : 'w-full'
          } transition-all duration-300 flex`}
        >
          <div className="w-1/2 h-full">
            <PipecatClientVideo participant="bot" />
          </div>
          <div className="w-1/2 h-full">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover bg-black"
            />
          </div>
        </div>

        {showChat && (
          <div className="w-1/3 border-l border-white/10 bg-background-secondary transition-all duration-300">
            <ChatSection
              messages={messages}
              onSendMessage={sendMessage}
              interviewId={interview?.id || 0}
            />
          </div>
        )}
      </div>

      <footer className="bg-background-secondary border-t border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-text-muted" />
              <span className="text-sm text-text-muted">2 участника</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={toggleVideo}
              className={`p-3 rounded-xl transition-all ${
                isVideoOn
                  ? 'bg-background-tertiary text-white hover:bg-white/10'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {isVideoOn ? (
                <Camera className="w-5 h-5" />
              ) : (
                <VideoOff className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={toggleAudio}
              className={`p-3 rounded-xl transition-all ${
                isAudioOn
                  ? 'bg-background-tertiary text-white hover:bg-white/10'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {isAudioOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex items-center space-x-3">
            {!interviewStarted ? (
              !isConnected ? (
                <button
                  onClick={handleConnect}
                  className="btn-primary"
                  disabled={isConnecting || !interview}
                >
                  {isConnecting ? 'Подключение...' : 'Подключиться к AI ассистенту'}
                </button>
              ) : (
                <button
                  onClick={startInterview}
                  className="btn-primary"
                  disabled={!isConnected}
                >
                  Начать собеседование
                </button>
              )
            ) : (
              <button
                onClick={endInterview}
                className="btn-danger flex items-center space-x-2"
              >
                <Phone className="w-4 h-4" />
                <span>Завершить</span>
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Добавь PipecatClientAudio для воспроизведения звука бота */}
      <PipecatClientAudio />
      
      <MediaPermissionHelper
        show={showPermissionHelper}
        onClose={() => setShowPermissionHelper(false)}
      />
    </div>
  );
};

const client = new PipecatClient({
  transport: new SmallWebRTCTransport({
  }),
  enableCam: false, // Default camera off
  enableMic: true, // Default microphone on
  callbacks: {
    // Event handlers
  },
});

const InterviewRoom = () => (
  <PipecatClientProvider client={client}>
    <InterviewRoomInternal />
  </PipecatClientProvider>
);

export default InterviewRoom;
