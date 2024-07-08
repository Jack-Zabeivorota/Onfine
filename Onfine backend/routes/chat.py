from typing import Literal
import json
from fastapi import APIRouter, HTTPException, UploadFile, Form
import models.requests as reque
import models.responses as resp
from sqlalchemy import or_, and_, select, func
from sqlalchemy.orm import aliased
from database.database import SessionMaker
from database.models import User, Message, Chat, ChatUser, ChatTypes, Like
from tools import connected_clients, check_auth, parse_model, get_UUID, get_now_datetime, save_image, remove_image, read_image


router = APIRouter()


@router.post('/chat/posts', tags=['Chat'], response_model=list[resp.Post])
def posts(data: reque.GetPosts):
    if not check_auth(data):
        raise HTTPException(401, 'Wrong token')
    
    with SessionMaker() as sess:
        likes = sess.query(
            Like.message_id,
            func.count().label('likes_count')
        ).group_by(Like.message_id).subquery()

        rows = sess.query(
            Chat.id,
            Message.id,
            Message.content,
            Message.with_image,
            Message.date_time,
            likes.c.likes_count,
            Like.user_id.label('is_liked')
        ).join( # select channels by user subscribe
            ChatUser, and_(
            ChatUser.user_id == data.user_id,
            ChatUser.chat_id == Chat.id,
            Chat.type == ChatTypes.channel.name,
        )).join( # select messages from channels
            Message, and_(
            Message.chat_id == Chat.id,
            Message.date_time < data.start_date_time,
        )).outerjoin( # find like at user on finded messages
            Like, and_(
            Like.message_id == Message.id,
            Like.user_id == data.user_id,
        )).outerjoin( # join likes on messages
            likes,
            likes.c.message_id == Message.id
        ).order_by(Message.date_time.desc()).limit(data.limit).all()

    posts = []

    for row in rows:
        chat_id, id_, content, with_image, date_time, likes, is_liked = row.tuple()

        posts.append(resp.Post(
            id=id_,
            sender_id=chat_id,
            content=content,
            image=read_image(f'{id_}_msg_image') if with_image else None,
            date_time=date_time,
            likes=0 if likes is None else likes,
            is_liked=not is_liked is None
        ))
    
    return posts


@router.post('/chat/messages', tags=['Chat'], response_model=list[resp.Message])
def messages(data: reque.GetMessages):
    if not check_auth(data):
        raise HTTPException(401, 'Wrong token')

    with SessionMaker() as sess:
        row = sess.query(
            Chat.id,
            ChatUser.user_id
        ).filter(
            Chat.id == data.chat_id
        ).outerjoin(
            ChatUser, and_(
            ChatUser.chat_id == Chat.id,
            ChatUser.user_id == data.user_id
        )).first()

        if row is None:
            raise HTTPException(404, 'Chat with this ID not exists')

        _, user_id = row.tuple()

        if user_id is None:
            raise HTTPException(403, 'You are not a member of this chat')


        likes = sess.query(
            Like.message_id,
            func.count().label('likes_count')
        ).group_by(Like.message_id).subquery()

        messages = sess.query(
            Message.id,
            Message.sender_id,
            Message.content,
            Message.with_image,
            Message.date_time,
            Message.reply_content,
            Message.reply_sender_id
        ).filter(
            Message.chat_id == data.chat_id,
            Message.date_time < data.start_date_time
        ).order_by(Message.date_time.desc()).limit(data.limit).subquery()

        rows = sess.query(
            messages.c.id,
            messages.c.sender_id,
            messages.c.content,
            messages.c.with_image,
            messages.c.date_time,
            messages.c.reply_content,
            messages.c.reply_sender_id,
            likes.c.likes_count,
            Like.user_id.label('is_liked')
        ).outerjoin(
            Like, and_(
            Like.message_id == messages.c.id,
            Like.user_id == data.user_id
        )).outerjoin(
            likes,
            likes.c.message_id == messages.c.id
        ).all()

    messages = []

    for row in rows:
        id_, sender_id, content, with_image, date_time, reply_content, reply_sender_id, likes, is_liked = row.tuple()

        messages.append(resp.Message(
            id=id_,
            sender_id=sender_id,
            content=content,
            image=read_image(f'{id_}_msg_image') if with_image else None,
            date_time=date_time,
            reply_content=reply_content,
            reply_sender_id=reply_sender_id,
            likes=0 if likes is None else likes,
            is_liked=not is_liked is None
        ))
    
    return messages


