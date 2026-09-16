/**
 * WeChat-style icon set.
 * Tab-bar glyphs are solid fills (WeChat uses filled tab icons); the rest are
 * thin strokes matching the iOS app's line weight.
 */
const STROKE = {
  search: 'M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm10 2-4.6-4.6',
  plus: 'M12 5v14M5 12h14',
  back: 'M15 4 7 12l8 8',
  chev: 'M9 5l7 7-7 7',
  close: 'M6 6l12 12M18 6 6 18',
  camera:
    'M3 8h3.5l1.6-2.4h7.8L17.5 8H21a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Zm9 9.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  more: 'M6 12h.01M12 12h.01M18 12h.01',
  smile: 'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18ZM8.5 9.5h.01M15.5 9.5h.01M8 14.5a5 5 0 0 0 8 0',
  voice: 'M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm7-3a7 7 0 0 1-14 0m7 7v3',
  qr: 'M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 3h3m3 0v3m-6 0h3',
  lock: 'M7 10V7a5 5 0 1 1 10 0v3M5.5 10h13a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z',
  trash: 'M4 7h16M10 7V5h4v2M6 7l1 13h10l1-13',
  image: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6',
};

const FILL = {
  // Bottom tab bar (filled, as in WeChat)
  chats:
    'M12 3C6.9 3 2.8 6.4 2.8 10.6c0 2.4 1.4 4.6 3.5 6L5.4 19a.4.4 0 0 0 .6.5l2.9-1.5c1 .3 2 .4 3.1.4 5.1 0 9.2-3.4 9.2-7.6S17.1 3 12 3Z',
  contacts:
    'M12 12.4a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4ZM12 14c-4.2 0-7.6 2.3-7.6 5.1 0 .7.5 1.2 1.2 1.2h12.8c.7 0 1.2-.5 1.2-1.2 0-2.8-3.4-5.1-7.6-5.1Z',
  discover:
    'M12 2.6a9.4 9.4 0 1 0 0 18.8 9.4 9.4 0 0 0 0-18.8Zm3.6 5.1-2 4.6a1 1 0 0 1-.5.5l-4.6 2a.4.4 0 0 1-.5-.5l2-4.6a1 1 0 0 1 .5-.5l4.6-2a.4.4 0 0 1 .5.5Z',
  me: 'M12 12.4a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4ZM12 14c-4.2 0-7.6 2.3-7.6 5.1 0 .7.5 1.2 1.2 1.2h12.8c.7 0 1.2-.5 1.2-1.2 0-2.8-3.4-5.1-7.6-5.1Z',
  // Moments popover
  heart: 'M12 20.3s-8-4.9-8-10a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.1-8 10-8 10Z',
  comment:
    'M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-4 3.4V17H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z',
  group:
    'M9 11.5a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8Zm7.4.6a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6ZM9 13c-3.5 0-6.3 1.9-6.3 4.3 0 .6.4 1 1 1h10.6c.6 0 1-.4 1-1C15.3 14.9 12.5 13 9 13Zm7.4.6c-.7 0-1.4.1-2 .3 1.1 1 1.8 2.3 1.8 3.8h4c.5 0 .9-.4.9-.9 0-1.8-2.1-3.2-4.7-3.2Z',
};

const Icon = ({ name, size = 22, strokeWidth = 1.6, className = '', style }) => {
  const fill = FILL[name];
  const stroke = STROKE[name];
  const d = fill || stroke;
  if (!d) return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? 'currentColor' : 'none'}
      stroke={fill ? 'none' : 'currentColor'}
      strokeWidth={fill ? 0 : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  );
};

export default Icon;
