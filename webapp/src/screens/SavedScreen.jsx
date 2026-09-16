import { useEffect, useState } from 'react';
import { api } from '../services/api';
import Icon from '../components/Icon';
import MomentItem from '../components/PostCard';
import { useToast } from '../components/Toast';

/** The posts this user has bookmarked — Instagram's "Saved" collection. */
const SavedScreen = ({ onBack, currentUser }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get('/api/saved');
        setPosts(data.posts || []);
      } catch (error) {
        toast(error.message);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ background: '#fff', minHeight: '100%' }}>
      <div className="wx-nav hair-b">
        <button className="wx-nav-btn left" onClick={onBack} aria-label="Back">
          <Icon name="back" size={22} strokeWidth={2} />
        </button>
        <div className="wx-nav-title">Saved</div>
        <span />
      </div>

      {loading ? (
        <div className="wx-loading">
          <div className="wx-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="wx-empty">Nothing saved yet.</div>
      ) : (
        posts.map((post) => (
          <MomentItem key={post._id} post={{ ...post, isSaved: true }} currentUser={currentUser} />
        ))
      )}
    </div>
  );
};

export default SavedScreen;
