import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import Chats from './chats/Chats';
import Auth from './auth/Auth';
import DialogAlert from './alert/DialogAlert';
import Alert from './alert/Alert';
import FullScreenImage from './components/FullScreenImage';
import ChatSelector from './chats/ChatSelector';
import UserDataUpdater from './userDataUpdater/UserDataUpdater';
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
        image
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
        state.global.fullScreenImage,
    ]);

    useEffect(() => {
        const body = document.querySelector('body');
        isDarkMode ? body.classList.add('dark_mode') : body.classList.remove('dark_mode');
    }, [isDarkMode]);

    return (<>
        { isShowedAuth ? <Auth /> : <Chats /> }

        { isShowedUserDataUpdater && <UserDataUpdater /> }

        { chatMasterData !== null &&  <ChatMaster chat={chatMasterData} /> }

        { chatSelectorData !== null && <ChatSelector {...chatSelectorData} /> }

        { userSelectorData !== null &&  <UserSelector {...userSelectorData} /> }

        { userInfoData !== null && <UserInfo {...userInfoData} /> }

        { chatInfoData !== null && <ChatInfo chat={chatInfoData} /> }

        { image !== null && <FullScreenImage src={image} /> }

        { alertData !== null &&
            (alertData.actions !== undefined ?
                <DialogAlert {...alertData} /> :
                <Alert {...alertData} />
            )
        }
    </>);
}

export default App;