import s from './Post.module.css';
import { useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectChat, likeMessage, sendMessage } from '../../store/chatSlice';
import { setFullScreenImage, setChatSelectorData } from '../../store/globalSlice';
import { getTimeDelta } from '../../tools';
import { imagesURL } from '../../store/localData';
import Icon from '../components/Icon';
import Counter from '../components/Counter';


function Post({ post }) {
    const [icons, chats] = useSelector(state => [
        state.global.icons,
        state.chat.chats,
    ]);
    const dispatch = useDispatch();

    const date_time = getTimeDelta(post.date_time);

    const [name, withIcon, chatId] = useMemo(() => {
        const chat = chats.find(chat => chat.id === post.sender_id);
        return chat !== undefined ? [chat.name, chat.with_icon, chat.id] : ['(unknow)', false, null];
    }, [chats, post.sender_id]);

    const icon = withIcon && `${imagesURL}/${chatId}_icon`;


    function onSelectChat() { dispatch(selectChat(post.sender_id)); }

    function onImageClick() { dispatch(setFullScreenImage(post.image)); }

    function onLike() {
        dispatch(likeMessage({
            chatId:    post.sender_id,
            messageId: post.id,
            isLiked:  !post.is_liked,
        }));
    }

    function onForward() {
        dispatch(setChatSelectorData({
            enterAction: 'Forward',
            onSelect: chatIds => chatIds.size > 0 && dispatch(sendMessage({
                chatIds,
                content: post.content,
                image: post.image,
            })),
        }));
    }


    return (
        <div className={s.container}>
            <div className={s.metadata} onClick={onSelectChat}>
                <Icon className={s.icon} src={icon} defaultText={name[0]} />

                <div>
                    <div className={s.name}>{name}</div>
                    <div className={s.datetime}>{date_time}</div>
                </div>
            </div>

            { post.image !== null &&
                <img className={s.image} src={post.image} onClick={onImageClick} alt="post_image" />
            }

            <span>{post.content}</span>

            <div className={s.down_panel}>
                { post.is_liked ?
                    <Counter icon={icons.like_active} count={post.likes} textColor='#FC4147' onClick={onLike} /> :
                    <Counter icon={icons.like} count={post.likes} onClick={onLike} />
                }
                <img className='ui_icon_btn' src={icons.forward} onClick={onForward} alt="forward" />
            </div>
        </div>
    );
}

export default Post;