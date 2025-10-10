# GitHub Pages SPA Fix

## Problem

When users navigate directly to URLs like:
- `https://maintainability.ai/docs/`
- `https://maintainability.ai/docs/workshop/part1-spectrum`

GitHub Pages returns a 404 error because these routes don't exist as physical files - they're client-side React Router routes.

## Solution Implemented

### 1. Created `404.html` Redirect Handler

**File**: `site-tw/public/404.html`

This file is served by GitHub Pages when a route is not found. It:
- Saves the requested path to `sessionStorage`
- Redirects to the root `/` (index.html)
- Allows React to take over and handle the routing

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Redirecting...</title>
  <script>
    sessionStorage.setItem('redirectPath', location.pathname + location.search + location.hash);
    location.replace(location.origin);
  </script>
</head>
<body>
  Redirecting...
</body>
</html>
```

### 2. Updated React App to Handle Redirects

**File**: `site-tw/src/main.tsx`

Added a `RedirectHandler` component that:
- Runs on app initialization
- Checks `sessionStorage` for a saved redirect path
- Navigates to that path using React Router
- Cleans up the sessionStorage

```typescript
function RedirectHandler() {
  const navigate = useNavigate();

  React.useEffect(() => {
    const redirectPath = sessionStorage.getItem('redirectPath');
    if (redirectPath) {
      sessionStorage.removeItem('redirectPath');
      navigate(redirectPath, { replace: true });
    }
  }, [navigate]);

  return null;
}
```

### 3. Added `.nojekyll` File

**File**: `site-tw/public/.nojekyll`

This empty file tells GitHub Pages:
- Don't run Jekyll processing
- Serve files starting with underscores (like Vite's `_assets/`)

## How It Works

1. **User navigates to**: `https://maintainability.ai/docs/workshop/part1-spectrum`
2. **GitHub Pages**: Can't find that file, serves `404.html`
3. **404.html script**: Saves path to sessionStorage, redirects to `/`
4. **React loads**: index.html loads, React app initializes
5. **RedirectHandler**: Reads sessionStorage, navigates to `/docs/workshop/part1-spectrum`
6. **React Router**: Handles the route, loads the correct MarkdownPage component

## Testing

After deploying to GitHub Pages, test these URLs:

- ✅ `https://maintainability.ai/docs/`
- ✅ `https://maintainability.ai/docs/workshop/`
- ✅ `https://maintainability.ai/docs/workshop/part1-spectrum`
- ✅ `https://maintainability.ai/docs/sdlc/phase1-design`
- ✅ `https://maintainability.ai/agenda`

All should load correctly without 404 errors.

## Files Changed

1. **Created**: `site-tw/public/404.html` - Redirect handler
2. **Created**: `site-tw/public/.nojekyll` - Disable Jekyll
3. **Modified**: `site-tw/src/main.tsx` - Added RedirectHandler component

## Deployment

The fix will be deployed automatically when you push to `main`:

```bash
git add site-tw/public/404.html site-tw/public/.nojekyll site-tw/src/main.tsx
git commit -m "fix: Add GitHub Pages SPA redirect support

- Create 404.html to handle direct navigation to routes
- Add .nojekyll to prevent Jekyll processing
- Add RedirectHandler component to restore paths
- Fixes navigation to /docs/ and subpages

Resolves direct link issues for:
- /docs/
- /docs/workshop/part1-spectrum
- All other client-side routes"

git push origin main
```

## Why This Approach?

This is the [recommended solution](https://github.com/rafgraph/spa-github-pages) for SPAs on GitHub Pages because:
- ✅ No server-side configuration needed
- ✅ Works with GitHub Pages limitations
- ✅ Preserves the full URL path
- ✅ Maintains browser history correctly
- ✅ SEO-friendly (Google can index the pages)
- ✅ No additional dependencies

## Alternative Approaches (Not Used)

1. **Hash Router** (`/#/docs/...`) - Works but ugly URLs
2. **Custom server** - Not possible with GitHub Pages
3. **Pre-rendering** - Complex setup, not needed for our use case
