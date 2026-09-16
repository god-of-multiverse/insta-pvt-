import { useEffect, useState } from 'react';
import { api } from '../services/api';
import Icon from '../components/Icon';
import { circleMeta } from '../lib/circles';
import { useToast } from '../components/Toast';

/**
 * Circles page — replaces the old "Search" tab.
 * There is deliberately no global people search in Inasta: you add someone by
 * exact username to a specific circle, and that is the only way in.
 */
const CirclesScreen = ({ localCircles, onAddCircle }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState('');
  const [member, setMember] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/groups');
      const list = response.groups || [];
      setGroups(list);
      if (!selected && list.length) setSelected(list[0]._id);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createCircle = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const response = await api.post('/api/groups', { name: name.trim() });
      const created = response.group;
      setGroups((prev) => [created, ...prev]);
      setSelected(created._id);
      onAddCircle?.(created.name);
      setName('');
      toast(`Circle “${created.name}” created`, 'success');
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const invite = async (event) => {
    event.preventDefault();
    if (!selected || !member.trim()) return;
    setBusy(true);
    try {
      const response = await api.post(`/api/groups/${selected}/members`, { username: member.trim() });
      setGroups((prev) => prev.map((g) => (g._id === selected ? response.group : g)));
      setMember('');
      toast(`${response.addedUser.username} joined the circle`, 'success');
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <h1>Circles</h1>
          <p className="sub">Small rooms with fixed membership. People in one never see another.</p>
        </div>
      </div>

      <div className="two-col">
        <div className="stack" style={{ gap: 16 }}>
          <form className="side-form" onSubmit={createCircle}>
            <span className="eyebrow">Start a circle</span>
            <input
              className="field"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Sunday Dinners"
            />
            <button className="btn btn-primary" type="submit" disabled={busy || !name.trim()}>
              {busy ? <span className="spinner" /> : 'Create circle'}
            </button>
          </form>

          <form className="side-form" onSubmit={invite}>
            <span className="eyebrow">Invite by username</span>
            <select
              className="field"
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
              aria-label="Choose a circle"
            >
              {groups.length === 0 ? (
                <option value="">No circles yet</option>
              ) : (
                groups.map((group) => (
                  <option key={group._id} value={group._id}>
                    {group.name}
                  </option>
                ))
              )}
            </select>
            <input
              className="field"
              value={member}
              onChange={(event) => setMember(event.target.value)}
              placeholder="exact username"
            />
            <button className="btn btn-ghost" type="submit" disabled={busy || !selected || !member.trim()}>
              <Icon name="plus" size={15} /> Add to circle
            </button>
            <p style={{ fontSize: 12.5, color: 'var(--text-mute)' }}>
              There is no people search. You need the exact username — that is the point.
            </p>
          </form>
        </div>

        <div>
          {loading ? (
            <div className="circle-grid">
              {[0, 1, 2].map((i) => (
                <div className="skeleton" key={i} style={{ height: 168 }} />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="empty">
              <h3>No circles yet</h3>
              <p>
                A circle is a fixed group of people. Create one for home, one for college, and post to
                each without the other ever knowing.
              </p>
            </div>
          ) : (
            <div className="circle-grid">
              {groups.map((group) => {
                const meta = circleMeta(group.name);
                const members = group.members || [];
                return (
                  <article className="circle-card" key={group._id}>
                    <div className="circle-card-top">
                      <div>
                        <h3>{group.name}</h3>
                        <span className="sub">
                          {members.length} {members.length === 1 ? 'member' : 'members'} · created by{' '}
                          {group.creator?.username || 'you'}
                        </span>
                      </div>
                      <span className="chip chip-solid" style={{ '--chip-color': meta.color }}>
                        <span className="dot" />
                        Private
                      </span>
                    </div>

                    <div className="member-row">
                      {members.length === 0 ? (
                        <span style={{ fontSize: 13, color: 'var(--text-mute)' }}>Just you so far.</span>
                      ) : (
                        members.map((m) => (
                          <span className="member-pill" key={m._id || m.username}>
                            <span className="avatar avatar-xs">
                              {(m.username || 'u')[0].toUpperCase()}
                            </span>
                            {m.username}
                          </span>
                        ))
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {localCircles?.length > 0 && (
            <div style={{ marginTop: 26 }}>
              <span className="eyebrow">Post labels in use</span>
              <div className="member-row" style={{ marginTop: 10 }}>
                {localCircles.map((circle) => {
                  const meta = circleMeta(circle);
                  return (
                    <span className="chip" key={circle} style={{ '--chip-color': meta.color }}>
                      <span className="dot" />
                      {circle}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CirclesScreen;
