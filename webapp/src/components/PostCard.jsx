import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import Avatar from './Avatar';
import { momentsTime } from '../lib/time';
import { mediaUrl } from '../services/api';

/**
 * A single Moments entry: avatar on the left, everything else in a right column.
 * The dots button opens WeChat's dark Like / Comment popover, and likes and
 * comments share one grey panel underneath.
 */
const MomentItem = ({ post, currentUser, onDelete }) => {
  const author = post.user || {};
  const name = author.username || 'Unknown';

  const [liked, setLiked] = useState(Boolean(post.isLiked));
  const [likers, setLikers] = useState(post.likers || []);
  const [comments, setComments] = useState(Array.isArray(post.comments) ? post.comments : []);
  const [popOpen, setPopOpen] = useState(false);
  const [replying, setReplying] = useState(false);
  const [draft, setDraft] = useState('');
  const popRef = useRef(null);

  const postId = post._id || post.id;
  const myName = currentUser?.username || 'you';
  const isMine =
    String(author._id || author.id || post.user || '') ===
    String(currentUser?._id || currentUser?.id || '');

  useEffect(() => {
    if (!popOpen) return undefined;
    const close = (event) => {
      if (popRef.current && !popRef.current.contains(event.target)) setPopOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [popOpen]);

  const toggleLike = () => {
    setLiked((wasLiked) => {
      setLikers((prev) => (wasLiked ? prev.filter((n) => n !== myName) : [...prev, myName]));
      return !wasLiked;
    });
    setPopOpen(false);
  };

  const submitReply = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setComments((prev) => [...prev, { _id: `local-${Date.now()}`, user: { username: myName }, text }]);
    setDraft('');
    setReplying(false);
  };

  const images = post.images?.length ? post.images : post.image ? [post.image] : [];
  const gridClass = images.length === 1 ? 'n1' : images.length === 3 || images.length > 4 ? 'n3' : 'n2';
  const hasSocial = likers.length > 0 || comments.length > 0;

  return (
    <div className="wx-moment hair-b hair-inset">
      <Avatar name={name} />

      <div className="wx-moment-col">
        <div className="wx-moment-name">{name}</div>

        {post.caption && <div className="wx-moment-text">{post.caption}</div>}

        {images.length > 0 && (
          <div className={`wx-grid ${gridClass}`}>
            {images.map((src, index) => (
              <img key={src} src={mediaUrl(src)} alt={post.caption || `Photo ${index + 1}`} loading="lazy" />
            ))}
          </div>
        )}

        <div className="wx-moment-foot">
          <span className="wx-moment-time">{momentsTime(post.createdAt)}</span>
          {isMine && onDelete && (
            <button
              className="wx-moment-del"
              onClick={() => {
                if (window.confirm('Delete this Moment?')) onDelete(postId);
              }}
            >
              Delete
            </button>
          )}

          <div className="wx-pop" ref={popRef}>
            <button className="wx-dots" onClick={() => setPopOpen((v) => !v)} aria-label="Like or comment">
              <Icon name="more" size={17} strokeWidth={2.6} />
            </button>
            {popOpen && (
              <div className="wx-pop-menu">
                <button onClick={toggleLike}>
                  <Icon name="heart" size={15} />
                  {liked ? 'Unlike' : 'Like'}
                </button>
                <button
                  onClick={() => {
                    setReplying(true);
                    setPopOpen(false);
                  }}
                >
                  <Icon name="comment" size={15} />
                  Comment
                </button>
              </div>
            )}
          </div>
        </div>

        {hasSocial && (
          <div className="wx-social">
            {likers.length > 0 && (
              <div className="wx-likes">
                <Icon name="heart" size={14} />
                <span className="wx-likes-names">{likers.join(', ')}</span>
              </div>
            )}
            {likers.length > 0 && comments.length > 0 && <div className="wx-social-split" />}
            {comments.length > 0 && (
              <div className="wx-comments">
                {comments.map((comment) => (
                  <div className="wx-comment" key={comment._id}>
                    <b>{comment.user?.username || 'someone'}</b>
                    {': '}
                    {comment.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {replying && (
          <form className="wx-reply-bar" onSubmit={submitReply}>
            <input
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={() => !draft.trim() && setReplying(false)}
              placeholder="Comment"
              aria-label="Write a comment"
            />
            <button type="submit" disabled={!draft.trim()}>
              Send
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default MomentItem;
