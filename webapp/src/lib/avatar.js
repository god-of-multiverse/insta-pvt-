/**
 * WeChat default avatars are flat muted tiles with the initial.
 * Colour is derived from the name so a person looks the same everywhere.
 */
const COLORS = ['#7d8fa9', '#5b9e7e', '#a98b6a', '#8f7da9', '#a97d87', '#6a8fa9', '#9aa15e'];

const hash = (value = '') => {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h;
};

export const avatarColor = (name = '') => COLORS[hash(name) % COLORS.length];
export const initialOf = (name = '') => (name.trim()[0] || 'U').toUpperCase();
