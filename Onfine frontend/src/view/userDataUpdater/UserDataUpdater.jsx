import s from './userDataUpdater.module.css';
import { useRef, useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { updateUserData, updatePassword, changeShowedUserDataUpdater, setAlertData, deleteUser } from '../../store/globalSlice';
import { imagesURL, userData } from '../../store/localData';
import Barier from '../components/Barier';
import { TextBox, PasswordBox } from '../components/TextBox';
import IconSelector from '../components/IconSelector';


function UserDataUpdater() {
    const dispatch = useDispatch();

    const emailRef          = useRef(),
          nameRef           = useRef(),
          nicknameRef       = useRef(),
          currPasswordRef   = useRef(),
          newPasswordRef    = useRef(),
          repeadPasswordRef = useRef(),
          passwordForDeletingRef = useRef();
    
    const [avatar, setAvatar] = useState(null);
    const [preview, setPreview] = useState(userData.with_avatar ? `${imagesURL}/${userData.userId}_avatar` : null);

    useEffect(() => {
        if (avatar === null) return;
        
        if (avatar !== 'none') {
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result);
            reader.readAsDataURL(avatar);
        }
        else setPreview(null);
    }, [avatar]);

    useEffect(() => {
        emailRef.current.value    = userData.email;
        nameRef.current.value     = userData.name;
        nicknameRef.current.value = userData.nickname;
    }, []);


    function onSelectIcon(icon) { setAvatar(icon ?? 'none'); }

    function onSubmitInfo() {
        const email    = emailRef.current.value,
              name     = nameRef.current.value,
              nickname = nicknameRef.current.value;

        dispatch(updateUserData({ email, name, nickname, avatar }));
    }

    function onSubmitPassword() {
        const currPassword   = currPasswordRef.current.value,
              newPassword    = newPasswordRef.current.value,
              repeadPassword = repeadPasswordRef.current.value;

        dispatch(updatePassword({ currPassword, newPassword, repeadPassword }));
    }

    function onDeleteAccount() {
        dispatch(setAlertData({
            title: 'Deleting account',
            content: 'Are you sure you want to delete your account?',
            actions: ['No', 'Yes'],
            onAction: (action) => {
                if (action !== 'Yes') return;
                const password = passwordForDeletingRef.current.value;
                dispatch(deleteUser(password));
            }
        }));
    }

    function onClose() { dispatch(changeShowedUserDataUpdater(false)); }


    return (
        <Barier onClick={onClose}>
            <section className={s.container} onClick={e => e.stopPropagation()}>
                <button className='ui_close_btn' onClick={onClose}>×</button>

                <div className={`${s.inner_container} scroll`}>

                    <div className={s.avatar_wrap}>
                        <IconSelector preview={preview} onSelectIcon={onSelectIcon} />
                    </div>

                    <span className={s.title}>Information</span>
                    <TextBox inputRef={emailRef} label='Email' />
                    <TextBox inputRef={nameRef} label='Name' />
                    <TextBox inputRef={nicknameRef} label='Nickname' />
                    <button className={`${s.submit} ui_btn`} onClick={onSubmitInfo}>
                        Save information
                    </button>

                    <span className={s.title}>Password</span>
                    <PasswordBox inputRef={currPasswordRef} label='Current password' />
                    <PasswordBox inputRef={newPasswordRef} label='New password' />
                    <PasswordBox inputRef={repeadPasswordRef} label='Repead password' />
                    <button className={`${s.submit} ui_btn`} onClick={onSubmitPassword}>
                        Save password
                    </button>
                
                    <span className={s.title}>Deleting account</span>
                    <PasswordBox inputRef={passwordForDeletingRef} label='Password' />
                    <button className={`${s.submit} ${s.red} ui_btn`} onClick={onDeleteAccount}>
                        Delete account
                    </button>

                </div>
            </section>
        </Barier>
    );
}

export default UserDataUpdater;