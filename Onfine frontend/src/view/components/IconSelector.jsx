import s from './IconSelector.module.css';
import { useRef } from 'react';
import { useDispatch } from 'react-redux';
import { setFullScreenImage } from '../../store/globalSlice';


function AvatarSelector({ preview, onSelectIcon }) {
    const dispatch = useDispatch();

    const fileSelectorRef = useRef();


    function onPreSelectIcon(e) {
        if (e.target.files.length > 0)
            onSelectIcon(e.target.files[0]);
    }

    function onSelectFile(e) {
        e.stopPropagation();
        fileSelectorRef.current.click();
    }

    function onContainerClick() {
        if (preview !== null)
            dispatch(setFullScreenImage(preview));
        else
            fileSelectorRef.current.click();
    }

    function onDeselectIcon(e) {
        e.stopPropagation();
        fileSelectorRef.current.value = '';
        onSelectIcon(null);
    }


    return (
        <div className={s.container} onClick={onContainerClick}>
            <input ref={fileSelectorRef} type='file' accept='image/*'
                   onClick={e => e.stopPropagation()} onChange={onPreSelectIcon} />

            { preview !== null ?
                <>
                    <img src={preview} alt="icon" />
                    <div className={s.deselector} onClick={onDeselectIcon}>×</div>
                    <div className={s.selector} onClick={onSelectFile}>Change</div>
                </> :
                <span className={s.capture}>Add icon</span>
            }
            
        </div>
    );
}

export default AvatarSelector;