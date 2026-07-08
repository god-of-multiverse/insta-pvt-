import { useEffect, useState } from 'react';
import { api } from '../services/api';

const SearchScreen = () => {
  const [groupName, setGroupName] = useState('');
  const [memberUsername, setMemberUsername] = useState('');
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const loadGroups = async () => {
    try {
      const response = await api.get('/api/groups');
      setGroups(response.groups || []);
      if (!selectedGroupId && (response.groups || []).length > 0) {
        setSelectedGroupId(response.groups[0]._id);
      }
    } catch (error) {
      console.error('Error loading groups', error.message);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleCreateGroup = async (event) => {
    event.preventDefault();
    if (!groupName.trim()) return;

    setLoading(true);
    try {
      const response = await api.post('/api/groups', { name: groupName.trim() });
      const newGroup = response.group;
      setGroups((prev) => [newGroup, ...prev]);
      setSelectedGroupId(newGroup._id);
      setGroupName('');
      setMessage(`Group "${newGroup.name}" created.`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (event) => {
    event.preventDefault();
    if (!selectedGroupId || !memberUsername.trim()) return;

    setLoading(true);
    try {
      const response = await api.post(`/api/groups/${selectedGroupId}/members`, { username: memberUsername.trim() });
      setGroups((prev) => prev.map((group) => (group._id === selectedGroupId ? response.group : group)));
      setMemberUsername('');
      setMessage(`Added ${response.addedUser.username} to the group.`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen-container">
      <h2 className="screen-title">Groups</h2>

      <form className="group-form" onSubmit={handleCreateGroup}>
        <input
          className="search-bar"
          type="text"
          placeholder="Create a new group"
          value={groupName}
          onChange={(event) => setGroupName(event.target.value)}
        />
        <button className="group-action-btn" type="submit" disabled={loading}>
          {loading ? 'Working...' : 'Create group'}
        </button>
      </form>

      <form className="group-form" onSubmit={handleAddMember}>
        <select
          className="group-select"
          value={selectedGroupId}
          onChange={(event) => setSelectedGroupId(event.target.value)}
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
          className="search-bar"
          type="text"
          placeholder="Add a username"
          value={memberUsername}
          onChange={(event) => setMemberUsername(event.target.value)}
        />
        <button className="group-action-btn" type="submit" disabled={loading || !selectedGroupId}>
          Add user
        </button>
      </form>

      {message && <div className="alert-message">{message}</div>}

      <div className="group-list">
        {groups.length === 0 ? (
          <div className="empty-state">
            <p className="empty-title">No groups yet</p>
            <p className="empty-subtitle">Create your first group and invite people into it.</p>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group._id} className="group-card">
              <div className="group-card-title">{group.name}</div>
              <div className="group-card-subtitle">Created by {group.creator?.username || 'you'}</div>
              <div className="group-members">
                {(group.members || []).map((member) => (
                  <span key={member._id} className="group-member-pill">{member.username}</span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SearchScreen;
