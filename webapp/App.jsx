import { useCallback, useEffect, useState } from 'react';
import './src/App.css';

import { api, session, safeStorage } from './src/services/api';
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
import AdminScreen from './src/screens/AdminScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import SavedScreen from './src/screens/SavedScreen';
import CirclesScreen from './src/screens/CirclesScreen';
import PrivacyScreen from './src/screens/PrivacyScreen';
import StickersScreen from './src/screens/StickersScreen';
import AssistantScreen from './src/screens/AssistantScreen';
import ScanScreen from './src/screens/ScanScreen';
import { StoryViewer, StoryComposer } from './src/components/Stories';

const CIRCLES_KEY = 'inasta.circles';

const readStoredCircles = () => {
  try {
    const raw = JSON.parse(safeStorage.get(CIRCLES_KEY));
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
  const [trays, setTrays] = useState([]);
  const [activeTray, setActiveTray] = useState(null);
  const [unread, setUnread] = useState(0);
  const [pendingChat, setPendingChat] = useState(null);
  const toast = useToast();

  const isLoggedIn = Boolean(currentUser && session.token);

  useEffect(() => {
    safeStorage.set(CIRCLES_KEY, JSON.stringify(circles));
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

  const loadStories = useCallback(async () => {
    try {
      const data = await api.get('/api/stories');
      setTrays(data.trays || []);
    } catch {
      /* stories are non-critical */
    }
  }, []);

  const loadUnread = useCallback(async () => {
    try {
      const data = await api.get('/api/notifications');
      setUnread(data.unread ?? 0);
    } catch {
      /* non-critical */
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) loadPosts();
  }, [isLoggedIn, loadPosts]);

  useEffect(() => {
    if (!isLoggedIn) return undefined;
    loadStories();
    loadUnread();
    const id = setInterval(loadUnread, 20000);
    return () => clearInterval(id);
  }, [isLoggedIn, loadStories, loadUnread]);

  // A hard sign-out from the API layer (rejected token) drops us to login
  // cleanly instead of leaving a half-dead screen behind.
  useEffect(() => {
    const onSignedOut = () => setCurrentUser(null);
    window.addEventListener('inasta:signed-out', onSignedOut);
    return () => window.removeEventListener('inasta:signed-out', onSignedOut);
  }, []);

  // The cached user in localStorage can be stale — it may predate fields like
  // `role`, or point at an account that no longer exists. Re-fetch the real
  // profile on boot so privileges are never decided from a stale copy.
  useEffect(() => {
    if (!session.token) return;
    api
      .get('/api/auth/me')
      .then(({ user }) => {
        session.save(session.token, user);
        setCurrentUser(user);
      })
      .catch(() => {
        // Token is dead (expired, or the account is gone). Start clean.
        session.clear();
        setCurrentUser(null);
      });
  }, []);

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

  if (overlay === 'admin') {
    return (
      <div className="wx-shell">
        <div className="wx-body">
          <AdminScreen currentUser={currentUser} onBack={() => setOverlay(null)} />
        </div>
      </div>
    );
  }

  if (overlay === 'privacy') {
    return (
      <div className="wx-shell">
        <div className="wx-body">
          <PrivacyScreen
            onBack={() => setOverlay(null)}
            currentUser={currentUser}
            onUserChange={setCurrentUser}
          />
        </div>
      </div>
    );
  }

  if (overlay === 'assistant') {
    return (
      <div className="wx-shell">
        <div className="wx-body">
          <AssistantScreen onBack={() => setOverlay(null)} currentUser={currentUser} />
        </div>
      </div>
    );
  }

  if (overlay === 'stickers') {
    return (
      <div className="wx-shell">
        <div className="wx-body">
          <StickersScreen onBack={() => setOverlay(null)} />
        </div>
      </div>
    );
  }

  if (overlay === 'scan') {
    return (
      <div className="wx-shell">
        <div className="wx-body">
          <ScanScreen onBack={() => setOverlay(null)} currentUser={currentUser} />
        </div>
      </div>
    );
  }

  if (overlay === 'circles') {
    return (
      <div className="wx-shell">
        <div className="wx-body">
          <CirclesScreen onBack={() => setOverlay(null)} />
        </div>
      </div>
    );
  }

  if (overlay === 'saved') {
    return (
      <div className="wx-shell">
        <div className="wx-body">
          <SavedScreen onBack={() => setOverlay(null)} currentUser={currentUser} />
        </div>
      </div>
    );
  }

  if (overlay === 'notifications') {
    return (
      <div className="wx-shell">
        <div className="wx-body">
          <NotificationsScreen onBack={() => setOverlay(null)} onRead={() => setUnread(0)} />
        </div>
      </div>
    );
  }

  if (overlay === 'story') {
    return (
      <div className="wx-shell">
        <div className="wx-body" style={{ background: '#fff' }}>
          <StoryComposer
            circles={circles}
            onClose={() => setOverlay('moments')}
            onPosted={() => {
              setOverlay('moments');
              loadStories();
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
            trays={trays}
            onOpenStory={setActiveTray}
            onAddStory={() => setOverlay('story')}
          />
        </div>
        {activeTray && (
          <StoryViewer
            tray={activeTray}
            onClose={() => {
              setActiveTray(null);
              loadStories();
            }}
          />
        )}
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
            <button
              className="wx-nav-btn right"
              aria-label="New chat"
              onClick={() => setTab('contacts')}
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>+</span>
            </button>
          ) : (
            <span />
          )}
        </div>
      )}

      <div className="wx-body" style={{ background: tab === 'chat' && chatOpen ? '#ededed' : undefined }}>
        {tab === 'chat' && (
          <ChatScreen
            currentUser={currentUser}
            onOpenChange={setChatOpen}
            initialChat={pendingChat}
            onInitialChatUsed={() => setPendingChat(null)}
          />
        )}
        {tab === 'contacts' && (
          <ContactsScreen
            onAddCircle={addCircle}
            currentUser={currentUser}
            onOpenChat={(req) => {
              setPendingChat(req);
              setTab('chat');
            }}
          />
        )}
        {tab === 'discover' && (
          <DiscoverScreen
            onOpenMoments={() => setOverlay('moments')}
            momentsBadge={posts.length || null}
            onOpenNotifications={() => setOverlay('notifications')}
            onOpenSaved={() => setOverlay('saved')}
            onOpenScan={() => setOverlay('scan')}
            onOpenStickers={() => setOverlay('stickers')}
            onOpenAssistant={() => setOverlay('assistant')}
            unread={unread}
          />
        )}
        {tab === 'me' && (
          <MeScreen
            currentUser={currentUser}
            posts={posts}
            circles={circles}
            onLogout={logout}
            onOpenMoments={() => setOverlay('moments')}
            onOpenAdmin={() => setOverlay('admin')}
            onOpenCircles={() => setOverlay('circles')}
            onOpenPrivacy={() => setOverlay('privacy')}
            onOpenStickers={() => setOverlay('stickers')}
            onOpenAssistant={() => setOverlay('assistant')}
            onOpenScan={() => setOverlay('scan')}
            onOpenNotifications={() => setOverlay('notifications')}
            unread={unread}
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
          badges={{ discover: posts.length ? true : null, me: unread ? true : null }}
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
