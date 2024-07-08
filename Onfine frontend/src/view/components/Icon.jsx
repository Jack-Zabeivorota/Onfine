import s from './Icon.module.css';


function Icon({ src, defaultText, className, onClick }) {
    return (
        <div className={`${s.container} ${onClick && s.clickable} ${className}`} onClick={onClick}>
            { src ?
                <img src={src} alt="icon" /> :
                <span>{defaultText}</span>
            }
        </div>
    );
}

export default Icon;