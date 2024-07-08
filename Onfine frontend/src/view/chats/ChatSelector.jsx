import s from './ChatSelector.module.css';
import { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setChatSelectorData } from '../../store/globalSlice';
import Barier from '../components/Barier';
import ChatItem from './ChatItem';
import SearchBox from '../components/SearchBox';


function ChatSelector({ enterAction, onSelect }) {
    const [allChats, users] = useSelector(state => [
        state.chat.chats,
        state.chat.users,
    ]);
    const dispatch = useDispatch();

    const [selectedChatIds, setSelectedChatIds] = useState(new Set());
    const [chatType, setChatType] = useState('all');
    const [searchValue, setSearchValue] = useState('');

    const chatTypes = [
        ['all',     'All'],
        ['chat',    'Chats'],
        ['channel', 'Channels'],
        ['group',   'Groups'],
    ];

    const chats = useMemo(() => allChats.filter(chat =>
        !(chat.type === 'channel' && !chat.is_admin) &&
        (chatType === 'all' || chat.type === chatType) &&
        (searchValue === '' || (chat.type === 'chat' ?
            (users[chat.companion_id].name.toLowerCase().includes(searchValue) ||
             users[chat.companion_id].nickname.toLowerCase().includes(searchValue)) :
            chat.name.toLowerCase().includes(searchValue)
        ))
    ), [searchValue, chatType, allChats, users]);

    function onSearchChats(value) { setSearchValue(value.toLowerCase()); }

    function onSelectOrUnselectChat(chatId) {
        setSelectedChatIds(state => {
            const chatIds = new Set(state);
            chatIds.has(chatId) ? chatIds.delete(chatId) : chatIds.add(chatId);
            return chatIds;
        });
    }

    function onAction(isEnterAction) {
        dispatch(setChatSelectorData(null));
        onSelect(isEnterAction ? selectedChatIds : new Set());
    }


    return (
        <Barier onClick={() => onAction(false)}>
            <section className={s.container} onClick={e => e.stopPropagation()}>
                
                <div className={s.top_panel}>

                    <SearchBox onChange={onSearchChats} />

                    <div className={s.chat_types}>
                        { chatTypes.map(([type, value]) =>
                            <button key={type}
                                className={`ui_chip ${type === chatType && 'select'}`}
                                onClick={() => setChatType(type)}>
                                {value}
                            </button>
                        )}
                    </div>

                </div>
                
                <div className={`${s.chats} scroll`}>
                    { chats.map(chat =>
                        <ChatItem key={chat.id}
                                  chat={chat}
                                  onClick={() => onSelectOrUnselectChat(chat.id)}
                                  isSelected={selectedChatIds.has(chat.id)}
                                  isSelectMode
                        />
                    )}
                </div>

                <div className='ui_actions'>
                    <button onClick={() => onAction(false)}>Cancel</button>
                    <button onClick={() => onAction(true)}>{enterAction}</button>
                </div>

            </section>
        </Barier>
    );
}

export default ChatSelector;