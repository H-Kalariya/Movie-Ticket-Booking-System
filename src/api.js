// Thin API client for the CurtainCall backend.
// Handles base URL, JSON, bearer tokens, and transparent access-token refresh.
const BASE = (import.meta.env.VITE_API_URL || '') + '/api';

const ACCESS_KEY = 'cc_access';
const REFRESH_KEY = 'cc_refresh';

export const tokens = {
  get access() { return localStorage.getItem(ACCESS_KEY); },
  get refresh() { return localStorage.getItem(REFRESH_KEY); },
  set({ accessToken, refreshToken }) {
    if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

async function raw(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && tokens.access) headers.Authorization = `Bearer ${tokens.access}`;

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = { error: text }; }
  }
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// Try a request; on 401, attempt a single refresh and retry once.
let refreshing = null;
async function request(path, opts = {}) {
  try {
    return await raw(path, opts);
  } catch (e) {
    if (e.status !== 401 || !tokens.refresh || opts._retried) throw e;
    try {
      refreshing = refreshing || raw('/auth/refresh', { method: 'POST', body: { refreshToken: tokens.refresh }, auth: false });
      const data = await refreshing;
      refreshing = null;
      tokens.set({ accessToken: data.accessToken });
      return await raw(path, { ...opts, _retried: true });
    } catch (refreshErr) {
      refreshing = null;
      tokens.clear();
      throw refreshErr;
    }
  }
}

const qs = (obj) => {
  const p = new URLSearchParams();
  Object.entries(obj || {}).forEach(([k, v]) => { if (v) p.set(k, v); });
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const api = {
  // Auth
  register: (payload) => request('/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload, auth: false }),
  me: () => request('/auth/me'),

  // Profile / users
  updateProfile: (payload) => request('/users/me', { method: 'PUT', body: payload }),
  listUsers: () => request('/users'),
  listOwners: () => request('/users/owners'),
  setUserRole: (id, role) => request(`/users/${id}/role`, { method: 'PUT', body: { role } }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),

  // Movies
  listMovies: (filters) => request('/movies' + qs(filters), { auth: false }),
  getMovie: (id) => request(`/movies/${id}`, { auth: false }),
  createMovie: (payload) => request('/movies', { method: 'POST', body: payload }),
  updateMovie: (id, payload) => request(`/movies/${id}`, { method: 'PUT', body: payload }),
  deleteMovie: (id) => request(`/movies/${id}`, { method: 'DELETE' }),

  // Theatres
  listTheatres: () => request('/theatres', { auth: false }),
  listManageableTheatres: () => request('/theatres/manage/list'),
  createTheatre: (payload) => request('/theatres', { method: 'POST', body: payload }),
  updateTheatre: (id, payload) => request(`/theatres/${id}`, { method: 'PUT', body: payload }),
  deleteTheatre: (id) => request(`/theatres/${id}`, { method: 'DELETE' }),
  addScreen: (id, payload) => request(`/theatres/${id}/screens`, { method: 'POST', body: payload }),
  updateScreen: (id, sid, payload) => request(`/theatres/${id}/screens/${sid}`, { method: 'PUT', body: payload }),
  deleteScreen: (id, sid) => request(`/theatres/${id}/screens/${sid}`, { method: 'DELETE' }),

  // Shows
  listShows: (filters) => request('/shows' + qs(filters), { auth: false }),
  getShow: (id) => request(`/shows/${id}`, { auth: false }),
  listManageableShows: () => request('/shows/manage/list'),
  createShow: (payload) => request('/shows', { method: 'POST', body: payload }),
  updateShow: (id, payload) => request(`/shows/${id}`, { method: 'PUT', body: payload }),
  deleteShow: (id) => request(`/shows/${id}`, { method: 'DELETE' }),

  // Bookings
  createBooking: (payload) => request('/bookings', { method: 'POST', body: payload }),
  myBookings: () => request('/bookings/mine'),
  getBooking: (id) => request(`/bookings/${id}`),
  cancelBooking: (id) => request(`/bookings/${id}/cancel`, { method: 'POST' }),
  listManageableBookings: () => request('/bookings/manage/list'),
  cancelManagedBooking: (id) => request(`/bookings/manage/${id}/cancel`, { method: 'POST' }),

  // Logs
  listLogs: () => request('/logs'),
};
