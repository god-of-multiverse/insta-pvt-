import React, { useState, useEffect } from 'react';
import LoginScreen from './LoginScreen';

const LandingScreen = ({ onLoginSuccess }) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [detectedOS, setDetectedOS] = useState('Detecting...');
  const [deviceClass, setDeviceClass] = useState('Desktop Web');

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    let os = 'Unknown OS';
    let dev = 'Desktop Web';

    if (/android/i.test(ua)) {
      os = 'Android';
      dev = 'Mobile Browser';
    } else if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
      os = 'iOS';
      dev = 'Mobile Browser';
    } else if (/Macintosh/i.test(ua)) {
      os = 'macOS';
      dev = 'Mac Station';
    } else if (/Windows/i.test(ua)) {
      os = 'Windows';
      dev = 'Windows Station';
    } else if (/Linux/i.test(ua)) {
      os = 'Linux';
      dev = 'Linux Station';
    }

    setDetectedOS(os);
    setDeviceClass(dev);
  }, []);

  return (
    <div className="landing-container">
      {/* Background blobs */}
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>
      <div className="blob blob-3"></div>

      {/* Floating Header */}
      <header className="landing-header">
        <h1 className="logo-main" style={{ margin: 0 }}>Inasta</h1>
        <button className="landing-nav-btn" onClick={() => setShowAuthModal(true)}>
          Log In
        </button>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="hero-content fade-in-up">
          <div className="device-badge">
            <span className="pulse-dot"></span>
            Optimized for: <strong>{detectedOS} ({deviceClass})</strong>
          </div>
          
          <h2 className="hero-title">
            Your World, Simplified.<br />
            <span>Private Circles</span> for Friends.
          </h2>
          
          <p className="hero-subtitle">
            Share moments without the public bloat. Segregate your friends into dedicated circles like Hometown, College, and General. No cross-friend visibility. Just real relationships.
          </p>

          <div className="hero-actions">
            <button className="btn-primary-gradient" onClick={() => setShowAuthModal(true)}>
              Launch Web App
            </button>
            <a href="#features" className="btn-secondary-outline">
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Live Tech Display Section */}
      <section className="tech-display fade-in-up">
        <div className="glass-panel tech-grid">
          <div className="tech-card">
            <h3>⚡ Responsive Layout</h3>
            <p>Adapts instantly whether you visit from a phone or a dual-monitor desktop console.</p>
          </div>
          <div className="tech-card">
            <h3>🔒 Circle Privacy</h3>
            <p>Zero database leakage. Friends in separate circles never see each other's updates.</p>
          </div>
          <div className="tech-card">
            <h3>💬 Direct Messages</h3>
            <p>Instant chat messaging directly in the browser to contact your friends immediately.</p>
          </div>
        </div>
      </section>

      {/* Features Detail Section */}
      <section id="features" className="landing-features">
        <div className="section-header">
          <h2 className="section-title-landing">Revolutionizing Friend Interaction</h2>
          <p className="section-subtitle-landing">Built to prevent friend circle overlaps. Because not all friends know each other.</p>
        </div>

        <div className="feature-rows">
          <div className="feature-row glass-panel">
            <div className="feature-text">
              <h3>🏡 Hometown Circle</h3>
              <p>Keep local updates local. Only friends added to your Hometown group will view what you post here.</p>
            </div>
            <div className="feature-visual circle-visual hometown-visual">🏡</div>
          </div>

          <div className="feature-row glass-panel">
            <div className="feature-text">
              <h3>🎓 College Circle</h3>
              <p>Post campus memories and campus humor where classmates can see, keeping family and local friends separate.</p>
            </div>
            <div className="feature-visual circle-visual college-visual">🎓</div>
          </div>
        </div>
      </section>

      {/* Auth Modal overlay */}
      {showAuthModal && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setShowAuthModal(false)}>×</button>
            <LoginScreen onLoginSuccess={onLoginSuccess} />
          </div>
        </div>
      )}

      {/* Landing Footer */}
      <footer className="landing-footer">
        <p>© 2026 Inasta. Created for Job Interview Presentation.</p>
      </footer>
    </div>
  );
};

export default LandingScreen;