@router.post('/chat/all', tags=['Chat'], response_model=list[resp.Chat])
def all_chats(data: reque.Auth):
    if not check_auth(data):
        raise HTTPException(401, 'Wrong token')

    with SessionMaker() as sess:
        last_messages = sess.query(
            Message.chat_id,
            func.max(Message.date_time).label('date_time')
        ).group_by(Message.chat_id).subquery()
        
        chatUsers = sess.query(
            ChatUser.chat_id,
            ChatUser.is_admin,
            ChatUser.key,
            ChatUser.unread_count
        ).filter(ChatUser.user_id == data.user_id).subquery()

        rows = sess.query(
            Chat.id,
            Chat.type,
            Chat.name,
            Chat.description,
            Chat.with_icon,
            Chat.is_private,
            Chat.members_count,
            Chat.last_reading,
            Message.content,
            Message.date_time,
            Message.sender_id,
            chatUsers.c.is_admin,
            chatUsers.c.key,
            chatUsers.c.unread_count,
            ChatUser.user_id
        ).select_from(chatUsers).outerjoin(
            Chat,
            Chat.id == chatUsers.c.chat_id
        ).outerjoin(
            last_messages,
            last_messages.c.chat_id == Chat.id
        ).outerjoin(
            Message, and_(
            Message.chat_id == last_messages.c.chat_id,
            Message.date_time == last_messages.c.date_time
        )).outerjoin(
            ChatUser, and_(
            Chat.type == ChatTypes.chat.name,
            ChatUser.chat_id == Chat.id,
            ChatUser.user_id != data.user_id
        )).order_by(Message.date_time.desc()).all()

    chats = []

    for row in rows:
        id_, type_, name, description, with_icon, is_private, members_count, last_reading, msg_content, msg_datetime, msg_sender_id, is_admin, key, unread_count, companion_id = row.tuple()

        chats.append(resp.Chat(
            id=id_,
            type=type_,
            companion_id=companion_id,
            name=name,
            description=description,
            with_icon=with_icon,
            is_private=is_private,
            members_count=members_count,
            last_reading=last_reading,
            message_content=msg_content,
            message_datetime=msg_datetime,
            message_sender_id=msg_sender_id,
            is_admin=is_admin,
            key=key,
            unread_count=unread_count
        ))
    
    return chats


