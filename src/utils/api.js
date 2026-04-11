// utils/api.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_BASE_URL = 'https://sandbox.safeqr.in/api/v1';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// utils/api.js
api.interceptors.request.use(
    async (config) => {
        try {
            const authData = await AsyncStorage.getItem('auth-storage');
            if (authData) {
                const parsed = JSON.parse(authData);
                const user = parsed.state?.user;

                // ✅ your API saves it as 'accessToken', not 'token'
                const token = user?.accessToken || user?.token;

                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            }
        } catch (error) {
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response) {

            if (error.response.status === 401) {
                AsyncStorage.removeItem('auth-storage');
            }
        } else if (error.request) {
        } else {
        }

        return Promise.reject(error);
    }
);

export default api;