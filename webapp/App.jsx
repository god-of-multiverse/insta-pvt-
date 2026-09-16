import { useCallback, useEffect, useState } from 'react';
import './src/App.css';

import { api, session } from './src/services/api';
import { DEFAULT_CIRCLES } from './src/lib/circles';
import { ToastProvider, useToast } from './src/components/Toast';
import Icon from './src/components/Icon';
import BottomNav, { NAV_ITEMS } from './src/components/BottomNav';
import LandingScreen from './src/screens/LandingScreen';
import HomeScreen from './src/screens/HomeScreen';
import CirclesScreen from './src/screens/SearchScreen';
import UploadScreen from './src/screens/UploadScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ChatScreen from './src/screens/ChatScreen';

const CIRCLES_KEY = 'inasta.circles';

const readStoredCircles = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(CIRCLES_KEY));
    return Array.isArray(raw) && raw.length ? raw : DEFAULT_CIRCLES;
  } catch {
    return DEFAULT_CIRCLES;
  }
};

function Shell() {
  const [currentUser, setCurrentUser] = useState(() => session.user);
  const [screen, setScreen] = useState('home');
  const [activeCircle, setActiveCircle] = useState('All');
  const [circles, setCircles] = useState(readStoredCircles);
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const toast = useToast();

  const isLoggedIn = Boolean(currentUser && session.token);

  useEffect(() => {
    localStorage.setItem(CIRCLES_KEY, JSON.stringify(circles));
  }, [circles]);

  const loadPosts = useCallback(async () => {
    setLoadingPosts(true);
    try {
      const data = await api.get(`/api/posts?circle=${encodeURIComponent(activeCircle)}`);
      setPosts(Array.isArray(data) ? data : []);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setLoadingPosts(false);
    }
  }, [activeCircle, toast]);

  useEffect(() => {
    if (isLoggedIn) loadPosts();
  }, [isLoggedIn, loadPosts]);

  // Circles discovered on existing posts should show up as filters too.
  useEffect(() => {
    const found = [...new Set(posts.map((post) => post.circle).filter(Boolean))];
    const missing = found.filter((name) => !circles.includes(name));
    if (missing.length) setCircles((prev) => [...prev, ...missing]);
  }, [posts, circles]);

  const addCircle = useCallback((name) => {
    setCircles((prev) => (prev.some((c) => c.toLowerCase() === name.toLowerCase()) ? prev : [...prev, name]));
  }, []);

  const logout = () => {
    session.clear();
    setCurrentUser(null);
    setPosts([]);
    setScreen('home');
    setActiveCircle('All');
  };

  const handleUploadSuccess = (_post, circle) => {
    if (circle) {
      addCircle(circle);
      setActiveCircle(circle);
    }
    setScreen('home');
    loadPosts();
  };

  const deletePost = async (postId) => {
    try {
      await api.delete(`/api/posts/${postId}`);
      setPosts((prev) => prev.filter((post) => (post._id || post.id) !== postId));
      toast('Post deleted', 'success');
    } catch (error) {
      toast(error.message, 'error');
    }
  };

  if (!isLoggedIn) {
    return <LandingScreen onLoginSuccess={setCurrentUser} />;
  }

  const screens = {
    home: (
      <HomeScreen
        posts={posts}
        loading={loadingPosts}
        activeCircle={activeCircle}
        setActiveCircle={setActiveCircle}
        circles={circles}
        currentUser={currentUser}
        onDeletePost={deletePost}
        onCompose={() => setScreen('upload')}
      />
    ),
    search: <CirclesScreen localCircles={circles} onAddCircle={addCircle} />,
    upload: (
      <UploadScreen onUploadSuccess={handleUploadSuccess} circles={circles} onAddCircle={addCircle} />
    ),
    chat: <ChatScreen currentUser={currentUser} />,
    profile: (
      <ProfileScreen currentUser={currentUser} posts={posts} circles={circles} onLogout={logout} />
    ),
  };

  return (
    <div className="shell">
      <aside className="rail">
        <div className="rail-brand">
          <div className="wordmark">
            <span className="mark" />
            Inasta
          </div>
        </div>

        <nav className="rail-nav">
          {NAV_ITEMS.filter((item) => item.id !== 'upload').map((item) => (
            <button
              key={item.id}
              className={`rail-item ${screen === item.id ? 'on' : ''}`}
              onClick={() => setScreen(item.id)}
              aria-current={screen === item.id ? 'page' : undefined}
            >
              <Icon name={item.icon} size={20} filled={screen === item.id && item.id === 'home'} />
              {item.label}
              {item.id === 'search' && <span className="count">{circles.length}</span>}
            </button>
          ))}
        </nav>

        <button className="btn btn-primary btn-block rail-compose" onClick={() => setScreen('upload')}>
          <Icon name="compose" size={17} />
          New post
        </button>

        <div className="rail-foot">
          <div className="rail-user">
            <div className="avatar avatar-sm">{(currentUser.username || 'u')[0].toUpperCase()}</div>
            <div className="who">
              <div className="name">{currentUser.username}</div>
              <div className="meta">Private account</div>
            </div>
          </div>
          <button className="btn btn-quiet" onClick={logout} style={{ justifyContent: 'flex-start' }}>
            <Icon name="logout" size={16} />
            Log out
          </button>
        </div>
      </aside>

      <main className="viewport">{screens[screen] || screens.home}</main>

      <BottomNav currentScreen={screen} setCurrentScreen={setScreen} />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Shell />
    </ToastProvider>
  );
}
