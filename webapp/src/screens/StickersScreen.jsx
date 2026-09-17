import { useState } from 'react';
import Icon from '../components/Icon';
import { useToast } from '../components/Toast';

/**
 * Sticker picker — reached from the Stickers rows in Discover and Me, both of
 * which previously did nothing.
 *
 * Stickers are emoji sets rather than image packs, so they need no uploads or
 * CDN and work offline. Favourites persist per device.
 */
const PACKS = [
  {
    id: 'faces',
    name: 'Faces',
    items: ['😀', '😂', '🥹', '😊', '😍', '🤔', '😎', '😴', '🙃', '😭', '🥳', '😤'],
  },
  {
    id: 'hands',
    name: 'Hands',
    items: ['👍', '👎', '👏', '🙌', '🤝', '✌️', '🤞', '👋', '💪', '🙏', '👌', '🫶'],
  },
  {
    id: 'hearts',
    name: 'Hearts',
    items: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '💕', '💖', '✨'],
  },
  {
    id: 'life',
    name: 'Everyday',
    items: ['☕', '🍜', '🍰', '🌧️', '🌙', '🔥', '🌱', '📚', '🎧', '🚲', '🏠', '⛰️'],
  },
];

const FAV_KEY = 'inasta.stickers.fav';

const readFavs = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(FAV_KEY));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
};

const StickersScreen = ({ onBack, onPick }) => {
  const [favs, setFavs] = useState(readFavs);
  const [active, setActive] = useState('faces');
  const toast = useToast();

  const persist = (next) => {
    setFavs(next);
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(next));
    } catch {
      /* storage may be blocked in an embedded frame */
    }
  };

  const toggleFav = (emoji) => {
    persist(favs.includes(emoji) ? favs.filter((e) => e !== emoji) : [...favs, emoji]);
  };

  const choose = (emoji) => {
    if (onPick) return onPick(emoji);
    // No chat open to insert into, so make the action still mean something.
    try {
      navigator.clipboard?.writeText(emoji);
      toast(`${emoji} copied`);
    } catch {
      toast(emoji);
    }
  };

  const pack = PACKS.find((p) => p.id === active) || PACKS[0];

  const Grid = ({ items }) => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: 6,
        padding: 12,
        background: '#fff',
      }}
    >
      {items.map((emoji) => (
        <button
          key={emoji}
          onClick={() => choose(emoji)}
          onContextMenu={(e) => {
            e.preventDefault();
            toggleFav(emoji);
          }}
          title="Tap to use · long-press to favourite"
          style={{
            aspectRatio: 1,
            fontSize: 26,
            borderRadius: 6,
            background: favs.includes(emoji) ? '#f2fbf5' : 'transparent',
            border: favs.includes(emoji) ? '1px solid #07c160' : '1px solid transparent',
          }}
        >
          {emoji}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{ background: '#ededed', minHeight: '100%' }}>
      <div className="wx-nav hair-b">
        <button className="wx-nav-btn left" onClick={onBack} aria-label="Back">
          <Icon name="back" size={22} strokeWidth={2} />
        </button>
        <div className="wx-nav-title">Stickers</div>
        <span />
      </div>

      {favs.length > 0 && (
        <>
          <div className="wx-section-label">Favourites</div>
          <Grid items={favs} />
        </>
      )}

      <div style={{ display: 'flex', gap: 6, padding: '10px 12px', overflowX: 'auto' }}>
        {PACKS.map((p) => (
          <button
            key={p.id}
            className={`wx-aud-chip ${active === p.id ? 'on' : ''}`}
            onClick={() => setActive(p.id)}
          >
            {p.name}
          </button>
        ))}
      </div>

      <Grid items={pack.items} />

      <div style={{ padding: '12px 16px', fontSize: 12, color: '#888' }}>
        Tap to {onPick ? 'insert into your message' : 'copy'}. Long-press to add to
        favourites.
      </div>
    </div>
  );
};

export default StickersScreen;
