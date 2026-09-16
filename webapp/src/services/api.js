// Same-origin by default: the dev server (and any production reverse proxy)
// forwards /api and /uploads to the Express backend. This keeps the browser
// from ever having to know the backend's host, which is what broke the app
// whenever it was opened from anything other than the dev machine itself.
// Override with VITE_API_URL only if the API lives on a different origin.
const readApiOrigin = () => {
  try {
    return import.meta.env.VITE_API_URL || '';
  } catch {
    return '';
  }
};

const BASE_URL = readApiOrigin().replace(/\/$/, '');

const TOKEN_KEY = 'inasta.token';
const USER_KEY = 'inasta.user';

/**
 * Storage that cannot fail.
 *
 * Browsers throw a SecurityError on localStorage when the page is embedded in
 * a cross-origin iframe with third-party storage blocked — which is how the
 * preview panel loads the app, and how many in-app browsers behave. If we let
 * that throw, the token is never saved and every subsequent request goes out
 * unauthenticated, producing "Access denied. No token provided."
 *
 * So every access is guarded, and we keep an in-memory mirror that carries the
 * session for the life of the tab even when persistence is unavailable.
 */
const memory = new Map();

export const safeStorage = {
  get(key) {
    try {
      const value = localStorage.getItem(key);
      if (value !== null) return value;
    } catch {
      /* storage blocked — fall through to memory */
    }
    return memory.has(key) ? memory.get(key) : null;
  },
  set(key, value) {
    memory.set(key, value);
    try {
      localStorage.setItem(key, value);
    } catch {
      /* storage blocked — the in-memory copy is enough for this tab */
    }
  },
  remove(key) {
    memory.delete(key);
    try {
      localStorage.removeItem(key);
    } catch {
      /* nothing to do */
    }
  },
};

export const session = {
  get token() {
    return safeStorage.get(TOKEN_KEY) || safeStorage.get('token');
  },
  get user() {
    const raw = safeStorage.get(USER_KEY) || safeStorage.get('user');
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  save(token, user) {
    safeStorage.set(TOKEN_KEY, token);
    safeStorage.set(USER_KEY, JSON.stringify(user));
  },
  clear() {
    [TOKEN_KEY, USER_KEY, 'token', 'user'].forEach((key) => safeStorage.remove(key));
  },
};

const getHeaders = (isMultipart = false) => {
  const headers = {};
  if (!isMultipart) headers['Content-Type'] = 'application/json';
  const token = session.token;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const handleResponse = async (response) => {
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error('The server is unreachable. Is the API running?');
  }

  if (!response.ok) {
    // Only a genuinely rejected token ends the session. A transient 401 from a
    // background poll must never silently sign the user out.
    if (response.status === 401 && session.token) {
      session.clear();
      window.dispatchEvent(new CustomEvent('inasta:signed-out'));
    }
    throw new Error(data.error || data.message || `Request failed (${response.status})`);
  }
  return data;
};

const request = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    return await handleResponse(response);
  } catch (error) {
    if (error instanceof TypeError) throw new Error('Network error — cannot reach the Inasta API.');
    throw error;
  }
};

/** Media stored by the API is returned as a relative path; make it loadable. */
export const mediaUrl = (src) => {
  if (!src) return '';
  if (/^(https?:|data:|blob:)/.test(src)) return src;
  return `${BASE_URL}${src.startsWith('/') ? '' : '/'}${src}`;
};

export const api = {
  get: (endpoint) => request(endpoint, { method: 'GET', headers: getHeaders() }),
  post: (endpoint, body) =>
    request(endpoint, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) }),
  patch: (endpoint, body) =>
    request(endpoint, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify(body) }),
  postMultipart: (endpoint, formData) =>
    request(endpoint, { method: 'POST', headers: getHeaders(true), body: formData }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE', headers: getHeaders() }),
};
