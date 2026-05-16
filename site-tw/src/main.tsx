import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import './styles.css';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import WorkshopPage from './pages/WorkshopPage';
import MarkdownPage from './components/MarkdownPage';

function safeRedirectPath(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return null;
  }

  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.origin !== window.location.origin) {
      return null;
    }

    const path = parsed.pathname;
    const isAllowedPath =
      path === '/' ||
      path === '/agenda' ||
      path === '/agenda.html' ||
      path === '/docs' ||
      path.startsWith('/docs/');

    return isAllowedPath ? `${parsed.pathname}${parsed.search}${parsed.hash}` : null;
  } catch {
    return null;
  }
}

// Component to handle GitHub Pages SPA redirect
function RedirectHandler() {
  const navigate = useNavigate();

  React.useEffect(() => {
    const redirectPath = safeRedirectPath(sessionStorage.getItem('redirectPath'));
    if (redirectPath) {
      sessionStorage.removeItem('redirectPath');
      navigate(redirectPath, { replace: true });
    } else {
      sessionStorage.removeItem('redirectPath');
    }
  }, [navigate]);

  return null;
}

// Component to scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <RedirectHandler />
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="agenda.html" element={<WorkshopPage />} />
          <Route path="agenda" element={<WorkshopPage />} />
          {/* Docs routes */}
          <Route path="docs/*" element={<MarkdownPage />} />

          {/* Catch-all for backwards compatibility */}
          <Route path="*" element={<MarkdownPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
