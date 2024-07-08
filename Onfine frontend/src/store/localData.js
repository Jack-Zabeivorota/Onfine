export const userData = {
    cryptoKey:   null,
    userId:      null,
    authToken:   null,
    privKey:     null,
    email:       null,
    name:        null,
    nickname:    null,
    with_avatar: null,
};

export function resetUserData() {
    Object.keys(userData).forEach(key => { userData[key] = null; });
}

export function getAsUser() {
    return {
        name: userData.name,
        nickname: userData.nickname,
        with_avatar: userData.with_avatar,
        is_online: true,
        last_visit: null,
    };
}

export const serverWS  = 'ws://127.0.0.1:8000/ws';
export const serverURL = 'http://127.0.0.1:8000';
export const imagesURL = serverURL + '/images';