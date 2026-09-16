import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import Avatar from './Avatar';
import { momentsTime } from '../lib/time';
import { api, mediaUrl } from '../services/api';
import { useToast } from './Toast';

/**
 * A single Moments entry: avatar on the left, everything else in a right column.
 * The dots button opens WeChat's dark Like / Comment popover, and likes and
 * comments share one grey panel underneath.
 *
 * Likes, comments and saves are persisted through the API.
 */
const MomentItem = ({ post, currentUser, onDelete }) => {
  const author = post.user || {};
  const name = author.username || 'Unknown';
  const postId = post._id || post.id;
  const toast = useToast();

  const [liked, setLiked] = useState(Boolean(post.isLiked));
  const [likeCount, setLikeCount] = useState(post.likesCount ?? (post.likes || []).length);
  const [saved, setSaved] = useState(Boolean(post.isSaved));
  const [comments, setComments] = useState(Array.isArray(post.comments) ? post.comments : []);
  const [popOpen, setPopOpen] = useState(false);
  const [replying, setReplying] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const popRef = useRef(null);

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

  const toggleLike = async () => {
    setPopOpen(false);
    // optimistic
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    try {
      const r = await api.post(`/api/posts/${postId}/like`, {});
      setLiked(r.liked);
      setLikeCount(r.likesCount);
    } catch (error) {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
      toast(error.message);
    }
  };

  const toggleSave = async () => {
    setPopOpen(false);
    const next = !saved;
    setSaved(next);
    try {
      const r = await api.post(`/api/posts/${postId}/save`, {});
      setSaved(r.saved);
      toast(r.saved ? 'Saved' : 'Removed from saved');
    } catch (error) {
      setSaved(!next);
      toast(error.message);
    }
  };

  const submitReply = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const r = await api.post(`/api/posts/${postId}/comments`, { text });
      setComments((prev) => [...prev, r.comment]);
      setDraft('');
      setReplying(false);
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  };

  const removeComment = async (commentId) => {
    try {
      await api.delete(`/api/posts/${postId}/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    } catch (error) {
      toast(error.message);
    }
  };

  const images = post.images?.length ? post.images : post.image ? [post.image] : [];
  const gridClass = images.length === 1 ? 'n1' : images.length === 3 || images.length > 4 ? 'n3' : 'n2';
  const hasSocial = likeCount > 0 || comments.length > 0;

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
                <button onClick={toggleSave}>
                  <Icon name="qr" size={15} />
                  {saved ? 'Unsave' : 'Save'}
                </button>
              </div>
            )}
          </div>
        </div>

        {hasSocial && (
          <div className="wx-social">
            {likeCount > 0 && (
              <div className="wx-likes">
                <Icon name="heart" size={14} />
                <span className="wx-likes-names">
                  {liked
                    ? likeCount === 1
                      ? myName
                      : `${myName} and ${likeCount - 1} other${likeCount > 2 ? 's' : ''}`
                    : `${likeCount} like${likeCount === 1 ? '' : 's'}`}
                </span>
              </div>
            )}
            {likeCount > 0 && comments.length > 0 && <div className="wx-social-split" />}
            {comments.length > 0 && (
              <div className="wx-comments">
                {comments.map((comment) => {
                  const mine = comment.user?.username === myName;
                  return (
                    <div className="wx-comment" key={comment._id}>
                      <b>{comment.user?.username || 'someone'}</b>
                      {': '}
                      {comment.text}
                      {(mine || isMine) && (
                        <button
                          onClick={() => removeComment(comment._id)}
                          style={{ marginLeft: 6, fontSize: 12, color: '#b2b2b2' }}
                        >
                          delete
                        </button>
                      )}
                    </div>
                  );
                })}
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
            <button type="submit" disabled={!draft.trim() || busy}>
              Send
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default MomentItem;
