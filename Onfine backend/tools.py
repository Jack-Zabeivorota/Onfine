import uuid
import os
from secrets import token_hex
import bcrypt
from pydantic import BaseModel, ValidationError
from fastapi import WebSocket, UploadFile
from models.requests import Auth as AuthRequest
from datetime import datetime, UTC


IMAGES_PATH = './images'
os.makedirs(IMAGES_PATH, exist_ok=True)

async def save_image(filename: str, file: UploadFile | str) -> bool:
    try:
        path = os.path.join(IMAGES_PATH, filename)
        mode = 'w' if isinstance(file, str) else 'wb'

        with open(path, mode) as f:
            f.write(file if isinstance(file, str) else await file.read())
    except:
        return False

    return True

def remove_image(filename: str):
    path = os.path.join(IMAGES_PATH, filename)

    if os.path.exists(path):
        os.remove(path)

def read_image(filename: str) -> str:
    path = os.path.join(IMAGES_PATH, filename)

    with open(path, 'r') as f:
        return f.read()

def get_UUID(): return uuid.uuid4().hex

def get_now_datetime(): return datetime.now(UTC).replace(tzinfo=None)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def check_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed_password.encode())


connected_clients: dict[str, WebSocket] = {}

__auth_tokens: dict[str, str] = {}

def auth_user(user_id: str) -> str:
    token = token_hex(16)
    __auth_tokens[user_id] = token
    return token

def check_auth(data: AuthRequest) -> bool:
    return __auth_tokens.get(data.user_id, None) == data.token

def logout_user(user_id: str):
    __auth_tokens.pop(user_id)


def parse_model(model: BaseModel, **fields) -> BaseModel | None:
    try:
        return model(**fields)
    except ValidationError:
        return None

async def json_response(socket: WebSocket, message: str, status: int = 200) -> dict:
    await socket.send_json({ 'message': message, 'status': status })
