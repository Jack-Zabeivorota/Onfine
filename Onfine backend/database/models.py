from typing_extensions import Annotated
from enum import Enum
from sqlalchemy import ForeignKey, String, Integer, Text, TIMESTAMP
from sqlalchemy.orm import DeclarativeBase, registry, Mapped, mapped_column, relationship
from datetime import datetime
from tools import get_UUID, get_now_datetime


uuid    = Annotated[String, 32]
str_50  = Annotated[String, 50]
str_255 = Annotated[String, 255]

class Base(DeclarativeBase):
    registry = registry(
        type_annotation_map={
            uuid:     String(32),
            str_50:   String(50),
            str_255:  String(255),
            str:      Text,
            int:      Integer,
            datetime: TIMESTAMP(timezone=True),
        }
    )

metadata = Base.metadata


class ChatTypes(Enum):
    chat    = 0
    group   = 1
    channel = 2


class ChatUser(Base):
    __tablename__ = 'chat_user'

    user_id:  Mapped[uuid] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), primary_key=True, index=True)
    chat_id:  Mapped[uuid] = mapped_column(ForeignKey('chats.id', ondelete='CASCADE'), primary_key=True, index=True)
    is_admin: Mapped[bool] = mapped_column(default=False)
    key:      Mapped[str]  = mapped_column(nullable=True, default=None)
    unread_count: Mapped[int] = mapped_column(default=0)

class Like(Base):
    __tablename__ = 'likes'

    user_id:    Mapped[uuid] = mapped_column(ForeignKey('users.id', ondelete='SET NULL'), primary_key=True, nullable=True, index=True)
    message_id: Mapped[uuid] = mapped_column(ForeignKey('messages.id', ondelete='CASCADE'), primary_key=True, index=True)


class User(Base):
    __tablename__ = 'users'

    id:          Mapped[uuid]     = mapped_column(primary_key=True, default=get_UUID, index=True)
    email:       Mapped[str_50]   = mapped_column(unique=True)
    password:    Mapped[str_255]
    name:        Mapped[str_50]
    nickname:    Mapped[str_50]   = mapped_column(unique=True)
    with_avatar: Mapped[bool]     = mapped_column(default=False)
    last_visit:  Mapped[datetime] = mapped_column(default=get_now_datetime)
    pub_key:     Mapped[str]
    priv_key:    Mapped[str]
    latest_key_update: Mapped[datetime] = mapped_column(default=get_now_datetime)

    message_likes:   Mapped[list['Message']] = relationship(back_populates='user_likes', secondary='likes')
    messages:        Mapped[list['Message']] = relationship(back_populates='sender', foreign_keys='Message.sender_id')
    reply_list:      Mapped[list['Message']] = relationship(back_populates='reply_sender', foreign_keys='Message.reply_sender_id')
    chats:           Mapped[list['Chat']]    = relationship(back_populates='users', secondary='chat_user')

class Message(Base):
    __tablename__ = 'messages'

    id:            Mapped[uuid]     = mapped_column(primary_key=True, default=get_UUID, index=True)
    content:       Mapped[str]
    with_image:    Mapped[bool]     = mapped_column(default=False)
    date_time:     Mapped[datetime] = mapped_column(default=get_now_datetime)
    reply_content: Mapped[str]      = mapped_column(nullable=True)

    sender_id: Mapped[uuid]   = mapped_column(ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    sender:    Mapped['User'] = relationship(back_populates='messages', foreign_keys=[sender_id])

    reply_sender_id: Mapped[uuid]   = mapped_column(ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    reply_sender:    Mapped['User'] = relationship(back_populates='reply_list', foreign_keys=[reply_sender_id])

    user_likes: Mapped[list['User']] = relationship(back_populates='message_likes', secondary='likes')

    chat_id: Mapped[uuid]   = mapped_column(ForeignKey('chats.id', ondelete='CASCADE'))
    chat:    Mapped['Chat'] = relationship(back_populates='messages')

class Chat(Base):
    __tablename__ = 'chats'

    id:             Mapped[uuid]     = mapped_column(primary_key=True, default=get_UUID, index=True)
    type:           Mapped[str_50]
    name:           Mapped[str_50]   = mapped_column(nullable=True)
    description:    Mapped[str_255]  = mapped_column(nullable=True)
    with_icon:      Mapped[bool]     = mapped_column(default=False)
    is_private:     Mapped[bool]
    members_count:  Mapped[int]
    unread_senders: Mapped[str]      = mapped_column(default='')
    last_reading:   Mapped[datetime] = mapped_column(default=get_now_datetime)

    users:    Mapped[list['User']]    = relationship(back_populates='chats', secondary='chat_user')
    messages: Mapped[list['Message']] = relationship(back_populates='chat')
