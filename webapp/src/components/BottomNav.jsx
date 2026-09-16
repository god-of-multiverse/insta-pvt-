import Icon from './Icon';

export const NAV_ITEMS = [
  { id: 'home', icon: 'home', label: 'Feed' },
  { id: 'search', icon: 'circles', label: 'Circles' },
  { id: 'upload', icon: 'compose', label: 'Post', accent: true },
  { id: 'chat', icon: 'chat', label: 'Chat' },
  { id: 'profile', icon: 'user', label: 'You' },
];

const BottomNav = ({ currentScreen, setCurrentScreen }) => (
  <nav className="tabbar" aria-label="Primary">
    {NAV_ITEMS.map((item) => (
      <button
        key={item.id}
        className={`tab-btn ${currentScreen === item.id ? 'on' : ''} ${item.accent ? 'accent' : ''}`}
        onClick={() => setCurrentScreen(item.id)}
        aria-current={currentScreen === item.id ? 'page' : undefined}
      >
        <Icon name={item.icon} size={21} filled={currentScreen === item.id && item.id === 'home'} />
        {item.label}
      </button>
    ))}
  </nav>
);

export default BottomNav;
