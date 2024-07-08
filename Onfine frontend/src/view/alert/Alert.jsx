import s from './Alert.module.css';
import { useSelector, useDispatch } from 'react-redux';
import { setAlertData } from '../../store/globalSlice';


function Alert({ content, isSuccess=false }) {
    const icons = useSelector(state => state.global.icons);
    const dispatch = useDispatch();


    function onClose() { dispatch(setAlertData(null)); }


    return (
        <div className={`${s.container} ${isSuccess && s.success}`}>
            <span className={s.content}>{content}</span>
            <img className={`${s.close_btn} ui_icon_btn`} onClick={onClose} src={icons.close_white} alt="close" />
        </div>
    );
}

export default Alert;