import React, { useState, useEffect } from 'react';
import './src/App.css';

import { api } from './src/services/api';
import BottomNav from './src/components/BottomNav';
import LandingScreen from './src/screens/LandingScreen';
import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import UploadScreen from './src/screens/UploadScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ChatScreen from './src/screens/ChatScreen';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('home');
  const [activeCircle, setActiveCircle] = useState('All');
  const [posts, setPosts] = useState([]);
  const [circles, setCircles] = useState(['General', 'Hometown', 'College']);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [detectedOS, setDetectedOS] = useState('Desktop Web');

  // Check login session & User Agent on load
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      setCurrentUser(JSON.parse(user));
      setIsLoggedIn(true);
    }

    // Detect Device Client Type
    const ua = navigator.userAgent;
    if (/android/i.test(ua) || /iPhone|iPad|iPod/i.test(ua)) {
      setDetectedOS('Mobile Web');
    } else {
      setDetectedOS('Desktop Web');
    }
  }, []);

  // Fetch posts when user is logged in or active circle changes
  useEffect(() => {
    if (isLoggedIn) {
      loadPosts();
    }
  }, [isLoggedIn, activeCircle]);

  const loadPosts = async () => {
    setLoadingPosts(true);
    try {
      const data = await api.get(`/api/posts?circle=${activeCircle}`);
      setPosts(data);
    } catch (error) {
      console.error('Error loading posts:', error.message);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    setCurrentScreen('home');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setCurrentUser(null);
    setCurrentScreen('home');
    setActiveCircle('All');
    setPosts([]);
  };

  const handleUploadSuccess = (uploadedPost, selectedCircle) => {
    if (selectedCircle && !circles.includes(selectedCircle)) {
      setCircles((prev) => [...prev, selectedCircle]);
    }
    if (selectedCircle && selectedCircle !== 'All') {
      setActiveCircle(selectedCircle);
    }
    loadPosts();
    setCurrentScreen('home');
  };

  const handleDeletePost = async (postId) => {
    try {
      await api.delete(`/api/posts/${postId}`);
      setPosts((prev) => prev.filter((post) => (post._id || post.id) !== postId));
    } catch (error) {
      console.error('Error deleting post:', error.message);
    }
  };

  // Unauthenticated visitors see the Landing Page
  if (!isLoggedIn) {
    return <LandingScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const renderActiveScreen = () => {
    switch (currentScreen) {
      case 'home':
        return (
          <HomeScreen 
            posts={posts} 
            loading={loadingPosts} 
            activeCircle={activeCircle} 
            setActiveCircle={setActiveCircle} 
            circles={circles} 
            currentUser={currentUser} 
            onDeletePost={handleDeletePost} 
          />
        );
      case 'search':
        return <SearchScreen />;
      case 'upload':
        return <UploadScreen onUploadSuccess={handleUploadSuccess} circles={circles} onAddCircle={(newCircle) => setCircles((prev) => (prev.includes(newCircle) ? prev : [...prev, newCircle]))} />;
      case 'chat':
        return <ChatScreen currentUser={currentUser} />;
      case 'profile':
        return (
          <ProfileScreen
            currentUser={currentUser}
            posts={posts}
            onLogout={handleLogout}
          />
        );
      default:
        return <HomeScreen posts={posts} loading={loadingPosts} activeCircle={activeCircle} setActiveCircle={setActiveCircle} circles={circles} currentUser={currentUser} onDeletePost={handleDeletePost} />;
    }
  };

  return (
    <div className={`main-layout-container ${detectedOS === 'Desktop Web' ? 'desktop-view' : 'mobile-view'}`}>
      
      {/* Desktop Left Sidebar navigation */}
      <aside className="desktop-sidebar">
        <div className="sidebar-brand">
          <h2>Inasta</h2>
          <span className="brand-badge">{detectedOS}</span>
        </div>
        <nav className="sidebar-nav">
          <button 
            className={`sidebar-nav-item ${currentScreen === 'home' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('home')}
          >
            <span className="nav-icon-span">🏠</span> Home Feed
          </button>
          <button 
            className={`sidebar-nav-item ${currentScreen === 'search' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('search')}
          >
            <span className="nav-icon-span">🔍</span> Search
          </button>
          <button 
            className={`sidebar-nav-item ${currentScreen === 'upload' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('upload')}
          >
            <span className="nav-icon-span">➕</span> Create Post
          </button>
          <button 
            className={`sidebar-nav-item ${currentScreen === 'chat' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('chat')}
          >
            <span className="nav-icon-span">💬</span> Messages
          </button>
          <button 
            className={`sidebar-nav-item ${currentScreen === 'profile' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('profile')}
          >
            <span className="nav-icon-span">👤</span> Profile
          </button>
        </nav>
        <div className="sidebar-footer">
          {currentUser && (
            <div className="sidebar-user">
              <div className="user-indicator"></div>
              <span>{currentUser.username}</span>
            </div>
          )}
          <button onClick={handleLogout} className="sidebar-logout-btn">
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="content-viewport">
        {renderActiveScreen()}
      </main>

      {/* Mobile Bottom Navigation (only shown/styled on mobile-view via CSS) */}
      <BottomNav
        currentScreen={currentScreen}
        setCurrentScreen={setCurrentScreen}
      />
    </div>
  );
}

export default App;
