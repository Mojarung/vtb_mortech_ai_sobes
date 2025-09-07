import logging
import tempfile
import os
from faster_whisper import WhisperModel
from typing import Optional, Tuple
import asyncio
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)


class WhisperService:
    def __init__(self, model_size: str = "base"):
        """Инициализация сервиса распознавания речи"""
        self.model_size = model_size
        self.model = None
        self.executor = ThreadPoolExecutor(max_workers=2)
    
    def initialize_model(self):
        """Инициализация модели Whisper"""
        if self.model is None:
            logger.info(f"Загрузка модели Whisper: {self.model_size}")
            self.model = WhisperModel(self.model_size, device="cpu", compute_type="int8")
            logger.info("Модель Whisper загружена успешно")
    
    def _transcribe_audio_sync(self, audio_data: bytes, language: Optional[str] = None) -> Tuple[str, str, float]:
        """Синхронное распознавание аудио"""
        if self.model is None:
            self.initialize_model()
        
        # Сохранение аудио во временный файл
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
            temp_file.write(audio_data)
            temp_file_path = temp_file.name
        
        try:
            # Распознавание речи
            segments, info = self.model.transcribe(
                temp_file_path, 
                language=language,
                beam_size=5
            )
            
            # Объединение всех сегментов в один текст
            text_segments = []
            total_confidence = 0
            segment_count = 0
            
            for segment in segments:
                text_segments.append(segment.text.strip())
                if hasattr(segment, 'avg_logprob'):
                    total_confidence += segment.avg_logprob
                    segment_count += 1
            
            full_text = " ".join(text_segments).strip()
            detected_language = info.language if info else "unknown"
            avg_confidence = total_confidence / segment_count if segment_count > 0 else 0.0
            
            logger.info(f"Распознан текст: '{full_text}' (язык: {detected_language}, уверенность: {avg_confidence:.2f})")
            
            return full_text, detected_language, avg_confidence
            
        except Exception as e:
            logger.error(f"Ошибка при распознавании речи: {e}")
            return "", "unknown", 0.0
        finally:
            # Удаление временного файла
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
    
    async def transcribe_audio(self, audio_data: bytes, language: Optional[str] = None) -> Tuple[str, str, float]:
        """Асинхронное распознавание аудио"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self.executor, 
            self._transcribe_audio_sync, 
            audio_data, 
            language
        )
    
    def cleanup(self):
        """Очистка ресурсов"""
        if self.executor:
            self.executor.shutdown(wait=True)


# Глобальный экземпляр сервиса
whisper_service = WhisperService()
