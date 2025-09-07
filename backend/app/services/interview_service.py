import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import Session, select
from ..models import Interview, InterviewCreate, InterviewStatus, InterviewUpdate
from ..database import SessionDep


class InterviewService:
    
    @staticmethod
    def create_interview(interview_data: InterviewCreate, session: Session) -> Interview:
        """Создание нового собеседования с уникальной ссылкой"""
        # Генерация уникальной ссылки
        unique_link = str(uuid.uuid4())
        
        # Создание объекта интервью
        interview = Interview(
            **interview_data.model_dump(),
            unique_link=unique_link,
            status=InterviewStatus.NOT_STARTED
        )
        
        session.add(interview)
        session.commit()
        session.refresh(interview)
        
        return interview
    
    @staticmethod
    def get_interview_by_link(unique_link: str, session: Session) -> Optional[Interview]:
        """Получение собеседования по уникальной ссылке"""
        statement = select(Interview).where(Interview.unique_link == unique_link)
        return session.exec(statement).first()
    
    @staticmethod
    def get_interview_by_id(interview_id: int, session: Session) -> Optional[Interview]:
        """Получение собеседования по ID"""
        return session.get(Interview, interview_id)
    
    @staticmethod
    def update_interview_status(
        interview_id: int, 
        status: InterviewStatus, 
        session: Session,
        started_at: Optional[datetime] = None,
        finished_at: Optional[datetime] = None,
        actual_duration: Optional[int] = None
    ) -> Optional[Interview]:
        """Обновление статуса собеседования"""
        interview = session.get(Interview, interview_id)
        if not interview:
            return None
        
        interview.status = status
        
        if started_at:
            interview.started_at = started_at
        if finished_at:
            interview.finished_at = finished_at
        if actual_duration is not None:
            interview.actual_duration = actual_duration
        
        session.add(interview)
        session.commit()
        session.refresh(interview)
        
        return interview
    
    @staticmethod
    def save_transcript_path(interview_id: int, file_path: str, session: Session) -> Optional[Interview]:
        """Сохранение пути к файлу транскрипции"""
        interview = session.get(Interview, interview_id)
        if not interview:
            return None
        
        interview.transcript_file_path = file_path
        session.add(interview)
        session.commit()
        session.refresh(interview)
        
        return interview
