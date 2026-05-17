import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import './styles.css';
import Layout from './components/Layout';
import PageLoading from './components/PageLoading';
import { safeRedirectPath } from './lib/redirects';

const HomePage = React.lazy(() => import('./pages/HomePage'));
const WorkshopPage = React.lazy(() => import('./pages/WorkshopPage'));
const MarkdownPage = React.lazy(() => import('./components/MarkdownPage'));

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
      <React.Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="agenda.html" element={<WorkshopPage />} />
            <Route path="agenda" element={<WorkshopPage />} />
            <Route path="docs/*" element={<MarkdownPage />} />

            <Route path="*" element={<MarkdownPage />} />
          </Route>
        </Routes>
      </React.Suspense>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
