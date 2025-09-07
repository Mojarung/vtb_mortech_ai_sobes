import os
import json
from datetime import datetime
from typing import List
from ..models import ChatMessage, Interview


class TranscriptService:
    
    @staticmethod
    def create_transcript_file(interview: Interview, messages: List[ChatMessage]) -> str:
        """Создание файла транскрипции собеседования"""
        
        # Создание папки для транскрипций если её нет
        transcripts_dir = "transcripts"
        os.makedirs(transcripts_dir, exist_ok=True)
        
        # Формирование имени файла
        filename = f"interview_{interview.id}_{interview.unique_link[:8]}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        file_path = os.path.join(transcripts_dir, filename)
        
        # Подготовка данных для записи
        transcript_data = {
            "interview_info": {
                "id": interview.id,
                "unique_link": interview.unique_link,
                "candidate_name": interview.candidate_name,
                "candidate_email": interview.candidate_email,
                "position": interview.position,
                "recommended_duration_minutes": interview.recommended_duration,
                "actual_duration_seconds": interview.actual_duration,
                "status": interview.status,
                "created_at": interview.created_at.isoformat() if interview.created_at else None,
                "started_at": interview.started_at.isoformat() if interview.started_at else None,
                "finished_at": interview.finished_at.isoformat() if interview.finished_at else None,
                "knowledge_base": interview.knowledge_base,
                "description": interview.description
            },
            "conversation": []
        }
        
        # Добавление сообщений чата
        for message in messages:
            transcript_data["conversation"].append({
                "id": message.id,
                "role": message.role,
                "content": message.content,
                "timestamp": message.timestamp.isoformat() if message.timestamp else None
            })
        
        # Добавление метаданных
        transcript_data["metadata"] = {
            "total_messages": len(messages),
            "transcript_created_at": datetime.now().isoformat(),
            "file_version": "1.0"
        }
        
        # Запись в файл
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(transcript_data, f, ensure_ascii=False, indent=2)
        
        return file_path
    
    @staticmethod
    def create_simple_text_transcript(interview: Interview, messages: List[ChatMessage]) -> str:
        """Создание простого текстового файла транскрипции"""
        
        # Создание папки для транскрипций если её нет
        transcripts_dir = "transcripts"
        os.makedirs(transcripts_dir, exist_ok=True)
        
        # Формирование имени файла
        filename = f"interview_{interview.id}_{interview.unique_link[:8]}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        file_path = os.path.join(transcripts_dir, filename)
        
        # Формирование содержимого
        content_lines = []
        content_lines.append(f"ТРАНСКРИПЦИЯ СОБЕСЕДОВАНИЯ")
        content_lines.append(f"=" * 50)
        content_lines.append(f"ID собеседования: {interview.id}")
        content_lines.append(f"Кандидат: {interview.candidate_name}")
        content_lines.append(f"Email: {interview.candidate_email}")
        content_lines.append(f"Позиция: {interview.position}")
        content_lines.append(f"Рекомендуемая длительность: {interview.recommended_duration} мин")
        
        if interview.actual_duration:
            actual_minutes = interview.actual_duration // 60
            actual_seconds = interview.actual_duration % 60
            content_lines.append(f"Фактическая длительность: {actual_minutes}:{actual_seconds:02d}")
        
        content_lines.append(f"Статус: {interview.status}")
        content_lines.append(f"Создано: {interview.created_at.strftime('%Y-%m-%d %H:%M:%S') if interview.created_at else 'N/A'}")
        
        if interview.started_at:
            content_lines.append(f"Начато: {interview.started_at.strftime('%Y-%m-%d %H:%M:%S')}")
        
        if interview.finished_at:
            content_lines.append(f"Завершено: {interview.finished_at.strftime('%Y-%m-%d %H:%M:%S')}")
        
        content_lines.append(f"=" * 50)
        content_lines.append("")
        
        # Добавление разговора
        content_lines.append("РАЗГОВОР:")
        content_lines.append("-" * 30)
        
        role_names = {
            "ai_hr": "AI HR",
            "candidate": "КАНДИДАТ",
            "recruiter": "РЕКРУТЕР"
        }
        
        for message in messages:
            timestamp = message.timestamp.strftime('%H:%M:%S') if message.timestamp else 'N/A'
            role_name = role_names.get(message.role, message.role.upper())
            content_lines.append(f"[{timestamp}] {role_name}: {message.content}")
        
        content_lines.append("")
        content_lines.append("-" * 30)
        content_lines.append(f"Всего сообщений: {len(messages)}")
        content_lines.append(f"Транскрипция создана: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Запись в файл
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(content_lines))
        
        return file_path
