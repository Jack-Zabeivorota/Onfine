import uvicorn
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
import models.requests as reque
import models.responses as resp
from database.database import SessionMaker
from database.models import User 
from tools import check_auth, parse_model, json_response, connected_clients, get_now_datetime, logout_user

from routes.chat import router as chat_router
from routes.user import router as user_router
from routes.message import router as message_router


app = FastAPI()
app.include_router(chat_router)
app.include_router(user_router)
app.include_router(message_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*']
)

app.mount('/view', StaticFiles(directory='view', html=True), name='view')
app.mount('/images', StaticFiles(directory='images'), name='images')


@app.get('/', response_class=RedirectResponse)
def view():
    return RedirectResponse(url='/view')


async def send_user_status(user_id: str, is_online: bool):
    notifi = resp.NewStatus(user_id=user_id, is_online=is_online).model_dump_json()

    for socket in connected_clients.values():
        await socket.send_text(notifi)


@app.websocket('/ws')
async def ws(socket: WebSocket):
    await socket.accept()

    data: dict = await socket.receive_json()
    auth_data: reque.Auth | None = parse_model(reque.Auth, **data)

    if auth_data is None:
        await json_response(socket, 'Wrong parameters', 400)
        return
    
    if not check_auth(auth_data):
        await json_response(socket, 'Wrong token', 401)
        return

    user_id = auth_data.user_id

    await send_user_status(user_id, True)
    connected_clients[user_id] = socket

    try:
        while True:
            await socket.receive_text()
    finally:
        connected_clients.pop(user_id)

        with SessionMaker.begin() as sess:
            sess.query(User).filter(User.id == user_id).update({
                User.last_visit: get_now_datetime()
            })

        logout_user(user_id)
        await send_user_status(user_id, False)


if __name__ == '__main__':
    uvicorn.run('main:app', reload=True)
