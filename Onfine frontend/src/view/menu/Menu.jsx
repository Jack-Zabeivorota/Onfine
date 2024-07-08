import s from './Menu.module.css';
import { useDispatch, useSelector } from 'react-redux';
import { changeShowedMenu, changeTheme, changeShowedUserDataUpdater, setFullScreenImage } from '../../store/globalSlice';
import { userData, imagesURL } from '../../store/localData';
import Icon from '../components/Icon';


function Menu() {
    const isShowedMenu = useSelector(state => state.global.isShowedMenu);
    const dispatch = useDispatch();
    const avatar = userData.with_avatar && `${imagesURL}/${userData.userId}_avatar`;

    const actions = [
        ['Change theme', () => dispatch(changeTheme())],
        ['Update data',  () => dispatch(changeShowedUserDataUpdater(true))],
        ['Logout',       () => window.location.reload()],
    ];


    function onClose() { dispatch(changeShowedMenu(false)); }

    function onAvatarClick() { avatar && dispatch(setFullScreenImage(avatar)); }


    return (
        <div className={`${s.container} ${isShowedMenu && s.show} scroll`}>
            <button className='ui_close_btn' onClick={onClose}>×</button>

            <Icon className={s.avatar}
                  src={avatar}
                  defaultText={userData.name?.[0]}
                  onClick={onAvatarClick} />

            <div className={s.name}>{userData.name}</div>
            <div className={s.nickname}>{`@${userData.nickname}`}</div>
            
            { actions.map(([action, func]) =>
                <div key={action} className={s.action} onClick={func}>{action}</div>
            )}
        </div>
    );
}

export default Menu;