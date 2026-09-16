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

export const session = {
  get token() {
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem('token');
  },
  get user() {
    const raw = localStorage.getItem(USER_KEY) || localStorage.getItem('user');
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  save(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    [TOKEN_KEY, USER_KEY, 'token', 'user'].forEach((key) => localStorage.removeItem(key));
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
