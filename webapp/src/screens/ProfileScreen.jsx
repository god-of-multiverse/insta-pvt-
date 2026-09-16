import { useMemo, useState } from 'react';
import Icon from '../components/Icon';
import { circleMeta } from '../lib/circles';
import { mediaUrl } from '../services/api';

const ProfileScreen = ({ currentUser, posts, circles, onLogout }) => {
  const user = currentUser || {};
  const initial = (user.username || 'U')[0].toUpperCase();
  const [tab, setTab] = useState('posts');
  const [quietMode, setQuietMode] = useState(true);
  const [privateLikes, setPrivateLikes] = useState(true);

  const myId = String(user._id || user.id || '');
  const mine = useMemo(
    () => posts.filter((post) => String(post.user?._id || post.user?.id || post.user || '') === myId),
    [posts, myId]
  );

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <h1>You</h1>
          <p className="sub">Nothing on this page is visible to anyone outside your circles.</p>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-ghost" onClick={onLogout}>
            <Icon name="logout" size={16} />
            Log out
          </button>
        </div>
      </div>

      <section className="profile-hero">
        <div className="avatar avatar-xl">{initial}</div>
        <div className="profile-id">
          <h2>{user.username || 'you'}</h2>
          <div className="handle">{user.email || 'no email on file'}</div>
          <p className="bio">{user.bio || 'No bio — and no one is waiting for one.'}</p>
          <div className="stat-row">
            <div className="stat">
              <div className="num">{mine.length}</div>
              <div className="lbl">Posts</div>
            </div>
            <div className="stat">
              <div className="num">{circles.length}</div>
              <div className="lbl">Circles</div>
            </div>
            <div className="stat">
              <div className="num">
                <Icon name="lock" size={20} />
              </div>
              <div className="lbl">Private</div>
            </div>
          </div>
        </div>
      </section>

      <div className="tabs" role="tablist">
        {[
          ['posts', 'Posts'],
          ['circles', 'Circles'],
          ['settings', 'Settings'],
        ].map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            className={`tab ${tab === key ? 'on' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'posts' &&
        (mine.length === 0 ? (
          <div className="empty">
            <h3>You haven&apos;t posted yet</h3>
            <p>Whatever you share goes to exactly one circle. Nowhere else, ever.</p>
          </div>
        ) : (
          <div className="photo-grid">
            {mine.map((post) => {
              const meta = circleMeta(post.circle);
              return (
                <div className="photo-tile" key={post._id || post.id}>
                  <img src={mediaUrl(post.image)} alt={post.caption || 'Your post'} loading="lazy" />
                  <span className="tag" style={{ color: meta.color }}>
                    {meta.name}
                  </span>
                </div>
              );
            })}
          </div>
        ))}

      {tab === 'circles' && (
        <div className="circle-grid">
          {circles.map((name) => {
            const meta = circleMeta(name);
            const count = posts.filter((post) => post.circle === name).length;
            return (
              <article className="circle-card" key={name}>
                <div className="circle-card-top">
                  <div>
                    <h3>{name}</h3>
                    <span className="sub">{count} {count === 1 ? 'post' : 'posts'}</span>
                  </div>
                  <span className="chip chip-solid" style={{ '--chip-color': meta.color }}>
                    <span className="dot" />
                    Private
                  </span>
                </div>
                <p style={{ fontSize: 13.5, color: 'var(--text-mute)' }}>{meta.blurb}</p>
              </article>
            );
          })}
        </div>
      )}

      {tab === 'settings' && (
        <div className="stack">
          <div className="setting-row">
            <Icon name="lock" size={19} />
            <div className="txt">
              <strong>Private account</strong>
              <span>Always on. Inasta has no public profiles — this cannot be turned off.</span>
            </div>
            <div className="switch on" aria-hidden="true">
              <div className="knob" />
            </div>
          </div>

          <div className="setting-row">
            <Icon name="heart" size={19} />
            <div className="txt">
              <strong>Hide like counts</strong>
              <span>Nobody sees how many likes a post received, including you.</span>
            </div>
            <button
              className={`switch ${privateLikes ? 'on' : ''}`}
              onClick={() => setPrivateLikes((v) => !v)}
              aria-pressed={privateLikes}
              aria-label="Toggle hidden like counts"
            >
              <div className="knob" />
            </button>
          </div>

          <div className="setting-row">
            <Icon name="clock" size={19} />
            <div className="txt">
              <strong>Quiet mode</strong>
              <span>Batch every notification into one digest a day instead of pinging you.</span>
            </div>
            <button
              className={`switch ${quietMode ? 'on' : ''}`}
              onClick={() => setQuietMode((v) => !v)}
              aria-pressed={quietMode}
              aria-label="Toggle quiet mode"
            >
              <div className="knob" />
            </button>
          </div>

          <button className="btn btn-ghost" onClick={onLogout} style={{ justifySelf: 'start' }}>
            <Icon name="logout" size={16} />
            Log out of Inasta
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileScreen;
