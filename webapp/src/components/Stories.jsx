import { useEffect, useRef, useState } from 'react';
import { api, mediaUrl } from '../services/api';
import Icon from './Icon';
import { avatarColor, initialOf } from '../lib/avatar';
import { useToast } from './Toast';

const RING_UNSEEN = 'linear-gradient(135deg, #07c160, #95ec69)';

/** Horizontal tray of story rings, shown above the Moments feed. */
export const StoryTray = ({ trays, currentUser, onOpen, onAdd }) => (
  <div
    style={{
      display: 'flex',
      gap: 14,
      padding: '12px 16px',
      overflowX: 'auto',
      background: '#fff',
      scrollbarWidth: 'none',
    }}
  >
    <button onClick={onAdd} style={{ flex: 'none', textAlign: 'center', width: 62 }}>
      <div style={{ position: 'relative', width: 58, height: 58, margin: '0 auto' }}>
        <div
          className="wx-av"
          style={{
            width: 58,
            height: 58,
            borderRadius: 8,
            background: avatarColor(currentUser?.username || 'you'),
            fontSize: 22,
          }}
        >
          {initialOf(currentUser?.username || 'you')}
        </div>
        <span
          style={{
            position: 'absolute',
            right: -2,
            bottom: -2,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#07c160',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            border: '2px solid #fff',
          }}
        >
          <Icon name="plus" size={12} strokeWidth={3} />
        </span>
      </div>
      <div style={{ fontSize: 11, marginTop: 5, color: '#888' }}>Your story</div>
    </button>

    {trays
      .filter((t) => String(t.user._id) !== String(currentUser?._id || currentUser?.id))
      .map((tray) => (
        <button
          key={tray.user._id}
          onClick={() => onOpen(tray)}
          style={{ flex: 'none', textAlign: 'center', width: 62 }}
        >
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: 10,
              padding: 2,
              margin: '0 auto',
              background: tray.hasUnseen ? RING_UNSEEN : '#d8d8d8',
            }}
          >
            <div
              className="wx-av"
              style={{
                width: '100%',
                height: '100%',
                borderRadius: 8,
                background: avatarColor(tray.user.username),
                fontSize: 21,
                border: '2px solid #fff',
              }}
            >
              {initialOf(tray.user.username)}
            </div>
          </div>
          <div
            style={{
              fontSize: 11,
              marginTop: 5,
              color: '#333',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {tray.user.username}
          </div>
        </button>
      ))}
  </div>
);

/** Full-screen story viewer with timed progress bars and tap navigation. */
export const StoryViewer = ({ tray, onClose, onViewed }) => {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const toast = useToast();
  const story = tray.stories[index];

  useEffect(() => {
    if (!story) return undefined;
    setProgress(0);
    api.post(`/api/stories/${story._id}/view`, {}).then((r) => onViewed?.(story, r)).catch(() => {});

    const started = Date.now();
    timerRef.current = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - started) / 5000) * 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(timerRef.current);
        if (index < tray.stories.length - 1) setIndex((i) => i + 1);
        else onClose();
      }
    }, 50);

    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, story?._id]);

  if (!story) return null;

  const screenshot = async () => {
    try {
      await api.post(`/api/stories/${story._id}/screenshot`, {});
      toast('Author was notified of the screenshot');
    } catch {
      /* non-critical */
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 400,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', gap: 3, padding: '10px 10px 6px' }}>
        {tray.stories.map((s, i) => (
          <div key={s._id} style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.3)' }}>
            <div
              style={{
                height: '100%',
                background: '#fff',
                width: i < index ? '100%' : i === index ? `${progress}%` : '0%',
              }}
            />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 12px 10px' }}>
        <div
          className="wx-av wx-av-sm"
          style={{ background: avatarColor(tray.user.username) }}
        >
          {initialOf(tray.user.username)}
        </div>
        <span style={{ color: '#fff', fontSize: 14, flex: 1 }}>{tray.user.username}</span>
        {story.disappearing && (
          <span style={{ color: '#95ec69', fontSize: 11 }}>one-view</span>
        )}
        <button onClick={screenshot} style={{ color: '#fff', opacity: 0.8 }} aria-label="Screenshot">
          <Icon name="camera" size={18} />
        </button>
        <button onClick={onClose} style={{ color: '#fff' }} aria-label="Close">
          <Icon name="close" size={20} strokeWidth={2} />
        </button>
      </div>

      <div style={{ flex: 1, position: 'relative', display: 'grid', placeItems: 'center' }}>
        <img
          src={mediaUrl(story.media)}
          alt={story.caption}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        />
        {/* tap zones */}
        <button
          onClick={() => (index > 0 ? setIndex(index - 1) : onClose())}
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '32%' }}
          aria-label="Previous"
        />
        <button
          onClick={() =>
            index < tray.stories.length - 1 ? setIndex(index + 1) : onClose()
          }
          style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '32%' }}
          aria-label="Next"
        />
      </div>

      {story.caption && (
        <div style={{ color: '#fff', textAlign: 'center', padding: '12px 20px', fontSize: 15 }}>
          {story.caption}
        </div>
      )}
      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, textAlign: 'center', paddingBottom: 14 }}>
        {story.viewerCount || 0} views
      </div>
    </div>
  );
};

