from typing import Literal
import json
from fastapi import APIRouter, HTTPException, Form, UploadFile
import models.requests as reque
import models.responses as resp
from sqlalchemy import or_, and_, select, case
from database.database import SessionMaker
from database.models import User, ChatUser, Chat
from tools import connected_clients, auth_user, check_auth, logout_user, hash_password, check_password, parse_model, get_now_datetime, get_UUID, save_image, remove_image


router = APIRouter()


@router.post('/user/register', tags=['User'], response_model=resp.Register)
def register(data: reque.Register):
    with SessionMaker.begin() as sess:
        user_id: str | None = sess.query(User.id).filter(or_(
            User.email == data.email,
            User.nickname == data.nickname
        )).scalar()

        if not user_id is None:
            raise HTTPException(400, 'User with that email or nicname is already exists')
        
        id_ = get_UUID()

        sess.add(User(
            id=id_,
            email=data.email,
            password=hash_password(data.password),
            name=data.name,
            nickname=data.nickname,
            with_avatar=False,
            pub_key=data.pub_key,
            priv_key=data.priv_key,
        ))

    return resp.Register(user_id=id_, token=auth_user(id_))


@router.post('/user/login', tags=['User'], response_model=resp.Login)
def login(data: reque.Login):
    with SessionMaker() as sess:
        row = sess.query(
            User.id,
            User.password,
            User.priv_key,
            User.name,
            User.nickname,
            User.with_avatar,
            User.latest_key_update
        ).filter(User.email == data.email).first()

    if row is None:
        raise HTTPException(404, 'User with this email not found')
    
    user_id, password, priv_key, name, nickname, with_avatar, latest_key_update = row.tuple()
    
    if not check_password(data.password, password):
        raise HTTPException(401, 'Wrong password')

    return resp.Login(
        user_id=user_id,
        token=auth_user(user_id),
        priv_key=priv_key,
        name=name,
        nickname=nickname,
        with_avatar=with_avatar,
        latest_key_update=latest_key_update
    )


@router.post('/user/logout', tags=['User'])
def logout(data: reque.Auth):
    if not check_auth(data):
        raise HTTPException(401, 'Wrong token')

    logout_user(data.user_id)


@router.post('/user/pub_keys', tags=['User'], response_model=dict[str, str])
def pub_keys(data: reque.Users):
    with SessionMaker() as sess:
        rows = sess.query(User.id, User.pub_key).filter(User.id.in_(data.user_ids)).all()

    keys = {}

    for row in rows:
        user_id, pub_key = row.tuple()
        keys[user_id] = pub_key

    return keys


@router.put('/user/update_keys_data', tags=['User'])
def update_keys_data(data: reque.UpdateKeysData):
    if not check_auth(data):
        raise HTTPException(401, 'Wrong token')
    
    with SessionMaker.begin() as sess:
        sess.query(User).filter(User.id == data.user_id).update({
            User.pub_key: data.pub_key,
            User.priv_key: data.priv_key,
            User.latest_key_update: get_now_datetime(),
        })

        sess.query(ChatUser).filter(
            ChatUser.user_id == data.user_id
        ).update({
            ChatUser.key: case(
                *[(ChatUser.chat_id == chat_id, key) for chat_id, key in data.chat_keys.items()],
                else_=ChatUser.key
            ),
        })


@router.post('/user/users', tags=['User'], response_model=dict[str, resp.User])
def users(data: reque.Users):
    with SessionMaker() as sess:
        rows = sess.query(
            User.id,
            User.name,
            User.nickname,
            User.with_avatar,
            User.last_visit
        ).filter(User.id.in_(data.user_ids)).all()
    
    users = {}

    for row in rows:
        id_, name, nickname, with_avatar, last_visit = row.tuple()
        users[id_] = resp.User(
            name=name,
            nickname=nickname,
            with_avatar=with_avatar,
            last_visit=last_visit,
            is_online=id_ in connected_clients
        )
    
    return users


@router.put('/user/update_data', tags=['User'])
async def update_data(data: str = Form(...), avatar: UploadFile | Literal['none', 'null'] = Form()):
    data: reque.UpdateUserData | None = parse_model(reque.UpdateUserData, **json.loads(data))
    if not data:
        raise HTTPException(400, 'Wrong parameters')

    if not check_auth(data):
        raise HTTPException(401, 'Wrong token')

    with SessionMaker.begin() as sess:
        user_id: str | None = sess.query(User.id).filter(
            User.id != data.user_id, or_(
            User.email == data.email,
            User.nickname == data.nickname
        )).scalar()

        if not user_id is None:
            raise HTTPException(400, 'User with that email or nicname is already exists')


        values = {
            User.email:    data.email,
            User.name:     data.name,
            User.nickname: data.nickname,
        }

        if avatar != 'null':
            if avatar == 'none':
                remove_image(f'{data.user_id}_avatar')
                values[User.with_avatar] = False
            else:
                if not await save_image(f'{data.user_id}_avatar', avatar):
                    raise HTTPException(400, 'Avatar error')
                values[User.with_avatar] = True

                
        sess.query(User).filter(User.id == data.user_id).update(values)


@router.put('/user/update_password', tags=['User'])
def update_password(data: reque.UpdatePassword):
    with SessionMaker.begin() as sess:
        password: str | None = sess.query(User.password).filter(User.id == data.user_id).scalar()

        if password is None:
            raise HTTPException(404, 'User with this ID not found')
        
        if not check_password(data.curr_password, password):
            raise HTTPException(401, 'Wrong password')

        sess.query(User).filter(User.id == data.user_id).update({
            User.password: hash_password(data.new_password),
            User.priv_key: data.priv_key
        })


@router.delete('/user/delete', tags=['User'])
async def delete_user(data: reque.DeleteUser):
    with SessionMaker.begin() as sess:
        password: str | None = sess.query(User.password).filter(User.id == data.user_id).scalar()

        if password is None:
            raise HTTPException(404, 'User with this ID not found')

        if not check_password(data.password, password):
            raise HTTPException(401, 'Wrong password')

        query = select(ChatUser.chat_id).where(ChatUser.user_id == data.user_id)
        chat_ids: list[str] = sess.execute(query).scalars().all()

        if chat_ids:
            sess.query(Chat).filter(Chat.id.in_(chat_ids)).update({
                Chat.members_count: Chat.members_count - 1
            })

        sess.query(User).filter(User.id == data.user_id).delete()

    remove_image(f'{data.user_id}_avatar')

    notifi = resp.DeletedUser(user_id=data.user_id).model_dump_json()

    for socket in connected_clients.values():
        await socket.send_text(notifi)


@router.post('/user/search', tags=['User'], response_model=list[resp.User])
def search(data: reque.SearchUsers):
    if not check_auth(data):
        raise HTTPException(401, 'Wrong token')

    with SessionMaker() as sess:
        query = sess.query(
            User.id,
            User.name,
            User.nickname,
            User.with_avatar,
            User.last_visit,
        ).filter(
            User.nickname.icontains(data.value),
            User.id != data.user_id
        )

        if data.chat_id:
            user_id: str | None = sess.query(ChatUser.user_id).filter(
                ChatUser.chat_id == data.chat_id,
                ChatUser.user_id == data.user_id
            ).scalar()

            if user_id is None:
                raise HTTPException(403, 'You are not a member of this chat')
            
            query = query.outerjoin(
                ChatUser, and_(
                ChatUser.chat_id == data.chat_id,
                ChatUser.user_id == User.id
            )).filter(ChatUser.chat_id == None)

        rows = query.limit(20).all()
        users = []

        for row in rows:
            id_, name, nickname, with_avatar, last_visit = row.tuple()

            users.append(resp.User(
                id=id_,
                name=name,
                nickname=nickname,
                with_avatar=with_avatar,
                last_visit=last_visit,
                is_online=id_ in connected_clients
            ))
        
        return users
