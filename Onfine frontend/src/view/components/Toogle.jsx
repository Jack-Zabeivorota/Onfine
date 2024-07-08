import s from './Toogle.module.css';


function Toogle({ isChecked, onCheck }) {
    function onClick() { onCheck(!isChecked); }

    return (
        <div className={`${s.container} ${isChecked && s.checked}`} onClick={onClick}>
            <div></div>
        </div>
    );
}

export default Toogle;