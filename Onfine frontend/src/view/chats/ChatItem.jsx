import s from './ChatItem.module.css';
import { useSelector } from 'react-redux';
import { userData, imagesURL } from '../../store/localData';
import { getTimeDelta } from '../../tools';
import Icon from '../components/Icon';


function getStatus(chat, icons) {
    if (chat.unread_count > 0)
        return (<div className={s.new_msg_indicator}>{chat.unread_count}</div>);

    if (chat.message_sender_id !== userData.userId)
        return '';

    if (new Date(chat.last_reading) > new Date(chat.message_datetime))
        return (<img className={s.msg_indicator} src={icons.readed_message} alt='readed' />)
    else
        return (<img className={s.msg_indicator} src={icons.sent_message} alt='sent' />)
}

function getUserOrChatData(chat, users) {
    const user = chat.type === 'chat' ?
        (chat.companion_id in users ? users[chat.companion_id] : undefined) :
        null;
    
    if (user === null)
        return [chat.name, chat.with_icon, `/${chat.id}_icon`, false];

    if (user !== undefined)
        return [user.name, user.with_avatar, `/${chat.companion_id}_avatar`, user.is_online];

    return ['unknow', false, null, false];
}

function getMessageContent(chat, users) {
    if (!chat.writing_users || chat.writing_users.length === 0)
        return chat.message_content;

    const userId = chat.writing_users[0];

    if (userId in users)
        return `${users[userId].name} is writing...`

    return '(unknow) is writing...';
}

function ChatItem({ chat, onClick, isSelected, isSelectMode=false }) {
    const [icons, users] = useSelector(state => [
        state.global.icons,
        state.chat.users,
    ]);

    const dateTime = chat.message_datetime && getTimeDelta(chat.message_datetime);
    const someOneIsWriting = chat.writing_users?.length > 0;

    const msg = getMessageContent(chat, users);
    const [name, withIcon, icon, isOnline] = getUserOrChatData(chat, users);


    return (
        <div className={`${s.container} ${isSelectMode && s.select_mode} ${isSelected && s.selected}`} onClick={onClick}>
            { isSelectMode &&
                <div className={s.selector}>
                    <img src={icons.check} alt="check" />
                </div>
            }

            <div className={`${s.online_indicator_wrap} ${isOnline && s.online}`}>
                <Icon className={s.icon} src={withIcon && imagesURL + icon} defaultText={name[0]} />
            </div>

            <div className={s.data}>
                <div className={s.name}>{name}</div>
                <div className={`${s.msg} ${someOneIsWriting && s.writing}`}>{msg}</div>
            </div>

            <div className={s.metadata}>
                <span className={s.date}>{dateTime}</span>
                { getStatus(chat, icons) }
            </div>
        </div>
    );
}

export default ChatItem;