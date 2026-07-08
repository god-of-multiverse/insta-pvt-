import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

const UploadScreen = ({ onUploadSuccess, circles = ['General', 'Hometown', 'College'], onAddCircle }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [caption, setCaption] = useState('');
  const [activeCircle, setActiveCircle] = useState('General');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [availableCircles, setAvailableCircles] = useState(circles);
  const [customCircle, setCustomCircle] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    setAvailableCircles(circles || ['General', 'Hometown', 'College']);
    setActiveCircle((circles && circles[0]) || 'General');
  }, [circles]);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddCircle = () => {
    const trimmed = customCircle.trim();
    if (!trimmed) return;

    const normalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    const alreadyExists = availableCircles.some((circle) => circle.toLowerCase() === normalized.toLowerCase());

    if (!alreadyExists) {
      const nextCircles = [...availableCircles, normalized];
      setAvailableCircles(nextCircles);
      if (onAddCircle) onAddCircle(normalized);
    }

    setActiveCircle(normalized);
    setCustomCircle('');
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage('Please select an image first');
      return;
    }

    setUploading(true);
    setMessage('Uploading...');

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('caption', caption);
      formData.append('circle', activeCircle);

      const response = await api.postMultipart('/api/posts', formData);

      if (response && response.post) {
        setMessage('Post uploaded successfully! 🎉');
        setSelectedFile(null);
        setPreviewUrl(null);
        setCaption('');
        setActiveCircle(availableCircles[0] || 'General');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        if (onUploadSuccess) {
          onUploadSuccess(response.post, activeCircle);
        }
      } else {
        setMessage('ERROR: Upload response invalid');
      }
    } catch (error) {
      setMessage(`ERROR: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const clearForm = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption('');
    setActiveCircle(availableCircles[0] || 'General');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setMessage('');
  };

  return (
    <div className="screen-container">
      <h2 className="screen-title">Create New Post</h2>
      
      {!previewUrl ? (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="file-input-hidden"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="upload-card"
          >
            <div className="upload-plus">+</div>
            <p style={{ margin: 0, fontWeight: '600' }}>Select photo from computer</p>
          </button>
        </div>
      ) : (
        <div>
          <div className="preview-box">
            <img src={previewUrl} className="preview-image" alt="Preview" />
          </div>
          
          <textarea
            className="caption-textarea"
            placeholder="Write a caption..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows="3"
          />

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: '600', color: '#8f9cae', marginBottom: 10 }}>
              Share to Group
            </label>
            <div className="circle-selector-grid">
              {availableCircles.map((circle) => (
                <button
                  key={circle}
                  type="button"
                  onClick={() => setActiveCircle(circle)}
                  className={`circle-select-btn ${activeCircle === circle ? 'selected' : ''}`}
                >
                  {circle === 'General' ? '💬 General' : circle === 'Hometown' ? '🏡 Hometown' : circle === 'College' ? '🎓 College' : `🏷️ ${circle}`}
                </button>
              ))}
            </div>
            <div className="circle-create-row">
              <input
                className="circle-create-input"
                value={customCircle}
                onChange={(e) => setCustomCircle(e.target.value)}
                placeholder="Create a new group"
              />
              <button type="button" className="circle-create-btn" onClick={handleAddCircle}>
                Add
              </button>
            </div>
          </div>

          <div className="button-group">
            <button onClick={clearForm} className="btn-secondary">
              Cancel
            </button>
            <button 
              onClick={handleUpload}
              disabled={uploading}
              className="btn-primary"
            >
              {uploading ? 'Uploading...' : 'Share'}
            </button>
          </div>
        </div>
      )}
      
      {message && <div className="alert-message">{message}</div>}
    </div>
  );
};

export default UploadScreen;
