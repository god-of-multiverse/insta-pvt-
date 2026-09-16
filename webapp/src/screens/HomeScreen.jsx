import PostCard from '../components/PostCard';
import Icon from '../components/Icon';
import { circleMeta } from '../lib/circles';
import { dayLabel } from '../lib/time';

const FeedSkeleton = () => (
  <div className="feed">
    {[0, 1].map((i) => (
      <div className="post" key={i}>
        <div className="post-head">
          <div className="skeleton" style={{ width: 42, height: 42, borderRadius: '50%' }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ width: 120, height: 12, marginBottom: 7 }} />
            <div className="skeleton" style={{ width: 72, height: 10 }} />
          </div>
        </div>
        <div className="skeleton" style={{ height: 320, borderRadius: 0 }} />
        <div className="post-body">
          <div className="skeleton" style={{ height: 12, width: '70%', marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 12, width: '45%' }} />
        </div>
      </div>
    ))}
  </div>
);

/** Groups posts under Today / Yesterday / weekday headings. */
const groupByDay = (posts) => {
  const groups = [];
  posts.forEach((post) => {
    const label = dayLabel(post.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.posts.push(post);
    else groups.push({ label, posts: [post] });
  });
  return groups;
};

const HomeScreen = ({
  posts,
  loading,
  activeCircle,
  setActiveCircle,
  circles,
  currentUser,
  onDeletePost,
  onCompose,
}) => {
  const options = ['All', ...circles];
  const meta = circleMeta(activeCircle);
  const groups = groupByDay(posts);

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <h1>{activeCircle === 'All' ? 'Your circles' : activeCircle}</h1>
          <p className="sub">{meta.blurb}</p>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-ghost" onClick={onCompose}>
            <Icon name="plus" size={16} />
            Post
          </button>
        </div>
      </div>

      <div className="circle-bar" role="tablist" aria-label="Filter by circle">
        {options.map((name) => {
          const item = circleMeta(name);
          return (
            <button
              key={name}
              role="tab"
              aria-selected={activeCircle === name}
              className={`circle-tab ${activeCircle === name ? 'on' : ''}`}
              style={{ '--chip-color': item.color }}
              onClick={() => setActiveCircle(name)}
            >
              <span className="dot" />
              {name}
            </button>
          );
        })}
      </div>

      {loading ? (
        <FeedSkeleton />
      ) : posts.length === 0 ? (
        <div className="empty">
          <h3>Nothing here yet</h3>
          <p>
            {activeCircle === 'All'
              ? 'When people in your circles post, it shows up here in the order it happened — and then it stops.'
              : `No one has posted to ${activeCircle} yet. Be the first; only this circle will see it.`}
          </p>
          <button className="btn btn-primary" style={{ marginTop: 22 }} onClick={onCompose}>
            <Icon name="plus" size={16} />
            Share something
          </button>
        </div>
      ) : (
        <>
          <div className="feed">
            {groups.map((group) => (
              <div key={group.label} className="stack" style={{ gap: 26 }}>
                <div className="day-rule">{group.label}</div>
                {group.posts.map((post) => (
                  <PostCard
                    key={post._id || post.id}
                    post={post}
                    currentUser={currentUser}
                    onDelete={onDeletePost}
                  />
                ))}
              </div>
            ))}
          </div>

          <p
            style={{
              textAlign: 'center',
              color: 'var(--text-mute)',
              fontSize: 13,
              padding: '38px 0 10px',
              maxWidth: 620,
            }}
          >
            That&apos;s everything. No infinite scroll — go do something else.
          </p>
        </>
      )}
    </div>
  );
};

export default HomeScreen;
