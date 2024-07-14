import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setIsMobil } from '../store/globalSlice';
import Auth from './auth/Auth';
import Menu from './menu/Menu';
import Layout from './layout/Layout';
import DialogAlert from './alert/DialogAlert';
import Alert from './alert/Alert';
import FullScreenImage from './components/FullScreenImage';
import ChatSelector from './chats/ChatSelector';
import UserDataUpdater from './userDataUpdater/userDataUpdater';
import ChatMaster from './chatMaster/ChatMaster';
import UserSelector from './userSelector/UserSelector';
import UserInfo from './userInfo/UserInfo';
import ChatInfo from './chatInfo/ChatInfo';

function App() {
    const [
        isDarkMode,
        isShowedAuth,
        isShowedUserDataUpdater,
        chatMasterData,
        alertData,
        chatSelectorData,
        userSelectorData,
        userInfoData,
        chatInfoData,
        fullScreenImage
    ] = useSelector(state => [
        state.global.isDarkMode,
        state.global.isShowedAuth,
        state.global.isShowedUserDataUpdater,
        state.global.chatMasterData,
        state.global.alertData,
        state.global.chatSelectorData,
        state.global.userSelectorData,
        state.global.userInfoData,
        state.global.chatInfoData,
        state.global.fullScreenImage
    ]);
    
    const dispatch = useDispatch();


    function onResize() {
        dispatch(setIsMobil(window.innerWidth < 1000));
    }


    useEffect(() => {
        const body = document.querySelector('body');
        isDarkMode ? body.classList.add('dark_mode') : body.classList.remove('dark_mode');
    }, [isDarkMode]);

    useEffect(() => {
        onResize();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    return (
    <>
        { isShowedAuth ? <Auth /> : <Layout /> }

        <Menu />

        { isShowedUserDataUpdater && <UserDataUpdater /> }

        { chatMasterData !== null &&  <ChatMaster chat={chatMasterData} /> }

        { chatSelectorData !== null && <ChatSelector {...chatSelectorData} /> }

        { userSelectorData !== null &&  <UserSelector {...userSelectorData} /> }

        { userInfoData !== null && <UserInfo {...userInfoData} /> }

        { chatInfoData !== null && <ChatInfo chat={chatInfoData} /> }

        { fullScreenImage !== null && <FullScreenImage src={fullScreenImage} /> }

        { alertData !== null &&
            (alertData.actions !== undefined ?
                <DialogAlert {...alertData} /> :
                <Alert {...alertData} />
            )
        }
    </>
    );
}

export default App;