import s from './SearchBox.module.css';
import { useRef, useState } from 'react';
import { useSelector } from 'react-redux';


function SearchBox({ flex, onChange }) {
    const icons = useSelector(state => state.global.icons);
    
    const inputRef = useRef();
    const [timer, setTimer] = useState(null);


    function onPreChange() {
        if (timer !== null) clearTimeout(timer);

        setTimer(
            setTimeout(() => {
                if (inputRef.current !== null)
                    onChange(inputRef.current.value);
                setTimer(null);
            }, 1000)
        );
    }


    return (
        <div className={s.container} style={flex !== null && {flex}}>
            <input type='text' ref={inputRef} onChange={onPreChange} />
            <img src={icons.search} alt='search' />
        </div>
    );
}

export default SearchBox;