const ProfileScreen = ({ currentUser, posts, onLogout }) => {
  const user = currentUser || {};
  const userPosts = posts.filter(post => post.user?._id === user.id || post.user === user.id);
  const initial = user.username ? user.username[0].toUpperCase() : 'U';

  return (
    <div style={{ color: '#fff' }}>
      <div className="profile-header">
        <h2 className="profile-username">{user.username || 'User'}</h2>
        <button onClick={onLogout} className="logout-button">Logout</button>
      </div>

      <div className="profile-bio-card">
        <div className="profile-pic-large">{initial}</div>
        <div className="profile-stats">
          <div className="stat-item">
            <div className="stat-num">{userPosts.length}</div>
            <div className="stat-lbl">Posts</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">0</div>
            <div className="stat-lbl">Followers</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">0</div>
            <div className="stat-lbl">Following</div>
          </div>
        </div>
      </div>

      <div className="profile-details">
        <p className="profile-display-name">{user.username || 'Display Name'}</p>
        <p className="profile-bio-text">No bio yet</p>
        <span className="private-badge">Private Account</span>
      </div>

      <button className="edit-profile-btn">Edit Profile</button>

      <div className="profile-tabs">
        <div className="profile-tab-item active">POSTS</div>
        <div className="profile-tab-item">SAVED</div>
      </div>

      {userPosts.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">No Posts Yet</p>
          <p className="empty-subtitle">Share your first photo on Inasta!</p>
        </div>
      ) : (
        <div className="posts-grid-container">
          {userPosts.map((post) => (
            <img key={post._id} src={post.image} className="grid-photo" alt="Grid View Post" />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfileScreen;
