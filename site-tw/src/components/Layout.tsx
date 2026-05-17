import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen">
      <header className="site-header">
        <div className="site-shell flex items-center justify-between py-4">
          <Link to="/" className="font-extrabold text-xl sm:text-2xl tracking-tight">
            <span className="text-brand">Maintainability</span>.ai
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-6 text-slate-300">
            <Link className="site-nav-link" to="/docs/impossible-things">Vision</Link>
            <Link className="site-nav-link" to="/docs/framework">Framework</Link>
            <Link className="site-nav-link" to="/docs/">Docs</Link>
            <Link className="site-nav-link" to="/agenda">Workshop</Link>
            <a className="site-nav-link" href="https://github.com/AliceNN-ucdenver/MaintainabilityAI">GitHub</a>
            <a className="site-button-primary px-4 py-2" href="https://chiefarcheologist.com/contact">Contact</a>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-slate-300 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-900">
            <nav className="flex flex-col px-4 py-4 space-y-3">
              <Link
                className="site-mobile-link"
                to="/docs/impossible-things"
                onClick={() => setMobileMenuOpen(false)}
              >
                Vision
              </Link>
              <Link
                className="site-mobile-link"
                to="/docs/framework"
                onClick={() => setMobileMenuOpen(false)}
              >
                Framework
              </Link>
              <Link
                className="site-mobile-link"
                to="/docs/"
                onClick={() => setMobileMenuOpen(false)}
              >
                Docs
              </Link>
              <Link
                className="site-mobile-link"
                to="/agenda"
                onClick={() => setMobileMenuOpen(false)}
              >
                Workshop
              </Link>
              <a
                className="site-mobile-link"
                href="https://github.com/AliceNN-ucdenver/MaintainabilityAI"
              >
                GitHub
              </a>
              <a
                className="site-button-primary"
                href="https://chiefarcheologist.com/contact"
              >
                Contact
              </a>
            </nav>
          </div>
        )}
      </header>

      <Outlet />

      <footer className="border-t border-slate-800 bg-slate-950">
        <div className="site-shell py-10">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h4 className="font-bold text-lg mb-4 text-brand">Maintainability.ai</h4>
              <p className="text-slate-400 text-sm">
                Security-first AI-assisted engineering. From prompt to production.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link to="/docs/impossible-things" className="site-footer-link">Vision</Link></li>
                <li><Link to="/docs/framework" className="site-footer-link">Framework</Link></li>
                <li><Link to="/docs/" className="site-footer-link">Documentation</Link></li>
                <li><Link to="/agenda" className="site-footer-link">Workshop</Link></li>
                <li><a href="https://github.com/AliceNN-ucdenver/MaintainabilityAI" className="site-footer-link">GitHub</a></li>
                <li><Link to="/docs/governance/governed-golden-rules" className="site-footer-link">Golden Rules</Link></li>
                <li><Link to="/docs/governance/compliance-mapping" className="site-footer-link">Compliance Mapping</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Framework</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link to="/docs/framework" className="site-footer-link">Framework Guide</Link></li>
                <li><Link to="/docs/sdlc/" className="site-footer-link">SDLC Phases</Link></li>
                <li><Link to="/docs/prompts/threat-modeling/" className="site-footer-link">Threat Modeling Prompts</Link></li>
                <li><Link to="/docs/prompts/owasp/" className="site-footer-link">OWASP Prompts</Link></li>
                <li><Link to="/docs/prompts/maintainability/" className="site-footer-link">Maintainability Prompts</Link></li>
                <li><Link to="/docs/quickstart-redqueen" className="site-footer-link">Red Queen Quickstart</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 text-center text-slate-500 text-sm">
            <p>© 2026 Maintainability.ai — Built with Tailwind + Vite. Licensed under MIT.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
