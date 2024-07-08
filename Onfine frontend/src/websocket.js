import { setUserStatus, likeMessageLocal, deleteChatLocal, deleteUserLocal, deleteMessagesLocal, setUserWriting, createChatLocal, createMessageLocal, setReadedMessages, readChat, getUsers, chatsInTop } from './store/chatSlice';
import { setAlertData } from './store/globalSlice';
import { serverWS, userData } from './store/localData';


function createWebSocket(dispatch) {
    const ws = new WebSocket(serverWS);

    ws.onopen = () => {
        ws.send(JSON.stringify({
            user_id: userData.userId,
            token:   userData.authToken,
        }));
    }

    ws.onerror = () => dispatch(setAlertData({ content: 'Connecting error' }));

    ws.onmessage = (e) => {
        const data = JSON.parse(e.data);

        switch (data.notifi_type) {

            case 'new_status':
                dispatch(setUserStatus({
                    userId:   data.user_id,
                    isOnline: data.is_online,
                }));
                break;

            case 'new_like':
                dispatch(likeMessageLocal({
                    chatId:    data.chat_id,
                    messageId: data.message_id,
                    isLiked:   data.is_liked,
                    fromOther: true,
                }));
                break;
            
            case 'deleted_chat':
                dispatch(deleteChatLocal(data.chat_id));
                break;
            
            case 'deleted_messages':
                dispatch(deleteMessagesLocal({
                    chatId:     data.chat_id,
                    messageIds: data.message_ids,
                }));
                break;
            
            case 'new_writing':
                dispatch(setUserWriting({
                    userId:    data.user_id,
                    chatId:    data.chat_id,
                    isWriting: data.is_writing,
                }));
                break;
            
            case 'new_chat':
                dispatch(createChatLocal({
                    chat: data.chat,
                    fromOther: true,
                }));
                if (data.chat.type === 'chat' && data.chat.companion_id)
                    dispatch(getUsers([data.chat.companion_id]))
                break;
            
            case 'new_message':
                dispatch(createMessageLocal({
                    chatId:  data.chat_id,
                    message: data.message,
                }));
                dispatch(readChat(data.chat_id));
                dispatch(chatsInTop(new Set([data.chat_id])));
                break;
            
            case 'readed_messages':
                dispatch(setReadedMessages({
                    chatId: data.chat_id,
                    lastReading: data.last_reading,
                }));
            
            case 'deleted_user':
                dispatch(deleteUserLocal(data.user_id))
                break;
        }
    }

    return () => ws.close();
}

export default createWebSocket;