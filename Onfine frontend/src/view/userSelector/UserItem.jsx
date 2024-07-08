import s from './UserItem.module.css';
import { useSelector } from 'react-redux';
import { getTimeDelta } from '../../tools';
import { imagesURL } from '../../store/localData';
import Toogle from '../components/Toogle';
import Icon from '../components/Icon';


function UserItem({ userId, user, isAdmin, isSelectedMode, isSelected, onClick, onCheckAdmin }) {
    const icons = useSelector(state => state.global.icons);

    const dateTime = !user.is_online &&
        `Last visit ${getTimeDelta(user.last_visit)}`;
    const avatar = user.with_avatar && `${imagesURL}/${userId}_avatar`;
    

    return (
        <div className={`${s.container} ${isSelected && s.selected}`} onClick={onClick}>
            
            { isSelectedMode &&
                <div className={s.selector}>
                    <img src={icons.check} alt="check" />
                </div>
            }

            <div className={`${s.online_indicator_wrap} ${user.is_online && s.online}`}>
                <Icon className={s.avatar}
                      src={avatar}
                      defaultText={user.nickname[0]} />
            </div>

            <div className={s.info}>
                <div className={s.name}>{`@${user.nickname}`}</div>
                <div className={s.capture}>{dateTime}</div>
            </div>

            { isSelectedMode && isSelected &&
                <div className={s.admin} onClick={e => e.stopPropagation()}>
                    <div className={s.capture}>Is admin</div>
                    <Toogle isChecked={isAdmin} onCheck={onCheckAdmin}/>
                </div>
            }

        </div>
    );
}

export default UserItem;