@router.post('/chat/create', tags=['Chat'], response_model=resp.CreatedChat)
async def create(data: str = Form(...), icon: UploadFile | Literal['none'] = Form('none')):
    data: reque.CreateChat | None = parse_model(reque.CreateChat, **json.loads(data))
    if not data:
        raise HTTPException(400, 'Wrong parameters')

    if not check_auth(data):
        raise HTTPException(401, 'Wrong token')
    
    # Validation

    if data.type == ChatTypes.chat.name and len(data.members) != 1:
        raise HTTPException(400, 'This chat should have one member')
    
    with SessionMaker.begin() as sess:
        member_ids = [member.id for member in data.members]

        if data.user_id in member_ids:
            raise HTTPException(400, "You can't identify yourself as a member")

        members_count: int = sess.query(func.count()).filter(User.id.in_(member_ids)).scalar()

        if members_count < len(data.members):
            raise HTTPException(404, 'Not all members were found')
        
        if data.type == ChatTypes.chat.name:
            chatUser1: ChatUser = aliased(ChatUser)
            chatUser2: ChatUser = aliased(ChatUser)

            chat_id: str | None = sess.query(Chat.id).filter(
                Chat.type == ChatTypes.chat.name
            ).join(
                chatUser1, and_(
                chatUser1.chat_id == Chat.id,
                chatUser1.user_id == data.user_id
            )).join(
                chatUser2, and_(
                chatUser2.chat_id == Chat.id,
                chatUser2.user_id == data.members[0].id
            )).scalar()

            if not chat_id is None:
                raise HTTPException(400, 'This chat already exists')

        # Saving

        id_ = get_UUID()
        
        if data.type == ChatTypes.chat.name:
            is_private = True
            name = None
            description = None
            companion_id = data.user_id
        else:
            is_private = data.is_private
            name = data.name
            description = data.description
            companion_id = None

        members_count += 1
        last_reading = get_now_datetime()
        with_icon = icon != 'none'

        if with_icon:
            if not await save_image(f'{id_}_icon', icon):
                raise HTTPException(400, 'Icon error')

        sess.add(Chat(
            id=id_,
            type=data.type,
            name=name,
            description=description,
            with_icon=with_icon,
            is_private=is_private,
            members_count=members_count,
            last_reading=last_reading,
        ))

        sess.add(ChatUser(
            chat_id=id_,
            user_id=data.user_id,
            is_admin=True,
            key=data.my_key
        ))

        for member in data.members:
            sess.add(ChatUser(
                chat_id=id_,
                user_id=member.id,
                is_admin=True if data.type == ChatTypes.chat.name else member.is_admin,
                key=member.key
            ))
    
    # Notification

    chat = resp.Chat(
        id=id_,
        type=data.type,
        name=name,
        description=description,
        with_icon=with_icon,
        companion_id=companion_id,
        is_private=is_private,
        members_count=members_count,
        is_admin=False,
        last_reading=last_reading
    )

    for member in data.members:
        if member.id in connected_clients:
            chat.key = member.key
            chat.is_admin = member.is_admin
            
            notifi = resp.NewChat(chat=chat).model_dump_json()
            await connected_clients[member.id].send_text(notifi)
    
    return resp.CreatedChat(chat_id=id_)


@router.put('/chat/update', tags=['Chat'])
async def update(data: str = Form(...), icon: UploadFile | Literal['none', 'null'] = Form()):
    data: reque.UpdateChatData | None = parse_model(reque.UpdateChatData, **json.loads(data))
    if not data:
        raise HTTPException(400, 'Wrong parameters')
    
    if not check_auth(data):
        raise HTTPException(401, 'Wrong token')
    
    with SessionMaker.begin() as sess:
        id_: str | None = sess.query(Chat.id).filter(Chat.id == data.chat_id).scalar()

        if id_ is None:
            raise HTTPException(404, 'Chat with this ID not exists')


        values = {
            Chat.name:        data.name,
            Chat.description: data.description,
        }

        if icon != 'null':
            if icon == 'none':
                remove_image(f'{data.chat_id}_icon')
                values[Chat.with_icon] = False
            else:
                if not await save_image(f'{data.chat_id}_icon', icon):
                    raise HTTPException(400, 'Icon error')
                values[Chat.with_icon] = True
        

        sess.query(Chat).filter(Chat.id == data.chat_id).update(values)


@router.post('/chat/read', tags=['Chat'])
async def read(data: reque.ChatData):
    if not check_auth(data):
        raise HTTPException(401, 'Wrong token')
    
    with SessionMaker.begin() as sess:
        unread_senders: str | None = sess.query(Chat.unread_senders).filter(Chat.id == data.chat_id).scalar()

        if unread_senders is None:
            raise HTTPException(404, 'Chat with this ID not exists')

        change_count = sess.query(ChatUser).filter(
            ChatUser.chat_id == data.chat_id,
            ChatUser.user_id == data.user_id
        ).update({ ChatUser.unread_count: 0 })

        if change_count == 0:
            raise HTTPException(403, 'You are not a member of this chat')

        if unread_senders != '':
            last_reading = get_now_datetime()

            sess.query(Chat).filter(Chat.id == data.chat_id).update({
                Chat.unread_senders: '',
                Chat.last_reading: last_reading
            })

            notify = resp.ReadedMessages(
                chat_id=data.chat_id,
                last_reading=last_reading
            ).model_dump_json()

            for sender_id in unread_senders.split(';'):
                if sender_id in connected_clients:
                    await connected_clients[sender_id].send_text(notify)


