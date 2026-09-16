import { useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon';
import AuthPanel from './LoginScreen';

const useReveal = () => {
  const ref = useRef(null);
  useEffect(() => {
    const nodes = ref.current?.querySelectorAll('.reveal');
    if (!nodes?.length) return undefined;
    if (!('IntersectionObserver' in window)) {
      nodes.forEach((n) => n.classList.add('in'));
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);
  return ref;
};

const THEM = [
  'One feed for everyone you have ever met',
  'An algorithm decides who sees you',
  'Public like counts turn friends into metrics',
  'Ads and suggested strangers between friends',
  'Stories designed to make you check back hourly',
];

const US = [
  'A separate circle for hometown, college, work — no overlap',
  'Strictly reverse-chronological. No ranking, ever',
  'Likes are private; only you see your own numbers',
  'No ads, no suggested accounts, no discovery page',
  'No streaks, no read receipts, nothing engineered to pull you back',
];

const FEATURES = [
  {
    icon: 'circles',
    title: 'Audience before you post',
    body: 'You pick the circle first, so there is never a moment where you wonder who just saw that.',
  },
  {
    icon: 'eyeOff',
    title: 'Members cannot see each other',
    body: 'Your college friends never learn that your hometown circle exists. Circles are invisible sideways.',
  },
  {
    icon: 'clock',
    title: 'Plain chronology',
    body: 'Posts appear in the order they happened, grouped by day. When you reach the end, you are done.',
  },
  {
    icon: 'shield',
    title: 'Private by default',
    body: 'Every account starts closed. There is no public profile to find, and no search that reaches you.',
  },
  {
    icon: 'chat',
    title: 'Messages that stay in context',
    body: 'Direct and circle chats live beside the posts they are about, not in a separate inbox app.',
  },
  {
    icon: 'sparkle',
    title: 'Small on purpose',
    body: 'Circles are capped small. A feed that never exceeds a few real people stays worth reading.',
  },
];

const LandingScreen = ({ onLoginSuccess }) => {
  const [authOpen, setAuthOpen] = useState(false);
  const [mode, setMode] = useState('signup');
  const reveal = useReveal();

  const open = (nextMode) => {
    setMode(nextMode);
    setAuthOpen(true);
  };

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && setAuthOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="landing" ref={reveal}>
      <header className="landing-nav">
        <div className="wordmark">
          <span className="mark" />
          Inasta
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-quiet" onClick={() => open('login')}>
            Log in
          </button>
          <button className="btn btn-primary" onClick={() => open('signup')}>
            Create account
          </button>
        </div>
      </header>

      <section className="landing-hero">
        <div>
          <span className="hero-badge">
            <span className="pulse" />
            Private circles · invite only
          </span>
          <h1 className="hero-title">
            Not a feed.
            <br />
            A few <em>rooms</em> with
            <br />
            the right people in them.
          </h1>
          <p className="hero-sub">
            Instagram gives you one audience: everyone. Inasta gives you several small ones that never
            meet. Choose the circle, then share — hometown, college, or the five people who actually
            reply.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary btn-lg" onClick={() => open('signup')}>
              Start a circle
              <Icon name="arrowRight" size={17} />
            </button>
            <a className="btn btn-ghost btn-lg" href="#difference">
              See the difference
            </a>
          </div>
          <p className="hero-note">
            <Icon name="lock" size={14} /> No public profile. No algorithm. No ads.
          </p>
        </div>

        <div className="hero-visual">
          <div className="phone">
            <div className="phone-screen">
              <div className="phone-row">
                <div className="avatar avatar-sm">M</div>
                <div style={{ flex: 1 }}>
                  <div className="phone-line short" />
                </div>
                <span className="chip chip-solid" style={{ '--chip-color': 'var(--c-hometown)' }}>
                  <span className="dot" />
                  Hometown
                </span>
              </div>
              <div className="phone-frame" />
              <div className="phone-line mid" />
              <div className="phone-line short" />
            </div>
          </div>
          <div className="hero-float one">
            <Icon name="eyeOff" size={15} /> College can&apos;t see this
          </div>
          <div className="hero-float two">
            <Icon name="users" size={15} /> 6 people in this circle
          </div>
        </div>
      </section>

      <section className="section" id="difference">
        <div className="section-head reveal">
          <span className="eyebrow">The difference</span>
          <h2>Everything they optimise, we removed.</h2>
          <p>
            Most of what makes a social app stressful is not the people — it is the machinery around
            them. So there isn&apos;t any.
          </p>
        </div>
        <div className="compare reveal">
          <div className="compare-col them">
            <h3>The feed apps</h3>
            {THEM.map((item) => (
              <div className="compare-item" key={item}>
                <Icon name="close" size={15} />
                {item}
              </div>
            ))}
          </div>
          <div className="compare-col us">
            <h3>Inasta</h3>
            {US.map((item) => (
              <div className="compare-item" key={item}>
                <Icon name="check" size={15} />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head reveal">
          <span className="eyebrow">How it works</span>
          <h2>Six decisions that change the feeling.</h2>
        </div>
        <div className="feature-grid reveal">
          {FEATURES.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <div className="feature-icon">
                <Icon name={feature.icon} size={20} />
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="cta reveal">
          <h2>Your people are already fewer than you think.</h2>
          <p>Make a circle, invite them by username, and post like it is 2009 again.</p>
          <button className="btn btn-primary btn-lg" onClick={() => open('signup')}>
            Create your account
          </button>
        </div>
      </section>

      <footer className="landing-footer">
        <span>© {new Date().getFullYear()} Inasta</span>
        <span>Private circles for people who stopped posting.</span>
      </footer>

      {authOpen && (
        <div className="overlay" onClick={() => setAuthOpen(false)} role="dialog" aria-modal="true">
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setAuthOpen(false)} aria-label="Close">
              <Icon name="close" size={17} />
            </button>
            <AuthPanel initialMode={mode} onLoginSuccess={onLoginSuccess} />
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingScreen;
