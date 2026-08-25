from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from app.auth.security import SECRET_KEY, ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_user(request: Request, token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    db = request.app.state.db
    
    try:
        user = await db.user.find_unique(where={"id": user_id})
    except Exception as e:
        err_type = type(e).__name__
        if err_type in ["UniqueViolationError", "RecordNotFoundError"]:
            raise credentials_exception
            
        import asyncio
        print(f"Caught DB exception in auth dependencies: {err_type} - {str(e)}")
        print("Recreating Prisma instance to recover from Neon crash...")
        
        from prisma import Prisma
        
        try:
            if db.is_connected():
                await db.disconnect()
        except:
            pass
            
        await asyncio.sleep(1)
        
        new_db = Prisma()
        await new_db.connect()
        request.app.state.db = new_db
        
        user = await new_db.user.find_unique(where={"id": user_id})
    if user is None:
        raise credentials_exception
        
    return user
