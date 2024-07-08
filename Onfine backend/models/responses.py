from typing import Literal
from pydantic import BaseModel, Field
from abc import ABC
from datetime import datetime


class Register(BaseModel):
    user_id: str
    token: str

class Login(Register):
    priv_key: str
    name: str = Field(min_length=2, max_length=50)
    nickname: str = Field(min_length=2, max_length=50)
    with_avatar: bool
    latest_key_update: datetime

class User(BaseModel):
    id: str | None = None
    name: str = Field(min_length=2, max_length=50)
    nickname: str = Field(min_length=2, max_length=50)
    with_avatar: bool
    last_visit: datetime
    is_online: bool

class CreatedChat(BaseModel):
    chat_id: str

class ChatBaseData(BaseModel):
    id: str
    type: Literal['chat', 'group', 'channel']
    name: str | None = Field(min_length=2, max_length=50, default=None)
    description: str | None = Field(max_length=255, default=None)
    with_icon: bool
    members_count: int = Field(gt=0)

class Chat(ChatBaseData):
    key: str | None = None
    companion_id: str | None = None
    is_private: bool
    last_reading: datetime
    message_content: str | None = None
    message_datetime: datetime | None = None
    message_sender_id: str | None = None
    is_admin: bool
    unread_count: int = Field(ge=0, default=0)
    writing_users: list = []
    all_messages_is_loaded: bool = False

class Post(BaseModel):
    id: str
    sender_id: str
    content: str
    image: str | None
    date_time: datetime
    likes: int = Field(ge=0, default=0)
    is_liked: bool = False

class Message(Post):
    sender_id: str | None
    reply_content: str | None
    reply_sender_id: str | None

class SentMessage(BaseModel):
    message_ids: dict[str, str]
    date_time: datetime


class SocketResponseBase(BaseModel, ABC):
    notifi_type: str

class NewMessage(SocketResponseBase):
    notifi_type: str = 'new_message'
    chat_id: str
    message: Message

class DeletedMessages(SocketResponseBase):
    notifi_type: str = 'deleted_messages'
    chat_id: str
    message_ids: list[str]

class NewLike(SocketResponseBase):
    notifi_type: str = 'new_like'
    chat_id: str
    message_id: str
    is_liked: bool

class NewChat(SocketResponseBase):
    notifi_type: str = 'new_chat'
    chat: Chat

class DeletedChat(SocketResponseBase):
    notifi_type: str = 'deleted_chat'
    chat_id: str

class DeletedUser(SocketResponseBase):
    notifi_type: str = 'deleted_user'
    user_id: str

class NewStatus(SocketResponseBase):
    notifi_type: str = 'new_status'
    user_id: str
    is_online: bool

class NewWriting(SocketResponseBase):
    notifi_type: str = 'new_writing'
    user_id: str
    chat_id: str
    is_writing: bool

class ReadedMessages(SocketResponseBase):
    notifi_type: str = 'readed_messages'
    chat_id: str
    last_reading: datetime
