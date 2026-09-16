import { useCallback, useEffect, useState } from 'react';
import './src/App.css';

import { api, session } from './src/services/api';
import { DEFAULT_CIRCLES } from './src/lib/circles';
import { ToastProvider, useToast } from './src/components/Toast';
import BottomNav, { TABS } from './src/components/BottomNav';
import AuthScreen from './src/screens/LoginScreen';
import MomentsScreen from './src/screens/HomeScreen';
import ContactsScreen from './src/screens/SearchScreen';
import DiscoverScreen from './src/screens/DiscoverScreen';
import ComposeScreen from './src/screens/UploadScreen';
import MeScreen from './src/screens/ProfileScreen';
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
  const [tab, setTab] = useState('chat');
  // Full-screen views stacked above the tabs: 'moments' | 'compose'
  const [overlay, setOverlay] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
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
      toast(error.message);
    } finally {
      setLoadingPosts(false);
    }
  }, [activeCircle, toast]);

  useEffect(() => {
    if (isLoggedIn) loadPosts();
  }, [isLoggedIn, loadPosts]);

  useEffect(() => {
    const found = [...new Set(posts.map((post) => post.circle).filter(Boolean))];
    const missing = found.filter((name) => !circles.includes(name));
    if (missing.length) setCircles((prev) => [...prev, ...missing]);
  }, [posts, circles]);

  const addCircle = useCallback((name) => {
    setCircles((prev) =>
      prev.some((c) => c.toLowerCase() === name.toLowerCase()) ? prev : [...prev, name]
    );
  }, []);

  const logout = () => {
    session.clear();
    setCurrentUser(null);
    setPosts([]);
    setTab('chat');
    setOverlay(null);
    setActiveCircle('All');
  };

  const deletePost = async (postId) => {
    try {
      await api.delete(`/api/posts/${postId}`);
      setPosts((prev) => prev.filter((post) => (post._id || post.id) !== postId));
      toast('Deleted');
    } catch (error) {
      toast(error.message);
    }
  };

  if (!isLoggedIn) return <AuthScreen onLoginSuccess={setCurrentUser} />;

  /* Full-screen overlays sit above the tab bar, as they do in WeChat */
  if (overlay === 'compose') {
    return (
      <div className="wx-shell">
        <div className="wx-body">
          <ComposeScreen
            circles={circles}
            onAddCircle={addCircle}
            onCancel={() => setOverlay('moments')}
            onUploadSuccess={(_post, circle) => {
              if (circle) {
                addCircle(circle);
                setActiveCircle(circle);
              }
              setOverlay('moments');
              loadPosts();
            }}
          />
        </div>
      </div>
    );
  }

  if (overlay === 'moments') {
    return (
      <div className="wx-shell">
        <div className="wx-body" style={{ background: '#fff' }}>
          <MomentsScreen
            posts={posts}
            loading={loadingPosts}
            activeCircle={activeCircle}
            setActiveCircle={setActiveCircle}
            circles={circles}
            currentUser={currentUser}
            onDeletePost={deletePost}
            onCompose={() => setOverlay('compose')}
          />
        </div>
        <div className="wx-nav" style={{ position: 'sticky', bottom: 0, borderTop: '1px solid #e5e5e5' }}>
          <button className="wx-nav-btn left" onClick={() => setOverlay(null)} aria-label="Back">
            <span style={{ fontSize: 15 }}>‹ Back</span>
          </button>
          <span />
          <span />
        </div>
      </div>
    );
  }

  const titles = { chat: 'Chats', contacts: 'Contacts', discover: 'Discover', me: 'Me' };

  return (
    <div className="wx-shell">
      {/* The conversation view supplies its own nav bar */}
      {!(tab === 'chat' && chatOpen) && (
        <div className="wx-nav">
          <span />
          <div className="wx-nav-title">{titles[tab]}</div>
          {tab === 'chat' ? (
            <button className="wx-nav-btn right" aria-label="New chat">
              <span style={{ fontSize: 22, lineHeight: 1 }}>+</span>
            </button>
          ) : (
            <span />
          )}
        </div>
      )}

      <div className="wx-body" style={{ background: tab === 'chat' && chatOpen ? '#ededed' : undefined }}>
        {tab === 'chat' && <ChatScreen currentUser={currentUser} onOpenChange={setChatOpen} />}
        {tab === 'contacts' && <ContactsScreen onAddCircle={addCircle} />}
        {tab === 'discover' && (
          <DiscoverScreen onOpenMoments={() => setOverlay('moments')} momentsBadge={posts.length || null} />
        )}
        {tab === 'me' && (
          <MeScreen
            currentUser={currentUser}
            posts={posts}
            circles={circles}
            onLogout={logout}
            onOpenMoments={() => setOverlay('moments')}
          />
        )}
      </div>

      {!(tab === 'chat' && chatOpen) && (
        <BottomNav
          current={tab}
          onChange={(next) => {
            setTab(next);
            setChatOpen(false);
          }}
          badges={{ discover: posts.length ? true : null }}
        />
      )}
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
