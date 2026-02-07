from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from schemas.auth import UserCreate, UserLogin, TokenResponse, UserResponse
from services.auth_service import AuthService
from dependencies import get_current_user, get_db

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

@router.post("/register",response_model=TokenResponse)
def register(user_create: UserCreate,
             db: Session = Depends(get_db),
             auth_service: AuthService = Depends(AuthService)):
    """Register a new user."""
    try:
        user, token = auth_service.register_user(db, user_create)
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
def login(user_login: UserLogin,
          db: Session = Depends(get_db),
          auth_service: AuthService = Depends(AuthService)):
    """Authenticate a user and return JWT token."""
    try:
        user, token = auth_service.login_user(db, user_login.email, user_login.password)
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
        print(e)
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
