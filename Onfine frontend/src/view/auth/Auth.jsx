import s from './Auth.module.css';
import { useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { changeTheme, login, register } from '../../store/globalSlice';
import { TextBox, PasswordBox } from '../components/TextBox';


function RegisterForm() {
    const emailRef    = useRef(),
          nameRef     = useRef(),
          nicknameRef = useRef(),
          passwordRef = useRef(),
          repeadPasswordRef = useRef();

    const dispatch = useDispatch();


    function onSubmit() {
        const email    = emailRef.current.value,
              name     = nameRef.current.value,
              nickname = nicknameRef.current.value,
              password = passwordRef.current.value,
              repeadPassword = repeadPasswordRef.current.value;
        
        dispatch(register({email, name, nickname, password, repeadPassword}));
    }


    return (
        <div className={`${s.form} scroll`}>
            <div className={s.register_form}>
                <span className={s.title}>REGISTER</span>

                <TextBox inputRef={emailRef} label='Email' />
                <TextBox inputRef={nameRef} label='User name' />
                <TextBox inputRef={nicknameRef} label='Nicname' />
                <PasswordBox inputRef={passwordRef} label='Password' />
                <PasswordBox inputRef={repeadPasswordRef} label='Repead password' />

                <button className={`${s.submit} ui_btn`} onClick={onSubmit}>Register</button>
            </div>
        </div>
    );
}

function LoginForm() {
    const emailRef    = useRef();
    const passwordRef = useRef();
    const dispatch = useDispatch();


    function onSubmit() {
        const email    = emailRef.current.value;
        const password = passwordRef.current.value;
        dispatch(login({email, password}));
    }


    return (
        <div className={`${s.form} scroll`}>
            <div className={s.login_form}>
                <span className={s.title}>LOGIN</span>

                <TextBox inputRef={emailRef} label='Email' />
                <PasswordBox inputRef={passwordRef} label='Password' />

                <button className={`${s.submit} ui_btn`} onClick={onSubmit}>Login</button>
            </div>
        </div>
    );
}

function Auth() {
    const [icons, isDarkMode] = useSelector(state => [
        state.global.icons,
        state.global.isDarkMode,
    ]);
    const dispatch = useDispatch();
    const [isRegister, setIsRegister] = useState(false);
    

    function toogleRegister() { setIsRegister(!isRegister); }

    function onChangeTheme() { dispatch(changeTheme()); }


    const theme_button = isDarkMode ?
        { src: icons.sun,  alt: 'light_theme' } :
        { src: icons.moon, alt: 'dark_theme'  }

    return (
        <section className={`${s.container} ${isRegister && s.register}`}>

            <RegisterForm />
            <LoginForm />

            <div className={s.board}>
                <img className={`${s.theme_btn} ui_icon_btn`}
                     src={theme_button.src} alt={theme_button.alt}
                     onClick={onChangeTheme}
                />

                <img className={s.logo} src={icons.logo_white} alt="logo" />
                <span className={s.capture}>Social media for your own</span>

                <button className={s.btn} onClick={toogleRegister}>
                    {isRegister ? 'Login' : 'Register'}
                </button>
            </div>
        </section>
    );
}

export default Auth;