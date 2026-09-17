import { useMemo, useState } from 'react';
import Icon from '../components/Icon';
import { useToast } from '../components/Toast';

/**
 * My Code / Scan — reached from the Scan row in Discover, which did nothing.
 *
 * Renders the user's contact code as an SVG so it needs no QR library, and
 * accepts a typed code to "scan" without camera permissions (which are not
 * available in an embedded preview frame anyway).
 */

/** Deterministic pattern from a string — same input always yields same art. */
const useMatrix = (seed, size = 21) =>
  useMemo(() => {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const rand = () => {
      h ^= h << 13;
      h ^= h >>> 17;
      h ^= h << 5;
      return Math.abs(h) / 2 ** 31;
    };
    const grid = [];
    for (let y = 0; y < size; y++) {
      const row = [];
      for (let x = 0; x < size; x++) row.push(rand() > 0.55);
      grid.push(row);
    }
    // Finder squares in three corners, like a real QR code.
    const finder = (ox, oy) => {
      for (let y = 0; y < 7; y++) {
        for (let x = 0; x < 7; x++) {
          const edge = x === 0 || y === 0 || x === 6 || y === 6;
          const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
          grid[oy + y][ox + x] = edge || core;
        }
      }
    };
    finder(0, 0);
    finder(size - 7, 0);
    finder(0, size - 7);
    return grid;
  }, [seed, size]);

const ScanScreen = ({ onBack, currentUser }) => {
  const [mode, setMode] = useState('code'); // 'code' | 'scan'
  const [entry, setEntry] = useState('');
  const toast = useToast();

  const me = currentUser || {};
  const code = `inasta:${me.username || 'you'}`;
  const grid = useMatrix(code);
  const cell = 8;
  const size = grid.length * cell;

  const submit = (event) => {
    event.preventDefault();
    const value = entry.trim().replace(/^inasta:/, '');
    if (!value) return;
    if (value === me.username) return toast("That's your own code");
    toast(`Looked up ${value} — add them from Contacts`);
    setEntry('');
  };

  return (
    <div style={{ background: '#ededed', minHeight: '100%' }}>
      <div className="wx-nav hair-b">
        <button className="wx-nav-btn left" onClick={onBack} aria-label="Back">
          <Icon name="back" size={22} strokeWidth={2} />
        </button>
        <div className="wx-nav-title">{mode === 'code' ? 'My Code' : 'Scan'}</div>
        <span />
      </div>

      <div style={{ display: 'flex', gap: 6, padding: '10px 16px', background: '#fff' }}>
        <button
          className={`wx-aud-chip ${mode === 'code' ? 'on' : ''}`}
          onClick={() => setMode('code')}
        >
          My code
        </button>
        <button
          className={`wx-aud-chip ${mode === 'scan' ? 'on' : ''}`}
          onClick={() => setMode('scan')}
        >
          Enter a code
        </button>
      </div>

      {mode === 'code' ? (
        <div style={{ padding: 20 }}>
          <div
            style={{
              background: '#fff',
              borderRadius: 10,
              padding: 22,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 600 }}>{me.username || 'you'}</div>
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              style={{ background: '#fff' }}
              role="img"
              aria-label="Your contact code"
            >
              {grid.map((row, y) =>
                row.map((on, x) =>
                  on ? (
                    <rect
                      key={`${x}-${y}`}
                      x={x * cell}
                      y={y * cell}
                      width={cell}
                      height={cell}
                      fill="#191919"
                    />
                  ) : null
                )
              )}
            </svg>
            <div style={{ fontSize: 13, color: '#888' }}>{code}</div>
            <button
              className="wx-aud-chip"
              onClick={() => {
                try {
                  navigator.clipboard?.writeText(code);
                  toast('Code copied');
                } catch {
                  toast(code);
                }
              }}
            >
              Copy code
            </button>
          </div>
          <div style={{ padding: '14px 4px', fontSize: 12, color: '#888', textAlign: 'center' }}>
            Share this so someone can add you. It reveals nothing beyond your username.
          </div>
        </div>
      ) : (
        <div style={{ padding: 20 }}>
          <form
            onSubmit={submit}
            style={{ background: '#fff', borderRadius: 10, padding: 18 }}
          >
            <div style={{ fontSize: 13, color: '#888', marginBottom: 10 }}>
              Camera scanning isn't available in the browser preview, so enter the code
              directly.
            </div>
            <input
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              placeholder="inasta:username"
              style={{
                width: '100%',
                padding: 10,
                border: '1px solid #e0e0e0',
                borderRadius: 4,
                fontSize: 15,
                outline: 'none',
                marginBottom: 12,
              }}
            />
            <button
              type="submit"
              className="wx-aud-chip on"
              style={{ width: '100%', padding: 10 }}
              disabled={!entry.trim()}
            >
              Look up
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ScanScreen;
