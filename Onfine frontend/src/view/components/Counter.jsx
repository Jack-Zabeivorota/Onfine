import s from './Counter.module.css';
import { getFormatNum } from '../../tools';


function Counter({ icon, count=0, textColor=null, onClick }) {
    return (
        <div className={s.container} onClick={onClick}>
            <img src={icon} alt="icon" />
            { count > 0 &&
                <div style={textColor !== null ? {color: textColor} : null}>
                    {getFormatNum(count)}
                </div>
            }
        </div>
    );
}

export default Counter;