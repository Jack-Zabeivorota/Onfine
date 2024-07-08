import s from './Chats.module.css';
import { useState, useMemo, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectChat, searchChats, searchUsers, updateKeysData } from '../../store/chatSlice';
import { changeShowedMenu, setChatMasterData, setChatInfoData, setUserInfoData } from '../../store/globalSlice';
import createWebSocket from '../../websocket';
import Menu from '../menu/Menu';
import SearchBox from '../components/SearchBox';
import ChatItem from './ChatItem';
import UserItem from '../userSelector/UserItem';
import Chat from '../chat/Chat';
import Posts from '../posts/Posts';


function Chats() {
    const [icons, chatId, allChats] = useSelector(state => [
        state.global.icons,
        state.chat.selectedChatId,
        state.chat.chats,
    ]);
    const dispatch = useDispatch();
    const [chatType, setChatType] = useState('all');
    const [foundChats, setFoundChats] = useState([]);
    const [foundUsers, setFoundUsers] = useState([]);

    const chatsIsLoaded = allChats.length > 0;
    const isSearch = foundChats.length > 0 || foundUsers.length > 0;

    const chatTypes = [
        ['all',     'All'],
        ['chat',    'Chats'],
        ['channel', 'Channels'],
        ['group',   'Groups'],
    ];

    const myChatIds = useMemo(() => new Set(allChats.map(chat => chat.id)), [allChats]);

    const chats = useMemo(() => {
        if (isSearch) return foundChats;

        if (chatType === 'all') return allChats;

        return allChats.filter(chat => chat.type === chatType);
    },
    [chatType, allChats, isSearch, foundChats]);

    const users = isSearch ? foundUsers : [];

    useEffect(() => createWebSocket(dispatch), [dispatch]);

    useEffect(() => { chatsIsLoaded && dispatch(updateKeysData()); }, [chatsIsLoaded, dispatch]);


    function onShowMenu() { dispatch(changeShowedMenu(true)); }

    function onSearch(value) {
        if (value === '') {
            setFoundChats([]);
            setFoundUsers([]);
            return;
        }

        dispatch(searchChats({
            value,
            chatType: chatType !== 'all' ? chatType : null,
            setFoundChats,
        }));
        dispatch(searchUsers({value, setFoundUsers}));
    }

    function onSelectChat(chat) {
        dispatch(selectChat(chat.id !== chatId ? chat.id : null));
    }

    function onChatClick(chat) {
        if (myChatIds.has(chat.id))
            onSelectChat(chat);
        else
            dispatch(setChatInfoData(chat));
    }

    function onUserClick(user) {
        const chat = allChats.find(chat => chat.companion_id === user.id);

        if (chat)
            dispatch(selectChat(chat.id));
        else
            dispatch(setUserInfoData({ userId: user.id, user }));
    }

    function onCreateChat() { dispatch(setChatMasterData()); }


    return (
        <section className={s.container}>
            <div className={s.inner_container}>

                <div className={s.top_panel}>

                    <div>
                        <img className={`${s.menu} ui_icon_btn`} src={icons.menu} alt='menu' onClick={onShowMenu} />
                        <SearchBox flex={1} onChange={onSearch} />
                    </div>

                    <div>
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
                    { isSearch &&
                    <>
                        <div className={s.found_capture}>Found users</div>
                        { users.map(user =>
                            <UserItem userId={user.id}
                                      user={user}
                                      onClick={() => onUserClick(user)} />
                        )}
                        <div className={s.found_capture}>Found chats</div>
                    </>
                    }
                    { chats.map(chat =>
                        <ChatItem key={chat.id}
                                  chat={chat}
                                  isSelected={chat.id === chatId}
                                  onClick={() => onChatClick(chat)} />
                    )}
                </div>

                <button className={`${s.add_btn} ui_btn`} onClick={onCreateChat}>+</button>

            </div>

            { chatId === null ? <Posts /> : <Chat /> }
            <Menu />

        </section>
    );
}

export default Chats;