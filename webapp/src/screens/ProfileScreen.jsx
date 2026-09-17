import Icon from '../components/Icon';
import Avatar from '../components/Avatar';

/** WeChat's "Me" tab: profile header, then grouped setting rows. */
const MeScreen = ({ currentUser, posts, circles, onLogout, onOpenMoments, onOpenAdmin, onOpenCircles, onOpenPrivacy, onOpenStickers, onOpenScan, onOpenNotifications, unread }) => {
  const user = currentUser || {};
  const name = user.username || 'you';
  const myId = String(user._id || user.id || '');
  const mineCount = posts.filter(
    (post) => String(post.user?._id || post.user?.id || post.user || '') === myId
  ).length;

  const Row = ({ icon, color, title, value, last, onClick }) => (
    <button className={`wx-cell ${last ? '' : 'hair-b hair-inset'}`} onClick={onClick}>
      <span className="wx-cell-ico" style={{ background: color }}>
        <Icon name={icon} size={16} strokeWidth={1.9} />
      </span>
      <span className="wx-cell-body">
        <span className="wx-cell-title">{title}</span>
      </span>
      {value !== undefined && <span className="wx-cell-val">{value}</span>}
      <Icon name="chev" size={16} strokeWidth={2} className="wx-chev" />
    </button>
  );

  return (
    <>
      <div className="wx-me-head hair-b">
        <Avatar name={name} size="lg" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="wx-me-name">{name}</div>
          <div className="wx-me-id">
            Inasta ID: {user.email || name}
            {user.plan && user.plan !== 'free' && (
              <span style={{ color: '#07c160', marginLeft: 6, textTransform: 'uppercase', fontSize: 11 }}>
                {user.plan}
              </span>
            )}
          </div>
        </div>
        <button className="wx-qr" onClick={onOpenScan}>
          <Icon name="qr" size={17} />
          <Icon name="chev" size={15} strokeWidth={2} />
        </button>
      </div>

      <div className="wx-group">
        <Row icon="image" color="#07c160" title="Moments" value={mineCount} onClick={onOpenMoments} />
        <Row
          icon="group"
          color="#576b95"
          title="My Circles"
          value={circles.length}
          onClick={onOpenCircles}
          last
        />
      </div>

      {(user.role === 'admin' || user.role === 'moderator') && (
        <div className="wx-group">
          <Row
            icon="group"
            color="#fa5151"
            title="Admin Console"
            value={user.role}
            onClick={onOpenAdmin}
            last
          />
        </div>
      )}

      <div className="wx-group">
        <Row
          icon="heart"
          color="#fa5151"
          title="Notifications"
          value={unread ? String(unread) : ''}
          onClick={onOpenNotifications}
        />
        <Row icon="lock" color="#5a8fd6" title="Privacy" value={user.isPrivate ? 'Private' : 'Standard'} onClick={onOpenPrivacy} />
        <Row icon="smile" color="#fa9d3b" title="Stickers" onClick={onOpenStickers} last />
      </div>

      <button className="wx-logout" onClick={onLogout}>
        Log Out
      </button>

      <div style={{ height: 20 }} />
    </>
  );
};

export default MeScreen;
