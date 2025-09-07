from typing import List
from sqlmodel import Session, select
from ..models import ChatMessage, ChatMessageCreate, MessageRole
from datetime import datetime


class ChatService:
    
    @staticmethod
    def create_message(message_data: ChatMessageCreate, session: Session) -> ChatMessage:
        """Создание нового сообщения в чате"""
        message = ChatMessage(**message_data.model_dump())
        session.add(message)
        session.commit()
        session.refresh(message)
        return message
    
    @staticmethod
    def get_interview_messages(interview_id: int, session: Session) -> List[ChatMessage]:
        """Получение всех сообщений для конкретного собеседования"""
        statement = select(ChatMessage).where(
            ChatMessage.interview_id == interview_id
        ).order_by(ChatMessage.timestamp)
        
        return session.exec(statement).all()
    
    @staticmethod
    def add_ai_message(interview_id: int, content: str, session: Session) -> ChatMessage:
        """Добавление сообщения от AI HR"""
        message_data = ChatMessageCreate(
            content=content,
            role=MessageRole.AI_HR,
            interview_id=interview_id
        )
        return ChatService.create_message(message_data, session)
    
    @staticmethod
    def add_candidate_message(interview_id: int, content: str, session: Session) -> ChatMessage:
        """Добавление сообщения от кандидата"""
        message_data = ChatMessageCreate(
            content=content,
            role=MessageRole.CANDIDATE,
            interview_id=interview_id
        )
        return ChatService.create_message(message_data, session)
    
    @staticmethod
    def add_recruiter_message(interview_id: int, content: str, session: Session) -> ChatMessage:
        """Добавление сообщения от рекрутера"""
        message_data = ChatMessageCreate(
            content=content,
            role=MessageRole.RECRUITER,
            interview_id=interview_id
        )
        return ChatService.create_message(message_data, session)
