from fastapi import APIRouter, HTTPException
import models.requests as reque
import models.responses as resp
from sqlalchemy import and_, select
from database.database import SessionMaker
from database.models import Message, User, Chat, ChatUser, ChatTypes, Like
from tools import connected_clients, check_auth, get_UUID, get_now_datetime, save_image, remove_image


router = APIRouter()


@router.post('/message/send', tags=['Message'], response_model=resp.SentMessage)
async def send(data: reque.SendMessages):
    if not check_auth(data):
        raise HTTPException(401, 'Wrong token')

    # Validation

    if not data.messages:
        raise HTTPException(400, 'There are no messages')

    chat_ids = [msg.chat_id for msg in data.messages]

    with SessionMaker.begin() as sess:
        rows = sess.query(
            Chat.type,
            ChatUser.is_admin
        ).filter(
            Chat.id.in_(chat_ids)
        ).outerjoin(
            ChatUser, and_(
            ChatUser.chat_id == Chat.id,
            ChatUser.user_id == data.user_id
        )).all()


        if len(rows) < len(chat_ids):
            raise HTTPException(404, 'Chat with this ID not exists')

        for row in rows:
            chat_type, is_admin = row.tuple()

            if is_admin is None:
                raise HTTPException(403, 'You are not a member of this chat')

            if chat_type == ChatTypes.channel.name and not is_admin:
                raise HTTPException(403, 'You are not an admin of this chat')

        if not data.reply_sender_id is None:
            user_id: str | None = sess.query(User.id).filter(User.id == data.reply_sender_id).scalar()

            if user_id is None:
                raise HTTPException(404, 'User with this ID not exists')

        # Prepare data

        sess.query(ChatUser).filter(
            ChatUser.chat_id.in_(chat_ids),
            ChatUser.user_id != data.user_id
        ).update({
            ChatUser.unread_count: ChatUser.unread_count + 1
        })

        date_time = get_now_datetime()
        message_ids = {}

        for msg in data.messages:
            # Add to database

            id_ = get_UUID()
            message_ids[msg.chat_id] = id_

            if msg.image:
                if not await save_image(f'{id_}_msg_image', msg.image):
                    raise HTTPException(400, 'Image error')

            sess.add(Message(
                id=id_,
                chat_id=msg.chat_id,
                content=msg.content,
                with_image=bool(msg.image),
                date_time=date_time,
                reply_content=msg.reply_content,
                reply_sender_id=data.reply_sender_id,
                sender_id=data.user_id,
            ))

            # Notify clients

            notifi = resp.NewMessage(
                chat_id=msg.chat_id,
                message=resp.Message(
                    id=id_,
                    sender_id=data.user_id,
                    content=msg.content,
                    image=msg.image,
                    date_time=date_time,
                    reply_content=msg.reply_content,
                    reply_sender_id=data.reply_sender_id,
            )).model_dump_json()

            query = select(ChatUser.user_id).where(ChatUser.chat_id == msg.chat_id, ChatUser.user_id != data.user_id)
            user_ids = sess.execute(query).scalars().all()

            for user_id in user_ids:
                if user_id in connected_clients:
                    await connected_clients[user_id].send_text(notifi)

        sess.query(Chat).filter(Chat.id.in_(chat_ids)).update({
            Chat.unread_senders: Chat.unread_senders + f'{data.user_id};'
        })

    return resp.SentMessage(message_ids=message_ids, date_time=date_time)


@router.post('/message/like', tags=['Message'])
async def like(data: reque.Like):
    if not check_auth(data):
        raise HTTPException(401, 'Wrong token')

    with SessionMaker.begin() as sess:
        row = sess.query(
            ChatUser.chat_id,
            Like.user_id,
        ).select_from(Message).filter(
            Message.id == data.message_id
        ).outerjoin(
            ChatUser, and_(
            ChatUser.chat_id == Message.chat_id,
            ChatUser.user_id == data.user_id
        )).outerjoin(
            Like, and_(
            Like.message_id == Message.id,
            Like.user_id == data.user_id
        )).first()

        if row is None:
            raise HTTPException(404, 'Message with this ID not exists')

        chat_id, like_user_id = row.tuple()

        if chat_id is None:
            raise HTTPException(403, 'You are not a member of this chat')


        is_liked = not like_user_id is None

        if is_liked:
            sess.query(Like).filter(
                Like.message_id == data.message_id,
                Like.user_id == data.user_id
            ).delete()
        else:
            sess.add(Like(message_id=data.message_id, user_id=data.user_id))

        query = select(ChatUser.user_id).where(ChatUser.chat_id == chat_id, ChatUser.user_id != data.user_id)
        user_ids = sess.execute(query).scalars().all()


    notifi = resp.NewLike(
        chat_id=chat_id,
        message_id=data.message_id,
        is_liked=not is_liked
    ).model_dump_json()

    for user_id in user_ids:
        if user_id in connected_clients:
            await connected_clients[user_id].send_text(notifi)


@router.delete('/message/delete', tags=['Message'])
async def delete(data: reque.DeleteMessages):
    if not check_auth(data):
        raise HTTPException(401, 'Wrong token')
    
    if not data.message_ids:
        raise HTTPException(400, 'Messages are not specified')
    
    with SessionMaker.begin() as sess:
        rows = sess.query(
            Message.id,
            Message.sender_id,
            Message.with_image
        ).filter(
            Message.id.in_(data.message_ids),
            Message.chat_id == data.chat_id
        ).all()

        if len(rows) < len(data.message_ids):
            raise HTTPException(404, 'Message with this ID not exists')
        

        chat_type, is_admin = sess.query(
            Chat.type,
            ChatUser.is_admin
        ).filter(
            Chat.id == data.chat_id
        ).outerjoin(
            ChatUser, and_(
            ChatUser.chat_id == data.chat_id,
            ChatUser.user_id == data.user_id
        )).first().tuple()

        if is_admin is None:
            raise HTTPException(403, 'You are not a member of this chat')
        

        messages_with_image = []

        for row in rows:
            id_, sender_id, with_image = row.tuple()

            if not is_admin and not (chat_type == ChatTypes.group.name and sender_id == data.user_id):
                raise HTTPException(403, "You can't delete message(s)")
            
            if with_image:
                messages_with_image.append(id_)


        sess.query(Message).filter(Message.id.in_(data.message_ids)).delete()


        query = select(ChatUser.user_id).where(ChatUser.chat_id == data.chat_id, ChatUser.user_id != data.user_id)
        user_ids = sess.execute(query).scalars().all()
    
    for id_ in messages_with_image:
        remove_image(f'{id_}_msg_image')

    notifi = resp.DeletedMessages(
        chat_id=data.chat_id,
        message_ids=data.message_ids
    ).model_dump_json()

    for user_id in user_ids:
        if user_id in connected_clients:
            await connected_clients[user_id].send_text(notifi)
