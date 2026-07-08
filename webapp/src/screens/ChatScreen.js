import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

const ChatScreen = ({ currentUser }) => {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [activeUser, setActiveUser] = useState(null);
  const [activeGroup, setActiveGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessageText, setNewMessageText] = useState('');
  const [sending, setSending] = useState(false);
  
  // Ref for messages scroll container
  const chatBottomRef = useRef(null);
  const pollingRef = useRef(null);

  // Fetch active users list on load
  useEffect(() => {
    loadUsers();
    loadGroups();
    return () => {
      // Clear polling on unmount
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Set up message fetching and polling when active user changes
  useEffect(() => {
    if (activeUser) {
      setActiveGroup(null);
      loadMessages(activeUser._id);

      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(() => {
        pollMessages(activeUser._id);
      }, 3000);
    } else if (activeGroup) {
      setMessages([]);
      loadGroupMessages(activeGroup._id);

      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(() => {
        pollGroupMessages(activeGroup._id);
      }, 3000);
    } else {
      setMessages([]);
      if (pollingRef.current) clearInterval(pollingRef.current);
    }
  }, [activeUser, activeGroup]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await api.get('/api/messages/users');
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadGroups = async () => {
    setLoadingGroups(true);
    try {
      const response = await api.get('/api/groups');
      setGroups(response.groups || []);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoadingGroups(false);
    }
  };

  const loadMessages = async (friendId) => {
    setLoadingMessages(true);
    try {
      const data = await api.get(`/api/messages/${friendId}`);
      setMessages(data);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const pollMessages = async (friendId) => {
    try {
      const data = await api.get(`/api/messages/${friendId}`);
      if (data.length !== messages.length) {
        setMessages(data);
      }
    } catch (error) {
      console.error('Error polling messages:', error);
    }
  };

  const loadGroupMessages = async (groupId) => {
    setLoadingMessages(true);
    try {
      const data = await api.get(`/api/group-messages/${groupId}`);
      setMessages(data);
    } catch (error) {
      console.error('Error loading group messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const pollGroupMessages = async (groupId) => {
    try {
      const data = await api.get(`/api/group-messages/${groupId}`);
      if (data.length !== messages.length) {
        setMessages(data);
      }
    } catch (error) {
      console.error('Error polling group messages:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessageText.trim() || (!activeUser && !activeGroup) || sending) return;

    setSending(true);
    try {
      if (activeGroup) {
        const response = await api.post('/api/group-messages', {
          groupId: activeGroup._id,
          text: newMessageText.trim()
        });
        setMessages((prev) => [...prev, response]);
      } else if (activeUser) {
        const payload = {
          recipientId: activeUser._id,
          text: newMessageText.trim()
        };
        const response = await api.post('/api/messages', payload);
        setMessages((prev) => [...prev, response]);
      }
      setNewMessageText('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chat-layout-wrapper screen-container">
      <div className="chat-layout glass-panel">
        
        {/* Left Side: Users list */}
        <div className={`chat-sidebar ${activeUser ? 'hide-mobile' : ''}`}>
          <div className="chat-sidebar-header">
            <h3>Messages</h3>
          </div>
          {loadingUsers || loadingGroups ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#8f9cae' }}>
              <div className="spinner"></div>
            </div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748b' }}>
              No friends found to chat with yet.
            </div>
          ) : (
            <div className="chat-users-list">
              {groups.length > 0 && (
                <div className="chat-section-title">Groups</div>
              )}
              {groups.map((group) => {
                const isActive = activeGroup && activeGroup._id === group._id;
                return (
                  <button
                    key={group._id}
                    onClick={() => {
                      setActiveGroup(group);
                      setActiveUser(null);
                    }}
                    className={`chat-user-item ${isActive ? 'active' : ''}`}
                  >
                    <div className="chat-user-avatar">#</div>
                    <div className="chat-user-info">
                      <div className="chat-user-name">{group.name}</div>
                      <div className="chat-user-subtext">Group chat</div>
                    </div>
                  </button>
                );
              })}
              {users.length > 0 && (
                <div className="chat-section-title">Direct</div>
              )}
              {users.map((user) => {
                const initial = user.username ? user.username[0].toUpperCase() : 'U';
                const isActive = activeUser && activeUser._id === user._id;
                return (
                  <button
                    key={user._id}
                    onClick={() => {
                      setActiveUser(user);
                      setActiveGroup(null);
                    }}
                    className={`chat-user-item ${isActive ? 'active' : ''}`}
                  >
                    <div className="chat-user-avatar">{initial}</div>
                    <div className="chat-user-info">
                      <div className="chat-user-name">{user.username}</div>
                      <div className="chat-user-subtext">Click to message</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Message conversation area */}
        <div className={`chat-conversation-area ${!activeUser && !activeGroup ? 'hide-mobile' : ''}`}>
          {activeUser || activeGroup ? (
            <div className="chat-active-container">
              {/* Header */}
              <div className="chat-active-header">
                <button
                  className="chat-back-btn show-mobile"
                  onClick={() => {
                    setActiveUser(null);
                    setActiveGroup(null);
                  }}
                >
                  ←
                </button>
                <div className="chat-active-avatar">
                  {activeGroup ? '#' : activeUser.username[0].toUpperCase()}
                </div>
                <div className="chat-active-details">
                  <h4>{activeGroup ? activeGroup.name : activeUser.username}</h4>
                  <span className="online-indicator">{activeGroup ? 'group chat' : 'active now'}</span>
                </div>
              </div>

              {/* Message log */}
              <div className="chat-messages-log">
                {loadingMessages ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div className="spinner"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="chat-empty">
                    <p style={{ fontSize: 24, marginBottom: 8 }}>💬</p>
                    <p>{activeGroup ? `Start chatting in ${activeGroup.name}!` : `Start chatting with ${activeUser.username}!`}</p>
                    <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                      {activeGroup ? 'Share updates with everyone in this group.' : 'Messages are securely isolated to your private connection.'}
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isSender = msg.sender === currentUser.id || msg.sender?._id === currentUser.id;
                    return (
                      <div
                        key={msg._id}
                        className={`message-bubble-wrapper ${isSender ? 'sent' : 'received'}`}
                      >
                        <div className={`message-bubble ${isSender ? 'sent' : 'received'}`}>
                          {msg.text}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Text input form */}
              <form onSubmit={handleSendMessage} className="chat-input-form">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  className="chat-input-box"
                />
                <button
                  type="submit"
                  disabled={!newMessageText.trim() || sending}
                  className="chat-send-btn"
                >
                  Send
                </button>
              </form>
            </div>
          ) : (
            <div className="chat-active-fallback">
              <span style={{ fontSize: 48, marginBottom: 12 }}>💬</span>
              <h3>No Conversation Selected</h3>
              <p>Select a group or a friend from the left panel to start messaging immediately.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ChatScreen;
