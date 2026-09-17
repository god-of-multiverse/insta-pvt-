import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api';
import Icon from '../components/Icon';
import Avatar from '../components/Avatar';
import { chatListTime, messageStamp, shouldStamp } from '../lib/time';
import { useToast } from '../components/Toast';

const POLL_MS = 4000;

/**
 * Chats tab. Two states in one screen, exactly like the phone app:
 *  - list of conversations (search bar pinned at the top)
 *  - a conversation, which replaces the list and gets a back chevron
 */
const ChatScreen = ({ currentUser, onOpenChange, initialChat, onInitialChatUsed }) => {
  const [people, setPeople] = useState([]);
  const [groups, setGroups] = useState([]);
  const [active, setActive] = useState(null);
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
    onOpenChange?.(Boolean(active));
  }, [active, onOpenChange]);

  // Contacts can ask us to open a specific conversation. Wait until the lists
  // are loaded so we can resolve the id to a real person or group.
  useEffect(() => {
    if (!initialChat || loadingList) return;
    const pool = initialChat.kind === 'group' ? groups : people;
    const item = pool.find((entry) => String(entry._id) === String(initialChat.id));
    if (item) setActive({ kind: initialChat.kind, item });
    onInitialChatUsed?.();
  }, [initialChat, loadingList, groups, people, onInitialChatUsed]);

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
        if (!cancelled) toast(error.message);
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
        if (!quiet) toast(error.message);
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
    bottomRef.current?.scrollIntoView({ block: 'end' });
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
      toast(error.message);
    } finally {
      setSending(false);
    }
  };

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const match = (value) => !needle || value.toLowerCase().includes(needle);
    return [
      ...groups
        .filter((g) => match(g.name || ''))
        .map((g) => ({
          kind: 'group',
          item: g,
          key: `g-${g._id}`,
          name: g.name,
          preview: `${(g.members || []).length} members`,
          time: g.createdAt,
        })),
      ...people
        .filter((p) => match(p.username || ''))
        .map((p) => ({
          kind: 'dm',
          item: p,
          key: `u-${p._id}`,
          name: p.username,
          preview: p.bio || 'Tap to chat',
          time: null,
        })),
    ];
  }, [groups, people, query]);

  /* ---------------------------------------------------------------- list */
  if (!active) {
    return (
      <>
        <div className="wx-searchwrap">
          <div className="wx-search">
            <Icon name="search" size={15} strokeWidth={2} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              aria-label="Search chats"
            />
          </div>
        </div>

        {loadingList ? (
          <div className="wx-loading">
            <div className="wx-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="wx-empty">No chats yet.</div>
        ) : (
          rows.map((row) => (
            <button
              key={row.key}
              className="wx-chatrow hair-b hair-inset"
              onClick={() => setActive({ kind: row.kind, item: row.item })}
            >
              <Avatar name={row.name} group={row.kind === 'group'} />
              <div className="wx-chatrow-body">
                <div className="wx-chatrow-top">
                  <span className="wx-chatrow-name">{row.name}</span>
                  {row.time && <span className="wx-chatrow-time">{chatListTime(row.time)}</span>}
                </div>
                <div className="wx-chatrow-msg">{row.preview}</div>
              </div>
            </button>
          ))
        )}
      </>
    );
  }

  /* -------------------------------------------------------- conversation */
  const title = active.kind === 'group' ? active.item.name : active.item.username;

  return (
    <div className="wx-convo">
      <div className="wx-nav hair-b" style={{ position: 'static' }}>
        <button className="wx-nav-btn left" onClick={() => setActive(null)} aria-label="Back">
          <Icon name="back" size={22} strokeWidth={2} />
        </button>
        <div className="wx-nav-title">
          {title}
          {active.kind === 'group' && ` (${(active.item.members || []).length})`}
        </div>
        <button className="wx-nav-btn right" aria-label="Chat info">
          <Icon name="more" size={20} strokeWidth={2.4} />
        </button>
      </div>

      <div className="wx-log">
        {loadingLog ? (
          <div className="wx-loading">
            <div className="wx-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="wx-empty" style={{ padding: '50px 20px' }}>
            No messages yet.
          </div>
        ) : (
          messages.map((message, index) => {
            const senderId = String(message.sender?._id || message.sender || '');
            const mine = senderId === myId;
            const senderName = mine
              ? currentUser?.username || 'you'
              : message.sender?.username || title;
            const stamp = shouldStamp(message.createdAt, messages[index - 1]?.createdAt);

            return (
              <div key={message._id}>
                {stamp && (
                  <div className="wx-timestamp">
                    <span>{messageStamp(message.createdAt)}</span>
                  </div>
                )}
                <div className={`wx-msg ${mine ? 'me' : ''}`}>
                  <Avatar name={senderName} size="sm" />
                  <div className="wx-msg-col">
                    {active.kind === 'group' && !mine && (
                      <div className="wx-msg-sender">{senderName}</div>
                    )}
                    <div className={`wx-bubble ${mine ? 'me' : 'them'}`}>{message.text}</div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form className="wx-composer" onSubmit={send}>
        <button type="button" className="wx-composer-ico" aria-label="Voice message">
          <Icon name="voice" size={22} />
        </button>
        <textarea
          className="wx-composer-input"
          rows={1}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              send(event);
            }
          }}
          aria-label="Message"
        />
        <button type="button" className="wx-composer-ico" aria-label="Emoji">
          <Icon name="smile" size={22} />
        </button>
        {draft.trim() ? (
          <button className="wx-send" type="submit" disabled={sending}>
            Send
          </button>
        ) : (
          <button type="button" className="wx-composer-ico" aria-label="More">
            <Icon name="plus" size={22} strokeWidth={1.8} />
          </button>
        )}
      </form>
    </div>
  );
};

export default ChatScreen;
