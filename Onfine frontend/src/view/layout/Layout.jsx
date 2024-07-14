import s from './Layout.module.css';
import Chats from '../chats/Chats';
import Posts from '../posts/Posts';
import Chat from '../chat/Chat';
import { useSelector } from 'react-redux';


function MobilLayout() {
    const selectedChatId = useSelector(state => state.chat.selectedChatId);

    return (
        <section className={s.mobil_container}>
            { selectedChatId ? <Chat /> : <Chats /> }
        </section>
    );
}

function DesktopLayout() {
    const selectedChatId = useSelector(state => state.chat.selectedChatId);

    return (
        <section className={s.desktop_container}>

            <div className={s.chats}>
                <Chats />
            </div>

            <div className={s.inner}>
                { selectedChatId ? <Chat /> : <Posts /> }
            </div>

        </section>
    );
}

function Layout() {
    const isMobil = useSelector(state => state.global.isMobil);

    return (
        isMobil ?  <MobilLayout /> : <DesktopLayout />
    );
}

export default Layout;