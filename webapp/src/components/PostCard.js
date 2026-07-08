import { useState } from 'react';

const PostCard = ({ post, currentUser, onDelete }) => {
  const user = post.user || {};
  const initial = user.username ? user.username[0].toUpperCase() : 'U';
  const [isLiked, setIsLiked] = useState(Boolean(post.isLiked));
  const [likeCount, setLikeCount] = useState(post.likesCount || post.likes || 0);
  const [comments, setComments] = useState(Array.isArray(post.comments) ? post.comments : []);
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(Boolean(comments.length));
  const [isFollowing, setIsFollowing] = useState(Boolean(post.isFollowing));
  const [isSaved, setIsSaved] = useState(Boolean(post.isSaved));
  const [shareMessage, setShareMessage] = useState('');

  const postId = post._id || post.id;
  const isOwner = currentUser && (String(post.user?._id || post.user?.id || post.user || '') === String(currentUser._id || currentUser.id || currentUser || ''));

  const handleLike = () => {
    setIsLiked((prev) => !prev);
    setLikeCount((prev) => (isLiked ? Math.max(0, prev - 1) : prev + 1));
  };

  const handleAddComment = (event) => {
    event.preventDefault();
    const text = commentText.trim();
    if (!text) return;

    setComments((prev) => [
      { _id: Date.now().toString(), user: { username: 'You' }, text },
      ...prev,
    ]);
    setCommentText('');
    setShowComments(true);
  };

  const handleFollow = () => {
    setIsFollowing((prev) => !prev);
  };

  const handleSave = () => {
    setIsSaved((prev) => !prev);
  };

  const handleShare = async () => {
    const shareText = `Check out ${user.username || 'this post'} on Inasta`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Inasta Post', text: shareText });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
      }
      setShareMessage('Link copied to clipboard');
      setTimeout(() => setShareMessage(''), 1800);
    } catch {
      setShareMessage('Share action cancelled');
      setTimeout(() => setShareMessage(''), 1800);
    }
  };

  const handleDelete = async () => {
    if (!postId || !onDelete) return;
    if (window.confirm('Remove this post?')) {
      await onDelete(postId);
    }
  };

  const timeLabel = post.createdAt
    ? new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : 'Just now';

  return (
    <div className="post-card">
      <div className="post-header">
        <div className="post-avatar">{initial}</div>
        <div className="post-user-meta">
          <div className="post-username">{user.username || 'Unknown'}</div>
          <div className="post-time">{timeLabel}</div>
        </div>
        <div className="post-header-actions">
          {isOwner && (
            <button type="button" className="post-delete-btn" onClick={handleDelete}>
              Remove
            </button>
          )}
          <button type="button" className={`follow-btn ${isFollowing ? 'following' : ''}`} onClick={handleFollow}>
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        </div>
      </div>
      <div className="post-image-container">
        <img src={post.image} className="post-image" alt="Post" />
      </div>

      <div className="post-stats">
        <span>{likeCount} likes</span>
        <span>{comments.length} comments</span>
      </div>

      <div className="post-actions">
        <button type="button" className={`action-btn like ${isLiked ? 'active' : ''}`} onClick={handleLike}>
          {isLiked ? '♥' : '♡'}
        </button>
        <button type="button" className="action-btn" onClick={() => setShowComments((prev) => !prev)}>
          💬
        </button>
        <button type="button" className={`action-btn ${isSaved ? 'saved' : ''}`} onClick={handleSave}>
          {isSaved ? '🔖' : '📑'}
        </button>
        <button type="button" className="action-btn" onClick={handleShare}>
          ↗
        </button>
      </div>

      {shareMessage && <div className="share-message">{shareMessage}</div>}

      {post.caption && (
        <div className="post-caption">
          <strong>{user.username || 'user'}</strong>
          {post.caption}
        </div>
      )}

      {showComments && (
        <div className="post-comments">
          {comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment._id} className="comment-item">
                <strong>{comment.user?.username || 'You'}</strong>
                <span>{comment.text}</span>
              </div>
            ))
          ) : (
            <div className="comment-empty">Be the first to comment</div>
          )}
        </div>
      )}

      <form className="comment-form" onSubmit={handleAddComment}>
        <input
          className="comment-input"
          value={commentText}
          onChange={(event) => setCommentText(event.target.value)}
          placeholder="Write a comment..."
        />
        <button type="submit" className="comment-submit">Post</button>
      </form>
    </div>
  );
};

export default PostCard;
