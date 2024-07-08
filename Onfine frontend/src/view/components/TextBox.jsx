import s from './TextBox.module.css';
import { useState } from 'react';
import { useSelector } from 'react-redux';


export function TextBox({ label, inputRef }) {
    return (
        <div className={s.container}>
            <div className={s.label}>{label}</div>
            <input ref={inputRef} type='text' />
        </div>
    );
}

export function PasswordBox({ label, inputRef }) {
    const [isShow, setIsShow] = useState(false);
    const icons = useSelector(state => state.global.icons);


    function toggleIsShow() { setIsShow(!isShow); }


    return (
        <div className={s.container}>
            <div className={s.label}>{label}</div>
            
            <div className={s.field}>
                <input ref={inputRef} type={isShow ? 'text' : 'password'} />
                { isShow ?
                    <img src={icons.hide_text} onClick={toggleIsShow} alt="hide" /> :
                    <img src={icons.show_text} onClick={toggleIsShow} alt="show" />
                }
            </div>
        </div>
    );
}

export function TextArea({ label, inputRef, rows=4 }) {
    return (
        <div className={s.container}>
            <div className={s.label}>{label}</div>
            <textarea className='scroll' ref={inputRef} type='text' rows={rows} />
        </div>
    );
}

