import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import Icon from '../components/Icon';
import { circleMeta } from '../lib/circles';
import { useToast } from '../components/Toast';

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_CAPTION = 600;

const UploadScreen = ({ onUploadSuccess, circles, onAddCircle }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [target, setTarget] = useState(circles[0] || 'General');
  const [newCircle, setNewCircle] = useState('');
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    if (!circles.includes(target)) setTarget(circles[0] || 'General');
  }, [circles, target]);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const accept = (candidate) => {
    if (!candidate) return;
    if (!candidate.type.startsWith('image/')) {
      toast('That file is not an image.', 'error');
      return;
    }
    if (candidate.size > MAX_BYTES) {
      toast('Images need to be under 5 MB.', 'error');
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(candidate);
    setPreview(URL.createObjectURL(candidate));
  };

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setCaption('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const addCircle = () => {
    const name = newCircle.trim();
    if (!name) return;
    const normalized = name[0].toUpperCase() + name.slice(1);
    if (!circles.some((c) => c.toLowerCase() === normalized.toLowerCase())) onAddCircle(normalized);
    setTarget(normalized);
    setNewCircle('');
    toast(`Circle “${normalized}” ready`, 'success');
  };

  const submit = async () => {
    if (!file) {
      toast('Pick a photo first.', 'error');
      return;
    }
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('caption', caption.trim());
      formData.append('circle', target);
      const response = await api.postMultipart('/api/posts', formData);
      if (!response?.post) throw new Error('The server returned an unexpected response.');
      toast(`Shared with ${target} only`, 'success');
      const chosen = target;
      reset();
      onUploadSuccess(response.post, chosen);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const meta = circleMeta(target);

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <h1>New post</h1>
          <p className="sub">Pick the audience first. Nothing is shared until you choose.</p>
        </div>
      </div>

      <div className="composer">
        <div>
          {!preview ? (
            <>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => accept(event.target.files?.[0])}
              />
              <button
                type="button"
                className={`drop ${dragging ? 'over' : ''}`}
                onClick={() => inputRef.current?.click()}
                onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  accept(event.dataTransfer.files?.[0]);
                }}
              >
                <span className="ring">
                  <Icon name="image" size={24} />
                </span>
                <strong>Drop a photo, or browse</strong>
                <span>JPG, PNG or WebP · up to 5 MB</span>
              </button>
            </>
          ) : (
            <div className="preview">
              <img src={preview} alt="Selected upload preview" />
              <div className="preview-bar">
                <button className="icon-btn" onClick={() => inputRef.current?.click()} aria-label="Replace image">
                  <Icon name="image" size={17} />
                </button>
                <button className="icon-btn" onClick={reset} aria-label="Remove image">
                  <Icon name="close" size={17} />
                </button>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => accept(event.target.files?.[0])}
              />
            </div>
          )}
        </div>

        <aside className="composer-side">
          <div>
            <label className="field-label" htmlFor="caption">Caption</label>
            <textarea
              id="caption"
              className="field caption-area"
              value={caption}
              maxLength={MAX_CAPTION}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Say the thing you would only say to these people…"
            />
            <div className="char-count">{caption.length}/{MAX_CAPTION}</div>
          </div>

          <div>
            <span className="field-label">Who sees this</span>
            <div className="circle-picker">
              {circles.map((name) => {
                const item = circleMeta(name);
                return (
                  <button
                    key={name}
                    type="button"
                    className={`circle-option ${target === name ? 'on' : ''}`}
                    style={{ '--chip-color': item.color }}
                    onClick={() => setTarget(name)}
                  >
                    <span className="dot" style={{ width: 9, height: 9, borderRadius: '50%', background: item.color }} />
                    <span className="label">{name}</span>
                    <Icon name="check" size={16} className="tick" />
                  </button>
                );
              })}
            </div>

            <div className="inline-add" style={{ marginTop: 10 }}>
              <input
                className="field"
                value={newCircle}
                onChange={(event) => setNewCircle(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && (event.preventDefault(), addCircle())}
                placeholder="New circle name"
                aria-label="Create a new circle"
              />
              <button type="button" className="btn btn-ghost" onClick={addCircle} disabled={!newCircle.trim()}>
                Add
              </button>
            </div>
          </div>

          <div className="audience-note">
            <Icon name="eyeOff" size={15} />
            <span>{meta.blurb}</span>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost" onClick={reset} disabled={busy || !file}>
              Clear
            </button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={submit} disabled={busy || !file}>
              {busy ? <span className="spinner" /> : `Share with ${target}`}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default UploadScreen;
