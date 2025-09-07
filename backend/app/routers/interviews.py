from fastapi import APIRouter, HTTPException, status, WebSocket, WebSocketDisconnect
from typing import List, Dict
from datetime import datetime
import json
import uuid

from ..database import SessionDep
from ..models import (
    InterviewCreate, 
    InterviewPublic, 
    InterviewStatus,
    Interview,
    ChatMessage,
    ChatMessageCreate,
    MessageRole
)

router = APIRouter(prefix="/interviews", tags=["interviews"])

# Хранилище активных WebSocket соединений
active_connections: Dict[str, List[WebSocket]] = {}


@router.post("/", response_model=InterviewPublic)
async def create_interview(interview_data: InterviewCreate, session: SessionDep):
    """Создание нового собеседования с уникальной ссылкой"""
    try:
        # Создание интервью с уникальной ссылкой
        unique_link = str(uuid.uuid4())
        
        interview = Interview(
            unique_link=unique_link,
            candidate_name=interview_data.candidate_name,
            candidate_id=interview_data.candidate_id,
            position=interview_data.position,
            recommended_duration=interview_data.recommended_duration,
            knowledge_base=interview_data.knowledge_base,
            description=interview_data.description
        )
        
        session.add(interview)
        session.commit()
        session.refresh(interview)
        
        # Возвращаем интервью с полной ссылкой
        response_data = {
            **interview.dict(),
            "full_link": f"http://localhost:3000/interview/{unique_link}"
        }
        return response_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при создании собеседования: {str(e)}"
        )


@router.get("/{unique_link}", response_model=InterviewPublic)
async def get_interview_by_link(unique_link: str, session: SessionDep):
    """Получение собеседования по уникальной ссылке"""
    interview = session.query(Interview).filter(Interview.unique_link == unique_link).first()
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Собеседование не найдено"
        )
    return interview


@router.patch("/{interview_id}/start")
async def start_interview(interview_id: int, session: SessionDep):
    """Начало собеседования"""
    interview = session.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Собеседование не найдено"
        )
    
    interview.status = InterviewStatus.STARTED
    interview.started_at = datetime.utcnow()
    session.commit()
    
    return {"message": "Собеседование начато", "interview_id": interview_id}


@router.patch("/{interview_id}/finish")
async def finish_interview(interview_id: int, session: SessionDep):
    """Завершение собеседования и создание транскрипции"""
    interview = session.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Собеседование не найдено"
        )
    
    # Вычисление фактической длительности
    actual_duration = None
    if interview.started_at:
        duration_delta = datetime.utcnow() - interview.started_at
        actual_duration = int(duration_delta.total_seconds())
    
    # Обновление статуса
    interview.status = InterviewStatus.FINISHED
    interview.finished_at = datetime.utcnow()
    interview.actual_duration = actual_duration
    session.commit()
    
    # Получение сообщений чата
    messages = session.query(ChatMessage).filter(ChatMessage.interview_id == interview_id).all()
    
    # Создание простого текстового файла транскрипции
    try:
        import os
        transcript_dir = "transcripts"
        os.makedirs(transcript_dir, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"interview_{interview_id}_{interview.unique_link[:8]}_{timestamp}"
        
        # JSON файл
        json_path = os.path.join(transcript_dir, f"{filename}.json")
        transcript_data = {
            "interview_id": interview_id,
            "candidate_name": interview.candidate_name,
            "position": interview.position,
            "start_time": interview.started_at.isoformat() if interview.started_at else None,
            "end_time": interview.finished_at.isoformat() if interview.finished_at else None,
            "duration_seconds": actual_duration,
            "messages": [
                {
                    "role": msg.role.value,
                    "content": msg.content,
                    "timestamp": msg.timestamp.isoformat()
                }
                for msg in messages
            ]
        }
        
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(transcript_data, f, ensure_ascii=False, indent=2)
        
        # Текстовый файл
        txt_path = os.path.join(transcript_dir, f"{filename}.txt")
        with open(txt_path, 'w', encoding='utf-8') as f:
            f.write(f"ТРАНСКРИПЦИЯ СОБЕСЕДОВАНИЯ\n")
            f.write(f"Кандидат: {interview.candidate_name}\n")
            f.write(f"Позиция: {interview.position}\n")
            f.write(f"Время начала: {interview.started_at}\n")
            f.write(f"Время окончания: {interview.finished_at}\n")
            f.write(f"Длительность: {actual_duration} секунд\n")
            f.write("="*50 + "\n\n")
            
            for msg in messages:
                role_name = "AI HR" if msg.role == MessageRole.AI_HR else "Кандидат" if msg.role == MessageRole.CANDIDATE else "Рекрутер"
                f.write(f"[{msg.timestamp.strftime('%H:%M:%S')}] {role_name}: {msg.content}\n")
        
        interview.transcript_file_path = json_path
        session.commit()
        
        return {
            "message": "Собеседование завершено",
            "interview_id": interview_id,
            "actual_duration": actual_duration,
            "transcript_path": json_path,
            "text_transcript_path": txt_path
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при создании транскрипции: {str(e)}"
        )


@router.get("/{interview_id}/status")
async def get_interview_status(interview_id: int, session: SessionDep):
    """Получение статуса собеседования"""
    interview = session.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Собеседование не найдено"
        )
    
    return {
        "interview_id": interview_id,
        "status": interview.status,
        "started_at": interview.started_at,
        "finished_at": interview.finished_at,
        "actual_duration": interview.actual_duration
    }


@router.websocket("/{interview_id}/ws")
async def websocket_endpoint(websocket: WebSocket, interview_id: int):
    """WebSocket соединение для интервью"""
    await websocket.accept()
    
    # Добавляем соединение в список активных
    if str(interview_id) not in active_connections:
        active_connections[str(interview_id)] = []
    active_connections[str(interview_id)].append(websocket)
    
    try:
        while True:
            # Получаем данные от клиента
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Обрабатываем разные типы сообщений
            if message_data["type"] == "chat_message":
                # Отправляем сообщение всем подключенным клиентам
                for connection in active_connections[str(interview_id)]:
                    if connection != websocket:  # Не отправляем отправителю
                        try:
                            await connection.send_text(data)
                        except:
                            # Удаляем неактивные соединения
                            active_connections[str(interview_id)].remove(connection)
            
            elif message_data["type"] == "audio_data":
                # Обработка аудиоданных для транскрипции
                # Здесь можно интегрировать с Whisper сервисом
                pass
            
            elif message_data["type"] == "video_data":
                # Обработка видеоданных
                pass
                
    except WebSocketDisconnect:
        # Удаляем соединение при отключении
        if str(interview_id) in active_connections:
            active_connections[str(interview_id)].remove(websocket)
