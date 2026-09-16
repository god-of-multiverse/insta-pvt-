const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** "just now" / "12m" / "4h" / "3d" / "12 Mar" */
export const relativeTime = (value) => {
  if (!value) return 'just now';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return 'just now';
  const diff = Date.now() - then;

  if (diff < MIN) return 'just now';
  if (diff < HOUR) return `${Math.floor(diff / MIN)}m`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d`;
  return new Date(then).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

/** "Today" / "Yesterday" / "Monday, 12 March" — used for feed day dividers. */
export const dayLabel = (value) => {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return 'Today';
  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(new Date()) - startOf(date)) / DAY);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return date.toLocaleDateString(undefined, { weekday: 'long' });
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
};

export const clockTime = (value) =>
  new Date(value || Date.now()).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
