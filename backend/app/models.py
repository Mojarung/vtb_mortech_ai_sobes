from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
from enum import Enum


class InterviewStatus(str, Enum):
    NOT_STARTED = "not_started"
    STARTED = "started"
    FINISHED = "finished"


class InterviewBase(SQLModel):
    candidate_name: str
    candidate_id: str  # ID кандидата вместо email
    position: str
    recommended_duration: int  # в минутах
    knowledge_base: Optional[str] = None
    description: Optional[str] = None


class Interview(InterviewBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    unique_link: str = Field(index=True, unique=True)
    status: InterviewStatus = Field(default=InterviewStatus.NOT_STARTED)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    actual_duration: Optional[int] = None  # в секундах
    transcript_file_path: Optional[str] = None
    
    # Связь с сообщениями чата
    chat_messages: List["ChatMessage"] = Relationship(back_populates="interview")


class InterviewCreate(InterviewBase):
    pass


class InterviewPublic(InterviewBase):
    id: int
    unique_link: str
    status: InterviewStatus
    created_at: datetime
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    actual_duration: Optional[int] = None


class InterviewUpdate(SQLModel):
    status: Optional[InterviewStatus] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    actual_duration: Optional[int] = None
    transcript_file_path: Optional[str] = None


class MessageRole(str, Enum):
    AI_HR = "ai_hr"
    CANDIDATE = "candidate"
    RECRUITER = "recruiter"


class ChatMessageBase(SQLModel):
    content: str
    role: MessageRole
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ChatMessage(ChatMessageBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    interview_id: int = Field(foreign_key="interview.id")
    
    # Связь с интервью
    interview: Optional[Interview] = Relationship(back_populates="chat_messages")


class ChatMessageCreate(SQLModel):
    content: str
    role: MessageRole
    interview_id: int


class ChatMessagePublic(ChatMessageBase):
    id: int
    interview_id: int


class SpeechRecognitionResult(SQLModel):
    text: str
    language: str
    confidence: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)
