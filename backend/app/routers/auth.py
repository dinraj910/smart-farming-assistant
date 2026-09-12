from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.auth.security import get_password_hash, verify_password, create_access_token
from app.auth.dependencies import get_current_user
import asyncio

async def safe_db_execute(request, coro_func_name, *args, **kwargs):
    db = request.app.state.db
    
    try:
        # Get the coroutine function dynamically from the current db instance
        target_model, target_action = coro_func_name.split('.')
        model_obj = getattr(db, target_model)
        action_func = getattr(model_obj, target_action)
        return await action_func(*args, **kwargs)
    except Exception as e:
        err_type = type(e).__name__
        if err_type in ["UniqueViolationError", "RecordNotFoundError"]:
            raise e
        
        print(f"Caught DB exception: {err_type} - {str(e)}")
        print("Recreating Prisma instance to recover from Neon crash...")
        
        from prisma import Prisma
        import asyncio
        
        try:
            if db.is_connected():
                await db.disconnect()
        except:
            pass
        
        await asyncio.sleep(1)
        
        # Create a brand new Prisma instance
        new_db = Prisma()
        await new_db.connect()
        request.app.state.db = new_db
        
        # Retry with the new db instance
        target_model, target_action = coro_func_name.split('.')
        model_obj = getattr(new_db, target_model)
        action_func = getattr(model_obj, target_action)
        return await action_func(*args, **kwargs)

router = APIRouter()

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister, request: Request):
    db = request.app.state.db
    
    # Check if user exists
    existing_user = await safe_db_execute(request, "user.find_unique", where={"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
        
    hashed_password = get_password_hash(user_data.password)
    
    # Create user
    user = await safe_db_execute(request, "user.create",
        data={
            "name": user_data.name,
            "email": user_data.email,
            "passwordHash": hashed_password
        }
    )
    
    # Create token
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login", response_model=Token)
async def login(user_data: UserLogin, request: Request):
    db = request.app.state.db
    
    user = await safe_db_execute(request, "user.find_unique", where={"email": user_data.email})
    if not user or not verify_password(user_data.password, user.passwordHash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email
    }


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None


@router.put("/me", response_model=UserResponse)
async def update_users_me(
    user_data: UserUpdate,
    request: Request,
    current_user = Depends(get_current_user),
):
    update_dict = {}
    if user_data.name is not None and user_data.name.strip():
        update_dict["name"] = user_data.name.strip()

    if user_data.email is not None and user_data.email != current_user.email:
        existing = await safe_db_execute(
            request, "user.find_unique", where={"email": user_data.email}
        )
        if existing and str(existing.id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already taken by another account",
            )
        update_dict["email"] = user_data.email

    if update_dict:
        updated = await safe_db_execute(
            request,
            "user.update",
            where={"id": current_user.id},
            data=update_dict,
        )
        return {
            "id": str(updated.id),
            "name": updated.name,
            "email": updated.email,
        }

    return {
        "id": str(current_user.id),
        "name": current_user.name,
        "email": current_user.email,
    }

