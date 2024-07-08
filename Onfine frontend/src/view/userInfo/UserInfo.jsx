import s from './UserInfo.module.css';
import { useDispatch, useSelector } from 'react-redux';
import { createChat, selectChat } from '../../store/chatSlice';
import { setFullScreenImage, setUserInfoData } from '../../store/globalSlice';
import { getTimeDelta } from '../../tools';
import { imagesURL } from '../../store/localData';
import Barier from '../components/Barier';
import Icon from '../components/Icon';


function UserInfo({ userId, user }) {
    const chats = useSelector(state => state.chat.chats);
    const dispatch = useDispatch();

    const status = user.is_online ? 'Online' : `Last visit at ${getTimeDelta(user.last_visit)}`;
    const avatar = user.with_avatar && `${imagesURL}/${userId}_avatar`;


    function onAvatarClick() { avatar && dispatch(setFullScreenImage(avatar)); }

    function onClose() { dispatch(setUserInfoData(null)); }

    function onSendClick() {
        const chat = chats.find(chat => chat.companion_id === userId);
        
        if (chat)
            dispatch(selectChat(chat.id));
        else {    
            const members = {};
            members[userId] = {is_admin: true};
            dispatch(createChat({companion: user, members}));
        }
        onClose();
    }


    return (
        <Barier isShowCloseBtn onClick={onClose}>
            <section className={s.container} onClick={e => e.stopPropagation()}>
                <Icon className={s.avatar}
                      src={avatar}
                      defaultText={user.name[0]}
                      onClick={onAvatarClick} />

                <div className={s.info}>
                    <div className={s.name}>{user.name}</div>

                    <div className={s.nickname}>{`@${user.nickname}`}</div>

                    <div className={`${s.status} ${user.is_online && s.accent}`}>{status}</div>

                    <button className={`${s.send} ui_btn`} onClick={onSendClick}>Send message</button>
                </div>

            </section>
        </Barier>
    );
}

export default UserInfo;