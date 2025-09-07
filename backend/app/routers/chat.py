from fastapi import APIRouter, HTTPException, status, WebSocket, WebSocketDisconnect
from typing import List, Dict
import json
import logging

from ..database import SessionDep, get_session
from ..models import ChatMessageCreate, ChatMessagePublic, MessageRole, ChatMessage, Interview

router = APIRouter(prefix="/chat", tags=["chat"])
logger = logging.getLogger(__name__)

# Хранение активных WebSocket соединений
active_connections: Dict[int, List[WebSocket]] = {}


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, interview_id: int):
        await websocket.accept()
        if interview_id not in self.active_connections:
            self.active_connections[interview_id] = []
        self.active_connections[interview_id].append(websocket)
        logger.info(f"WebSocket подключение для собеседования {interview_id}")
    
    def disconnect(self, websocket: WebSocket, interview_id: int):
        if interview_id in self.active_connections:
            self.active_connections[interview_id].remove(websocket)
            if not self.active_connections[interview_id]:
                del self.active_connections[interview_id]
        logger.info(f"WebSocket отключение для собеседования {interview_id}")
    
    async def send_message_to_interview(self, message: dict, interview_id: int):
        if interview_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[interview_id]:
                try:
                    await connection.send_text(json.dumps(message, ensure_ascii=False))
                except:
                    disconnected.append(connection)
            
            # Удаление отключенных соединений
            for connection in disconnected:
                self.disconnect(connection, interview_id)


manager = ConnectionManager()


@router.websocket("/{interview_id}/ws")
async def websocket_endpoint(websocket: WebSocket, interview_id: int):
    """WebSocket соединение для чата"""
    await manager.connect(websocket, interview_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message_data = json.loads(data)
                
                # Проверка обязательных полей
                if "content" not in message_data or "role" not in message_data:
                    await websocket.send_text(json.dumps({
                        "error": "Отсутствуют обязательные поля: content, role"
                    }))
                    continue
                
                # Создание сообщения в базе данных
                session_gen = get_session()
                session = next(session_gen)
                
                try:
                    # Создание сообщения в базе данных
                    saved_message = ChatMessage(
                        content=message_data["content"],
                        role=MessageRole(message_data["role"]),
                        interview_id=interview_id
                    )
                    
                    session.add(saved_message)
                    session.commit()
                    session.refresh(saved_message)
                    
                    # Отправка всем подключенным клиентам
                    response_message = {
                        "id": saved_message.id,
                        "content": saved_message.content,
                        "role": saved_message.role,
                        "timestamp": saved_message.timestamp.isoformat(),
                        "interview_id": interview_id
                    }
                    
                    await manager.send_message_to_interview(response_message, interview_id)
                    
                    # Логирование сообщения
                    logger.info(f"Сообщение в чате (собеседование {interview_id}): [{saved_message.role}] {saved_message.content}")
                    
                except Exception as e:
                    logger.error(f"Ошибка при сохранении сообщения: {e}")
                    await websocket.send_text(json.dumps({
                        "error": f"Ошибка при сохранении сообщения: {str(e)}"
                    }))
                finally:
                    session.close()
                    
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({
                    "error": "Неверный формат JSON"
                }))
            except ValueError as e:
                await websocket.send_text(json.dumps({
                    "error": f"Неверное значение роли: {str(e)}"
                }))
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, interview_id)


@router.get("/{interview_id}/messages", response_model=List[ChatMessagePublic])
async def get_chat_messages(interview_id: int, session: SessionDep):
    """Получение всех сообщений чата для собеседования"""
    # Проверка существования собеседования
    interview = session.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Собеседование не найдено"
        )
    
    messages = session.query(ChatMessage).filter(ChatMessage.interview_id == interview_id).order_by(ChatMessage.timestamp).all()
    return messages


@router.post("/{interview_id}/messages", response_model=ChatMessagePublic)
async def send_message(interview_id: int, message_data: ChatMessageCreate, session: SessionDep):
    """Отправка сообщения в чат (альтернатива WebSocket)"""
    # Проверка существования собеседования
    interview = session.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Собеседование не найдено"
        )
    
    # Создание сообщения
    message = ChatMessage(
        content=message_data.content,
        role=message_data.role,
        interview_id=interview_id
    )
    
    session.add(message)
    session.commit()
    session.refresh(message)
    
    # Отправка через WebSocket всем подключенным клиентам
    response_message = {
        "id": message.id,
        "content": message.content,
        "role": message.role,
        "timestamp": message.timestamp.isoformat(),
        "interview_id": interview_id
    }
    
    await manager.send_message_to_interview(response_message, interview_id)
    
    return message


@router.post("/{interview_id}/ai-message")
async def send_ai_message(interview_id: int, content: dict, session: SessionDep):
    """Отправка сообщения от AI HR (заглушка)"""
    # Проверка существования собеседования
    interview = session.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Собеседование не найдено"
        )
    
    if "message" not in content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Отсутствует поле 'message'"
        )
    
    # Создание сообщения от AI
    message = ChatMessage(
        content=content["message"],
        role=MessageRole.AI_HR,
        interview_id=interview_id
    )
    
    session.add(message)
    session.commit()
    session.refresh(message)
    
    # Отправка через WebSocket
    response_message = {
        "id": message.id,
        "content": message.content,
        "role": message.role,
        "timestamp": message.timestamp.isoformat(),
        "interview_id": interview_id
    }
    
    await manager.send_message_to_interview(response_message, interview_id)
    
    return {"message": "AI сообщение отправлено", "message_id": message.id}
