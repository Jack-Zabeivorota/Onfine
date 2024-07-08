import s from './ChatMaster.module.css';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { setChatMasterData, setUserSelectorData } from '../../store/globalSlice';
import { createChat, updateChatData } from '../../store/chatSlice';
import { imagesURL } from '../../store/localData';
import Barier from '../components/Barier';
import { TextBox, TextArea } from '../components/TextBox';
import Toogle from '../components/Toogle';
import IconSelector from '../components/IconSelector';


function ChatMaster({ chat }) {
    const dispatch = useDispatch();

    const chatNameRef    = useRef(),
          descriptionRef = useRef();

    const isChat = chat !== undefined;

    const [chatType, setChatType]   = useState(isChat ? chat.type : 'group');
    const [isPrivate, setIsPrivate] = useState(false);
    const [members, setMembers]     = useState({});

    const [image, setImage]     = useState(isChat ? null : 'none');
    const [preview, setPreview] = useState(isChat && chat.with_icon ? `${imagesURL}/${chat.id}_icon` : null);

    const membersCount = useMemo(() => Object.keys(members).length, [members]);
    const title = isChat ?
        ((chat.is_private ? 'Private ' : 'Public ') + (chat.type === 'group' ? 'group' : 'channel')) :
        'Creating chat';

    const chatTypes = [
        ['group',   'Group'],
        ['channel', 'Channel'],
    ];

    useEffect(() => {
        if (!isChat) return;

        chatNameRef.current.value = chat.name;
        descriptionRef.current.value = chat.description;
    }, [isChat, chat]);

    useEffect(() => {
        if (image === null) return;

        if (image !== 'none') {
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result);
            reader.readAsDataURL(image);
        }
        else setPreview(null);
    }, [image]);


    function onSelectMembers() {
        dispatch(setUserSelectorData({
            enterAction: 'Select',
            initSelectedUsers: members,
            onSelect: setMembers,
        }));
    }

    function onSelectIcon(icon) { setImage(icon ?? 'none'); }

    function onSetIsPrivate(isPrivate) { setIsPrivate(isPrivate); }

    function onClose() { dispatch(setChatMasterData(null)); }

    function onAction(isEnterAction) {
        if (!isEnterAction) {
            onClose();
            return;
        }

        const name = chatNameRef.current.value;
        const description = descriptionRef.current.value;

        if (isChat)
            dispatch(updateChatData({
                chatId: chat.id,
                name,
                description,
                icon: image,
            }));
        else
            dispatch(createChat({
                type: chatType,
                name,
                description,
                icon: image,
                isPrivate,
                members,
            }));
    }


    return (
        <Barier onClick={onClose}>
            <section className={s.container} onClick={e => e.stopPropagation()}>

                <div className={`${s.inner_container} scroll`}>

                    <span className={s.title}>{title}</span>

                    { !isChat &&
                        <div className={s.chat_types}>
                            { chatTypes.map(([type, value]) =>
                                <button key={type}
                                    className={`ui_chip ${type === chatType && 'select'}`}
                                    onClick={() => setChatType(type)}>
                                    {value}
                                </button>
                            )}
                        </div>
                    }

                    <TextBox inputRef={chatNameRef} label='Chat name' />

                    <TextArea inputRef={descriptionRef} label='Description' />

                    <div className={s.icon_wrap}>
                        <IconSelector preview={preview} onSelectIcon={onSelectIcon} />
                    </div>

                    { !isChat &&
                    <>
                        <div className={s.private}>
                            <Toogle isChecked={isPrivate} onCheck={onSetIsPrivate} />
                            <div>Is private</div>
                        </div>

                        <div className={`${s.members} ui_chip`} onClick={onSelectMembers}>
                            {membersCount} members
                        </div>
                    </>
                    }

                </div>

                <div className='ui_actions'>
                    <button onClick={() => onAction(false)}>Cancel</button>
                    <button onClick={() => onAction(true)}>{chat ? 'Save' : 'Create'}</button>
                </div>

            </section>
        </Barier>
    );
}

export default ChatMaster;