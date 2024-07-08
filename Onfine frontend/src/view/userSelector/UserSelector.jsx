import s from './UserSelector.module.css';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setUserSelectorData } from '../../store/globalSlice';
import { searchUsers } from '../../store/chatSlice';
import Barier from '../components/Barier';
import UserItem from './UserItem';
import SearchBox from '../components/SearchBox';


function UserSelector({ enterAction, onSelect, chatId=null }) {
    const dispatch = useDispatch();

    const [selectedUsers, setSelectedUsers] = useState({});
    const [foundUsers, setFoundUsers] = useState([]);


    function onSearchUsers(value) {
        if (value === '') setFoundUsers([]);
        dispatch(searchUsers({ value, chatId, setFoundUsers }));
    }

    function onSelectOrUnselectUser(userId) {
        setSelectedUsers(users => {
            const selectedUsers = {...users};

            userId in selectedUsers ?
                delete selectedUsers[userId] :
                selectedUsers[userId] = {is_admin: false};
            
            return selectedUsers;
        });
    }

    function onCheckAdmin(userId, isAdmin) {
        setSelectedUsers(users => {
            const selectedUsers = {...users};
            selectedUsers[userId] = { is_admin: isAdmin };
            return selectedUsers;
        })
    }

    function onAction(isEnterAction) {
        dispatch(setUserSelectorData(null));
        onSelect(isEnterAction ? selectedUsers : {});
    }


    return (
        <Barier onClick={() => onAction(false)}>
            <section className={s.container} onClick={e => e.stopPropagation()}>
                
                <div className={s.search_wrap}>
                    <SearchBox onChange={onSearchUsers} />
                </div>
                
                <div className={`${s.users} scroll`}>
                    { foundUsers.map(user => 
                        <UserItem key={user.id}
                                  userId={user.id}
                                  user={user}
                                  isSelectedMode
                                  isSelected={user.id in selectedUsers}
                                  onClick={() => onSelectOrUnselectUser(user.id)}
                                  isAdmin={user.id in selectedUsers ? selectedUsers[user.id].is_admin : false}
                                  onCheckAdmin={isAdmin => onCheckAdmin(user.id, isAdmin)} />
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

export default UserSelector;