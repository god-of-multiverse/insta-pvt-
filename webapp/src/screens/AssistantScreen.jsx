import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import Icon from '../components/Icon';
import Avatar from '../components/Avatar';
import { useToast } from '../components/Toast';

/**
 * The in-app assistant.
 *
 * Built out of the existing chat classes (wx-log, wx-msg, wx-bubble,
 * wx-composer) so it reads as another conversation rather than a new surface
 * bolted onto the app.
 *
 * The part that matters is under each answer: thumbs up and down. Up
 * reinforces the route that produced the answer, down weakens it and opens a
 * box to type the correct answer, which the agent then knows for everyone.
 */

const STARTERS = [
  'What is this app?',
  'How do circles work?',
  'How do I post a photo?',
  'What happens to my stories?',
];

const AssistantScreen = ({ onBack, currentUser }) => {
  const [turns, setTurns] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [teaching, setTeaching] = useState(null); // turn id being corrected
  const [lesson, setLesson] = useState('');

  const bottomRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      try {
        setTurns(await api.get('/api/assistant/history'));
      } catch (error) {
        toast(error.message);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Guarded: scrollIntoView is missing in some embedded webviews, and an
    // exception here would take the whole conversation down with it.
    const node = bottomRef.current;
    if (node && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ block: 'end', behavior: 'smooth' });
    }
  }, [turns, teaching]);

  const ask = async (question) => {
    const text = String(question || '').trim();
    if (!text || sending) return;
    setSending(true);
    setDraft('');
    try {
      const turn = await api.post('/api/assistant/ask', { question: text });
      setTurns((prev) => [...prev, turn]);
    } catch (error) {
      toast(error.message);
    } finally {
      setSending(false);
    }
  };

  const rate = async (turn, helpful) => {
    if (!helpful) {
      setTeaching(turn._id);
      setLesson('');
      return;
    }
    // Optimistic: the tick should land immediately.
    setTurns((prev) => prev.map((t) => (t._id === turn._id ? { ...t, rated: 'up' } : t)));
    try {
      await api.post('/api/assistant/feedback', { turnId: turn._id, helpful: true });
      toast('Thanks — I will remember that worked.');
    } catch (error) {
      setTurns((prev) => prev.map((t) => (t._id === turn._id ? { ...t, rated: null } : t)));
      toast(error.message);
    }
  };

  const teach = async (turn) => {
    const correction = lesson.trim();
    try {
      const result = await api.post('/api/assistant/feedback', {
        turnId: turn._id,
        helpful: false,
        correction,
      });
      setTurns((prev) => prev.map((t) => (t._id === turn._id ? { ...t, rated: 'down' } : t)));
      setTeaching(null);
      setLesson('');
      toast(result.taught ? 'Learned it. Ask me again.' : 'Noted — I will stop giving that answer.');
    } catch (error) {
      toast(error.message);
    }
  };

  const clear = async () => {
    try {
      await api.delete('/api/assistant/history');
      setTurns([]);
      toast('Conversation cleared.');
    } catch (error) {
      toast(error.message);
    }
  };

  return (
    <div className="wx-convo">
      <div className="wx-nav hair-b" style={{ position: 'static' }}>
        <button className="wx-nav-btn left" onClick={onBack} aria-label="Back">
          <Icon name="back" size={22} strokeWidth={2} />
        </button>
        <div className="wx-nav-title">Assistant</div>
        <button className="wx-nav-btn right" onClick={clear} aria-label="Clear conversation">
          <Icon name="trash" size={19} strokeWidth={2} />
        </button>
      </div>

      <div className="wx-log">
        {loading ? (
          <div className="wx-loading">
            <div className="wx-spin" />
          </div>
        ) : (
          <>
            {/* Greeting is client-side so an empty history is never a blank screen. */}
            <div className="wx-msg">
              <Avatar name="Assistant" size="sm" />
              <div className="wx-msg-col">
                <div className="wx-bubble them">
                  Hello{currentUser?.username ? `, ${currentUser.username}` : ''}. I can explain how
                  this app works — posts, stories, circles, privacy, chats, and the rest.
                  {'\n\n'}If I get something wrong, tell me with the thumbs down and I will learn
                  from it.
                </div>
              </div>
            </div>

            {turns.length === 0 && (
              <div style={{ padding: '4px 12px 10px 52px', display: 'grid', gap: 7 }}>
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    style={{
                      justifySelf: 'start',
                      border: '1px solid #d9d9d9',
                      background: '#fff',
                      color: '#576b95',
                      borderRadius: 16,
                      padding: '7px 13px',
                      fontSize: 14,
                      cursor: 'pointer',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {turns.map((turn) => (
              <div key={turn._id}>
                <div className="wx-msg me">
                  <Avatar name={currentUser?.username || 'you'} size="sm" />
                  <div className="wx-msg-col">
                    <div className="wx-bubble me">{turn.question}</div>
                  </div>
                </div>

                <div className="wx-msg">
                  <Avatar name="Assistant" size="sm" />
                  <div className="wx-msg-col">
                    <div className="wx-bubble them">{turn.answer}</div>

                    {/* Feedback strip: the learning signal. */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '5px 2px 0',
                        fontSize: 12,
                        color: '#9a9a9a',
                      }}
                    >
                      {turn.rated ? (
                        <span style={{ color: turn.rated === 'up' ? '#07c160' : '#9a9a9a' }}>
                          {turn.rated === 'up' ? 'Marked helpful' : 'Thanks for the correction'}
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => rate(turn, true)}
                            style={{
                              border: 0,
                              background: 'none',
                              cursor: 'pointer',
                              color: '#576b95',
                              fontSize: 12,
                              padding: 0,
                            }}
                          >
                            Helpful
                          </button>
                          <button
                            onClick={() => rate(turn, false)}
                            style={{
                              border: 0,
                              background: 'none',
                              cursor: 'pointer',
                              color: '#576b95',
                              fontSize: 12,
                              padding: 0,
                            }}
                          >
                            Not helpful
                          </button>
                        </>
                      )}
                      {typeof turn.confidence === 'number' && (
                        <span style={{ marginLeft: 'auto', fontSize: 11 }}>
                          {Math.round(Math.min(turn.confidence, 2) * 50)}% sure
                        </span>
                      )}
                    </div>

                    {teaching === turn._id && (
                      <div
                        style={{
                          marginTop: 8,
                          background: '#fff',
                          border: '1px solid #e2e2e2',
                          borderRadius: 8,
                          padding: 10,
                        }}
                      >
                        <div style={{ fontSize: 12, color: '#7f7f7f', marginBottom: 6 }}>
                          What should I have said?
                        </div>
                        <textarea
                          value={lesson}
                          onChange={(event) => setLesson(event.target.value)}
                          rows={3}
                          placeholder="Type the right answer and I will use it from now on."
                          style={{
                            width: '100%',
                            border: '1px solid #e2e2e2',
                            borderRadius: 6,
                            padding: 8,
                            fontSize: 14,
                            resize: 'vertical',
                            fontFamily: 'inherit',
                            boxSizing: 'border-box',
                          }}
                        />
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button
                            onClick={() => teach(turn)}
                            style={{
                              background: '#07c160',
                              color: '#fff',
                              border: 0,
                              borderRadius: 5,
                              padding: '7px 15px',
                              fontSize: 14,
                              cursor: 'pointer',
                            }}
                          >
                            {lesson.trim() ? 'Teach me' : 'Just mark it wrong'}
                          </button>
                          <button
                            onClick={() => setTeaching(null)}
                            style={{
                              background: '#f2f2f2',
                              border: 0,
                              borderRadius: 5,
                              padding: '7px 15px',
                              fontSize: 14,
                              cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {sending && (
              <div className="wx-msg">
                <Avatar name="Assistant" size="sm" />
                <div className="wx-msg-col">
                  <div className="wx-bubble them" style={{ color: '#9a9a9a' }}>
                    Thinking…
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="wx-composer"
        onSubmit={(event) => {
          event.preventDefault();
          ask(draft);
        }}
      >
        <textarea
          className="wx-composer-input"
          rows={1}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              ask(draft);
            }
          }}
          placeholder="Ask about this app"
          aria-label="Ask the assistant"
        />
        <button className="wx-send" type="submit" disabled={sending || !draft.trim()}>
          Send
        </button>
      </form>
    </div>
  );
};

export default AssistantScreen;
