import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import Icon from '../components/Icon';
import Avatar from '../components/Avatar';
import { useToast } from '../components/Toast';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const Stat = ({ label, value, sub, accent }) => (
  <div style={{ flex: '1 1 46%', background: '#fff', padding: '14px 12px', borderRadius: 6 }}>
    <div style={{ fontSize: 12, color: '#888' }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 600, color: accent || '#191919', marginTop: 2 }}>
      {value}
    </div>
    {sub && <div style={{ fontSize: 11, color: '#b2b2b2', marginTop: 2 }}>{sub}</div>}
  </div>
);

/** Tiny inline bar chart for the 14-day signup trend. */
const Spark = ({ data }) => {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 54, marginTop: 10 }}>
      {data.map((d) => (
        <div
          key={d.date}
          title={`${d.date}: ${d.count}`}
          style={{
            flex: 1,
            height: `${Math.max(4, (d.count / max) * 100)}%`,
            background: d.count ? '#07c160' : '#e5e5e5',
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
};

const AdminScreen = ({ onBack, currentUser }) => {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const toast = useToast();

  const loadStats = useCallback(async () => {
    try {
      setStats(await api.get('/api/admin/stats'));
    } catch (error) {
      toast(error.message);
    }
  }, [toast]);

  const loadUsers = useCallback(
    async (q = '') => {
      try {
        const data = await api.get(`/api/admin/users?limit=100&q=${encodeURIComponent(q)}`);
        setUsers(data.users || []);
      } catch (error) {
        toast(error.message);
      }
    },
    [toast]
  );

  const loadPosts = useCallback(async () => {
    try {
      const data = await api.get('/api/admin/posts?limit=40');
      setPosts(data.posts || []);
    } catch (error) {
      toast(error.message);
    }
  }, [toast]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadStats(), loadUsers(), loadPosts()]);
      setLoading(false);
    })();
  }, [loadStats, loadUsers, loadPosts]);

  const patchUser = async (userId, body) => {
    try {
      await api.patch(`/api/admin/users/${userId}`, body);
      toast('Saved');
      setEditing(null);
      await Promise.all([loadUsers(query), loadStats()]);
    } catch (error) {
      toast(error.message);
    }
  };

  const removeUser = async (userId, username) => {
    if (!window.confirm(`Delete ${username} and all their content? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/admin/users/${userId}`);
      toast('User deleted');
      await Promise.all([loadUsers(query), loadStats()]);
    } catch (error) {
      toast(error.message);
    }
  };

  const removePost = async (postId) => {
    if (!window.confirm('Take down this post?')) return;
    try {
      await api.delete(`/api/admin/posts/${postId}`);
      setPosts((prev) => prev.filter((p) => p._id !== postId));
      toast('Post removed');
      loadStats();
    } catch (error) {
      toast(error.message);
    }
  };

  const m = stats?.monetisation;

  return (
    <div style={{ background: '#ededed', minHeight: '100%' }}>
      <div className="wx-nav hair-b">
        <button className="wx-nav-btn left" onClick={onBack} aria-label="Back">
          <Icon name="back" size={22} strokeWidth={2} />
        </button>
        <div className="wx-nav-title">Admin</div>
        <span />
      </div>

      {/* Segmented control */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 16px', background: '#fff' }}>
        {[
          ['overview', 'Overview'],
          ['users', 'Users'],
          ['content', 'Content'],
        ].map(([key, label]) => (
          <button
            key={key}
            className={`wx-aud-chip ${tab === key ? 'on' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="wx-loading">
          <div className="wx-spin" />
        </div>
      )}

      {/* ---------------------------------------------------------- overview */}
      {!loading && tab === 'overview' && stats && (
        <div style={{ padding: 10 }}>
          <div className="wx-section-label" style={{ background: 'none' }}>
            Revenue
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Stat label="MRR" value={money(m.mrr)} accent="#07c160" sub="monthly recurring" />
            <Stat label="ARR" value={money(m.arr)} accent="#07c160" sub="annualised" />
            <Stat label="Paying users" value={m.paying} sub={`${m.conversionRate}% conversion`} />
            <Stat label="ARPU" value={money(m.arpu)} sub="per user / month" />
          </div>

          <div className="wx-section-label" style={{ background: 'none' }}>
            Plans
          </div>
          <div style={{ background: '#fff', borderRadius: 6, padding: 12 }}>
            {Object.entries(m.plans).map(([plan, count]) => {
              const pct = stats.users.total ? (count / stats.users.total) * 100 : 0;
              return (
                <div key={plan} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ textTransform: 'capitalize' }}>
                      {plan} · {money(m.prices[plan])}/mo
                    </span>
                    <span style={{ color: '#888' }}>
                      {count} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3, marginTop: 4 }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: plan === 'free' ? '#c8c8c8' : '#07c160',
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="wx-section-label" style={{ background: 'none' }}>
            Users
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Stat label="Total users" value={stats.users.total} />
            <Stat label="Active today" value={stats.users.activeToday} accent="#07c160" />
            <Stat label="New today" value={stats.users.newToday} sub={`${stats.users.newThisWeek} this week`} />
            <Stat label="Banned" value={stats.users.banned} accent={stats.users.banned ? '#fa5151' : undefined} />
          </div>

          <div style={{ background: '#fff', borderRadius: 6, padding: 12, marginTop: 8 }}>
            <div style={{ fontSize: 12, color: '#888' }}>Signups, last 14 days</div>
            <Spark data={stats.growth} />
          </div>

          <div className="wx-section-label" style={{ background: 'none' }}>
            Content
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            <Stat label="Posts" value={stats.content.posts} sub={`${stats.content.postsToday} today`} />
            <Stat label="Active stories" value={stats.content.activeStories} />
            <Stat label="Messages" value={stats.content.messages} />
            <Stat label="Groups" value={stats.content.groups ?? '—'} />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- users */}
      {!loading && tab === 'users' && (
        <>
          <div className="wx-searchwrap">
            <div className="wx-search">
              <Icon name="search" size={15} strokeWidth={2} />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  loadUsers(e.target.value);
                }}
                placeholder="Search users"
              />
            </div>
          </div>

          <div className="wx-group" style={{ marginTop: 0 }}>
            {users.map((u, i) => (
              <div key={u._id} className={`wx-cell ${i < users.length - 1 ? 'hair-b hair-inset' : ''}`}>
                <Avatar name={u.username} />
                <span className="wx-cell-body">
                  <span className="wx-cell-title">
                    {u.username}
                    {u.role !== 'user' && (
                      <span style={{ color: '#07c160', fontSize: 12, marginLeft: 6 }}>
                        {u.role}
                      </span>
                    )}
                    {u.isBanned && (
                      <span style={{ color: '#fa5151', fontSize: 12, marginLeft: 6 }}>banned</span>
                    )}
                  </span>
                  <span className="wx-cell-sub">
                    {u.plan} · {u.postCount} posts · {u.email}
                  </span>
                </span>
                <button className="wx-aud-chip" onClick={() => setEditing(u)}>
                  Edit
                </button>
              </div>
            ))}
            {users.length === 0 && <div className="wx-empty">No users match.</div>}
          </div>
        </>
      )}

      {/* ----------------------------------------------------------- content */}
      {!loading && tab === 'content' && (
        <div style={{ padding: 10 }}>
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}
          >
            {posts.map((p) => (
              <div key={p._id} style={{ position: 'relative' }}>
                <img
                  src={p.image}
                  alt={p.caption}
                  style={{ width: '100%', aspectRatio: 1, objectFit: 'cover', background: '#ddd' }}
                />
                <button
                  onClick={() => removePost(p._id)}
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    background: 'rgba(250,81,81,0.92)',
                    color: '#fff',
                    width: 22,
                    height: 22,
                    borderRadius: 4,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                  aria-label="Remove post"
                >
                  <Icon name="close" size={13} strokeWidth={2.6} />
                </button>
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'rgba(0,0,0,0.5)',
                    color: '#fff',
                    fontSize: 10,
                    padding: '2px 4px',
                  }}
                >
                  {p.user?.username}
                </div>
              </div>
            ))}
          </div>
          {posts.length === 0 && <div className="wx-empty">No posts yet.</div>}
        </div>
      )}

      {/* -------------------------------------------------------- edit sheet */}
      {editing && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 250,
            background: 'rgba(0,0,0,0.45)',
            display: 'grid',
            placeItems: 'center',
            padding: 24,
          }}
          onClick={() => setEditing(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 320, background: '#fff', borderRadius: 10, padding: 18 }}
          >
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 12, textAlign: 'center' }}>
              {editing.username}
            </div>

            <div style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>Plan</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {['free', 'plus', 'pro'].map((p) => (
                <button
                  key={p}
                  className={`wx-aud-chip ${editing.plan === p ? 'on' : ''}`}
                  onClick={() => setEditing({ ...editing, plan: p })}
                >
                  {p}
                </button>
              ))}
            </div>

            <div style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>Role</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {['user', 'moderator', 'admin'].map((r) => (
                <button
                  key={r}
                  className={`wx-aud-chip ${editing.role === r ? 'on' : ''}`}
                  onClick={() => setEditing({ ...editing, role: r })}
                >
                  {r}
                </button>
              ))}
            </div>

            <label
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginBottom: 8 }}
            >
              <input
                type="checkbox"
                checked={!!editing.isVerified}
                onChange={(e) => setEditing({ ...editing, isVerified: e.target.checked })}
              />
              Verified badge
            </label>
            <label
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginBottom: 16 }}
            >
              <input
                type="checkbox"
                checked={!!editing.isBanned}
                onChange={(e) => setEditing({ ...editing, isBanned: e.target.checked })}
              />
              Banned
            </label>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="wx-aud-chip"
                style={{ flex: 1, padding: 9 }}
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button
                className="wx-aud-chip on"
                style={{ flex: 1, padding: 9 }}
                onClick={() =>
                  patchUser(editing._id, {
                    plan: editing.plan,
                    role: editing.role,
                    isVerified: editing.isVerified,
                    isBanned: editing.isBanned,
                  })
                }
              >
                Save
              </button>
            </div>

            {editing._id !== String(currentUser?._id || currentUser?.id) && (
              <button
                onClick={() => removeUser(editing._id, editing.username)}
                style={{
                  width: '100%',
                  marginTop: 10,
                  padding: 9,
                  borderRadius: 4,
                  color: '#fa5151',
                  fontSize: 14,
                }}
              >
                Delete user
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminScreen;
