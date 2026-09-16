import Icon from './Icon';
import { avatarColor, initialOf } from '../lib/avatar';

/**
 * WeChat's rounded-square avatar (never a circle).
 * Groups get a neutral tile with the people glyph instead of an initial.
 */
const Avatar = ({ name, size = 'md', group = false, style, className = '' }) => {
  const sizeClass = { xs: 'wx-av-xs', sm: 'wx-av-sm', md: '', lg: 'wx-av-lg' }[size] || '';
  const glyph = { xs: 14, sm: 20, md: 25, lg: 34 }[size] || 25;

  return (
    <div
      className={`wx-av ${sizeClass} ${group ? 'wx-av-group' : ''} ${className}`}
      style={{ background: group ? undefined : avatarColor(name), ...style }}
    >
      {group ? <Icon name="group" size={glyph} /> : initialOf(name)}
    </div>
  );
};

export default Avatar;
