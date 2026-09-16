const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const clock = (date) =>
  date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });

/** Moments style: "刚刚"-equivalent — "1 minute ago", "3 hours ago", "Yesterday", "12 March". */
export const momentsTime = (value) => {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';
  const diff = Date.now() - date.getTime();

  if (diff < MIN) return 'Just now';
  if (diff < HOUR) {
    const n = Math.floor(diff / MIN);
    return `${n} minute${n === 1 ? '' : 's'} ago`;
  }
  if (diff < DAY) {
    const n = Math.floor(diff / HOUR);
    return `${n} hour${n === 1 ? '' : 's'} ago`;
  }
  if (diff < 2 * DAY) return 'Yesterday';
  if (diff < 7 * DAY) {
    const n = Math.floor(diff / DAY);
    return `${n} days ago`;
  }
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
};

/** Chat list: time today, "Yesterday", weekday this week, else date. */
export const chatListTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(new Date()) - startOf(date)) / DAY);

  if (days <= 0) return clock(date);
  if (days === 1) return 'Yesterday';
  if (days < 7) return date.toLocaleDateString(undefined, { weekday: 'short' });
  return date.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' });
};

/** In-conversation divider: "HH:MM" today, "Yesterday HH:MM", else full. */
export const messageStamp = (value) => {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return '';
  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(new Date()) - startOf(date)) / DAY);

  if (days <= 0) return clock(date);
  if (days === 1) return `Yesterday ${clock(date)}`;
  return `${date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} ${clock(date)}`;
};

/** WeChat only prints a timestamp when messages are >5 min apart. */
export const shouldStamp = (current, previous) => {
  if (!previous) return true;
  const a = new Date(current || Date.now()).getTime();
  const b = new Date(previous || Date.now()).getTime();
  return Math.abs(a - b) > 5 * MIN;
};
