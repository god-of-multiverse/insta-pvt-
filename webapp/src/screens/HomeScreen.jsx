import { useState } from 'react';
import MomentItem from '../components/PostCard';
import Icon from '../components/Icon';
import Avatar from '../components/Avatar';

/**
 * Moments (朋友圈): cover photo with the user's avatar overhanging its bottom
 * edge, then a plain white list of entries. The nav bar floats transparently
 * over the cover, with a camera button on the right.
 */
const MomentsScreen = ({
  posts,
  loading,
  activeCircle,
  setActiveCircle,
  circles,
  currentUser,
  onDeletePost,
  onCompose,
}) => {
  const [filterOpen, setFilterOpen] = useState(false);
  const options = ['All', ...circles];

  return (
    <div className="wx-moments">
      <div className="wx-nav transparent">
        <span />
        <div className="wx-nav-title">{activeCircle === 'All' ? '' : activeCircle}</div>
        <button className="wx-nav-btn right" onClick={onCompose} aria-label="New Moment">
          <Icon name="camera" size={21} strokeWidth={1.7} />
        </button>
      </div>

      <div className="wx-cover">
        <div className="wx-cover-me">
          <div className="wx-cover-name">{currentUser?.username || 'you'}</div>
          <Avatar name={currentUser?.username || 'you'} className="wx-cover-av" />
        </div>
      </div>

      {/* Circle filter — WeChat's "who can see" concept surfaced as a strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '34px 16px 6px',
          overflowX: 'auto',
        }}
      >
        <button
          onClick={() => setFilterOpen((v) => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#576b95', fontSize: 14 }}
        >
          <Icon name="group" size={16} />
          {activeCircle === 'All' ? 'All circles' : activeCircle}
          <Icon name="chev" size={12} strokeWidth={2} style={{ transform: 'rotate(90deg)' }} />
        </button>
      </div>

      {filterOpen && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px 16px 10px' }}>
          {options.map((name) => (
            <button
              key={name}
              className={`wx-aud-chip ${activeCircle === name ? 'on' : ''}`}
              onClick={() => {
                setActiveCircle(name);
                setFilterOpen(false);
              }}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="wx-loading">
          <div className="wx-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="wx-empty">
          No Moments yet.
          <br />
          Tap the camera to share one.
        </div>
      ) : (
        posts.map((post) => (
          <MomentItem
            key={post._id || post.id}
            post={post}
            currentUser={currentUser}
            onDelete={onDeletePost}
          />
        ))
      )}

      <div style={{ height: 24 }} />
    </div>
  );
};

export default MomentsScreen;
