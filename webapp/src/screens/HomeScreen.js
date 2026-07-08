import PostCard from '../components/PostCard';

const HomeScreen = ({ posts, loading, activeCircle, setActiveCircle, circles = ['General', 'Hometown', 'College'], currentUser, onDeletePost }) => {
  const filterOptions = ['All', ...circles];

  return (
    <div className="screen-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0 }} className="screen-title">Inasta</h2>
      </div>

      {/* Horizontal Circle Scroll Selector */}
      <div className="circle-filter-scroll">
        {filterOptions.map((circle) => (
          <button
            key={circle}
            onClick={() => setActiveCircle(circle)}
            className={`circle-pill ${activeCircle === circle ? 'active' : ''}`}
          >
            {circle === 'All' ? '🌐 All' : circle === 'General' ? '💬 General' : circle === 'Hometown' ? '🏡 Hometown' : '🎓 College'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#8f9cae' }}>
          <div className="spinner"></div>
          <p style={{ marginTop: 10 }}>Loading {activeCircle} feed...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">No posts in {activeCircle}</p>
          <p className="empty-subtitle">Click the "+" tab below to share a post with your friends in this circle!</p>
        </div>
      ) : (
        posts.map((post) => <PostCard key={post._id || post.id} post={post} currentUser={currentUser} onDelete={onDeletePost} />)
      )}
    </div>
  );
};

export default HomeScreen;
