import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import Icon from '../components/Icon';
import Avatar from '../components/Avatar';
import { useToast } from '../components/Toast';

/**
 * Circle management — who can actually see each audience.
 *
 * The privacy model was enforced server-side long before it could be
 * administered anywhere but the database; this is that missing interface.
 * Built entirely from the existing WeChat cell/group classes.
 */
const CirclesScreen = ({ onBack }) => {
  const [circles, setCircles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null); // circle being edited
  const [sheet, setSheet] = useState(null); // 'create' | 'add'
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const data = await api.get('/api/circles');
      setCircles(data.circles || []);
      // Keep the open sheet in sync with fresh data.
      setOpen((prev) => (prev ? (data.circles || []).find((c) => c._id === prev._id) || null : null));
    } catch (error) {
      toast(error.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (event) => {
    event.preventDefault();
    const value = draft.trim();
    if (!value || busy) return;
    setBusy(true);
    try {
      if (sheet === 'create') {
        await api.post('/api/circles', { name: value });
        toast('Circle created');
      } else {
        await api.post(`/api/circles/${open._id}/members`, { username: value });
        toast(`${value} can now see this circle`);
      }
      setDraft('');
      setSheet(null);
      await load();
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (circleId, userId, username) => {
    if (!window.confirm(`Remove ${username}? They will stop seeing these posts.`)) return;
    try {
      await api.delete(`/api/circles/${circleId}/members/${userId}`);
      toast(`${username} removed`);
      await load();
    } catch (error) {
      toast(error.message);
    }
  };

  const removeCircle = async (circle) => {
    if (
      !window.confirm(
        `Delete "${circle.name}"? Existing posts stay, but only you will be able to see them.`
      )
    )
      return;
    try {
      await api.delete(`/api/circles/${circle._id}`);
      setOpen(null);
      toast('Circle deleted');
      await load();
    } catch (error) {
      toast(error.message);
    }
  };

  return (
    <div style={{ background: '#ededed', minHeight: '100%' }}>
      <div className="wx-nav hair-b">
        <button className="wx-nav-btn left" onClick={onBack} aria-label="Back">
          <Icon name="back" size={22} strokeWidth={2} />
        </button>
        <div className="wx-nav-title">My Circles</div>
        <button
          className="wx-nav-btn right"
          onClick={() => {
            setDraft('');
            setSheet('create');
          }}
          aria-label="New circle"
        >
          <span style={{ fontSize: 22, lineHeight: 1 }}>+</span>
        </button>
      </div>

      <div
        style={{ padding: '10px 16px', fontSize: 12, color: '#888', lineHeight: 1.5 }}
      >
        Only people you add to a circle can see posts you share to it.
      </div>

      {loading ? (
        <div className="wx-loading">
          <div className="wx-spin" />
        </div>
      ) : circles.length === 0 ? (
        <div className="wx-empty">
          No circles yet. Posting to a new audience creates one.
        </div>
      ) : (
        <div className="wx-group" style={{ marginTop: 0 }}>
          {circles.map((circle, i) => (
            <button
              key={circle._id}
              className={`wx-cell ${i < circles.length - 1 ? 'hair-b hair-inset' : ''}`}
              onClick={() => setOpen(circle)}
            >
              <span className="wx-cell-ico" style={{ background: '#07c160' }}>
                <Icon name="group" size={17} />
              </span>
              <span className="wx-cell-body">
                <span className="wx-cell-title">{circle.name}</span>
                <span className="wx-cell-sub">
                  {circle.memberCount === 0
                    ? 'Only you'
                    : `${circle.memberCount} ${circle.memberCount === 1 ? 'person' : 'people'}`}
                  {circle.postCount > 0 && ` · ${circle.postCount} posts`}
                </span>
              </span>
              <Icon name="chev" size={16} strokeWidth={2} className="wx-chev" />
            </button>
          ))}
        </div>
      )}

      {/* ---------------------------------------------------- member editor */}
      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 240,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'flex-end',
          }}
          onClick={() => setOpen(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              background: '#ededed',
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
              maxHeight: '80%',
              overflowY: 'auto',
              paddingBottom: 20,
            }}
          >
            <div className="wx-nav hair-b" style={{ background: '#fff', borderRadius: '12px 12px 0 0' }}>
              <button className="wx-nav-btn left" onClick={() => setOpen(null)}>
                <span style={{ fontSize: 15 }}>Close</span>
              </button>
              <div className="wx-nav-title">{open.name}</div>
              <span />
            </div>

            <div className="wx-section-label">
              {open.memberCount === 0
                ? 'No one else can see this circle'
                : `${open.memberCount} ${open.memberCount === 1 ? 'member' : 'members'}`}
            </div>

            <div className="wx-group" style={{ marginTop: 0 }}>
              {(open.members || []).map((m, i) => (
                <div
                  key={m._id}
                  className={`wx-cell ${i < open.members.length - 1 ? 'hair-b hair-inset' : ''}`}
                >
                  <Avatar name={m.username || '?'} />
                  <span className="wx-cell-body">
                    <span className="wx-cell-title">{m.username}</span>
                  </span>
                  <button
                    onClick={() => removeMember(open._id, m._id, m.username)}
                    style={{ color: '#fa5151', fontSize: 14 }}
                  >
                    Remove
                  </button>
                </div>
              ))}

              <button
                className={`wx-cell ${open.members?.length ? 'hair-t' : ''}`}
                onClick={() => {
                  setDraft('');
                  setSheet('add');
                }}
              >
                <span className="wx-cell-ico" style={{ background: '#07c160' }}>
                  <Icon name="plus" size={17} strokeWidth={2.2} />
                </span>
                <span className="wx-cell-body">
                  <span className="wx-cell-title">Add someone</span>
                </span>
                <Icon name="chev" size={16} strokeWidth={2} className="wx-chev" />
              </button>
            </div>

            <button
              className="wx-logout"
              onClick={() => removeCircle(open)}
              style={{ color: '#fa5151' }}
            >
              Delete Circle
            </button>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------- input sheets */}
      {sheet && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 260,
            background: 'rgba(0,0,0,0.4)',
            display: 'grid',
            placeItems: 'center',
            padding: 30,
          }}
          onClick={() => setSheet(null)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={submit}
            style={{ width: '100%', maxWidth: 300, background: '#fff', borderRadius: 10, padding: 18 }}
          >
            <div style={{ fontSize: 16, fontWeight: 600, textAlign: 'center', marginBottom: 12 }}>
              {sheet === 'create' ? 'New Circle' : `Add to ${open?.name}`}
            </div>
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={sheet === 'create' ? 'Circle name' : 'Username'}
              style={{
                width: '100%',
                padding: 10,
                border: '1px solid #e0e0e0',
                borderRadius: 4,
                fontSize: 15,
                outline: 'none',
                marginBottom: 14,
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="wx-aud-chip"
                style={{ flex: 1, padding: 9 }}
                onClick={() => setSheet(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="wx-aud-chip on"
                style={{ flex: 1, padding: 9 }}
                disabled={!draft.trim() || busy}
              >
                {busy ? '…' : sheet === 'create' ? 'Create' : 'Add'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default CirclesScreen;
