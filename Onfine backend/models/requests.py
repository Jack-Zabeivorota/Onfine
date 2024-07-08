from typing import Literal
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime


class Auth(BaseModel):
    user_id: str
    token: str

class Login(BaseModel):
    email: EmailStr = Field(max_length=50)
    password: str   = Field(min_length=6, max_length=255)

class Register(Login):
    name: str     = Field(min_length=2, max_length=50)
    nickname: str = Field(min_length=2, max_length=50)
    pub_key: str
    priv_key: str

class Users(BaseModel):
    user_ids: list[str]

class UpdateUserData(Auth):
    email: EmailStr = Field(max_length=50)
    name: str       = Field(min_length=2, max_length=50)
    nickname: str   = Field(min_length=2, max_length=50)

class UpdatePassword(BaseModel):
    user_id: str
    curr_password: str = Field(min_length=6, max_length=255)
    new_password: str  = Field(min_length=6, max_length=255)
    priv_key: str

class UpdateKeysData(Auth):
    pub_key: str
    priv_key: str
    chat_keys: dict[str, str]

class DeleteUser(BaseModel):
    user_id: str
    password: str = Field(min_length=6, max_length=255)

class SearchUsers(Auth):
    value: str
    chat_id: str | None = None


class GetPosts(Auth):
    start_date_time: datetime
    limit: int = Field(ge=1, default=20)

class GetMessages(Auth):
    chat_id: str
    start_date_time: datetime
    limit: int = Field(ge=1, default=20)

class ChatData(Auth):
    chat_id: str

class ChatMember(BaseModel):
    id: str
    key: str | None = None
    is_admin: bool = False

class CreateChat(Auth):
    type: Literal['chat', 'group', 'channel']
    name: str | None = Field(min_length=2, max_length=50, default=None)
    description: str | None = Field(max_length=255, default=None)
    is_private: bool = True
    my_key: str | None = None
    members: list[ChatMember]

class AddMembers(Auth):
    chat_id: str
    members: list[ChatMember]

class RemoveMembers(Auth):
    chat_id: str
    member_ids: list[str]

class UpdateChatData(Auth):
    chat_id: str
    name: str = Field(max_length=50)
    description: str = Field(max_length=255)

class WritingInChat(Auth):
    chat_id: str
    is_writing: bool


class Message(BaseModel):
    chat_id: str
    content: str
    image: str | None = None
    reply_content: str | None = None

class SendMessages(Auth):
    messages: list[Message]
    reply_sender_id: str | None = None

class Like(Auth):
    message_id: str

class DeleteMessages(Auth):
    chat_id: str
    message_ids: list[str]
