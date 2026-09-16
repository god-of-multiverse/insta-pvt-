import Icon from './Icon';

/** WeChat's 4-tab bar: Chats, Contacts, Discover, Me. */
export const TABS = [
  { id: 'chat', icon: 'chats', label: 'Chats' },
  { id: 'contacts', icon: 'contacts', label: 'Contacts' },
  { id: 'discover', icon: 'discover', label: 'Discover' },
  { id: 'me', icon: 'me', label: 'Me' },
];

const BottomNav = ({ current, onChange, badges = {} }) => (
  <nav className="wx-tabbar" aria-label="Primary">
    {TABS.map((tab) => {
      const badge = badges[tab.id];
      return (
        <button
          key={tab.id}
          className={`wx-tab ${current === tab.id ? 'on' : ''}`}
          onClick={() => onChange(tab.id)}
          aria-current={current === tab.id ? 'page' : undefined}
        >
          <span className="ico">
            <Icon name={tab.icon} size={26} />
            {badge ? (
              <span className={`wx-badge ${badge === true ? 'dot' : ''}`}>
                {badge === true ? '' : badge}
              </span>
            ) : null}
          </span>
          {tab.label}
        </button>
      );
    })}
  </nav>
);

export default BottomNav;
