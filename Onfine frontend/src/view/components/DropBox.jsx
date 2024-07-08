import s from './DropBox.module.css';
import { useState } from 'react';


function DropBox({ action, action_classes, children = [], isAlignLeft=false }) {
    const [isShowed, setIsShowed] = useState(false);


    function toogleShowed() { setIsShowed(!isShowed); }


    return (
        <div className={s.container}>
            <div className={action_classes} onClick={toogleShowed}>{action}</div>

            <div className={`${s.options} ${isShowed && s.show} ${isAlignLeft && s.left}`}
                 onClick={toogleShowed}>
                {children}
            </div>
        </div>
    );
}

export default DropBox;