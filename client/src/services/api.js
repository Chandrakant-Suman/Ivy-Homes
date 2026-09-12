import axios from 'axios';

const BASE = import.meta.env.VITE_API_BASE || '/api';

// localStorage keys — keeping the session across refreshes.
const ACCESS = 'ivy_access_token';
const REFRESH = 'ivy_refresh_token';
const USER = 'ivy_user';

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS) || '';
  },
  get refresh() {
    return localStorage.getItem(REFRESH) || '';
  },
  get user() {
    try {
      return JSON.parse(localStorage.getItem(USER) || 'null');
    } catch {
      return null;
    }
  },
  save({ access_token, refresh_token, user }) {
    if (access_token) localStorage.setItem(ACCESS, access_token);
    if (refresh_token) localStorage.setItem(REFRESH, refresh_token);
    if (user) localStorage.setItem(USER, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
    localStorage.removeItem(USER);
  },
};

const api = axios.create({ baseURL: BASE });

// Attach the access token to every request.
api.interceptors.request.use((cfg) => {
  const t = tokenStore.access;
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

// On a 401, try the refresh flow once (the access token lasts only 15 min),
// then replay the original request. If refresh fails, clear the session.
let refreshing = null;
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && tokenStore.refresh) {
      original._retry = true;
      try {
        refreshing =
          refreshing ||
          axios.post(`${BASE}/auth/refresh`, { refresh_token: tokenStore.refresh });
        const { data } = await refreshing;
        refreshing = null;
        tokenStore.save(data);
        original.headers.Authorization = `Bearer ${data.access_token}`;
        return api(original);
      } catch (e) {
        refreshing = null;
        tokenStore.clear();
        window.location.href = '/login';
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  }
);

// ---- API calls -------------------------------------------------------------
export const authApi = {
  login: (email, password) => axios.post(`${BASE}/auth/login`, { email, password }).then((r) => r.data),
  // server-side demo login: the password stays in the backend .env
  demoLogin: (email) => axios.post(`${BASE}/auth/demo-login`, { email }).then((r) => r.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),
};

export const listingsApi = {
  list: (params) => api.get('/listings', { params }).then((r) => r.data),
  get: (id) => api.get(`/listings/${id}`).then((r) => r.data),
  similar: (id) => api.get(`/listings/${id}/similar`).then((r) => r.data),
};

export const rentalsApi = {
  list: (params) => api.get('/rentals', { params }).then((r) => r.data),
  get: (id) => api.get(`/rentals/${id}`).then((r) => r.data),
};

export const projectsApi = {
  list: (params) => api.get('/projects', { params }).then((r) => r.data),
  get: (id) => api.get(`/projects/${id}`).then((r) => r.data),
};

export const favouritesApi = {
  list: () => api.get('/favourites').then((r) => r.data),
  add: (listing_id) => api.post('/favourites', { listing_id }).then((r) => r.data),
  remove: (id) => api.delete(`/favourites/${id}`).then((r) => r.data),
};

export const insightsApi = {
  get: () => api.get('/insights').then((r) => r.data),
};

export default api;
