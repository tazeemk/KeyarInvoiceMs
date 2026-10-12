import axios from "axios";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { resolveApiBaseUrl } from "./config";

export const API_BASE_URL = resolveApiBaseUrl(
  process.env.EXPO_PUBLIC_API_URL,
  Constants.expoConfig?.extra?.apiUrl,
);
export const api = axios.create({ baseURL: API_BASE_URL, timeout: 90000 });
const authApi = axios.create({ baseURL: API_BASE_URL, timeout: 90000 });

let refreshRequest;
let onSessionExpired = () => {};

export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler;
}

api.interceptors.request.use(async (config) => {
  const access = await SecureStore.getItemAsync("keyar_access");
  if (access) config.headers.Authorization = `Bearer ${access}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthRequest = /auth\/token/.test(original?.url || "");
    if (error.response?.status !== 401 || !original || original._retried || isAuthRequest) {
      return Promise.reject(error);
    }

    const refresh = await SecureStore.getItemAsync("keyar_refresh");
    if (!refresh) {
      await expireSession();
      return Promise.reject(error);
    }

    original._retried = true;
    try {
      refreshRequest ??= authApi
        .post("auth/token/refresh/", { refresh })
        .then(async ({ data }) => {
          await SecureStore.setItemAsync("keyar_access", data.access);
          if (data.refresh) await SecureStore.setItemAsync("keyar_refresh", data.refresh);
          return data.access;
        })
        .finally(() => {
          refreshRequest = undefined;
        });
      const access = await refreshRequest;
      original.headers.Authorization = `Bearer ${access}`;
      return api(original);
    } catch (refreshError) {
      await expireSession();
      return Promise.reject(refreshError);
    }
  },
);

async function expireSession() {
  await SecureStore.deleteItemAsync("keyar_access");
  await SecureStore.deleteItemAsync("keyar_refresh");
  onSessionExpired();
}

export async function signIn(username, password) {
  const { data } = await authApi.post("auth/token/", { username, password });
  await SecureStore.setItemAsync("keyar_access", data.access);
  await SecureStore.setItemAsync("keyar_refresh", data.refresh);
}

export async function signOut() {
  await SecureStore.deleteItemAsync("keyar_access");
  await SecureStore.deleteItemAsync("keyar_refresh");
}

export async function fetchAll(path, params = {}) {
  const items = [];
  let page = 1;
  while (true) {
    const { data } = await api.get(path, { params: { ...params, page } });
    if (Array.isArray(data)) return items.concat(data);
    items.push(...(data.results || []));
    if (!data.next) return items;
    page += 1;
  }
}
