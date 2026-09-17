import { useEffect, useState } from 'react';
import { api } from '../services/api';
import Icon from '../components/Icon';
import Avatar from '../components/Avatar';
import { useToast } from '../components/Toast';

/**
 * Privacy settings — the controls behind the "Private" row in the Me tab,
 * which previously did nothing.
 *
 * Everything here is a real server-side setting, not a cosmetic toggle.
 */
const Switch = ({ on, onChange }) => (
  <span
    role="switch"
    aria-checked={on}
    onClick={onChange}
    style={{
      width: 44,
      height: 26,
      borderRadius: 99,
      padding: 3,
      flex: 'none',
      background: on ? '#07c160' : '#d8d8d8',
      transition: 'background .2s',
      cursor: 'pointer',
    }}
  >
    <span
      style={{
        display: 'block',
        width: 20,
        height: 20,
        borderRadius: '50%',
        background: '#fff',
        transform: on ? 'translateX(18px)' : 'none',
        transition: 'transform .2s',
      }}
    />
  </span>
);

const PrivacyScreen = ({ onBack, currentUser, onUserChange }) => {
  const [settings, setSettings] = useState({
    isPrivate: false,
    hideLastSeen: false,
    hideStoryFromStrangers: false,
    allowMentions: true,
  });
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get('/api/privacy');
        setSettings(data.settings);
        setBlocked(data.blocked || []);
      } catch (error) {
        toast(error.message);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = async (key) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next); // optimistic
    try {
      const data = await api.patch('/api/privacy', { [key]: next[key] });
      setSettings(data.settings);
      if (key === 'isPrivate') onUserChange?.({ ...currentUser, isPrivate: data.settings.isPrivate });
    } catch (error) {
      setSettings(settings);
      toast(error.message);
    }
  };

  const unblock = async (user) => {
    try {
      await api.post(`/api/users/${user._id}/block`, {});
      setBlocked((prev) => prev.filter((u) => u._id !== user._id));
      toast(`${user.username} unblocked`);
    } catch (error) {
      toast(error.message);
    }
  };

  const Row = ({ title, sub, k }) => (
    <div className="wx-cell hair-b hair-inset">
      <span className="wx-cell-body">
        <span className="wx-cell-title">{title}</span>
        {sub && <span className="wx-cell-sub">{sub}</span>}
      </span>
      <Switch on={!!settings[k]} onChange={() => update(k)} />
    </div>
  );

  return (
    <div style={{ background: '#ededed', minHeight: '100%' }}>
      <div className="wx-nav hair-b">
        <button className="wx-nav-btn left" onClick={onBack} aria-label="Back">
          <Icon name="back" size={22} strokeWidth={2} />
        </button>
        <div className="wx-nav-title">Privacy</div>
        <span />
      </div>

      {loading ? (
        <div className="wx-loading">
          <div className="wx-spin" />
        </div>
      ) : (
        <>
          <div className="wx-section-label">Account</div>
          <div className="wx-group" style={{ marginTop: 0 }}>
            <Row
              title="Private account"
              sub="Only people in your circles can find you"
              k="isPrivate"
            />
            <Row title="Hide last seen" sub="Don't show when you were last online" k="hideLastSeen" />
            <Row
              title="Allow mentions"
              sub="Let others tag you with @username"
              k="allowMentions"
            />
            <div className="wx-cell">
              <span className="wx-cell-body">
                <span className="wx-cell-title">Hide stories from non-members</span>
                <span className="wx-cell-sub">Stories stay inside the circle you post to</span>
              </span>
              <Switch
                on={!!settings.hideStoryFromStrangers}
                onChange={() => update('hideStoryFromStrangers')}
              />
            </div>
          </div>

          <div className="wx-section-label">
            Blocked {blocked.length > 0 && `(${blocked.length})`}
          </div>
          <div className="wx-group" style={{ marginTop: 0 }}>
            {blocked.length === 0 ? (
              <div className="wx-cell">
                <span className="wx-cell-body">
                  <span className="wx-cell-sub">You haven't blocked anyone.</span>
                </span>
              </div>
            ) : (
              blocked.map((u, i) => (
                <div
                  key={u._id}
                  className={`wx-cell ${i < blocked.length - 1 ? 'hair-b hair-inset' : ''}`}
                >
                  <Avatar name={u.username} />
                  <span className="wx-cell-body">
                    <span className="wx-cell-title">{u.username}</span>
                  </span>
                  <button className="wx-aud-chip" onClick={() => unblock(u)}>
                    Unblock
                  </button>
                </div>
              ))
            )}
          </div>

          <div style={{ padding: '14px 16px', fontSize: 12, color: '#888', lineHeight: 1.6 }}>
            Posts are always limited to the circle you share them with. These settings
            control everything outside that.
          </div>
        </>
      )}
    </div>
  );
};

export default PrivacyScreen;
