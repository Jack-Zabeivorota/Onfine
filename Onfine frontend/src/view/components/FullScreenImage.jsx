import { useDispatch } from 'react-redux';
import { setFullScreenImage } from '../../store/globalSlice';
import Barier from './Barier';


function FullScreenImage({ src }) {
    const dispatch = useDispatch();


    return (
        <Barier onClick={() => dispatch(setFullScreenImage(null))} isShowCloseBtn>
            <img src={src}
                 onClick={e => e.stopPropagation()}
                 style={{ maxWidth: '100%', maxHeight: '100%' }}
                 alt='fullscreen_image' />
        </Barier>
    )
}

export default FullScreenImage;