@router.post('/chat/chat_users', tags=['Chat'], response_model=list[str])
def chat_users(data: reque.ChatData):
    if not check_auth(data):
        raise HTTPException(401, 'Wrong token')
    
    with SessionMaker() as sess:
        user_id: str | None = sess.query(ChatUser.chat_id).filter(
            ChatUser.chat_id == data.chat_id,
            ChatUser.user_id == data.user_id
        ).scalar()

        if user_id is None:
            raise HTTPException(403, 'You are not a member of this chat')

        query = select(ChatUser.user_id).where(ChatUser.chat_id == data.chat_id, ChatUser.user_id != user_id)
        user_ids: list[str] = sess.execute(query).scalars().all()
        
        return user_ids


@router.post('/chat/add_members', tags=['Chat'])
async def add_members(data: reque.AddMembers):
    if not check_auth(data):
        raise HTTPException(401, 'Wrong token')

    if not data.members:
        raise HTTPException(400, 'Members not specified')
    
    with SessionMaker.begin() as sess:
        # check chat

        chat_type: str | None = sess.query(Chat.type).filter(Chat.id == data.chat_id).scalar()

        if chat_type is None:
            raise HTTPException(404, 'Chat with this ID not exists')

        if chat_type == ChatTypes.chat.name:
            raise HTTPException(403, "You can't add members to this chat")

        # check user and members

        member_ids = [member.id for member in data.members]

        if data.user_id in member_ids:
            raise HTTPException(400, "You can't identify yourself as a member")

        members_count: int = sess.query(func.count()).filter(User.id.in_(member_ids)).scalar()

        if members_count < len(member_ids):
            raise HTTPException(404, 'Member with this ID not exists')


        rows = sess.query(
            ChatUser.user_id,
            ChatUser.is_admin
        ).filter(
            ChatUser.chat_id == data.chat_id, or_(
                ChatUser.user_id == data.user_id,
                ChatUser.user_id.in_(member_ids)
        )).all()

        is_admin = None

        for row in rows:
            user_id, _is_admin = row.tuple()

            if user_id == data.user_id:
                is_admin = _is_admin
                break

        if is_admin is None:
            raise HTTPException(403, 'You are not a member of this chat')
        
        if not is_admin:
            raise HTTPException(403, 'You are not a admin of this chat')

        if len(rows) > 1:
            raise HTTPException(400, 'Some members are already in this chat')

        # Add members to DB and update chat

        for member in data.members:
            sess.add(ChatUser(
                chat_id=data.chat_id,
                user_id=member.id,
                is_admin=member.is_admin,
                key=member.key
            ))

        sess.query(Chat).filter(Chat.id == data.chat_id).update({
            Chat.members_count: Chat.members_count + members_count
        })

        last_message = sess.query(
            Message.chat_id,
            Message.content,
            Message.date_time,
            Message.sender_id,
        ).filter(
            Message.chat_id == data.chat_id
        ).order_by(Message.date_time.desc()).limit(1).subquery()

        row = sess.query(
            Chat.name,
            Chat.description,
            Chat.with_icon,
            Chat.is_private,
            Chat.last_reading,
            Chat.members_count,
            last_message.c.content,
            last_message.c.date_time,
            last_message.c.sender_id,
        ).filter(
            Chat.id == data.chat_id
        ).outerjoin(
            last_message,
            last_message.c.chat_id == Chat.id
        ).first()

        name, description, with_icon, is_private, last_reading, members_count, msg_content, msg_datetime, msg_sender_id = row.tuple()
    
    # Notify other users at chat

    chat = resp.Chat(
        id=data.chat_id,
        type=chat_type,
        name=name,
        description=description,
        with_icon=with_icon,
        is_private=is_private,
        last_reading=last_reading,
        members_count=members_count,
        message_content=msg_content,
        message_datetime=msg_datetime,
        message_sender_id=msg_sender_id,
        is_admin=False
    )

    for member in data.members:
        if member.id in connected_clients:
            chat.key = member.key
            chat.is_admin = member.is_admin
            
            notify = resp.NewChat(chat=chat).model_dump_json()
            await connected_clients[member.id].send_text(notify)


