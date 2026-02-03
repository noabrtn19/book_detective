from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from database.database import SessionLocal
from schemas.auth import UserCreate, UserLogin, TokenResponse, UserResponse
from services.auth_service import (
    register_user,
    login_user,
    verify_token,
    get_user_by_id
)

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    """Dependency to get the current authenticated user from JWT token."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header"
        )
    
    # Extract token from "Bearer <token>" format
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise ValueError()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format"
        )
    
    # Verify token
    user_id = verify_token(token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    # Get user from database
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return user


@router.post("/register", response_model=TokenResponse)
def register(user_create: UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    print("register")
    try:
        user, token = register_user(db, user_create)
        return TokenResponse(
            message="User registered successfully",
            user=UserResponse.from_orm(user),
            token=token
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": str(e)}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Registration failed"}
        )


@router.post("/login", response_model=TokenResponse)
def login(user_login: UserLogin, db: Session = Depends(get_db)):
    """Authenticate a user and return JWT token."""
    try:
        user, token = login_user(db, user_login.email, user_login.password)
        return TokenResponse(
            message="Login successful",
            user=UserResponse.from_orm(user),
            token=token
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": str(e)}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Login failed"}
        )


@router.get("/me")
def get_me(current_user = Depends(get_current_user)):
    """Get the current authenticated user."""
    return {"user": UserResponse.from_orm(current_user)}


@router.post("/logout")
def logout(current_user = Depends(get_current_user)):
    """Logout the current user (frontend will remove token from storage)."""
    return {"message": "Logged out successfully"}
