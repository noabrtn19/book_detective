from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
import os
from sqlalchemy.orm import Session
from bcrypt import hashpw, gensalt, checkpw
from jose import JWTError, jwt
from database.models.user import User
from schemas.auth import UserCreate, UserResponse
import os
from os.path import join, dirname
from dotenv import load_dotenv


# JWT Configuration
dotenv_path = join(os.path.join(dirname(__file__), "/.."), '.env')
load_dotenv(dotenv_path)

SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = gensalt()
    return hashpw(password.encode('utf-8'), salt).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password."""
    return checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[int]:
    """Verify a JWT token and return the user ID if valid."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        
        if user_id is None:
            return None
        
        return user_id
    except JWTError:
        return None


def register_user(db: Session, user_create: UserCreate) -> Tuple[User, str]:
    """Register a new user and return the user and JWT token."""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_create.email).first()
    if existing_user:
        raise ValueError("Email already registered")
    
    # Hash password and create new user
    hashed_password = hash_password(user_create.password)
    db_user = User(
        email=user_create.email,
        name=user_create.name,
        hashed_password=hashed_password
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create JWT token
    token = create_access_token(data={"sub": db_user.id})
    
    return db_user, token


def login_user(db: Session, email: str, password: str) -> Tuple[User, str]:
    """Authenticate a user and return the user and JWT token."""
    # Find user by email
    user = db.query(User).filter(User.email == email).first()
    
    if not user or not verify_password(password, user.hashed_password):
        raise ValueError("Invalid email or password")
    
    # Create JWT token
    token = create_access_token(data={"sub": user.id})
    
    return user, token


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """Get a user by ID."""
    return db.query(User).filter(User.id == user_id).first()
