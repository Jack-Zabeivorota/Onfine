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

export class Deque {
    #length
    #dict
    #first
    #last

    constructor(maxLength) {
        this.maxLength = maxLength;
        this.#length = 0;
        this.#dict = {};
        this.#first = null;
        this.#last = null;
    }

    get length() { return this.#length; }

    get firstValue() { return this.#first?.value; }

    get lastValue() {return this.#last?.value; }

    get(key) { return this.#dict[key]?.value; }

    #getNodeAt(index) {
        if (index < 0 || index >= this.#length)
            throw new Error('Index out of range');

        let node;

        if (index < this.#length / 2) {
            node = this.#first;

            for (let i = 0; i < index; i++)
                node = node.next;
        } else {
            node = this.#last;
    
            for (let i = 0; i < this.#length - index - 1; i++)
                node = node.prev;
        }

        return node;
    }

    getAt(index) {
        const node = this.#getNodeAt(index);
        return [node.value, node.key]
    }

    set(key, value) {
        if (key in this.#dict)
            this.#dict[key].value = value;
        else
            this.add(key, value);
    }

    has(key) { return key in this.#dict; }

    remove(key) {
        if (!(key in this.#dict)) return false;

        const node = this.#dict[key];
        delete this.#dict[key];

        if (this.length === 1) {
            this.#last = this.#first = null;
            return true;
        }

        if (node.prev !== null)
            node.prev.next = node.next;
        else
            this.#first = node.next;

        if (node.next !== null)
            node.next.prev = node.prev;
        else
            this.#last = node.prev;

        this.length -= 1;

        return true;
    }

    removeAt(index) { return this.remove(this.#getNodeAt(index).key); }

    removeFirst() { return this.#first !== null && this.remove(this.#first.key); }

    removeLast() { return this.#last !== null && this.remove(this.#last.key); }

    add(key, value) {
        const node = {
            next: null,
            prev: this.#last,
            key,
            value,
        };

        if (this.#last !== null) {
            this.#last.next = node;
            this.#last = node;
        }
        else this.#first = this.#last = node;

        this.#dict[key] = node;
        this.#length += 1;

        if (this.#length > this.maxLength) this.removeFirst();
    }

    toArray(by='value') {
        if (by !== 'value' || by !== 'key')
            throw new Error('"by" must be "value" or "key"');

        let node = this.#first;
        const list = [];

        while (node !== null) {
            list.push(node[by]);
            node = node.next;
        }

        return list;
    }

    toObject() {
        let node = this.#first;
        const obj = {};

        while (node !== null) {
            obj[node.key] = node.value;
            node = node.next;
        }

        return obj;
    }
}