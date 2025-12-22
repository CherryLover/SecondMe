"""认证模块"""
from datetime import datetime, timedelta
from typing import Optional, Tuple

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

import config

security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """密码加密"""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    """验证密码"""
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def create_token(user_id: str, role: str) -> str:
    """创建 JWT Token"""
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=config.JWT_EXPIRE_HOURS)
    }
    return jwt.encode(payload, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """解码 JWT Token"""
    try:
        return jwt.decode(token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def check_token_refresh(token: str) -> Optional[str]:
    """
    检查 Token 是否需要刷新（滑动过期）
    如果剩余有效期不足一半，返回新 Token，否则返回 None
    """
    try:
        payload = jwt.decode(token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
        exp_timestamp = payload.get("exp", 0)
        exp_time = datetime.utcfromtimestamp(exp_timestamp)
        now = datetime.utcnow()

        # 计算剩余时间
        remaining = exp_time - now
        total_duration = timedelta(hours=config.JWT_EXPIRE_HOURS)

        # 如果剩余时间不足一半，刷新 Token
        if remaining < total_duration / 2:
            return create_token(payload["user_id"], payload["role"])
        return None
    except jwt.PyJWTError:
        return None


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> dict:
    """获取当前用户（必须登录）"""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_token(credentials.credentials)
    return {"user_id": payload["user_id"], "role": payload["role"]}


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[dict]:
    """获取当前用户（可选，不强制登录）"""
    if credentials is None:
        return None

    try:
        payload = decode_token(credentials.credentials)
        return {"user_id": payload["user_id"], "role": payload["role"]}
    except HTTPException:
        return None


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """要求管理员权限"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin required")
    return current_user