/** Composer sheet for adding a story/snap. */
export const StoryComposer = ({ circles, onClose, onPosted }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [disappearing, setDisappearing] = useState(false);
  const [circle, setCircle] = useState(circles[0] || 'General');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  const toast = useToast();

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const pick = (f) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return toast('Please choose an image');
    if (f.size > 5 * 1024 * 1024) return toast('Image must be under 5 MB');
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!file) return toast('Choose a photo first');
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('media', file);
      fd.append('caption', caption);
      fd.append('circle', circle);
      fd.append('disappearing', String(disappearing));
      await api.postMultipart('/api/stories', fd);
      toast('Story shared');
      onPosted();
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#ededed', display: 'flex', flexDirection: 'column' }}>
      <div className="wx-post-nav hair-b">
        <button className="wx-post-cancel" onClick={onClose}>
          Cancel
        </button>
        <span style={{ fontSize: 17, fontWeight: 600 }}>New Story</span>
        <button className="wx-post-send" onClick={submit} disabled={busy || !file}>
          {busy ? '…' : 'Share'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div className="wx-post-body">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => pick(e.target.files?.[0])}
          />
          {preview ? (
            <div style={{ position: 'relative' }}>
              <img src={preview} alt="preview" style={{ width: '100%', borderRadius: 4 }} />
              <button
                className="wx-picker-x"
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                }}
              >
                <Icon name="close" size={13} strokeWidth={2.4} />
              </button>
            </div>
          ) : (
            <button
              className="wx-picker-add"
              style={{ width: '100%', aspectRatio: '3/4' }}
              onClick={() => inputRef.current?.click()}
            >
              <Icon name="camera" size={40} strokeWidth={1.1} />
            </button>
          )}

          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption"
            style={{
              width: '100%',
              marginTop: 12,
              padding: 10,
              border: '1px solid #e0e0e0',
              borderRadius: 4,
              fontSize: 15,
              outline: 'none',
            }}
          />
        </div>

        <div className="wx-group">
          <div className="wx-cell hair-b" style={{ display: 'block', paddingTop: 12 }}>
            <div className="wx-cell-title" style={{ marginBottom: 9 }}>
              Who can see
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {circles.map((c) => (
                <button
                  key={c}
                  className={`wx-aud-chip ${circle === c ? 'on' : ''}`}
                  onClick={() => setCircle(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <button className="wx-cell" onClick={() => setDisappearing((v) => !v)}>
            <span className="wx-cell-body">
              <span className="wx-cell-title">One-view snap</span>
              <span className="wx-cell-sub">Destroyed after each person opens it</span>
            </span>
            <span
              style={{
                width: 44,
                height: 26,
                borderRadius: 99,
                padding: 3,
                background: disappearing ? '#07c160' : '#d8d8d8',
              }}
            >
              <span
                style={{
                  display: 'block',
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: '#fff',
                  transform: disappearing ? 'translateX(18px)' : 'none',
                  transition: 'transform .2s',
                }}
              />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
