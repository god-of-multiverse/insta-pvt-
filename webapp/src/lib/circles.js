/**
 * Circles are the core concept of Inasta, so they get a stable identity:
 * a colour and a one-line description of exactly who can see the post.
 * Anything the user invents gets a deterministic colour from the same palette.
 */
const PALETTE = [
  'var(--c-general)',
  'var(--c-hometown)',
  'var(--c-college)',
  'var(--c-custom)',
  '#9ad7e8',
  '#e8a08a',
  '#b9a0e8',
];

const KNOWN = {
  All: { color: 'var(--accent)', blurb: 'Everything shared with you, across every circle.' },
  General: { color: 'var(--c-general)', blurb: 'Your default circle — anyone you have added.' },
  Hometown: { color: 'var(--c-hometown)', blurb: 'People from home. College never sees this.' },
  College: { color: 'var(--c-college)', blurb: 'Campus people only. Family never sees this.' },
};

const hash = (value) => {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h;
};

export const circleMeta = (name = 'General') => {
  if (KNOWN[name]) return { name, ...KNOWN[name] };
  return {
    name,
    color: PALETTE[hash(name) % PALETTE.length],
    blurb: `A private circle you created. Only members of ${name} can see these posts.`,
  };
};

export const DEFAULT_CIRCLES = ['General', 'Hometown', 'College'];
