import s from './Message.module.css';
import { useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { likeMessage, deleteMessages, sendMessage } from '../../store/chatSlice';
import { setFullScreenImage, setAlertData, setChatSelectorData, setUserInfoData } from '../../store/globalSlice';
import { userData, getAsUser, imagesURL } from '../../store/localData';
import { getTime } from '../../tools';
import Icon from '../components/Icon';
import Counter from '../components/Counter';
import DropBox from '../components/DropBox';


function getReplySenderName(msg, users) {
    const senderId = msg.reply_sender_id;

    if (senderId === userData.userId)
        return userData.name;

    if (senderId in users)
        return users[senderId].name;

    return '(unknow)';
}

function MessageBody({ msg, userName, isReaded }) {
    const [icons, users] = useSelector(state => [
        state.global.icons,
        state.chat.users,
    ]);
    const dispatch = useDispatch();

    const replySenderName = getReplySenderName(msg, users)
    
    const time = getTime(msg.date_time);

    const readedIcon = msg.sender_id === userData.userId ?
        (isReaded ? icons.readed_message_white : icons.sent_message_white) : null;


    function onImageClick(e) {
        e.stopPropagation();
        dispatch(setFullScreenImage(msg.image));
    }


    return (
        <div className={s.message}>
            { msg.reply_content &&
                <div className={s.reply}>
                    <img src={icons.reply} alt="reply" />
                    <div>
                        <b>{replySenderName}</b>
                        <div>{msg.reply_content}</div>
                    </div>
                </div>
            }

            { userName !== null &&
                <div className={s.name}>{userName}</div>
            }

            { msg.image !== null &&
                <img className={s.image} src={msg.image} onClick={onImageClick} alt="image_message" />
            }

            <div className={s.content_wrap}>
                <div className={s.metadata}>
                    <span className={s.time}>{time}</span>

                    { readedIcon !== null &&
                        <img className={s.readed_indicator} src={readedIcon} alt="readed" />
                    }
                </div>
                <div className={s.content}>{msg.content}</div>
            </div>
        </div>
    );
}

function getUser(isIdentify, senderId, users) {
    if (!isIdentify) return [null, null];

    if (senderId === userData.userId)
        return [senderId, getAsUser()];

    if (senderId in users)
        return [senderId, users[senderId]];

    return [null, null];
}

function Message({ msg, isIdentify, setReplyData, selectOrUnselectMessage, isSelectMode, isSelected, isReaded }) {
    const [icons, chatId, chats, users] = useSelector(state => [
        state.global.icons,
        state.chat.selectedChatId,
        state.chat.chats,
        state.chat.users,
    ]);
    const dispatch = useDispatch();

    const [userId, user] = getUser(isIdentify, msg.sender_id, users);
    const chat = useMemo(() => chats.find(chat => chat.id === chatId), [chatId, chats]);


    function onLike() {
        dispatch(likeMessage({
            chatId,
            messageId: msg.id,
            isLiked: !msg.is_liked,
        }));
    }

    function onAvatarClick() {
        if (userId && userId !== userData.userId)
            dispatch(setUserInfoData({userId, user}));
    }

    function onSelect() { isSelectMode && selectOrUnselectMessage(msg.id); }

    function onForward() {
        dispatch(setChatSelectorData({
            enterAction: 'Forward',
            onSelect: chatIds => chatIds.size > 0 && dispatch(sendMessage({
                chatIds,
                content: msg.content,
                image: msg.image,
                replyContent: msg.reply_content,
                replySenderId: msg.reply_sender_id,
            })),
        }));
    }

    function onDeleteMessage() {
        dispatch(setAlertData({
            title: 'Delete',
            content: 'Are you sure you want to delete?',
            actions: ['No', 'Yes'],
            onAction: action => {
                if (action !== 'Yes') return;
                dispatch(deleteMessages({
                    chatId: chatId,
                    messageIds: [msg.id],
                }));
            },
        }))
    }


    const options = [
        ['Reply',   () => setReplyData({ content: msg.content, senderId: msg.sender_id })],
        ['Forward', onForward],
    ];

    if (chat.is_admin)
        options.push( ['Select', () => selectOrUnselectMessage(msg.id)]);

    if (chat.is_admin || msg.sender_id === userData.userId)
        options.push(['Delete', onDeleteMessage]);

    const classMy = msg.sender_id === userData.userId && s.my;

    const likesAttrs = {
        icon: msg.is_liked ? icons.like_active : icons.like,
        count: msg.likes,
        textColor: msg.is_liked ? '#FC4147' : null,
        onClick: onLike,
    };

    return (
        <div className={`${s.container} ${classMy} ${isSelectMode && s.select_mode} ${isSelected && s.selected}`} onClick={onSelect}>
            { isIdentify &&
                <Icon className={s.avatar}
                      src={user?.with_avatar && `${imagesURL}/${userId}_avatar`}
                      defaultText={user?.name[0]}
                      onClick={onAvatarClick} />
            }

            <MessageBody msg={msg} userName={user?.name} isReaded={isReaded} />

            { msg.likes > 0 ?
                <Counter {...likesAttrs} /> :
                <div className={s.hiding}><Counter {...likesAttrs} /></div>
            }

            <div className={s.hiding}>
                <DropBox action={'···'} action_classes={`${s.options_action} ui_icon_btn`} isAlignLeft={classMy}>
                    { options.map(([value, func]) =>
                        <span key={value} className={s.option} onClick={func}>{value}</span>
                    )}
                </DropBox>
            </div>
        </div>
    );
}

export default Message;