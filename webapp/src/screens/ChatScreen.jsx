import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api';
import Icon from '../components/Icon';
import { clockTime, relativeTime } from '../lib/time';
import { useToast } from '../components/Toast';

const POLL_MS = 4000;

const ChatScreen = ({ currentUser }) => {
  const [people, setPeople] = useState([]);
  const [groups, setGroups] = useState([]);
  const [active, setActive] = useState(null); // { kind: 'dm' | 'group', item }
  const [messages, setMessages] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingLog, setLoadingLog] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [query, setQuery] = useState('');

  const bottomRef = useRef(null);
  const pollRef = useRef(null);
  const toast = useToast();

  const myId = String(currentUser?._id || currentUser?.id || '');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [users, groupResponse] = await Promise.all([
          api.get('/api/messages/users'),
          api.get('/api/groups'),
        ]);
        if (cancelled) return;
        setPeople(users || []);
        setGroups(groupResponse.groups || []);
      } catch (error) {
        if (!cancelled) toast(error.message, 'error');
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const endpointFor = useCallback(
    (conversation) =>
      conversation.kind === 'group'
        ? `/api/group-messages/${conversation.item._id}`
        : `/api/messages/${conversation.item._id}`,
    []
  );

  const fetchMessages = useCallback(
    async (conversation, { quiet = false } = {}) => {
      if (!quiet) setLoadingLog(true);
      try {
        const data = await api.get(endpointFor(conversation));
        setMessages((prev) => {
          const next = data || [];
          if (quiet && prev.length === next.length) return prev;
          return next;
        });
      } catch (error) {
        if (!quiet) toast(error.message, 'error');
      } finally {
        if (!quiet) setLoadingLog(false);
      }
    },
    [endpointFor, toast]
  );

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!active) {
      setMessages([]);
      return undefined;
    }
    setMessages([]);
    fetchMessages(active);
    pollRef.current = setInterval(() => fetchMessages(active, { quiet: true }), POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [active, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const send = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !active || sending) return;

    setSending(true);
    try {
      const response =
        active.kind === 'group'
          ? await api.post('/api/group-messages', { groupId: active.item._id, text })
          : await api.post('/api/messages', { recipientId: active.item._id, text });
      setMessages((prev) => [...prev, response]);
      setDraft('');
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setSending(false);
    }
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const match = (value) => !needle || value.toLowerCase().includes(needle);
    return {
      groups: groups.filter((g) => match(g.name || '')),
      people: people.filter((p) => match(p.username || '')),
    };
  }, [groups, people, query]);

  const title = active ? (active.kind === 'group' ? active.item.name : active.item.username) : '';
  const isEmpty = !loadingList && filtered.groups.length === 0 && filtered.people.length === 0;

  return (
    <div className="page" style={{ maxWidth: 'none' }}>
      <div className="topbar">
        <div>
          <h1>Messages</h1>
          <p className="sub">No read receipts, no typing indicators, no pressure to reply instantly.</p>
        </div>
      </div>

      <div className="chat">
        <div className={`chat-list ${active ? 'hide-sm' : ''}`}>
          <div className="chat-search">
            <input
              className="field"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find a person or circle"
              aria-label="Filter conversations"
            />
          </div>

          <div className="chat-scroll">
            {loadingList ? (
              <div className="stack" style={{ padding: 10 }}>
                {[0, 1, 2, 3].map((i) => (
                  <div className="skeleton" key={i} style={{ height: 54 }} />
                ))}
              </div>
            ) : isEmpty ? (
              <p style={{ padding: '30px 14px', color: 'var(--text-mute)', fontSize: 13.5, textAlign: 'center' }}>
                Nobody here yet. Add people to a circle first.
              </p>
            ) : (
              <>
                {filtered.groups.length > 0 && <div className="chat-group-label">Circles</div>}
                {filtered.groups.map((group) => (
                  <button
                    key={group._id}
                    className={`chat-item ${active?.kind === 'group' && active.item._id === group._id ? 'on' : ''}`}
                    onClick={() => setActive({ kind: 'group', item: group })}
                  >
                    <span className="avatar avatar-sm">
                      <Icon name="users" size={15} />
                    </span>
                    <span className="who">
                      <span className="name">{group.name}</span>
                      <span className="snippet">
                        {(group.members || []).length} members
                      </span>
                    </span>
                  </button>
                ))}

                {filtered.people.length > 0 && <div className="chat-group-label">Direct</div>}
                {filtered.people.map((person) => (
                  <button
                    key={person._id}
                    className={`chat-item ${active?.kind === 'dm' && active.item._id === person._id ? 'on' : ''}`}
                    onClick={() => setActive({ kind: 'dm', item: person })}
                  >
                    <span className="avatar avatar-sm">{(person.username || 'u')[0].toUpperCase()}</span>
                    <span className="who">
                      <span className="name">{person.username}</span>
                      <span className="snippet">{person.bio || 'Tap to write'}</span>
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        <div className={`chat-pane ${!active ? 'hide-sm' : ''}`}>
          {!active ? (
            <div className="chat-blank">
              <Icon name="chat" size={30} />
              <h3>Pick a conversation</h3>
              <p style={{ maxWidth: 320, fontSize: 13.5 }}>
                Messages are only ever between you and the people in that circle. Nothing is indexed,
                suggested, or surfaced anywhere else.
              </p>
            </div>
          ) : (
            <>
              <div className="chat-head">
                <button className="icon-btn chat-back" onClick={() => setActive(null)} aria-label="Back">
                  <Icon name="arrowLeft" size={18} />
                </button>
                <span className="avatar avatar-sm">
                  {active.kind === 'group' ? <Icon name="users" size={15} /> : title[0].toUpperCase()}
                </span>
                <div>
                  <div className="title">{title}</div>
                  <div className="status">
                    {active.kind === 'group'
                      ? `${(active.item.members || []).length} members in this circle`
                      : 'Direct message'}
                  </div>
                </div>
              </div>

              <div className="chat-log">
                {loadingLog ? (
                  <div style={{ margin: 'auto' }} className="spinner" />
                ) : messages.length === 0 ? (
                  <div className="chat-blank">
                    <h3>Nothing said yet</h3>
                    <p style={{ fontSize: 13.5 }}>Start it off — {title} will see it next time they look.</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const senderId = String(message.sender?._id || message.sender || '');
                    const mine = senderId === myId;
                    return (
                      <div className={`bubble-row ${mine ? 'me' : ''}`} key={message._id}>
                        <div className={`bubble ${mine ? 'me' : 'them'}`}>
                          {active.kind === 'group' && !mine && (
                            <div style={{ fontSize: 11.5, fontWeight: 700, opacity: 0.75, marginBottom: 3 }}>
                              {message.sender?.username || 'someone'}
                            </div>
                          )}
                          {message.text}
                          <div className="bubble-time">
                            {message.createdAt ? clockTime(message.createdAt) : relativeTime()}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <form className="chat-compose" onSubmit={send}>
                <input
                  className="field"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={`Message ${title}…`}
                  aria-label="Message text"
                />
                <button className="send-btn" type="submit" disabled={!draft.trim() || sending}>
                  {sending ? <span className="spinner" /> : <Icon name="send" size={18} />}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatScreen;
