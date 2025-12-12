import { useState, useEffect } from 'react'
import './ReaderControls.css'

function ReaderControls({ preferences, onPreferencesChange, onClose, bookFormat }) {
  const [localPrefs, setLocalPrefs] = useState(preferences)

  useEffect(() => {
    setLocalPrefs(preferences)
  }, [preferences])

  const handleChange = (key, value) => {
    const updated = { ...localPrefs, [key]: value }
    setLocalPrefs(updated)
    // Apply immediately for better UX
    onPreferencesChange({ [key]: value })
  }

  return (
    <div className="reader-controls-overlay" onClick={onClose}>
      <div className="reader-controls-panel" onClick={(e) => e.stopPropagation()}>
        <div className="controls-header">
          <h3>Reading Settings</h3>
          <button className="close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="controls-content">
          {/* Theme Selection */}
          <div className="control-group">
            <label>Theme</label>
            <div className="theme-buttons">
              <button
                className={`theme-button theme-light ${localPrefs.theme === 'light' ? 'active' : ''}`}
                onClick={() => handleChange('theme', 'light')}
              >
                <span className="theme-preview light"></span>
                Light
              </button>
              <button
                className={`theme-button theme-dark ${localPrefs.theme === 'dark' ? 'active' : ''}`}
                onClick={() => handleChange('theme', 'dark')}
              >
                <span className="theme-preview dark"></span>
                Dark
              </button>
              <button
                className={`theme-button theme-sepia ${localPrefs.theme === 'sepia' ? 'active' : ''}`}
                onClick={() => handleChange('theme', 'sepia')}
              >
                <span className="theme-preview sepia"></span>
                Sepia
              </button>
            </div>
          </div>

          {/* Font Size - Only show for EPUB since PDF has its own zoom */}
          {bookFormat === 'epub' && (
            <>
              <div className="control-group">
                <label>
                  Font Size
                  <span className="control-value">{localPrefs.fontSize}px</span>
                </label>
                <input
                  type="range"
                  min="12"
                  max="28"
                  value={localPrefs.fontSize}
                  onChange={(e) => handleChange('fontSize', parseInt(e.target.value))}
                  className="slider"
                />
                <div className="slider-labels">
                  <span>A</span>
                  <span style={{ fontSize: '1.25em' }}>A</span>
                </div>
              </div>

              <div className="control-group">
                <label>
                  Line Spacing
                  <span className="control-value">{localPrefs.lineSpacing}x</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="2.5"
                  step="0.1"
                  value={localPrefs.lineSpacing}
                  onChange={(e) => handleChange('lineSpacing', parseFloat(e.target.value))}
                  className="slider"
                />
                <div className="slider-labels">
                  <span>≡</span>
                  <span>⋮</span>
                </div>
              </div>

              <div className="control-group">
                <label>Font Family</label>
                <div className="font-buttons">
                  <button
                    className={`font-button ${localPrefs.fontFamily === 'serif' ? 'active' : ''}`}
                    onClick={() => handleChange('fontFamily', 'serif')}
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    Serif
                  </button>
                  <button
                    className={`font-button ${localPrefs.fontFamily === 'sans-serif' ? 'active' : ''}`}
                    onClick={() => handleChange('fontFamily', 'sans-serif')}
                    style={{ fontFamily: '-apple-system, sans-serif' }}
                  >
                    Sans
                  </button>
                  <button
                    className={`font-button ${localPrefs.fontFamily === 'monospace' ? 'active' : ''}`}
                    onClick={() => handleChange('fontFamily', 'monospace')}
                    style={{ fontFamily: 'Courier, monospace' }}
                  >
                    Mono
                  </button>
                </div>
              </div>
            </>
          )}

          {/* PDF-specific notice */}
          {bookFormat === 'pdf' && (
            <div className="control-info">
              <p>💡 Use the PDF toolbar for zoom and navigation controls.</p>
            </div>
          )}
        </div>

        <div className="controls-footer">
          <button className="done-button" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReaderControls
