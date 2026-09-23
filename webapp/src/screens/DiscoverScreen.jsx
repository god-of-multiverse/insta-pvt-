import Icon from '../components/Icon';

/**
 * Discover tab — WeChat's grouped-list hub. Moments sits alone at the top,
 * which is how you reach the feed in the real app.
 */
const DiscoverScreen = ({ onOpenMoments, momentsBadge, onOpenNotifications, onOpenSaved, onOpenScan, onOpenStickers, unread, onOpenAssistant }) => {
  const Row = ({ icon, color, title, last, badge, onClick }) => (
    <button className={`wx-cell ${last ? '' : 'hair-b hair-inset'}`} onClick={onClick}>
      <span className="wx-cell-ico" style={{ background: color }}>
        <Icon name={icon} size={16} strokeWidth={1.9} />
      </span>
      <span className="wx-cell-body">
        <span className="wx-cell-title">{title}</span>
      </span>
      {badge ? <span className="wx-badge" style={{ position: 'static', border: 'none' }}>{badge}</span> : null}
      <Icon name="chev" size={16} strokeWidth={2} className="wx-chev" />
    </button>
  );

  return (
    <>
      <div className="wx-group">
        <Row
          icon="image"
          color="#07c160"
          title="Moments"
          badge={momentsBadge}
          onClick={onOpenMoments}
          last
        />
      </div>

      <div className="wx-group">
        <Row
          icon="heart"
          color="#fa5151"
          title="Notifications"
          badge={unread || null}
          onClick={onOpenNotifications}
        />
        <Row icon="star" color="#fa9d3b" title="Saved" onClick={onOpenSaved} last />
      </div>

      <div className="wx-group">
        <Row icon="chats" color="#07c160" title="Assistant" onClick={onOpenAssistant} />
        <Row icon="qr" color="#2782d7" title="Scan" onClick={onOpenScan} />
        <Row icon="smile" color="#fa9d3b" title="Stickers" onClick={onOpenStickers} last />
      </div>

      <div style={{ height: 20 }} />
    </>
  );
};

export default DiscoverScreen;
