import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './styles.css';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import WorkshopPage from './pages/WorkshopPage';
import MarkdownPage from './components/MarkdownPage';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="agenda.html" element={<WorkshopPage />} />
          <Route path="agenda" element={<WorkshopPage />} />
          <Route path="services.html" element={<MarkdownPage path="/docs/services.md" />} />
          <Route path="services" element={<MarkdownPage path="/docs/services.md" />} />

          {/* Docs routes */}
          <Route path="docs/*" element={<MarkdownPage />} />

          {/* Catch-all for backwards compatibility */}
          <Route path="*" element={<MarkdownPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
