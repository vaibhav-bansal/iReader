# iReader Quick Start Guide

## Phase 0 Implementation Complete ✅

All Phase 0 features from the development plan have been implemented:

### ✅ Completed Features

1. **File Upload** - Upload EPUB and PDF files via drag-and-drop or file picker
2. **Local Library** - View all uploaded books with covers, metadata, and progress
3. **Reader View** - Responsive reading experience for both EPUB and PDF
4. **Reading Preferences** - Customize font size, line spacing, page width, font family
5. **Themes** - Light, dark, and sepia themes
6. **Progress Tracking** - Automatic progress tracking with resume from last position
7. **Local Storage** - All data stored locally using IndexedDB and localStorage
8. **Offline Support** - Service Worker and PWA manifest for offline reading

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The app will open at `http://localhost:3000`

### 3. Upload Your First Book

- Click "Upload Book" or drag and drop an EPUB or PDF file
- The book will be added to your library
- Click on the book to start reading

### 4. Customize Reading Experience

- Click the settings (⚙️) button in the reader
- Adjust font size, line spacing, page width, and theme
- Preferences are saved automatically

## Project Structure

```
iReader/
├── src/
│   ├── components/       # React components
│   │   └── ReaderControls.jsx
│   ├── db/              # Database setup
│   │   └── database.js  # Dexie IndexedDB setup
│   ├── pages/           # Page components
│   │   ├── Library.jsx  # Library view
│   │   └── Reader.jsx   # Reader view
│   ├── utils/           # Utility functions
│   │   ├── bookParser.js # EPUB/PDF parsing
│   │   └── storage.js   # Storage operations
│   ├── App.jsx          # Main app component
│   └── main.jsx         # Entry point
├── public/
│   ├── manifest.json    # PWA manifest
│   └── sw.js           # Service Worker
└── package.json        # Dependencies

```

## Key Technologies

- **React 18** - UI framework
- **React Router** - Navigation
- **Vite** - Build tool
- **EPUB.js** - EPUB rendering
- **PDF.js** - PDF rendering
- **Dexie.js** - IndexedDB wrapper
- **Service Worker** - Offline support

## Next Steps (Phase 1)

According to the development plan, Phase 1 will add:
- Dictionary lookup (free API integration)
- Text highlighting
- Notes and bookmarks
- Table of contents navigation
- In-book search
- Reading modes (paged vs continuous scroll)
- Distraction-free mode

## Notes

- All data is stored locally in your browser
- No sign-in required
- Works offline after initial upload
- Can be installed as a PWA (Progressive Web App)

## Troubleshooting

**Books not loading?**
- Make sure the file is a valid EPUB or PDF
- Check browser console for errors
- Try refreshing the page

**Progress not saving?**
- Check browser storage permissions
- Ensure IndexedDB is enabled in your browser

**Offline not working?**
- Service Worker registration may take a moment
- Check browser console for Service Worker errors
- Try hard refresh (Ctrl+Shift+R)

