# Implementation Plan: Page-by-Page Reading Mode

## Core Changes

### 1. Remove InfiniteScroll Component
   - Remove `react-infinite-scroll-component` dependency
   - Remove `loadMorePages` function
   - Remove `loadedPages` state (replace with `currentPage`)

### 2. Simplify Page Rendering
   - Render only current page (and optionally next page for preloading)
   - Remove complex `renderedPages` tracking
   - Remove DOM checking logic
   - Remove page render callbacks complexity

### 3. Add Page State Management
   - Replace `loadedPages` with `currentPage` state
   - Add `totalPages` from document load
   - Simple state: just track which page user is viewing

### 4. Update Progress Restoration
   - Remove complex restoration logic
   - Simply: Load target page directly when component mounts
   - No timing issues, no waiting for multiple pages
   - Instant restoration

### 5. Update Progress Tracking
   - Remove scroll tracking
   - Track only `currentPage` number
   - Save progress on page change

## UI Components to Add

### 6. Navigation Controls
   - Previous page button (←)
   - Next page button (→)
   - Reading progress "(25%)" after the Page X of Y
   - Position in footer

### 7. Page Jump Feature
   - "Go to page" input/modal
   - Jump to any page number
   - Input validation

### 8. Keyboard Navigation
   - Arrow keys (← →) for prev/next
   - Space bar for next page
   - Home/End for first/last page
   - Number input for page jump

### 9. Touch/Swipe Gestures
   - Swipe left or up = next page
   - Swipe right or down = previous page
   - Touch-friendly on mobile

### 10. Layout Updates
    - Center single page in viewport
    - Remove scroll container
    - Full-height page display
    - Responsive sizing

## Features to Simplify/Enable

### 12. Zoom Updates
    - Fit-to-height/width options

### 13. Progress Indicator
    - Progress bar showing "X% read"
    - Page number display
    - Optional: reading time estimate

## Future-Ready Structure

### 14. Bookmarks Foundation
    - Structure to save bookmarks (page numbers)
    - UI placeholder for bookmark button
    - Database schema ready (if not exists)

### 15. Annotations/Highlights Foundation
    - Structure for saving annotations
    - UI placeholders
    - Database ready

### 16. Table of Contents
    - Extract TOC from PDF metadata
    - Sidebar/drawer navigation
    - Jump to chapters

### 17. Search Foundation
    - Structure for text search within book
    - Search results with page numbers
    - Highlight search terms

## Code Cleanup

### 18. Remove Unused Code
    - Remove `renderedPages` Set tracking
    - Remove `initialPagesRendered` state
    - Remove `shouldRestoreScroll` logic
    - Remove complex DOM checking useEffects
    - Remove restoration timeout logic
    - Clean up `onPageLoadSuccess` complexity

### 19. Simplify Loading States
    - Maintain dynamic loading texts for labour effect for user, simplify rest other things
    - No complex restoration detection
    - Simple conditional rendering

### 20. Update Database Sync
    - Simplify progress sync (just page number)
    - Remove scroll position
    - Faster, more reliable sync

## Files to Modify

- `src/pages/Reader.jsx` - Major refactor
- `src/components/BookLoadingScreen.jsx` - Simplify messages
- `src/store/progressStore.js` - Simplify if needed
- `package.json` - Remove `react-infinite-scroll-component` (optional)

## Estimated Impact

- **Code Reduction**: ~200-300 lines removed
- **Complexity**: Significantly reduced
- **Performance**: Much better (1-2 pages vs many)
- **Features**: Much easier to add
- **User Experience**: Familiar e-reader pattern

## Implementation Order

1. **Phase 1**: Core Conversion (items 1-5, 10, 18, 19)
2. **Phase 2**: Navigation (items 6-9)
3. **Phase 3**: Enhanced Features (items 12-13, 20)
4. **Phase 4**: Future Features (items 14-17)

## UI Layout Preview

```
┌─────────────────────────────────┐
│  Header (Back, Title, Zoom)     │
├─────────────────────────────────┤
│                                   │
│     [Current Page - Centered]     │
│                                   │
│  ← Prev    [Page X of Y]    Next →│
│                                   │
└─────────────────────────────────┘
```

## Benefits Summary

1. **Progress Restoration**: Instant - just load target page
2. **Scalability**: Only 1-2 pages in memory
3. **Simplicity**: Much simpler codebase
4. **Features**: Easy to add bookmarks, annotations, highlights, search, TOC
5. **Familiar UX**: Matches Kindle/e-reader behavior
6. **Performance**: Fast initial load, low memory usage

