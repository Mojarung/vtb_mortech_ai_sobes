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
} from '@pipecat-ai/client-react';
import { PipecatClient } from '@pipecat-ai/client-js';
import { SmallWebRTCTransport } from '@pipecat-ai/small-webrtc-transport';

const PIPECAT_WEBRTC_URL = 'http://localhost:7860/api/offer';

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

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { messages, sendMessage, connectionStatus } = useWebSocket(
    interview?.id || 0
  );

  const client = usePipecatClient();

  const handleConnect = useCallback(async () => {
    if (!client) {
      return;
    }
    await client.connect({ url: PIPECAT_WEBRTC_URL });
  }, [client]);

  useEffect(() => {
    handleConnect();
    return () => {
      client?.disconnect();
    };
  }, [handleConnect, client]);

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

  if (connectionError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card max-w-md text-center">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Ошибка</h2>
          <p className="text-text-muted">{connectionError}</p>
        </div>
      </div>
    );
  }

  if (mediaError && !interview) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card max-w-2xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-red-400 mb-2">
              Проблема с медиа устройствами
            </h2>
            <p className="text-text-muted text-lg">{mediaError}</p>
          </div>

          {mediaPermissionDenied && (
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4 mb-6">
              <h3 className="text-yellow-400 font-medium mb-2">
                🔧 Как разрешить доступ:
              </h3>
              <ol className="text-sm text-yellow-200 space-y-2 list-decimal list-inside">
                <li>
                  Нажмите на иконку замка/камеры в адресной строке браузера
                </li>
                <li>Выберите "Разрешить" для камеры и микрофона</li>
                <li>Обновите страницу или нажмите "Повторить попытку"</li>
              </ol>
            </div>
          )}

          <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 mb-6">
            <h3 className="text-blue-400 font-medium mb-2">
              💡 Возможные решения:
            </h3>
            <ul className="text-sm text-blue-200 space-y-1 list-disc list-inside">
              <li>Перезагрузите страницу (Ctrl+F5 или Cmd+Shift+R)</li>
              <li>
                Закройте другие приложения, использующие камеру (Zoom, Teams,
                Skype)
              </li>
              <li>Проверьте физическое подключение веб-камеры</li>
              <li>Попробуйте другой браузер (Chrome рекомендуется)</li>
              <li>
                Убедитесь, что сайт открыт по HTTPS (для некоторых браузеров)
              </li>
            </ul>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={initCamera}
              className="btn-primary flex-1 flex items-center justify-center space-x-2"
            >
              <Camera className="w-4 h-4" />
              <span>Повторить попытку</span>
            </button>
            <button
              onClick={() => setShowPermissionHelper(true)}
              className="btn-secondary flex items-center space-x-2"
            >
              <Shield className="w-4 h-4" />
              <span>Справка</span>
            </button>
            <button
              onClick={() => {
                setMediaError(null);
              }}
              className="btn-secondary flex-1"
            >
              Продолжить без камеры
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <header className="bg-background-secondary border-b border-white/10 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-xl font-semibold text-white">Собеседование</h1>
            <p className="text-text-muted text-sm">
              {interview.candidate_name} • {interview.position}
            </p>
          </div>

          {mediaError && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg px-3 py-2 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-red-200 text-sm">
                Проблема с камерой/микрофоном
              </span>
              <button
                onClick={() => setShowPermissionHelper(true)}
                className="text-red-400 hover:text-red-300 underline text-sm"
              >
                Справка
              </button>
              <button
                onClick={initCamera}
                className="text-red-400 hover:text-red-300 underline text-sm ml-2"
              >
                Повторить
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 text-text-muted">
            <Clock className="w-4 h-4" />
            <InterviewTimer startTime={startTime} isRunning={interviewStarted} />
          </div>

          <div className="flex items-center space-x-2">
            <div
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-green-500'
                  : connectionStatus === 'connecting'
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
            ></div>
            <span className="text-xs text-text-muted">
              {connectionStatus === 'connected'
                ? 'Подключено'
                : connectionStatus === 'connecting'
                ? 'Подключение...'
                : 'Отключено'}
            </span>
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
              interviewId={interview.id}
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

            <div className="flex items-center space-x-2 text-xs">
              <div
                className={`flex items-center space-x-1 px-2 py-1 rounded ${
                  mediaError
                    ? 'bg-red-900/30 text-red-300'
                    : 'bg-green-900/30 text-green-300'
                }`}
              >
                <Camera className="w-3 h-3" />
                <span>{mediaError ? 'Ошибка' : 'ОК'}</span>
              </div>
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
              <button onClick={startInterview} className="btn-primary">
                Начать собеседование
              </button>
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

      <MediaPermissionHelper
        show={showPermissionHelper}
        onClose={() => setShowPermissionHelper(false)}
      />
    </div>
  );
};

const transport = new SmallWebRTCTransport();
const client = new PipecatClient({ transport });

const InterviewRoom = () => (
  <PipecatClientProvider client={client}>
    <InterviewRoomInternal />
  </PipecatClientProvider>
);

export default InterviewRoom;