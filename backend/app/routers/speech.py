from fastapi import APIRouter, HTTPException, status, UploadFile, File
from typing import Optional
import logging

from ..database import SessionDep
from ..models import SpeechRecognitionResult
from ..services.whisper_service import whisper_service
from ..services.interview_service import InterviewService

router = APIRouter(prefix="/speech", tags=["speech"])
logger = logging.getLogger(__name__)


@router.post("/transcribe/{interview_id}")
async def transcribe_audio(
    interview_id: int,
    audio_file: UploadFile = File(...),
    language: Optional[str] = None,
    session: SessionDep = None
):
    """Распознавание речи из аудио файла"""
    
    # Проверка существования собеседования
    interview = InterviewService.get_interview_by_id(interview_id, session)
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Собеседование не найдено"
        )
    
    # Проверка типа файла
    if not audio_file.content_type or not audio_file.content_type.startswith('audio/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Файл должен быть аудио форматом"
        )
    
    try:
        # Чтение аудио данных
        audio_data = await audio_file.read()
        
        if len(audio_data) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пустой аудио файл"
            )
        
        # Распознавание речи
        text, detected_language, confidence = await whisper_service.transcribe_audio(
            audio_data, language
        )
        
        # Создание результата
        result = SpeechRecognitionResult(
            text=text,
            language=detected_language,
            confidence=confidence
        )
        
        # Логирование результата
        logger.info(f"Распознавание речи для собеседования {interview_id}: '{text}' (язык: {detected_language}, уверенность: {confidence:.2f})")
        
        return {
            "interview_id": interview_id,
            "transcription": result.model_dump(),
            "success": True
        }
        
    except Exception as e:
        logger.error(f"Ошибка при распознавании речи: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при распознавании речи: {str(e)}"
        )


@router.post("/transcribe-realtime/{interview_id}")
async def transcribe_realtime_audio(
    interview_id: int,
    audio_data: bytes,
    language: Optional[str] = None,
    session: SessionDep = None
):
    """Распознавание речи в реальном времени (для WebRTC потоков)"""
    
    # Проверка существования собеседования
    interview = InterviewService.get_interview_by_id(interview_id, session)
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Собеседование не найдено"
        )
    
    if len(audio_data) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пустые аудио данные"
        )
    
    try:
        # Распознавание речи
        text, detected_language, confidence = await whisper_service.transcribe_audio(
            audio_data, language
        )
        
        # Создание результата
        result = SpeechRecognitionResult(
            text=text,
            language=detected_language,
            confidence=confidence
        )
        
        # Логирование результата
        if text.strip():  # Логируем только если есть распознанный текст
            logger.info(f"Распознавание речи в реальном времени (собеседование {interview_id}): '{text}' (язык: {detected_language}, уверенность: {confidence:.2f})")
        
        return {
            "interview_id": interview_id,
            "transcription": result.model_dump(),
            "success": True
        }
        
    except Exception as e:
        logger.error(f"Ошибка при распознавании речи в реальном времени: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при распознавании речи: {str(e)}"
        )


@router.get("/health")
async def speech_health_check():
    """Проверка состояния сервиса распознавания речи"""
    try:
        # Инициализация модели если ещё не инициализирована
        if whisper_service.model is None:
            whisper_service.initialize_model()
        
        return {
            "status": "healthy",
            "model_loaded": whisper_service.model is not None,
            "model_size": whisper_service.model_size
        }
    except Exception as e:
        logger.error(f"Ошибка при проверке состояния сервиса речи: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "model_loaded": False
        }