@router.delete('/chat/remove_members', tags=['Chat'])
async def remove_members(data: reque.RemoveMembers):
    if not check_auth(data):
        raise HTTPException(401, 'Wrong token')
    
    with SessionMaker.begin() as sess:
        is_admin: bool | None = sess.query(ChatUser.is_admin).filter(
            ChatUser.user_id == data.user_id,
            ChatUser.chat_id == data.chat_id
        ).scalar()

        if is_admin is None:
            raise HTTPException(403, 'You are not a member of this chat')
        
        if not is_admin:
            raise HTTPException(403, 'You are not a admin of this chat')
        
        members_count: int = sess.query(func.count()).filter(
            ChatUser.chat_id == data.chat_id,
            ChatUser.user_id.in_(data.member_ids)
        ).scalar()

        if members_count < len(data.member_ids):
            raise HTTPException(400, 'User with this ID is not a member of this chat')
        
        sess.query(ChatUser).filter(
            ChatUser.chat_id == data.chat_id,
            ChatUser.user_id.in_(data.member_ids)
        ).delete()


@router.post('/chat/join', tags=['Chat'], response_model=resp.Chat)
def join(data: reque.ChatData):
    if not check_auth(data):
        raise HTTPException(401, 'Wrong token')

    with SessionMaker.begin() as sess:
        row = sess.query(
            Chat.type,
            Chat.is_private,
            ChatUser.user_id,
        ).filter(
            Chat.id == data.chat_id
        ).outerjoin(
            ChatUser, and_(
            ChatUser.chat_id == Chat.id,
            ChatUser.user_id == data.user_id,
        )).first()

        if row is None:
            raise HTTPException(404, 'Chat with this ID not exists')
        
        chat_type, is_private, user_id = row.tuple()

        if not user_id is None:
            raise HTTPException(400, 'You already join in this chat')

        if chat_type == ChatTypes.chat.name:
            raise HTTPException(403, "You can't join chats")

        if is_private:
            raise HTTPException(403, 'You can join by invitation only')


        sess.add(ChatUser(
            chat_id=data.chat_id,
            user_id=data.user_id
        ))
        sess.query(Chat).filter(Chat.id == data.chat_id).update({
            Chat.members_count: Chat.members_count + 1
        })


        last_message = sess.query(
            Message.chat_id,
            Message.content,
            Message.date_time,
            Message.sender_id
        ).filter(
            Message.chat_id == data.chat_id
        ).order_by(Message.date_time.desc()).limit(1).subquery()

        row = sess.query(
            Chat.name,
            Chat.description,
            Chat.with_icon,
            Chat.last_reading,
            Chat.members_count,
            last_message.c.content,
            last_message.c.date_time,
            last_message.c.sender_id,
        ).filter(
            Chat.id == data.chat_id
        ).outerjoin(
            last_message,
            last_message.c.chat_id == Chat.id,
        ).first()
    
    name, description, with_icon, last_reading, members_count, msg_content, msg_datetime, msg_sender_id = row.tuple()

    return resp.Chat(
        id=data.chat_id,
        type=chat_type,
        name=name,
        description=description,
        with_icon=with_icon,
        is_private=False,
        last_reading=last_reading,
        members_count=members_count,
        message_content=msg_content,
        message_datetime=msg_datetime,
        message_sender_id=msg_sender_id,
        is_admin=False
    )


