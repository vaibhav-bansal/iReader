# Logger Utility Implementation Plan

## Overview
Replace all `console.log`, `console.error`, and `console.warn` calls with a custom logger utility that only logs in development mode. This will clean up production builds while keeping helpful debug logs during development.

## Goal
- ✅ Console logs visible in development (`npm run dev`)
- ✅ Console logs hidden in production (`npm run build`)
- ✅ Zero performance impact in production
- ✅ Easy to maintain and extend

---

## Implementation Steps

### Step 1: Create Logger Utility
**File**: `src/lib/logger.js`

Create a simple logger that checks `import.meta.env.DEV` before logging:

```javascript
// Logger utility that only logs in development
const isDev = import.meta.env.DEV

export const logger = {
  log: (...args) => {
    if (isDev) {
      console.log(...args)
    }
  },
  error: (...args) => {
    if (isDev) {
      console.error(...args)
    }
  },
  warn: (...args) => {
    if (isDev) {
      console.warn(...args)
    }
  },
  info: (...args) => {
    if (isDev) {
      console.info(...args)
    }
  },
  debug: (...args) => {
    if (isDev) {
      console.debug(...args)
    }
  }
}
```

**Status**: ⏳ Pending

---

### Step 2: Update Files with Console Calls

#### 2.1 Update `src/lib/pdfWorker.js`
- **Add import**: `import { logger } from './logger'`
- **Replace**: Line 9 - `console.log` → `logger.log`
- **Total changes**: 1 console call

**Status**: ⏳ Pending

#### 2.2 Update `src/lib/posthog.js`
- **Add import**: `import { logger } from './logger'`
- **Replace**: 
  - Line 9: `console.warn` → `logger.warn`
  - Line 30: `console.log` → `logger.log`
  - Line 45: `console.warn` → `logger.warn`
  - Line 68: `console.log` → `logger.log`
- **Total changes**: 4 console calls

**Status**: ⏳ Pending

#### 2.3 Update `src/components/Auth.jsx`
- **Add import**: `import { logger } from '../lib/logger'` (after line 5)
- **Replace**:
  - Line 85: `console.log` → `logger.log`
  - Line 97: `console.error` → `logger.error`
  - Line 118: `console.error` → `logger.error`
- **Total changes**: 3 console calls

**Status**: ⏳ Pending

#### 2.4 Update `src/pages/Library.jsx`
- **Add import**: `import { logger } from '../lib/logger'` (after line 12)
- **Replace**:
  - Line 279: `console.warn` → `logger.warn`
  - Line 286: `console.warn` → `logger.warn`
  - Line 319: `console.error` → `logger.error`
- **Total changes**: 3 console calls

**Status**: ⏳ Pending

#### 2.5 Update `src/pages/Reader.jsx`
- **Add import**: `import { logger } from '../lib/logger'` (after line 15)
- **Replace all console calls**:
  - `console.log` → `logger.log` (24 instances)
  - `console.error` → `logger.error` (21 instances)
- **Total changes**: 45 console calls

**Files to update**:
- Lines with `console.log`: 137, 181, 202, 210, 216, 236, 237, 247, 248, 249, 259, 270, 280, 292, 301, 305, 392, 409, 415, 644, 662, 685, 691, 722
- Lines with `console.error`: 137, 161, 224, 228, 232, 273, 274, 275, 276, 277, 295, 296, 297, 298, 313, 344, 446, 454, 706, 707, 708

**Status**: ⏳ Pending

---

### Step 3: Test Implementation

#### 3.1 Test in Development
- Run `npm run dev`
- Verify all logs appear in browser console
- Check that all functionality still works

**Status**: ⏳ Pending

#### 3.2 Test in Production
- Run `npm run build`
- Run `npm run preview` (or deploy to Vercel)
- Verify no console logs appear in browser console
- Check that all functionality still works

**Status**: ⏳ Pending

---

## Summary

**Total Files to Update**: 5
- `src/lib/logger.js` (create new)
- `src/lib/pdfWorker.js`
- `src/lib/posthog.js`
- `src/components/Auth.jsx`
- `src/pages/Library.jsx`
- `src/pages/Reader.jsx`

**Total Console Calls to Replace**: ~56
- `console.log`: ~28 calls
- `console.error`: ~24 calls
- `console.warn`: ~4 calls

---

## Future Enhancements (Optional)

### Option 1: Keep Errors in Production
Modify logger to always show errors:
```javascript
error: (...args) => {
  console.error(...args) // Always log errors
}
```

### Option 2: Add Log Levels
Add environment variable for log levels:
```javascript
const LOG_LEVEL = import.meta.env.VITE_LOG_LEVEL || (isDev ? 'debug' : 'error')
```

### Option 3: Remote Logging
Send logs to external service in production (e.g., Sentry, LogRocket)

### Option 4: Grouped Logs
Add grouping for related logs:
```javascript
group: (label, fn) => {
  if (isDev) {
    console.group(label)
    fn()
    console.groupEnd()
  }
}
```

---

## Notes

- The logger uses Vite's `import.meta.env.DEV` which is automatically `true` in dev and `false` in production builds
- No build configuration needed - works automatically with Vite
- Minimal performance impact (simple conditional check)
- Easy to extend later if needed

---

## Estimated Time
- Implementation: ~30 minutes
- Testing: ~15 minutes
- **Total**: ~45 minutes

---

**Created**: 2024
**Status**: ⏳ Pending Implementation

