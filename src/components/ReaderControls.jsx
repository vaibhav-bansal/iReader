import { useState, useEffect } from 'react'
import './ReaderControls.css'

function ReaderControls({ preferences, onPreferencesChange, onClose }) {
  const [localPrefs, setLocalPrefs] = useState(preferences)

  useEffect(() => {
    setLocalPrefs(preferences)
  }, [preferences])

  const handleChange = (key, value) => {
    const updated = { ...localPrefs, [key]: value }
    setLocalPrefs(updated)
    onPreferencesChange(updated)
  }

  return (
    <div className="reader-controls-overlay" onClick={onClose}>
      <div className="reader-controls-panel" onClick={(e) => e.stopPropagation()}>
        <div className="controls-header">
          <h3>Reading Settings</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="controls-content">
          <div className="control-group">
            <label>Theme</label>
            <div className="theme-buttons">
              <button
                className={`theme-button ${localPrefs.theme === 'light' ? 'active' : ''}`}
                onClick={() => handleChange('theme', 'light')}
              >
                Light
              </button>
              <button
                className={`theme-button ${localPrefs.theme === 'dark' ? 'active' : ''}`}
                onClick={() => handleChange('theme', 'dark')}
              >
                Dark
              </button>
              <button
                className={`theme-button ${localPrefs.theme === 'sepia' ? 'active' : ''}`}
                onClick={() => handleChange('theme', 'sepia')}
              >
                Sepia
              </button>
            </div>
          </div>

          <div className="control-group">
            <label>Font Size: {localPrefs.fontSize}px</label>
            <input
              type="range"
              min="12"
              max="24"
              value={localPrefs.fontSize}
              onChange={(e) => handleChange('fontSize', parseInt(e.target.value))}
              className="slider"
            />
          </div>

          <div className="control-group">
            <label>Line Spacing: {localPrefs.lineSpacing}x</label>
            <input
              type="range"
              min="1"
              max="2.5"
              step="0.1"
              value={localPrefs.lineSpacing}
              onChange={(e) => handleChange('lineSpacing', parseFloat(e.target.value))}
              className="slider"
            />
          </div>

          <div className="control-group">
            <label>Page Width</label>
            <div className="width-buttons">
              <button
                className={`width-button ${localPrefs.pageWidth === 'narrow' ? 'active' : ''}`}
                onClick={() => handleChange('pageWidth', 'narrow')}
              >
                Narrow
              </button>
              <button
                className={`width-button ${localPrefs.pageWidth === 'medium' ? 'active' : ''}`}
                onClick={() => handleChange('pageWidth', 'medium')}
              >
                Medium
              </button>
              <button
                className={`width-button ${localPrefs.pageWidth === 'wide' ? 'active' : ''}`}
                onClick={() => handleChange('pageWidth', 'wide')}
              >
                Wide
              </button>
            </div>
          </div>

          <div className="control-group">
            <label>Font Family</label>
            <select
              value={localPrefs.fontFamily}
              onChange={(e) => handleChange('fontFamily', e.target.value)}
              className="select-input"
            >
              <option value="serif">Serif</option>
              <option value="sans-serif">Sans-serif</option>
              <option value="monospace">Monospace</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReaderControls

