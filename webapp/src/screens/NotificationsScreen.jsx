import { useEffect, useState } from 'react';
import { api, mediaUrl } from '../services/api';
import Icon from '../components/Icon';
import Avatar from '../components/Avatar';
import { momentsTime } from '../lib/time';
import { useToast } from '../components/Toast';

const VERB = {
  like: 'liked your post',
  comment: 'commented',
  follow: 'started following you',
  mention: 'mentioned you',
  story_view: 'viewed your story',
  streak: 'kept your streak alive',
  system: '',
};

const NotificationsScreen = ({ onBack, onRead }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get('/api/notifications');
        setItems(data.notifications || []);
        await api.post('/api/notifications/read', {});
        onRead?.();
      } catch (error) {
        toast(error.message);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ background: '#ededed', minHeight: '100%' }}>
      <div className="wx-nav hair-b">
        <button className="wx-nav-btn left" onClick={onBack} aria-label="Back">
          <Icon name="back" size={22} strokeWidth={2} />
        </button>
        <div className="wx-nav-title">Notifications</div>
        <span />
      </div>

      {loading ? (
        <div className="wx-loading">
          <div className="wx-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="wx-empty">Nothing yet.</div>
      ) : (
        <div className="wx-group" style={{ marginTop: 0 }}>
          {items.map((n, i) => (
            <div key={n._id} className={`wx-cell ${i < items.length - 1 ? 'hair-b hair-inset' : ''}`}>
              <Avatar name={n.actor?.username || '?'} />
              <span className="wx-cell-body">
                <span className="wx-cell-title" style={{ fontSize: 15 }}>
                  <b>{n.actor?.username}</b> {n.text || VERB[n.type] || ''}
                </span>
                <span className="wx-cell-sub">{momentsTime(n.createdAt)}</span>
              </span>
              {n.post?.image && (
                <img
                  src={mediaUrl(n.post.image)}
                  alt=""
                  style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsScreen;
