import s from './Chat.module.css';
import { useRef, useMemo, useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { leaveChat, deleteChat, sendMessage, deleteMessages, writingInChat, addMembers, getMessages, readChat, selectChat } from '../../store/chatSlice';
import { setFullScreenImage, setAlertData, setUserSelectorData, setUserInfoData, setChatInfoData, setChatMasterData } from '../../store/globalSlice';
import { getDate, getFormatNum, getTimeDelta } from '../../tools.js';
import { imagesURL, userData } from '../../store/localData.js';
import Message from './Message';
import Icon from '../components/Icon.jsx';
import DropBox from '../components/DropBox';


function getStatus(user, chat, users) {
    if (chat.writing_users.length > 0) {
        const userId = chat.writing_users[0];
        const name = users[userId]?.name ?? '(unknow)';

        return {
            isAccent: true,
            content: `${name} is writing...`,
        }
    }
        
    if (user === null)
        return {
            isAccent: false,
            content:`${getFormatNum(chat.members_count)} members`,
        };
    
    if (user === undefined)
        return { isAccent: false, content: '' };

    if (user.is_online)
        return { isAccent: true, content: 'Online' };
    else
        return {
            isAccent: false,
            content: `Last visit at ${getTimeDelta(user.last_visit)}`,
        }
}

function getNameAndIcon(user, chat) {
    if (user === null)
        return [chat.name, chat.with_icon && `${imagesURL}/${chat.id}_icon`];

    if (user)
        return [user.name, user.with_avatar && `${imagesURL}/${chat.companion_id}_avatar`];

    return ['Unknow', null]
}

function getOptions(chat, dispatch) {
    function onAddMember() {
        dispatch(setUserSelectorData({
            enterAction: 'Add',
            chatId: chat.id,
            onSelect: members =>
                Object.keys(members).length > 0 && dispatch(addMembers({
                    chatId: chat.id,
                    members,
                })),
        }));
    }

    function onLeaveChat() {
        dispatch(setAlertData({
            title: 'Leaving chat',
            content: 'Are you sure you want to leave this chat?',
            actions: ['No', 'Yes'],
            onAction: action => { action === 'Yes' && dispatch(leaveChat(chat.id)); },
        }))
    }

    function onDeleteChat() {
        dispatch(setAlertData({
            title: 'Deleting chat',
            content: 'Are you sure you want to delete this chat?',
            actions: ['No', 'Yes'],
            onAction: action => { action === 'Yes' && dispatch(deleteChat(chat.id)); },
        }))
    }

    const options = [];

    if (!(chat.type === 'chat' || !chat.is_admin))
        options.push(['Add member', onAddMember]);

    if (chat.type !== 'chat')
        options.push(['Leave chat', onLeaveChat]);

    if (chat.is_admin)
        options.push(['Delete chat', onDeleteChat]);

    return options;
}

function TopPanel({ chat, selectedMessageIds, setSelectedMessageIds }) {
    const [icons, isMobil, users] = useSelector(state => [
        state.global.icons,
        state.global.isMobil,
        state.chat.users,
    ]);
    const dispatch = useDispatch();
    
    const user = chat.type === 'chat' ? users[chat.companion_id] : null;
    const [name, icon] = getNameAndIcon(user, chat);
    const status = getStatus(user, chat, users);


    function onInfoClick() {
        if (user === undefined)
            return;
        if (user)
            dispatch(setUserInfoData({ userId: chat.companion_id, user }));
        else if (chat.is_admin)
            dispatch(setChatMasterData(chat));
        else
            dispatch(setChatInfoData(chat));
    }

    function onDeselectMessages() { setSelectedMessageIds(new Set()); }

    function onDeleteMessages() {
        dispatch(setAlertData({
            title: 'Deleting messages',
            content: 'Are you sure you want to delete messages?',
            actions: ['No', 'Yes'],
            onAction: action => {
                if (action !== 'Yes') return
                dispatch(deleteMessages({
                    chatId: chat.id,
                    messageIds: Array.from(selectedMessageIds),
                }));
                onDeselectMessages();
            },
        }))
    }

    function onBack() { dispatch(selectChat(null)); }


    return (
        <div className={s.top_panel}>
            { isMobil ?
                <img className={`${s.back_btn} ui_icon_btn`} src={icons.arrow_left} onClick={onBack} alt="back" /> :
                <div></div>
            }

            <div className={s.info} onClick={onInfoClick}>

                <Icon className={s.icon} src={icon} defaultText={name[0]} />

                <div>
                    <div className={s.name}>{name}</div>
                    <div className={`${s.status} ${status.isAccent && s.accent}`}>{status.content}</div>
                </div>

            </div>

            { selectedMessageIds.size > 0 ?
                <div className={s.select_actions}>
                    <div>{selectedMessageIds.size}</div>
                    <img className='ui_icon_btn' src={icons.delete} onClick={onDeleteMessages} alt="delete" />
                    <img className='ui_icon_btn' src={icons.close} onClick={onDeselectMessages} alt="cancel" />
                </div> :

                <DropBox action={'···'} action_classes={`${s.options_action} ui_icon_btn`}>
                    { getOptions(chat, dispatch).map(([value, func]) =>
                        <span key={value} className={s.option} onClick={func}>{value}</span>
                    )}
                </DropBox>
            }
        </div>
    )
}

function getReplySenderName(replyData, users) {
    if (!replyData) return '(unknow)';

    const senderId = replyData.senderId;

    if (senderId === userData.userId) return userData.name;
    if (senderId in users) return users[senderId].name;

    return '(unknow)';
}

function DownPanel({ chat, replyData, setReplyData }) {
    const [icons, users] = useSelector(state => [
        state.global.icons,
        state.chat.users,
    ]);
    const dispatch = useDispatch();

    const fileSelectorRef = useRef();
    const textFieldRef    = useRef();
    
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [writingTimer, setWritingTimer] = useState(null);

    const replySenderName = getReplySenderName(replyData, users);

    useEffect(() => {
        if (image !== null) {
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result);
            reader.readAsDataURL(image);
        }
        else setPreview(null);
    }, [image]);


    function onChangeTextField() {
        const field = textFieldRef.current;
        field.style.height = '1px';
        field.style.height = (field.scrollHeight - 4) + 'px';

        if (chat.type === 'channel') return;

        if (writingTimer === null)
            dispatch(writingInChat({chatId: chat.id, isWriting: true}));
        else
            clearTimeout(writingTimer);

        setWritingTimer(
            setTimeout(() => {
                dispatch(writingInChat({chatId: chat.id, isWriting: false}));
                setWritingTimer(null);
            }, 3000)
        );
    }

    function onCancelReply() { setReplyData(null); }

    function onSelectImage() {
        if (image === null)
            fileSelectorRef.current.click();
        else
            setImage(null);
    }

    function onChangeImage(e) { e.target.files.length > 0 && setImage(e.target.files[0]); }

    function onImageToSendClick() { dispatch(setFullScreenImage(preview)); }

    function clearFields() {
        const field = textFieldRef.current;
        if (field !== null) {
            field.value = '';
            field.style.height = '1px';
            field.style.height = (field.scrollHeight - 4) + 'px';
        }
        setImage(null);
        setReplyData(null);
    }

    function onSendMessage() {
        const content = textFieldRef.current.value;
        if (content === '' && image === null) return;

        dispatch(sendMessage({
            chatIds: new Set([chat.id]),
            content,
            image,
            replyContent: replyData?.content,
            replySenderId: replyData?.senderId,
            clearFields,
        }));
    }


    useEffect(clearFields, [chat]);

    return (
        <div className={s.down_panel}>
            { replyData !== null && 
                <div className={s.reply}>
                    <img src={icons.reply} alt="reply" />
                    <div>
                        <b>{replySenderName}</b>
                        <div>{replyData.content}</div>
                    </div>
                    <img className='ui_icon_btn' src={icons.close} onClick={onCancelReply} alt="cancel_reply" />
                </div>
            }

            { preview !== null &&
                <img className={s.image_to_send} src={preview} onClick={onImageToSendClick} alt="image_to_send" />
            }

            <div className={s.send_field}>
                <input ref={fileSelectorRef} type='file' accept='image/*' onChange={onChangeImage} />
                
                <img className={`${s.image_selector} ui_icon_btn`}
                     src={image === null ? icons.image : icons.cancel_image}
                     onClick={onSelectImage}
                     alt="image_selector" />

                <textarea ref={textFieldRef} onChange={onChangeTextField} rows={1} />

                <button className='ui_btn' onClick={onSendMessage}>
                    <img src={icons.send_message} alt="send" />
                </button>
            </div>
        </div>
    )
}

