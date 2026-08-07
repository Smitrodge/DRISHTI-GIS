import enum
from sqlalchemy import Column, Integer, String, Boolean, Enum
from app.database import Base

class UserRole(str, enum.Enum):
    EMERGENCY_OFFICER = "EMERGENCY_OFFICER"
    ANALYST = "ANALYST"
    FIELD_RESPONDER = "FIELD_RESPONDER"
    VIEWER = "VIEWER"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.VIEWER, nullable=False)
    is_active = Column(Boolean, default=True)