@router.post('/chat/leave', tags=['Chat'])
def leave(data: reque.ChatData):
    if not check_auth(data):
        raise HTTPException(401, 'Wrong token')

    with SessionMaker.begin() as sess:
        row = sess.query(Chat.type, Chat.members_count).filter(Chat.id == data.chat_id).first()

        if row is None:
            raise HTTPException(404, 'Chat with this ID not found')

        type_, members_count = row.tuple()

        if type_ == ChatTypes.chat.name:
            raise HTTPException(403, "It's impossible to leave a chat")

        delete_count = sess.query(ChatUser).filter(
            ChatUser.chat_id == data.chat_id,
            ChatUser.user_id == data.user_id
        ).delete()

        if delete_count == 0:
            raise HTTPException(403, 'You are not a member of this chat')

        if members_count == 1:
            sess.query(Chat).filter(Chat.id == data.chat_id).delete()
        else:
            sess.query(Chat).filter(Chat.id == data.chat_id).update({
                Chat.members_count: members_count - 1
            })


@router.delete('/chat/delete', tags=['Chat'])
async def delete(data: reque.ChatData):
    if not check_auth(data):
        raise HTTPException(401, 'Wrong token')

    with SessionMaker.begin() as sess:
        row = sess.query(
            Chat.id,
            ChatUser.is_admin
        ).filter(
            Chat.id == data.chat_id
        ).outerjoin(
            ChatUser, and_(
            ChatUser.chat_id == Chat.id,
            ChatUser.user_id == data.user_id
        )).first()

        if row is None:
            raise HTTPException(404, 'Chat with this ID not exists')
        
        _, is_admin = row.tuple()

        if is_admin is None:
            raise HTTPException(403, 'You are not a member of this chat')
        
        if not is_admin:
            raise HTTPException(403, 'You are not an admin of this chat')
        
        query = select(ChatUser.user_id).where(ChatUser.chat_id == data.chat_id, ChatUser.user_id != data.user_id)
        user_ids: list[str] = sess.execute(query).scalars().all()

        sess.query(Chat).filter(Chat.id == data.chat_id).delete()
        
    remove_image(f'{data.chat_id}_icon')

    notifi = resp.DeletedChat(chat_id=data.chat_id).model_dump_json()

    for user_id in user_ids:
        if user_id in connected_clients:
            await connected_clients[user_id].send_text(notifi)


@router.post('/chat/writing', tags=['Chat'])
async def writing(data: reque.WritingInChat):
    with SessionMaker() as sess:
        user_id: str | None = sess.query(ChatUser.user_id).filter(
            ChatUser.chat_id == data.chat_id,
            ChatUser.user_id == data.user_id
        ).scalar()

        if user_id is None:
            raise HTTPException(403, 'You are not a member of this chat')

        query = select(ChatUser.user_id).where(ChatUser.chat_id == data.chat_id, ChatUser.user_id != data.user_id)
        user_ids = sess.execute(query).scalars().all()

    notifi = resp.NewWriting(
        is_writing=data.is_writing,
        user_id=data.user_id,
        chat_id=data.chat_id
    ).model_dump_json()

    for user_id in user_ids:
        if user_id in connected_clients:
            await connected_clients[user_id].send_text(notifi)


@router.get('/chat/search', tags=['Chat'], response_model=list[resp.ChatBaseData])
def search(value: str, chat_type: str | None = None):
    with SessionMaker() as sess:
        query = sess.query(
            Chat.id,
            Chat.type,
            Chat.name,
            Chat.description,
            Chat.with_icon,
            Chat.members_count,
        ).filter(
            Chat.name.icontains(value),
            Chat.is_private == False
        )
        if chat_type:
            query = query.filter(Chat.type == chat_type)
        
        rows = query.all()
        chats = []

        for row in rows:
            id_, type_, name, description, with_icon, members_count = row.tuple()

            chats.append(resp.ChatBaseData(
                id=id_,
                type=type_,
                name=name,
                description=description,
                with_icon=with_icon,
                members_count=members_count
            ))
        
        return chats
