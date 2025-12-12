# Testing Guide for iReader Application

This guide documents testing procedures for the iReader application with various file formats and EPUB versions.

## Test Files Available

### EPUB Files
Located in `ebooks/epub/`:

1. **EPUB with no images**
   - `A_Short_History_of_the_World_by_H_G_Wells-no_images.epub`
   - Tests: Basic EPUB rendering without image support

2. **EPUB with images**
   - `A_Short_History_of_the_World_by_H_G_Wells-images.epub`
   - Tests: EPUB 2.x with embedded images

3. **EPUB 3 with images**
   - `A_Short_History_of_the_World_by_H_G_Wells-images-3.epub`
   - `Cleopatra_by_Georg_Ebers-images-3.epub`
   - Tests: EPUB 3.0 format with enhanced features and images

### PDF Files
Located in `ebooks/pdf/`:

1. `Stephen_Hawking-A_Brief_History_of_Time.pdf`
2. `Stephen_Hawking-The_Theory_of_Everything.pdf`
3. `Wings-of-Fire-An-Autobiography-of-APJ-Abdul-Kalam.pdf`

### Unsupported Formats (for reference)
- MOBI files (not currently supported)
- TXT files (not currently supported)

## Testing Checklist

### EPUB Testing

#### 1. EPUB with No Images
- [ ] Upload `A_Short_History_of_the_World_by_H_G_Wells-no_images.epub`
- [ ] Verify book appears in library with correct title and author
- [ ] Verify cover placeholder or no cover (expected)
- [ ] Open book and verify text renders correctly
- [ ] Test page navigation (next/previous)
- [ ] Test reading progress tracking
- [ ] Test settings (theme, font size, etc.)
- [ ] Verify no errors in console

#### 2. EPUB with Images (EPUB 2.x)
- [ ] Upload `A_Short_History_of_the_World_by_H_G_Wells-images.epub`
- [ ] Verify book appears in library with cover image
- [ ] Open book and verify images render correctly
- [ ] Test page navigation through image-heavy sections
- [ ] Verify image scaling and positioning
- [ ] Test reading progress tracking
- [ ] Test all reading preferences
- [ ] Verify no errors in console

#### 3. EPUB 3 with Images
- [ ] Upload `A_Short_History_of_the_World_by_H_G_Wells-images-3.epub`
- [ ] Upload `Cleopatra_by_Georg_Ebers-images-3.epub`
- [ ] Verify EPUB 3 features are handled correctly
- [ ] Verify images render correctly
- [ ] Test enhanced navigation (if EPUB 3 specific features exist)
- [ ] Test reading progress tracking
- [ ] Verify compatibility with EPUB.js library
- [ ] Check for any EPUB 3 specific errors

### PDF Testing

#### 1. Basic PDF Rendering
- [ ] Upload each PDF file:
  - `Stephen_Hawking-A_Brief_History_of_Time.pdf`
  - `Stephen_Hawking-The_Theory_of_Everything.pdf`
  - `Wings-of-Fire-An-Autobiography-of-APJ-Abdul-Kalam.pdf`
- [ ] Verify book appears in library with cover (first page thumbnail)
- [ ] Verify correct title and author extraction
- [ ] Open book and verify first page renders correctly

#### 2. PDF Navigation
- [ ] Test next/previous page navigation
- [ ] Verify page numbers are correct
- [ ] Test reading progress tracking
- [ ] Verify progress percentage calculation

#### 3. PDF Features
- [ ] Test reading preferences (theme, font - may have limited effect on PDFs)
- [ ] Verify PDF rendering quality
- [ ] Test with different PDF sizes
- [ ] Check for any rendering errors

### Cross-Format Testing

#### 1. Library Management
- [ ] Upload multiple books (mix of EPUB and PDF)
- [ ] Verify all books appear in library
- [ ] Verify correct format badges (EPUB/PDF)
- [ ] Test deleting books
- [ ] Test opening different books

#### 2. Reading Experience
- [ ] Switch between EPUB and PDF books
- [ ] Verify progress is maintained per book
- [ ] Test settings persistence across books
- [ ] Verify no data leakage between books

#### 3. Analytics Tracking
- [ ] Verify `book_uploaded` events fire for each file type
- [ ] Verify `book_opened` events include correct format
- [ ] Verify `reading_progress_updated` works for both formats
- [ ] Check PostHog dashboard for all events

## Known Issues to Check

### EPUB.js Compatibility
- EPUB.js version 0.3.88 should support:
  - EPUB 2.0 ✅
  - EPUB 3.0 ✅ (with some limitations)
- Check for any console warnings about unsupported features

### PDF.js Compatibility
- PDF.js version 3.11.174 should support:
  - All standard PDF versions ✅
  - PDF/A format ✅
  - Encrypted PDFs (may require password handling)

### Potential Issues

1. **EPUB 3 Advanced Features**
   - Some EPUB 3 features may not be fully supported
   - Check for console warnings
   - Verify basic reading still works

2. **Large Files**
   - Test with larger PDF files
   - Check memory usage
   - Verify IndexedDB storage limits

3. **Image Loading**
   - Check if images load correctly in EPUB files
   - Verify image paths are resolved correctly
   - Test with slow connections

4. **Metadata Extraction**
   - Verify title and author extraction works for all files
   - Check if missing metadata is handled gracefully

## Testing Procedure

### Manual Testing Steps

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open the application in browser:**
   - Navigate to the URL shown (typically `http://localhost:5173`)

3. **Test each file type:**
   - Use drag-and-drop or file picker to upload files
   - Observe console for any errors
   - Test all reading features

4. **Check PostHog Analytics:**
   - Verify events are being tracked
   - Check user properties are set correctly
   - Verify session recordings are working

### Automated Testing (Future)

Consider adding:
- Unit tests for bookParser.js
- Integration tests for file upload
- E2E tests for reading experience

## Expected Results

### EPUB Files
- ✅ All EPUB versions should load and render
- ✅ Images should display correctly (when present)
- ✅ Navigation should work smoothly
- ✅ Progress tracking should be accurate

### PDF Files
- ✅ All PDFs should load and render
- ✅ Page navigation should work
- ✅ Cover thumbnails should generate
- ✅ Progress tracking should be accurate

### Analytics
- ✅ All events should fire correctly
- ✅ User properties should be set
- ✅ Session recordings should capture interactions

## Reporting Issues

When reporting issues, include:
1. File name and format
2. Steps to reproduce
3. Expected behavior
4. Actual behavior
5. Console errors (if any)
6. Browser and version
7. Device type (desktop/mobile/tablet)

## Notes

- MOBI and TXT files are not currently supported
- EPUB.js handles EPUB 2.0 and 3.0, but some advanced EPUB 3 features may not work
- PDF.js handles most PDF formats, but encrypted PDFs may require additional handling
- Large files may take longer to upload and process

