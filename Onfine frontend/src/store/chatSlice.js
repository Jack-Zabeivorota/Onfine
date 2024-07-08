import CryptoJS from 'crypto-js';
import JSEncrypt from 'jsencrypt';
import { setChatMasterData, setChatInfoData, setAlertData } from './globalSlice';
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { serverURL, userData } from './localData';
import { alertErrDecor, createFormData, throwError, readFileAsDataURL, cleanText, AESEncrypt, AESDecrypt } from '../tools';


export const updateKeysData = createAsyncThunk(
    'chat/updateKeysData',
    alertErrDecor(async (_, thunkAPI) => {
        if (!userData.latestKeyUpdate) {
            delete userData.latestKeyUpdate;
            return;
        }

        const days = (new Date() - new Date(userData.latestKeyUpdate)) / (1000 * 60 * 60 * 24);

        if (days < 90) {
            delete userData.latestKeyUpdate;
            return;
        }

        const keys    = new JSEncrypt();
        const privKey = keys.getPrivateKey();
        const chats   = thunkAPI.getState().chat.chats.filter(c => c.is_private);

        const chatKeys = {};

        for (const chat of chats)
            chatKeys[chat.id] = keys.encrypt(chat.key);

        const response = await fetch(serverURL + '/user/update_keys_data', {
            method: 'PUT',
            body: JSON.stringify({
                user_id:   userData.userId,
                token:     userData.authToken,
                pub_key:   keys.getPublicKey(),
                priv_key:  AESEncrypt(privKey, userData.cryptoKey),
                chat_keys: chatKeys,
            }),
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throwError(await response.json());

        userData.privKey = privKey;
        delete userData.latestKeyUpdate;
    }),
);

export const getChats = createAsyncThunk(
    'chat/getChats',
    alertErrDecor(async (_, thunkAPI) => {
        const response = await fetch(serverURL + '/chat/all', {
            method: 'POST',
            body: JSON.stringify({
                user_id: userData.userId,
                token:   userData.authToken,
            }),
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throwError(await response.json());

        const chats = await response.json();
        const companions = chats.filter(c => c.type === 'chat' && c.companion_id).map(c => c.companion_id);

        if (companions.length > 0)
            thunkAPI.dispatch(getUsers(companions));
    
        return chats;
    }),
);

export const getPosts = createAsyncThunk(
    'chat/getPosts',
    alertErrDecor(async (_, thunkAPI) => {
        const posts = thunkAPI.getState().chat.posts;

        const start_date_time = posts.length > 0 ?
            posts[posts.length - 1].date_time :
            new Date().toISOString();

        const response = await fetch(serverURL + '/chat/posts', {
            method: 'POST',
            body: JSON.stringify({
                user_id: userData.userId,
                token:   userData.authToken,
                start_date_time,
            }),
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throwError(await response.json());

        return await response.json();
    }),
);

export const getUsers = createAsyncThunk(
    'chat/getUsers',
    alertErrDecor(async (userIds) => {
        const response = await fetch(serverURL + '/user/users', {
            method: 'POST',
            body: JSON.stringify({ user_ids: Array.from(userIds) }),
            headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throwError(await response.json());
    
        return await response.json();
    }),
);

export const getMessages = createAsyncThunk(
    'chat/getMessages',
    alertErrDecor(async (chatId, thunkAPI) => {
        const state = thunkAPI.getState().chat;
        let messages = state.messages[chatId];
        
        const start_date_time = messages !== undefined && messages.length > 0 ?
            messages[0].date_time :
            new Date().toISOString();

        const response = await fetch(serverURL + '/chat/messages', {
            method: 'POST',
            body: JSON.stringify({
                user_id: userData.userId,
                token:   userData.authToken,
                chat_id: chatId,
                start_date_time,
            }),
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throwError(await response.json());

        messages = await response.json();

        const unknowUsers = new Set([
            ...messages
                .filter(m => m.sender_id && !(m.sender_id in state.users) && m.sender_id !== userData.userId)
                .map(m => m.sender_id),
            ...messages
                .filter(m => m.reply_sender_id && !(m.reply_sender_id in state.users) && m.reply_sender_id !== userData.userId)
                .map(m => m.reply_sender_id)
        ]);

        if (unknowUsers.size > 0)
            thunkAPI.dispatch(getUsers(unknowUsers));
  
        return { chatId, messages };
    }),
);

export const searchChats = createAsyncThunk(
    'chat/searchChats',
    alertErrDecor(async ({ value, chatType, setFoundChats }) => {
        const chatTypeParam = chatType !== null ? `&chat_type=${chatType}` : '';

        const response = await fetch(`${serverURL}/chat/search?value=${value}${chatTypeParam}`);
        if (!response.ok) throwError(await response.json());

        const chats = await response.json();

        for (const chat of chats) {
            chat.name        = cleanText(chat.name);
            chat.discription = cleanText(chat.discription);
        }
        setFoundChats(chats);
    }),
);

export const searchUsers = createAsyncThunk(
    'chat/searchUsers',
    alertErrDecor(async ({ value, chatId=null, setFoundUsers }) => {
        const response = await fetch(serverURL + '/user/search', {
            method: 'POST',
            body: JSON.stringify({
                user_id: userData.userId,
                token:   userData.authToken,
                value,
                chat_id: chatId,
            }),
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throwError(await response.json());
    
        const users = await response.json()
        
        for (const user of users) {
            user.name     = cleanText(user.name);
            user.nickname = cleanText(user.nickname);
        }
        setFoundUsers(users);
    }),
);

export const readChat = createAsyncThunk(
    'chat/readChat',
    alertErrDecor(async (chatId, thunkAPI) => {
        const selectedChatId = thunkAPI.getState().chat.selectedChatId;

        if (chatId !== selectedChatId) return;

        const response = await fetch(serverURL + '/chat/read', {
            method: 'POST',
            body: JSON.stringify({
                user_id: userData.userId,
                token:   userData.authToken,
                chat_id: chatId,
            }),
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throwError(await response.json());

        return chatId;
    }),
);

export const createChat = createAsyncThunk(
    'chat/createChat',
    alertErrDecor(async({ type='chat', name=null, description=null, icon='none', isPrivate=true, companion=null, members }, thunkAPI) => {
        const memberIds = Object.keys(members);
        let chatKey, my_key;

        name        = cleanText(name);
        description = cleanText(description);

        if (isPrivate) {
            const response = await fetch(serverURL + '/user/pub_keys', {
                method: 'POST',
                body: JSON.stringify({ user_ids: [userData.userId, ...memberIds] }),
                headers: { 'Content-Type': 'application/json' },
            });
            if (!response.ok) throwError(await response.json());

            const pubKeys = await response.json();

            if (Object.keys(pubKeys).length < memberIds.length + 1)
                throw new Error('User with this ID not found');


            const keys = new JSEncrypt();
            keys.setPublicKey(pubKeys[userData.userId]);

            chatKey = CryptoJS.lib.WordArray.random(32).toString();
            my_key = keys.encrypt(chatKey);

            members = memberIds.map(id => {
                keys.setPublicKey(pubKeys[id]);
                return {
                    id,
                    key: keys.encrypt(chatKey),
                    ...members[id],
                };
            });
        }
        else {
            chatKey = my_key = null;
            members = memberIds.map(id => { return { id, ...members[id] }; });
        }

        const response = await fetch(serverURL + '/chat/create', {
            method: 'POST',
            body: createFormData({
                data: JSON.stringify({
                    user_id: userData.userId,
                    token:   userData.authToken,
                    type,
                    name,
                    description,
                    is_private: isPrivate,
                    my_key,
                    members,
                }),
                icon
            }),
        });
        if (!response.ok) throwError(await response.json());

        const { chat_id } = await response.json();

        thunkAPI.dispatch(setChatMasterData(null));
        companion && thunkAPI.dispatch(addUserLocal({userId: memberIds[0], user: {...companion}}));

        thunkAPI.dispatch(createChatLocal({
            chat: {
                id: chat_id,
                type,
                name,
                description,
                with_icon: icon !== 'none',
                companion_id: type === 'chat' ? memberIds[0] : null,
                key: chatKey,
                is_private: isPrivate,
                members_count: memberIds.length + 1,
                last_reading: new Date().toISOString().replace('Z', ''),
                is_admin: true,
                message_content: null,
                message_datetime: null,
                message_sender_id: null,
                all_messages_is_loaded: true,
                unread_count: 0,
                writing_users: [],
            },
            fromOther: false,
        }));
    }),
);

export const addMembers = createAsyncThunk(
    'chat/addMembers',
    alertErrDecor(async ({ chatId, members }, thunkAPI) => {
        const memberIds = Object.keys(members);
        const chat = thunkAPI.getState().chat.chats.find(chat => chat.id === chatId);

        if (chat.is_private) {
            const response = await fetch(serverURL + '/user/pub_keys', {
                method: 'POST',
                body: JSON.stringify({ user_ids: memberIds }),
                headers: { 'Content-Type': 'application/json' },
            });
            if (!response.ok) throwError(await response.json());

            const pubKeys = await response.json();

            if (Object.keys(pubKeys).length < memberIds.length)
                throw new Error('User with this ID not found');

            const keys = new JSEncrypt();
        
            members = memberIds.map(id => {
                keys.setPublicKey(pubKeys[id]);
                return {
                    id,
                    key: keys.encrypt(chat.key),
                    ...members[id],
                };
            });
        } else {
            members = memberIds.map(id => { return { id, ...members[id] }; });
        }

        const response = await fetch(serverURL + '/chat/add_members', {
            method: 'POST',
            body: JSON.stringify({
                user_id: userData.userId,
                token:   userData.authToken,
                chat_id: chatId,
                members: members,
            }),
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throwError(await response.json());

        return {
            chatId: chat.id,
            added_members_count: memberIds.length,
        };
    }),
);

export const joinToChat = createAsyncThunk(
    'chat/joinToChat',
    alertErrDecor(async (chatId, thunkAPI) => {
        const response = await fetch(serverURL + '/chat/join', {
            method: 'POST',
            body: JSON.stringify({
                user_id: userData.userId,
                token:   userData.authToken,
                chat_id: chatId,
            }),
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throwError(await response.json());

        thunkAPI.dispatch(setChatInfoData(null));
        thunkAPI.dispatch(getMessages(chatId));

        return await response.json();
    }),
);

export const updateChatData = createAsyncThunk(
    'chat/updateChatData',
    alertErrDecor(async ({ chatId, name, description, icon }, thunkAPI) => {
        if (name === '')
            throw new Error('Chat name not entered');

        name        = cleanText(name);
        description = cleanText(description);

        const response = await fetch(serverURL + '/chat/update', {
            method: 'PUT',
            body: createFormData({
                data: JSON.stringify({
                    user_id: userData.userId,
                    token:   userData.authToken,
                    chat_id: chatId,
                    name,
                    description,
                }),
                icon
            })
        });
        if (!response.ok) throwError(await response.json());

        thunkAPI.dispatch(setAlertData({
            content: 'Chat updated',
            isSuccess: true,
        }));

        return { chatId, name, description, icon };
    }),
);

export const leaveChat = createAsyncThunk(
    'chat/leaveChat',
    alertErrDecor(async(chatId) => {
        const response = await fetch(serverURL + '/chat/leave', {
            method: 'POST',
            body: JSON.stringify({
                user_id: userData.userId,
                token:   userData.authToken,
                chat_id: chatId,
            }),
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throwError(await response.json());

        return chatId;
    }),
);

export const deleteChat = createAsyncThunk(
    'chat/deleteChat',
    alertErrDecor(async (chatId, thunkAPI) => {
        const response = await fetch(serverURL + '/chat/delete', {
            method: 'DELETE',
            body: JSON.stringify({
                user_id: userData.userId,
                token:   userData.authToken,
                chat_id: chatId,
            }),
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throwError(await response.json());

        thunkAPI.dispatch(deleteChatLocal(chatId));
    }),
);

export const writingInChat = createAsyncThunk(
    'chat/writingInChat',
    alertErrDecor(async ({ chatId, isWriting }) => {
        await fetch(serverURL + '/chat/writing', {
            method: 'POST',
            body: JSON.stringify({
                user_id:    userData.userId,
                token:      userData.authToken,
                chat_id:    chatId,
                is_writing: isWriting,
            }),
            headers: { 'Content-Type': 'application/json' }
        });
    }),
);


export const sendMessage = createAsyncThunk(
    'chat/sendMessage',
    alertErrDecor(async ({ chatIds, content, image, replyContent=null, replySenderId=null, clearFields }, thunkAPI) => {
        content      = cleanText(content);
        replyContent = cleanText(replyContent);
        
        if (image instanceof Blob)
            image = await readFileAsDataURL(image);
        
        const chats = thunkAPI.getState().chat.chats.filter(chat => chatIds.has(chat.id));
        const messages = [];

        for (const chat of chats)
            if (chat.key)
                messages.push({
                    chat_id:       chat.id,
                    image:         AESEncrypt(image, chat.key),
                    content:       AESEncrypt(content, chat.key),
                    reply_content: AESEncrypt(replyContent, chat.key),
                });
            else
                messages.push({
                    chat_id: chat.id,
                    image,
                    content,
                    reply_content: replyContent,
                });
        
        const response = await fetch(serverURL + '/message/send', {
            method: 'POST',
            body: JSON.stringify({
                user_id: userData.userId,
                token:   userData.authToken,
                messages,
                reply_sender_id: replySenderId,
            }),
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throwError(await response.json());
        
        clearFields && clearFields();
        thunkAPI.dispatch(chatsInTop(chatIds));

        const { message_ids, date_time } = await response.json();

        return {
            messageIds: message_ids,
            message: {
                content,
                image,
                date_time,
                sender_id: userData.userId,
                reply_content: replyContent,
                reply_sender_id: replySenderId,
                likes: 0,
                is_liked: false,
            },
        };
    }),
);

export const likeMessage = createAsyncThunk(
    'chat/likeMessage',
    alertErrDecor(async ({ chatId, messageId, isLiked }, thunkAPI) => {
        const response = await fetch(serverURL + '/message/like', {
            method: 'POST',
            body: JSON.stringify({
                user_id:    userData.userId,
                token:      userData.authToken,
                message_id: messageId,
            }),
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throwError(await response.json());

        thunkAPI.dispatch(likeMessageLocal({ chatId, messageId, isLiked, fromOther: false }));
    }),
);

export const deleteMessages = createAsyncThunk(
    'chat/deleteMessages',
    alertErrDecor(async ({ chatId, messageIds }, thunkAPI) => {
        const response = await fetch(serverURL + '/message/delete', {
            method: 'DELETE',
            body: JSON.stringify({
                user_id:     userData.userId,
                token:       userData.authToken,
		        chat_id:     chatId,
                message_ids: messageIds,
            }),
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throwError(await response.json());

        thunkAPI.dispatch(deleteMessagesLocal({chatId, messageIds}));
    }),
);


const initialState = {
    posts: [],
    all_posts_is_loaded: false,
    chats: [],
    users: {},
    messages: {},
    selectedChatId: null,
};

export const chatSlice = createSlice({
    name: 'chat',
    initialState,
    reducers: {
        selectChat: (state, action) => { state.selectedChatId = action.payload; },
        chatsInTop: (state, action) => {
            const chatIds = action.payload;

            state.chats = [
                ...state.chats.filter(chat => chatIds.has(chat.id)),
                ...state.chats.filter(chat => !chatIds.has(chat.id)),
            ];
        },
        createChatLocal: (state, action) => {
            const { chat, fromOther } = action.payload;
            
            if (!fromOther) {
                state.selectedChatId = chat.id;
                state.messages[chat.id] = [];
            }
            else if (chat.key) {
                const keys = new JSEncrypt();
                keys.setPrivateKey(userData.privKey);
                chat.key = keys.decrypt(chat.key);
                chat.message_content = AESDecrypt(chat.message_content, chat.key);
            }
            chat.name            = cleanText(chat.name);
            chat.description     = cleanText(chat.description);
            chat.message_content = cleanText(chat.message_content);

            state.chats.push(chat);
        },
        deleteChatLocal: (state, action) => {
            const chatId = action.payload;

            if (state.selectedChatId === chatId)
                state.selectedChatId = null;

            state.chats = state.chats.filter(chat => chat.id !== chatId);
            delete state.messages[chatId];
        },
        clearPosts: (state) => {
            state.posts = [];
            state.all_posts_is_loaded = false;
        },

        setUserStatus: (state, action) => {
            const { userId, isOnline } = action.payload;

            if (userId in state.users)
                state.users[userId].is_online = isOnline;
        },
        setUserWriting: (state, action) => {
            const { userId, chatId, isWriting } = action.payload;
            const chat = state.chats.find(chat => chat.id === chatId);

            if (isWriting)
                chat.writing_users.push(userId);
            else
                chat.writing_users = chat.writing_users.filter(id => id !== userId);
        },
        addUserLocal: (state, action) => {
            const { userId, user } = action.payload;

            user.name     = cleanText(user.name);
            user.nickname = cleanText(user.nickname);
            
            state.users[userId] = user;
        },
        deleteUserLocal: (state, action) => {
            const userId = action.payload;

            if (userId in state.users)
                delete state.users[userId];
        },

        createMessageLocal: (state, action) => {
            const { chatId, message } = action.payload;

            const chat = state.chats.find(chat => chat.id === chatId);
            if (!chat) return;

            if (chat.key) {
                message.content       = AESDecrypt(message.content, chat.key);
                message.image         = AESDecrypt(message.image, chat.key);
                message.reply_content = AESDecrypt(message.reply_content, chat.key);
            }
            message.content       = cleanText(message.content);
            message.reply_content = cleanText(message.reply_content);

            if (state.messages[chatId] === undefined)
                state.messages[chatId] = [];

            state.messages[chatId].push(message);

            chat.message_content   = message.content;
            chat.message_datetime  = message.date_time;
            chat.message_sender_id = message.sender_id;

            if (state.selectedChatId !== chatId)
                chat.unread_count += 1;
        },
        setReadedMessages: (state, action) => {
            const {chatId, lastReading} = action.payload;
            state.chats.find(chat => chat.id === chatId).last_reading = lastReading;
        },
        likeMessageLocal: (state, action) => {
            const { chatId, messageId, isLiked, fromOther } = action.payload;

            function setLike(msg) {
                msg.likes += isLiked ? 1 : -1;
                if (!fromOther) msg.is_liked = isLiked;
            }

            if (state.messages[chatId]) {
                const message = state.messages[chatId].find(msg => msg.id === messageId);
                if (message) setLike(message);
            }

            const post = state.posts.find(post => post.id === messageId);
            if (post) setLike(post);
        },
        deleteMessagesLocal: (state, action) => {
            const { chatId, messageIds } = action.payload;
            if (!state.messages[chatId]) return;
            
            const messageIdsSet = new Set(messageIds);
            state.messages[chatId] = state.messages[chatId].filter(msg => !messageIdsSet.has(msg.id));

            const chat = state.chats.find(chat => chat.id === chatId);
            const messages = state.messages[chatId];

            if (messages.length === 0) {
                chat.message_content   = null;
                chat.message_datetime  = null;
                chat.message_sender_id = null;
                return;
            }

            const lastMsg = messages[messages.length - 1];

            if (chat.message_datetime !== lastMsg.date_time) {
                chat.message_content   = lastMsg.content;
                chat.message_datetime  = lastMsg.date_time;
                chat.message_sender_id = lastMsg.sender_id;
            }
        },
    },
    extraReducers: {
        [getChats.fulfilled]: (state, action) => {
            state.chats = action.payload;

            const keys = new JSEncrypt();
            keys.setPrivateKey(userData.privKey);

            for (const chat of state.chats) {
                if (chat.key) {   
                    chat.key = keys.decrypt(chat.key);
                    chat.message_content = AESDecrypt(chat.message_content, chat.key);
                }
                chat.name            = cleanText(chat.name);
                chat.description     = cleanText(chat.description);
                chat.message_content = cleanText(chat.message_content);
            }
        },

        [getPosts.fulfilled]: (state, action) => {
            const posts = action.payload;
            const chatIds = new Set(posts.map(post => post.sender_id));
            const keys = {};

            for (const chat of state.chats) {
                if (chatIds.has(chat.id))
                    keys[chat.id] = chat.key;
            }

            for (const post of posts) {
                const key = keys[post.sender_id];
                if (key) {
                    post.content = AESDecrypt(post.content, key);
                    post.image   = AESDecrypt(post.image, key);
                }
                post.content = cleanText(post.content);
            }

            state.posts = [...state.posts, ...posts];

            if (posts.length < 20)
                state.all_posts_is_loaded = true;
        },

        [getUsers.fulfilled]: (state, action) => {
            const users = action.payload;

            Object.values(users).forEach(user => {
                user.name     = cleanText(user.name);
                user.nickname = cleanText(user.nickname);
            });

            state.users = { ...state.users, ...users };
        },

        [getMessages.fulfilled]: (state, action) => {
            const {chatId, messages} = action.payload;

            if (state.messages[chatId] === undefined)
                state.messages[chatId] = [];

            const chat = state.chats.find(chat => chat.id === chatId);

            if (messages.length > 0) {
                if (chat.key)
                    for (const msg of messages) {
                        msg.content       = AESDecrypt(msg.content, chat.key);
                        msg.image         = AESDecrypt(msg.image, chat.key);
                        msg.reply_content = AESDecrypt(msg.reply_content, chat.key);
                    }
                
                for (const msg of messages) {
                    msg.content       = cleanText(msg.content);
                    msg.reply_content = cleanText(msg.reply_content);
                }

                state.messages[chatId] = [...messages.reverse(), ...state.messages[chatId]];
            }

            if (messages.length < 20)
                chat.all_messages_is_loaded = true;
        },

        [readChat.fulfilled]: (state, action) => {
            const chatId = action.payload;
            if (!chatId) return;
            
            const chat = state.chats.find(chat => chat.id === chatId);
            if (chat) chat.unread_count = 0;
        },

        [addMembers.fulfilled]: (state, action) => {
            const {chatId, added_members_count} = action.payload;
            state.chats.find(chat => chat.id === chatId).members_count += added_members_count;
        },

        [joinToChat.fulfilled]: (state, action) => {
            const chat = action.payload;

            chat.name        = cleanText(chat.name);
            chat.description = cleanText(chat.description);

            state.chats = [chat, ...state.chats];
            state.selectedChatId = chat.id;
        },

        [updateChatData.fulfilled]: (state, action) => {
            const { chatId, name, description, icon } = action.payload;
            const chat = state.chats.find(chat => chat.id === chatId);

            chat.name = name;
            chat.description = description;

            if (icon !== null)
                chat.with_icon = icon !== 'none';
        },

        [leaveChat.fulfilled]: (state, action) => {
            const chatId = action.payload;

            if (state.selectedChatId === chatId)
                state.selectedChatId = null;

            state.chats = state.chats.filter(chat => chat.id !== chatId);
            delete state.messages[chatId];
        },

        [sendMessage.fulfilled]: (state, action) => {
            const { messageIds, message } = action.payload;

            for (const chat of state.chats)
                if (chat.id in messageIds) {
                    if (state.messages[chat.id] === undefined)
                        state.messages[chat.id] = [];
                    
                    const msg = {id: messageIds[chat.id], ...message};
                    state.messages[chat.id].push(msg);

                    chat.message_content   = msg.content;
                    chat.message_datetime  = msg.date_time;
                    chat.message_sender_id = msg.sender_id;
                }
        },
    }
});

export const {
    selectChat,
    chatsInTop,
    createChatLocal,
    deleteChatLocal,
    clearPosts,

    setUserStatus,
    setUserWriting,
    addUserLocal,
    deleteUserLocal,

    createMessageLocal,
    setReadedMessages,
    likeMessageLocal,
    deleteMessagesLocal,
} = chatSlice.actions;

export default chatSlice.reducer;
