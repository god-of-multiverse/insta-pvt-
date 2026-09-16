import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import Icon from '../components/Icon';
import { useToast } from '../components/Toast';

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * WeChat's Moments composer: Cancel / Send nav, a big plain textarea, a 3-up
 * photo picker grid, then "Who can see" rows underneath.
 */
const ComposeScreen = ({ onUploadSuccess, circles, onAddCircle, onCancel }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [text, setText] = useState('');
  const [target, setTarget] = useState(circles[0] || 'General');
  const [newCircle, setNewCircle] = useState('');
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    if (!circles.includes(target)) setTarget(circles[0] || 'General');
  }, [circles, target]);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const accept = (candidate) => {
    if (!candidate) return;
    if (!candidate.type.startsWith('image/')) return toast('Please choose an image');
    if (candidate.size > MAX_BYTES) return toast('Image must be under 5 MB');
    if (preview) URL.revokeObjectURL(preview);
    setFile(candidate);
    setPreview(URL.createObjectURL(candidate));
  };

  const clearPhoto = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const addCircle = () => {
    const value = newCircle.trim();
    if (!value) return;
    const normalized = value[0].toUpperCase() + value.slice(1);
    if (!circles.some((c) => c.toLowerCase() === normalized.toLowerCase())) onAddCircle(normalized);
    setTarget(normalized);
    setNewCircle('');
    setAdding(false);
  };

  const submit = async () => {
    if (!file) return toast('Please choose a photo');
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('caption', text.trim());
      formData.append('circle', target);
      const response = await api.postMultipart('/api/posts', formData);
      if (!response?.post) throw new Error('Unexpected server response');
      toast('Posted');
      const chosen = target;
      clearPhoto();
      setText('');
      onUploadSuccess(response.post, chosen);
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ background: '#ededed', minHeight: '100%' }}>
      <div className="wx-post-nav hair-b">
        <button className="wx-post-cancel" onClick={onCancel}>
          Cancel
        </button>
        <button className="wx-post-send" onClick={submit} disabled={busy || !file}>
          {busy ? '…' : 'Send'}
        </button>
      </div>

      <div className="wx-post-body">
        <textarea
          className="wx-post-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="What's on your mind?"
        />

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => accept(event.target.files?.[0])}
        />

        <div className="wx-picker">
          {preview ? (
            <div className="wx-picker-item">
              <img src={preview} alt="Selected" />
              <button className="wx-picker-x" onClick={clearPhoto} aria-label="Remove photo">
                <Icon name="close" size={13} strokeWidth={2.4} />
              </button>
            </div>
          ) : (
            <button className="wx-picker-add" onClick={() => inputRef.current?.click()}>
              <Icon name="plus" size={30} strokeWidth={1.2} />
            </button>
          )}
        </div>
      </div>

      <div className="wx-group">
        <div className="wx-cell hair-b" style={{ display: 'block', paddingTop: 12 }}>
          <div className="wx-cell-title" style={{ marginBottom: 9 }}>
            Who can see
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {circles.map((circle) => (
              <button
                key={circle}
                className={`wx-aud-chip ${target === circle ? 'on' : ''}`}
                onClick={() => setTarget(circle)}
              >
                {circle}
              </button>
            ))}
            {adding ? (
              <span style={{ display: 'flex', gap: 5 }}>
                <input
                  autoFocus
                  value={newCircle}
                  onChange={(event) => setNewCircle(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && addCircle()}
                  onBlur={() => !newCircle.trim() && setAdding(false)}
                  placeholder="Name"
                  style={{
                    width: 96,
                    padding: '4px 8px',
                    border: '1px solid #e0e0e0',
                    borderRadius: 3,
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
                <button className="wx-aud-chip" onClick={addCircle}>
                  Add
                </button>
              </span>
            ) : (
              <button className="wx-aud-chip" onClick={() => setAdding(true)}>
                + New
              </button>
            )}
          </div>
        </div>

        <div className="wx-cell">
          <span className="wx-cell-body">
            <span className="wx-cell-title" style={{ fontSize: 15, color: '#888' }}>
              Only people in {target} will see this
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default ComposeScreen;
