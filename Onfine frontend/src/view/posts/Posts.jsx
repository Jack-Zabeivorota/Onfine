import s from './Posts.module.css';
import { useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { clearPosts, getPosts } from '../../store/chatSlice';
import Post from './Post';


function Posts() {
    const [icons, posts, posts_is_loaded] = useSelector(state => [
        state.global.icons,
        state.chat.posts,
        state.chat.all_posts_is_loaded,
    ]);
    const dispatch = useDispatch();

    const loadPostsBlock = useRef();

    const isPosts = posts.length > 0;


    function reloadPosts() {
        dispatch(clearPosts());
        dispatch(getPosts());
    }


    useEffect(() => {
        if (!loadPostsBlock.current) return;

        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting)
                dispatch(getPosts());
        });
        const timer = setTimeout(() => observer.observe(loadPostsBlock.current), 1000);

        return () => {
            clearTimeout(timer);
            observer.disconnect();
        }
    }, [isPosts, loadPostsBlock.current]);


    return (
        <section className={s.container}>

            <div className={s.top_panel}>
                <img className={s.logo} src={icons.logo} alt="logo" />
                <img className='ui_icon_btn' src={icons.reload} onClick={reloadPosts} alt="reload" />
            </div>

            { isPosts ?
                <div className={`${s.posts} scroll`}>
                    { posts.map(post =>
                        <Post key={post.id} post={post} />
                    )}
                    { !posts_is_loaded &&
                        <div ref={loadPostsBlock} className={s.load_capture}>Load posts...</div>
                    }
                </div> :

                <div className={s.download_capture}>
                    <div>Posts not exists</div>
                </div>
            }

        </section>
    );
}

export default Posts;