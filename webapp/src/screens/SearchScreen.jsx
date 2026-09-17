import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import Icon from '../components/Icon';
import Avatar from '../components/Avatar';
import { useToast } from '../components/Toast';

/**
 * Contacts tab. WeChat's layout: a search field, a block of function rows
 * (New Friends / Group Chats / Tags), then contacts grouped under letter
 * headings with an alphabetical feel.
 */
const ContactsScreen = ({ onAddCircle, currentUser, onOpenChat }) => {
  const [groups, setGroups] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [sheet, setSheet] = useState(null); // 'group' | 'member'
  const [name, setName] = useState('');
  const [selected, setSelected] = useState('');
  const [member, setMember] = useState('');
  const [busy, setBusy] = useState(false);
  const [following, setFollowing] = useState(() => new Set());
  const [blocked, setBlocked] = useState(() => new Set());
  const toast = useToast();

  useEffect(() => {
    (async () => {
      try {
        const [groupResponse, users] = await Promise.all([
          api.get('/api/groups'),
          api.get('/api/messages/users'),
        ]);
        const list = groupResponse.groups || [];
        setGroups(list);
        setPeople(users || []);
        setFollowing(
          new Set((users || []).filter((u) => u.isFollowing).map((u) => String(u._id)))
        );
        setBlocked(new Set((users || []).filter((u) => u.isBlocked).map((u) => String(u._id))));
        if (list.length) setSelected(list[0]._id);
      } catch (error) {
        toast(error.message);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createGroup = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const response = await api.post('/api/groups', { name: name.trim() });
      setGroups((prev) => [response.group, ...prev]);
      setSelected(response.group._id);
      onAddCircle?.(response.group.name);
      setName('');
      setSheet(null);
      toast('Group created');
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  };

  const addMember = async (event) => {
    event.preventDefault();
    if (!selected || !member.trim()) return;
    setBusy(true);
    try {
      const response = await api.post(`/api/groups/${selected}/members`, {
        username: member.trim(),
      });
      setGroups((prev) => prev.map((g) => (g._id === selected ? response.group : g)));
      setMember('');
      setSheet(null);
      toast(`${response.addedUser.username} added`);
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleFollow = async (person) => {
    const id = String(person._id);
    const next = new Set(following);
    // optimistic
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFollowing(next);
    try {
      const r = await api.post(`/api/users/${id}/follow`, {});
      setFollowing((prev) => {
        const copy = new Set(prev);
        if (r.following) copy.add(id);
        else copy.delete(id);
        return copy;
      });
    } catch (error) {
      setFollowing(following);
      toast(error.message);
    }
  };

  const toggleBlock = async (person) => {
    const id = String(person._id);
    try {
      const r = await api.post(`/api/users/${id}/block`, {});
      setBlocked((prev) => {
        const copy = new Set(prev);
        if (r.blocked) copy.add(id);
        else copy.delete(id);
        return copy;
      });
      toast(r.blocked ? `${person.username} blocked` : `${person.username} unblocked`);
    } catch (error) {
      toast(error.message);
    }
  };

  const sections = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = people.filter((p) => !needle || (p.username || '').toLowerCase().includes(needle));
    const map = new Map();
    filtered
      .slice()
      .sort((a, b) => (a.username || '').localeCompare(b.username || ''))
      .forEach((person) => {
        const letter = (person.username || '#')[0].toUpperCase();
        if (!map.has(letter)) map.set(letter, []);
        map.get(letter).push(person);
      });
    return [...map.entries()];
  }, [people, query]);

  return (
    <>
      <div className="wx-searchwrap">
        <div className="wx-search">
          <Icon name="search" size={15} strokeWidth={2} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            aria-label="Search contacts"
          />
        </div>
      </div>

      <div className="wx-group">
        <button className="wx-cell hair-b hair-inset" onClick={() => setSheet('member')}>
          <span className="wx-cell-ico" style={{ background: '#fa9d3b' }}>
            <Icon name="plus" size={17} strokeWidth={2.2} />
          </span>
          <span className="wx-cell-body">
            <span className="wx-cell-title">New Friends</span>
          </span>
          <Icon name="chev" size={16} strokeWidth={2} className="wx-chev" />
        </button>
        <button className="wx-cell" onClick={() => setSheet('group')}>
          <span className="wx-cell-ico" style={{ background: '#07c160' }}>
            <Icon name="group" size={17} />
          </span>
          <span className="wx-cell-body">
            <span className="wx-cell-title">Group Chats</span>
          </span>
          <span className="wx-cell-val">{groups.length}</span>
          <Icon name="chev" size={16} strokeWidth={2} className="wx-chev" />
        </button>
      </div>

      {groups.length > 0 && (
        <>
          <div className="wx-section-label">Groups</div>
          <div className="wx-group" style={{ marginTop: 0 }}>
            {groups.map((group, index) => (
              <button
                key={group._id}
                className={`wx-cell ${index < groups.length - 1 ? 'hair-b hair-inset' : ''}`}
                onClick={() => onOpenChat?.({ kind: 'group', id: group._id })}
              >
                <Avatar name={group.name} group />
                <span className="wx-cell-body">
                  <span className="wx-cell-title">{group.name}</span>
                  <span className="wx-cell-sub">
                    {(group.members || []).map((m) => m.username).join(', ') || 'Only you'}
                  </span>
                </span>
                <Icon name="chev" size={16} strokeWidth={2} className="wx-chev" />
              </button>
            ))}
          </div>
        </>
      )}

      {loading ? (
        <div className="wx-loading">
          <div className="wx-spin" />
        </div>
      ) : (
        sections.map(([letter, list]) => (
          <div key={letter}>
            <div className="wx-section-label">{letter}</div>
            <div className="wx-group" style={{ marginTop: 0 }}>
              {list.map((person, index) => (
                <div
                  key={person._id}
                  className={`wx-cell ${index < list.length - 1 ? 'hair-b hair-inset' : ''}`}
                >
                  <Avatar name={person.username} />
                  <span className="wx-cell-body">
                    <span className="wx-cell-title">
                      {person.username}
                      {person.isVerified && (
                        <span style={{ color: '#07c160', fontSize: 12, marginLeft: 5 }}>✓</span>
                      )}
                    </span>
                    {blocked.has(String(person._id)) && (
                      <span className="wx-cell-sub" style={{ color: '#fa5151' }}>Blocked</span>
                    )}
                  </span>
                  <button
                    className={`wx-aud-chip ${following.has(String(person._id)) ? 'on' : ''}`}
                    onClick={() => toggleFollow(person)}
                  >
                    {following.has(String(person._id)) ? 'Following' : 'Follow'}
                  </button>
                  <button
                    onClick={() => toggleBlock(person)}
                    style={{ marginLeft: 8, color: '#b2b2b2' }}
                    aria-label="Block"
                  >
                    <Icon name="more" size={16} strokeWidth={2.4} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <div style={{ height: 20 }} />

      {/* Action sheets */}
      {sheet && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'rgba(0,0,0,0.4)',
            display: 'grid',
            placeItems: 'center',
            padding: 30,
          }}
          onClick={() => setSheet(null)}
        >
          <form
            onClick={(event) => event.stopPropagation()}
            onSubmit={sheet === 'group' ? createGroup : addMember}
            style={{
              width: '100%',
              maxWidth: 300,
              background: '#fff',
              borderRadius: 10,
              padding: 20,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 14 }}>
              {sheet === 'group' ? 'New Group Chat' : 'Add Friend'}
            </div>

            {sheet === 'group' ? (
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Group name"
                style={{
                  width: '100%',
                  padding: 9,
                  border: '1px solid #e0e0e0',
                  borderRadius: 4,
                  fontSize: 15,
                  outline: 'none',
                }}
              />
            ) : (
              <>
                <select
                  value={selected}
                  onChange={(event) => setSelected(event.target.value)}
                  style={{
                    width: '100%',
                    padding: 9,
                    border: '1px solid #e0e0e0',
                    borderRadius: 4,
                    fontSize: 15,
                    marginBottom: 8,
                    background: '#fff',
                  }}
                >
                  {groups.length === 0 ? (
                    <option value="">No groups yet</option>
                  ) : (
                    groups.map((group) => (
                      <option key={group._id} value={group._id}>
                        {group.name}
                      </option>
                    ))
                  )}
                </select>
                <input
                  autoFocus
                  value={member}
                  onChange={(event) => setMember(event.target.value)}
                  placeholder="WeChat ID / username"
                  style={{
                    width: '100%',
                    padding: 9,
                    border: '1px solid #e0e0e0',
                    borderRadius: 4,
                    fontSize: 15,
                    outline: 'none',
                  }}
                />
              </>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setSheet(null)}
                style={{
                  flex: 1,
                  padding: 9,
                  borderRadius: 4,
                  background: '#f2f2f2',
                  fontSize: 15,
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                style={{
                  flex: 1,
                  padding: 9,
                  borderRadius: 4,
                  background: '#07c160',
                  color: '#fff',
                  fontSize: 15,
                }}
              >
                OK
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default ContactsScreen;
