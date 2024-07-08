import s from './DialogAlert.module.css';
import Barier from '../components/Barier';
import { useDispatch } from 'react-redux';
import { setAlertData } from '../../store/globalSlice';


function DialogAlert({ title, content, actions, onAction }) {
    const dispatch = useDispatch();


    function onPreAction(action) {
        dispatch(setAlertData(null));
        onAction(action);
    }

    
    return (
        <Barier onClick={() => onPreAction(null)}>
            <div className={s.container} onClick={(e) => e.stopPropagation()}>
                <span className={s.title}>{title}</span>

                <span className={s.content}>{content}</span>

                <div className='ui_actions'>
                    { actions.map((text) =>
                        <button onClick={() => onPreAction(text)}>
                            {text}
                        </button>)
                    }
                </div>
            </div>
        </Barier>
    );
}

export default DialogAlert;