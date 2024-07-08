import s from './Barier.module.css';


function Barier({ children, isShowCloseBtn=false, onClick }) {
    return (
        <section className={s.container} onClick={onClick}>
            {children}
            { isShowCloseBtn && <button className='ui_close_btn'>×</button> }
        </section>
    );
}

export default Barier;