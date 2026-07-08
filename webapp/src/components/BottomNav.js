const BottomNav = ({ currentScreen, setCurrentScreen }) => {
  const navItems = [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'search', icon: '🔍', label: 'Search' },
    { id: 'upload', icon: '➕', label: 'Create' },
    { id: 'chat', icon: '💬', label: 'Chat' },
    { id: 'profile', icon: '👤', label: 'Profile' }
  ];

  return (
    <div className="bottom-navigation">
      {navItems.map((item) => (
        <div
          key={item.id}
          className={`nav-button ${currentScreen === item.id ? 'active' : ''}`}
          onClick={() => setCurrentScreen(item.id)}
        >
          <span className="nav-icon">{item.icon}</span>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
};

export default BottomNav;