function createMessages(messages, creationFunc) {
    if (!messages) return [];

    const comps = [];
    let prevDate = null;

    for (let i = 0; i < messages.length; i++) {
        const dt = new Date(messages[i].date_time + 'Z');
        const date = Number.parseInt(`${dt.getFullYear()}${dt.getMonth()}${dt.getDate()}`);
        const isSepar = prevDate === null || date > prevDate;

        comps.push(<>
            { isSepar &&
                <div key={date} className={s.separator}>{getDate(dt)}</div>
            }
            { creationFunc(messages[i]) }
        </>);

        prevDate = date;
    }

    return comps;
}

function Chat() {
    const [icons, chatId, chats, allMessages] = useSelector(state => [
        state.global.icons,
        state.chat.selectedChatId,
        state.chat.chats,
        state.chat.messages,
    ]);
    const dispatch = useDispatch();

    const [replyData, setReplyData] = useState(null);
    const [selectedMessageIds, setSelectedMessageIds] = useState(new Set());
    const [isShowedBottomBtn, setShowedBottomBtn] = useState(false);
    const [scrollDelta, setScrollDelta] = useState(0);
    
    const msgViewportRef = useRef();
    const loadMsgBlock   = useRef();

    const chat = useMemo(() => chats.find(chat => chat.id === chatId), [chatId, chats]);
    const lastReading = useMemo(() => new Date(chat.last_reading), [chat.last_reading]);

    const messages = allMessages[chatId];

    const msgIsLoaded = messages !== undefined;
    const [firstMsg, lastMsg] = msgIsLoaded && messages.length > 0 ?
        [messages[0], messages[messages.length - 1]] :
        [undefined, undefined];


    function onMsgViewportScroll(e) {
        const vp = e.target;
        const isShow = vp.scrollTop !== vp.scrollHeight - vp.clientHeight;

        if (isShow !== isShowedBottomBtn) setShowedBottomBtn(isShow);
    }

    function onToBottom() {
        const viewport = msgViewportRef.current;
        if (viewport) viewport.scrollTop = viewport.scrollHeight;
    }

    function selectOrUnselectMessage(msgId) {
        setSelectedMessageIds(state => {
            const messageIds = new Set(state);
            messageIds.has(msgId) ? messageIds.delete(msgId) : messageIds.add(msgId);
            return messageIds;
        });
    }


    useEffect(() => {
        if (msgIsLoaded) {
            setTimeout(onToBottom, 500);
            if (chat.unread_count > 0) dispatch(readChat(chatId))
        }
        else dispatch(getMessages(chatId));
    }, [chatId, msgIsLoaded]);

    useEffect(() => {
        const vp = msgViewportRef.current;
        if (vp) vp.scrollTop = vp.scrollHeight - scrollDelta;
    }, [firstMsg?.date_time]);

    useEffect(() => {
        const vp = msgViewportRef.current;
        if (vp && scrollDelta === vp.clientHeight) onToBottom();
    }, [lastMsg?.date_time]);

    useEffect(() => {
        if (!loadMsgBlock.current) return;

        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) 
                dispatch(getMessages(chatId));
        });
        const timer = setTimeout(() => observer.observe(loadMsgBlock.current), 1000);

        return () => {
            clearTimeout(timer);
            observer.disconnect();
        }
    }, [loadMsgBlock.current]);

    useEffect(() => {
        const vp = msgViewportRef.current;
        if (!vp) return;

        function setDelta() {
            setScrollDelta(vp.scrollHeight - vp.scrollTop);
        }
        vp.addEventListener('scroll', setDelta);

        return () => vp.removeEventListener('scroll', setDelta);

    }, [msgViewportRef.current]);


    const messagesComps = useMemo(() => createMessages(messages, msg =>
        <Message key={msg.id}
                msg={msg}
                isIdentify={chat.type === 'group'}
                setReplyData={setReplyData}
                selectOrUnselectMessage={selectOrUnselectMessage}
                isSelectMode={selectedMessageIds.size > 0}
                isSelected={selectedMessageIds.has(msg.id)}
                isReaded={lastReading > new Date(msg.date_time)}
        />
    ), [messages, chat.type, selectedMessageIds, lastReading]);
    
    return (
        <section className={s.container}>
            <TopPanel chat={chat}
                      selectedMessageIds={selectedMessageIds}
                      setSelectedMessageIds={setSelectedMessageIds} />

            { msgIsLoaded ?
                <div className={`${s.messages} scroll`} ref={msgViewportRef} onScroll={onMsgViewportScroll}>
                    { !chat.all_messages_is_loaded &&
                        <div ref={loadMsgBlock} className={s.load_capture}>Load messages...</div>
                    }
                    { messagesComps }

                    <div className={`${s.to_bottom} ${isShowedBottomBtn && s.show}`} onClick={onToBottom}>
                        <img src={icons.arrow_left} alt="to_bottom" />
                    </div>
                </div> :

                <div className={s.download_capture}>
                    <div>Download messages...</div>
                </div>
            }
            { (chat.type === 'channel' && !chat.is_admin) ||
                <DownPanel chat={chat} replyData={replyData} setReplyData={setReplyData} />
            }
        </section>
    );
}

export default Chat;