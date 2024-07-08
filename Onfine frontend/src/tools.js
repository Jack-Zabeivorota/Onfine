import CryptoJS from 'crypto-js';
import { setAlertData } from './store/globalSlice';


export function alertErrDecor(asyncFunc) {
    return async (payload, thunkAPI) => {
        try {
            return await asyncFunc(payload, thunkAPI);
        }
        catch(err) {
            const msg = err.name === 'Error' ? err.message : 'Server error';
            thunkAPI.dispatch(setAlertData({content: msg}));
            return thunkAPI.rejectWithValue(msg);
        }
    }
}

export function throwError(data) {
    throw new Error(data.detail instanceof Array ? data.detail[0].msg : data.detail);
}

export function getFormatNum(num) {
    if (num >= 1_000_000_000)
        return (num / 1_000_000_000).toFixed(1) + ' b';

    if (num >= 1_000_000)
        return (num / 1_000_000).toFixed(1) + ' m';

    if (num >= 1000)
        return (num / 1000).toFixed(1) + ' k';

    return num.toString();
}

export function cleanText(str) {
    if (!str) return str;
    str = str.replace(/</g, '&lt;');
    str = str.replace(/>/g, '&gt;');
    str = str.trim();
    return str;
}

export function getTime(date) {
    if (typeof date === 'string') date = new Date(date + 'Z');

    return date.toLocaleString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}

export function getDate(date) {
    if (typeof date === 'string') date = new Date(date + 'Z');

    return date.toLocaleString(undefined, {
        year:  'numeric',
        month: '2-digit',
        day:   '2-digit',
    });
}

export function getTimeDelta(date) {
    if (typeof date === 'string') date = new Date(date + 'Z');

    const minuteDelta = Math.floor((new Date() - date) / 60_000);


    if (minuteDelta < 1) return 'now';

    if (minuteDelta < 60) return `${minuteDelta} minutes ago`;

    const hourDelta = Math.floor(minuteDelta / 60);

    if (hourDelta < 5) return `${hourDelta} hours ago`;

    if (hourDelta < 24) return getTime(date);

    if (hourDelta < 48) return 'yesterday';

    return getDate(date);
}

export function createFormData(obj) {
    const form = new FormData();

    Object.keys(obj).forEach(key => {
        const value = obj[key];

        if (value instanceof Array)
            value.forEach(item => form.append(key, item));
        else
            form.append(key, value);
    });

    return form;
}

export function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        
        reader.readAsDataURL(file);
    });
}

export function AESEncrypt(message, key) {
    if (!message) return message;
    return CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(message), key).toString();
}

export function AESDecrypt(message, key) {
    if (!message) return message;
    return CryptoJS.AES.decrypt(message, key).toString(CryptoJS.enc.Utf8);
}