import CryptoJS from 'crypto-js';
import JSEncrypt from 'jsencrypt';
import { icons, iconsLight, iconsDark } from './icons';
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getChats, getPosts } from './chatSlice';
import { serverURL, userData } from './localData';
import { alertErrDecor, createFormData, throwError, cleanText, AESEncrypt, AESDecrypt } from '../tools';
import createWebSocket from '../websocket';


function getPasswordAndKey(password) {
    const hashedPassword = CryptoJS.SHA256(password).toString();

    password = hashedPassword.slice(0, hashedPassword.length / 2);
    let cryptoKey = hashedPassword.slice(hashedPassword.length / 2);

    password = CryptoJS.SHA256(password).toString();
    cryptoKey = CryptoJS.SHA256(cryptoKey).toString();

    return [password, cryptoKey];
}

export const login = createAsyncThunk(
    'global/login',
    alertErrDecor(async ({ email, password }, thunkAPI) => {
        if (email === '' || password === '')
            throw new Error('Field is empty');

        const [_password, cryptoKey] = getPasswordAndKey(password);

        const response = await fetch(serverURL + '/user/login', {
            method: 'POST',
            body: JSON.stringify({
                email:    email,
                password: _password,
            }),
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throwError(await response.json());

        const { user_id, token, priv_key, name, nickname, with_avatar, latest_key_update } = await response.json();
        
        userData.cryptoKey = cryptoKey;
        userData.userId    = user_id;
        userData.authToken = token;
        userData.privKey   = AESDecrypt(priv_key, cryptoKey);
        userData.email     = cleanText(email);
        userData.name      = cleanText(name);
        userData.nickname  = cleanText(nickname);
        userData.with_avatar     = with_avatar;
        userData.latestKeyUpdate = latest_key_update;

        createWebSocket(thunkAPI.dispatch);
        thunkAPI.dispatch(getChats());
        thunkAPI.dispatch(getPosts());
    }),
);

export const register = createAsyncThunk(
    'global/register',
    alertErrDecor(async ({ email, password, repeadPassword, name, nickname }, thunkAPI) => {
        if (email === '' || password === '' || name === '' || nickname === '')
            throw new Error('Field is empty');

        if (password !== repeadPassword)
            throw new Error('Password was repeated incorrectly');

        name     = cleanText(name);
        nickname = cleanText(nickname);

        const [_password, cryptoKey] = getPasswordAndKey(password);

        const keys = new JSEncrypt();
        const privKey = keys.getPrivateKey();
        
        const response = await fetch(serverURL + '/user/register', {
            method: 'POST',
            body: JSON.stringify({
                email:    email,
                password: _password,
                name:     name,
                nickname: nickname,
                pub_key:  keys.getPublicKey(),
                priv_key: AESEncrypt(privKey, cryptoKey),
            }),
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throwError(await response.json());

        const { user_id, token } = await response.json();

        userData.cryptoKey   = cryptoKey;
        userData.userId      = user_id;
        userData.authToken   = token;
        userData.privKey     = privKey;
        userData.email       = cleanText(email);
        userData.name        = name;
        userData.nickname    = nickname;
        userData.with_avatar = false;

        createWebSocket(thunkAPI.dispatch);
        thunkAPI.dispatch(getChats());
        thunkAPI.dispatch(getPosts());
    }),
);

export const updateUserData = createAsyncThunk(
    'global/updateUserData',
    alertErrDecor(async ({ email, name, nickname, avatar }, thunkAPI) => {
        if (email === '' || name === '' || nickname === '')
            throw new Error('Field is empty');

        name     = cleanText(name);
        nickname = cleanText(nickname);

        const response = await fetch(serverURL + '/user/update_data', {
            method: 'PUT',
            body: createFormData({
                data: JSON.stringify({
                    user_id: userData.userId,
                    token:   userData.authToken,
                    email, name, nickname,
                }),
                avatar
            })
        });
        if (!response.ok) throwError(await response.json());

        userData.email    = cleanText(email);
        userData.name     = name;
        userData.nickname = nickname;
        if (avatar) userData.with_avatar = avatar !== 'none';

        thunkAPI.dispatch(setAlertData({
            content: 'Information saved',
            isSuccess: true,
        }));
    }),
);

export const updatePassword = createAsyncThunk(
    'global/updatePassword',
    alertErrDecor(async ({ currPassword, newPassword, repeadPassword }, thunkAPI) => {
        if (currPassword === '' || newPassword === '')
            throw new Error('Field is empty');

        if (newPassword !== repeadPassword)
            throw new Error('Password was repeated incorrectly');

        const [_currPassword, currCryptoKey] = getPasswordAndKey(currPassword);

        if (userData.cryptoKey !== currCryptoKey)
            throw new Error('Wrong password');

        const [_newPassword, newCryptoKey] = getPasswordAndKey(newPassword);
        
        const response = await fetch(serverURL + '/user/update_password', {
            method: 'PUT',
            body: JSON.stringify({
                user_id:  userData.userId,
                curr_password: _currPassword,
                new_password: _newPassword,
                priv_key: AESEncrypt(userData.privKey, newCryptoKey),
            }),
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throwError(await response.json());

        userData.cryptoKey = newCryptoKey;

        thunkAPI.dispatch(setAlertData({
            content: 'Password saved',
            isSuccess: true,
        }));
    }),
);

export const updateKeys = createAsyncThunk(
    'global/updateKeys',
    alertErrDecor(async (_, thunkAPI) => {
        const keys = new JSEncrypt();
        const privKey = keys.getPrivateKey();

        const response = await fetch(serverURL + '/user/update_keys', {
            method: 'PUT',
            body: JSON.stringify({
                user_id: userData.userId,
                token:   userData.authToken,
                pub_key: keys.getPublicKey(),
                priv_key: AESEncrypt(privKey, userData.cryptoKey),
            })
        });
        if (!response.ok) throwError(await response.json());

        userData.privKey = privKey;

        thunkAPI.dispatch(setAlertData({
            content: 'Keys updated',
            isSuccess: true,
        }));
    }),
);

export const deleteUser = createAsyncThunk(
    'global/deleteUser',
    alertErrDecor(async (password) => {
        if (password === '')
            throw new Error('Field is empty');

        const [_password] = getPasswordAndKey(password);

        const response = await fetch(serverURL + '/user/delete', {
            method: 'DELETE',
            body: JSON.stringify({
                user_id:  userData.userId,
                password: _password,
            }),
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throwError(await response.json());

        window.location.reload();
    }),
);


const initialState = {
    isDarkMode: true,
    icons: {...icons, ...iconsDark},
    isMobil: false,
    alertData: null,
    chatSelectorData: null,
    isShowedAuth: true,
    isShowedMenu: false,
    isShowedUserDataUpdater: false,
    chatMasterData: null,
    userSelectorData: null,
    userInfoData: null,
    chatInfoData: null,
    fullScreenImage: null,
};

export const globalSlice = createSlice({
    name: 'global',
    initialState,
    reducers: {
        changeTheme: (state) => {
        state.isDarkMode = !state.isDarkMode;
        state.icons = state.isDarkMode ?
            {...icons, ...iconsDark} :
            {...icons, ...iconsLight};
        },
        setIsMobil:          (state, action) => { state.isMobil = action.payload; },
        setAlertData:        (state, action) => { state.alertData = action.payload; },
        setChatSelectorData: (state, action) => { state.chatSelectorData = action.payload; },
        changeShowedUserDataUpdater: (state, action) => { state.isShowedUserDataUpdater = action.payload },
        changeShowedMenu:    (state, action) => { state.isShowedMenu = action.payload; },
        setChatMasterData:   (state, action) => { state.chatMasterData = action.payload; },
        setUserSelectorData: (state, action) => { state.userSelectorData = action.payload; },
        setUserInfoData:     (state, action) => { state.userInfoData = action.payload; },
        setChatInfoData:     (state, action) => { state.chatInfoData = action.payload; },
        setFullScreenImage:  (state, action) => { state.fullScreenImage = action.payload; },
    },
    extraReducers: {
        [login.fulfilled]: (state) => { state.isShowedAuth = false; },
        [register.fulfilled]: (state) => { state.isShowedAuth = false; },
    },
});

export const {
    changeTheme,
    setIsMobil,
    setAlertData,
    setChatSelectorData,
    changeShowedMenu,
    changeShowedUserDataUpdater,
    setChatMasterData,
    setUserSelectorData,
    setUserInfoData,
    setChatInfoData,
    setFullScreenImage,
} = globalSlice.actions;

export default globalSlice.reducer;
