import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { circleMeta } from '../lib/circles';
import { relativeTime } from '../lib/time';
import { mediaUrl } from '../services/api';
import { useToast } from './Toast';

const PostCard = ({ post, currentUser, onDelete }) => {
  const author = post.user || {};
  const initial = (author.username || 'U')[0].toUpperCase();
  const meta = circleMeta(post.circle || 'General');
  const toast = useToast();

  const [liked, setLiked] = useState(Boolean(post.isLiked));
  const [saved, setSaved] = useState(Boolean(post.isSaved));
  const [comments, setComments] = useState(Array.isArray(post.comments) ? post.comments : []);
  const [draft, setDraft] = useState('');
  const [openComments, setOpenComments] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const menuRef = useRef(null);

  const postId = post._id || post.id;
  const authorId = String(author._id || author.id || post.user || '');
  const myId = String(currentUser?._id || currentUser?.id || '');
  const isMine = Boolean(myId) && authorId === myId;

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const addComment = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setComments((prev) => [
      ...prev,
      { _id: `local-${Date.now()}`, user: { username: currentUser?.username || 'you' }, text, createdAt: new Date().toISOString() },
    ]);
    setDraft('');
    setOpenComments(true);
  };

  const share = async () => {
    const text = `${author.username || 'Someone'} shared something in ${meta.name} on Inasta`;
    try {
      if (navigator.share) await navigator.share({ title: 'Inasta', text });
      else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        toast('Copied — remember this only makes sense to people in the circle');
      }
    } catch {
      /* user dismissed the share sheet */
    }
    setMenuOpen(false);
  };

  const remove = async () => {
    setMenuOpen(false);
    if (!postId || !onDelete) return;
    if (!window.confirm('Delete this post? It disappears for everyone in the circle.')) return;
    await onDelete(postId);
  };

  return (
    <article className="post">
      <header className="post-head">
        <div className="avatar avatar-md">{initial}</div>
        <div className="post-who">
          <div className="post-name">{author.username || 'Unknown'}</div>
          <div className="post-meta">
            <span>{relativeTime(post.createdAt)}</span>
            <span className="sep">·</span>
            <span style={{ color: meta.color }}>{meta.name}</span>
          </div>
        </div>
        <div className="post-menu-wrap" ref={menuRef}>
          <button className="icon-btn" onClick={() => setMenuOpen((v) => !v)} aria-label="Post options">
            <Icon name="more" size={18} strokeWidth={2.4} />
          </button>
          {menuOpen && (
            <div className="menu">
              <button onClick={share}>
                <Icon name="share" size={15} /> Share outside the circle
              </button>
              <button onClick={() => { setSaved((v) => !v); setMenuOpen(false); }}>
                <Icon name="bookmark" size={15} /> {saved ? 'Remove from saved' : 'Save to collection'}
              </button>
              {isMine && (
                <button className="danger" onClick={remove}>
                  <Icon name="trash" size={15} /> Delete post
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="post-media">
        {!imageReady && <div className="skeleton media-skeleton" />}
        <img
          src={mediaUrl(post.image)}
          alt={post.caption ? `Post: ${post.caption}` : `Post by ${author.username || 'a friend'}`}
          className={imageReady ? '' : 'loading'}
          loading="lazy"
          onLoad={() => setImageReady(true)}
          onError={() => setImageReady(true)}
        />
        <span className="audience-tag">
          <Icon name="eyeOff" size={13} />
          Only {meta.name}
        </span>
      </div>

      <div className="post-body">
        <div className="post-actions">
          <button
            className={`act ${liked ? 'on liked' : ''}`}
            onClick={() => setLiked((v) => !v)}
            aria-pressed={liked}
          >
            <Icon name="heart" size={19} filled={liked} />
            {liked ? 'Liked' : 'Like'}
          </button>
          <button className="act" onClick={() => setOpenComments((v) => !v)}>
            <Icon name="comment" size={19} />
            {comments.length > 0 ? comments.length : 'Reply'}
          </button>
          <button className="act" onClick={share}>
            <Icon name="share" size={19} />
          </button>
          <button
            className={`act act-spacer ${saved ? 'on' : ''}`}
            onClick={() => setSaved((v) => !v)}
            aria-pressed={saved}
            aria-label="Save post"
          >
            <Icon name="bookmark" size={19} filled={saved} />
          </button>
        </div>

        {post.caption && (
          <p className="post-caption">
            <span className="author">{author.username || 'user'}</span>
            {post.caption}
          </p>
        )}

        {openComments && (
          <div className="comments">
            {comments.length === 0 ? (
              <p style={{ fontSize: 13.5, color: 'var(--text-mute)' }}>
                No replies yet — in a circle this small, yours will actually be read.
              </p>
            ) : (
              comments.map((comment) => (
                <div className="comment" key={comment._id}>
                  <div className="avatar avatar-xs">
                    {(comment.user?.username || 'u')[0].toUpperCase()}
                  </div>
                  <div className="txt">
                    <span className="who">{comment.user?.username || 'you'}</span>
                    {comment.text}
                    <span className="when">{relativeTime(comment.createdAt)}</span>
                  </div>
                </div>
              ))
            )}

            <form className="comment-form" onSubmit={addComment}>
              <input
                className="field"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={`Reply to ${author.username || 'this'}…`}
                aria-label="Write a reply"
              />
              <button className="btn btn-ghost" type="submit" disabled={!draft.trim()}>
                Send
              </button>
            </form>
          </div>
        )}
      </div>
    </article>
  );
};

export default PostCard;
