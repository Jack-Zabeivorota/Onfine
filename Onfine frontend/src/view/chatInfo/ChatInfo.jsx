import s from './ChatInfo.module.css';
import { useDispatch, useSelector } from 'react-redux';
import { setChatInfoData, setFullScreenImage } from '../../store/globalSlice';
import { joinToChat } from '../../store/chatSlice';
import { getFormatNum } from '../../tools';
import { imagesURL } from '../../store/localData';
import Barier from '../components/Barier';
import Icon from '../components/Icon';


function ChatInfo({ chat }) {
    const chats = useSelector(state => state.chat.chats);
    const dispatch = useDispatch();

    const isMember = chats.find(c => c.id === chat.id) !== undefined;
    const icon = chat.with_icon && `${imagesURL}/${chat.id}_icon`;

    let metadata = (chat.is_private ? 'Private ' : 'Public ') + (chat.type === 'group' ? 'group' : 'channel');
    metadata += ` · ${getFormatNum(chat.members_count)} members`;


    function onClose() { dispatch(setChatInfoData(null)); }

    function onIconClick() { icon && dispatch(setFullScreenImage(icon)); }

    function onJoin() { dispatch(joinToChat(chat.id)); }


    return (
        <Barier isShowCloseBtn onClick={onClose}>
            <section className={s.container} onClick={e => e.stopPropagation()}>
                
                <div className={`${s.inner_container} scroll`}>

                    <Icon className={s.icon}
                          src={icon}
                          defaultText={chat.name[0]}
                          onClick={chat.with_icon && onIconClick} />

                    <div className={s.name}>{chat.name}</div>

                    <div className={s.metadata}>{metadata}</div>

                    { chat.description !== '' &&
                        <div className={s.desc}>{chat.description}</div>
                    }

                </div>

                { !isMember &&
                    <div className='ui_actions'>
                        <button onClick={onJoin}>Join</button>
                    </div>
                }

            </section>
        </Barier>
    );
}

export default ChatInfo;