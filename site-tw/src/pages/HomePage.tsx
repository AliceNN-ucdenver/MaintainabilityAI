import React from 'react';
import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-700/20 via-fuchsia-600/10 to-cyan-500/10 blur-3xl"></div>
        <div className="max-w-6xl mx-auto px-6 py-24 md:py-32 relative">
          <div className="max-w-4xl">
            <h1 className="text-5xl md:text-7xl font-black leading-tight">
              Secure, Maintainable <span className="text-brand">AI Engineering</span>
            </h1>
            <p className="mt-6 text-xl md:text-2xl text-slate-300 max-w-3xl leading-relaxed">
              From prompt to production. We help engineering orgs ship faster <strong className="text-white">without</strong> sacrificing security or maintainability.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row flex-wrap gap-4">
              <Link to="/docs/sdlc" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-brand text-slate-900 font-bold text-lg hover:bg-indigo-400 transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                SDLC
              </Link>
              <Link to="/agenda" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border-2 border-brand text-brand hover:bg-brand/10 font-semibold text-lg transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Workshop Agenda
              </Link>
              <Link to="/docs/" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border-2 border-slate-700 hover:bg-slate-900 font-semibold text-lg transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Docs
              </Link>
              <a href="https://github.com/AliceNN-ucdenver/MaintainabilityAI" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-slate-700 hover:border-slate-600 font-semibold text-lg transition">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Why Now */}
      <section className="border-t border-slate-800 bg-slate-900/30">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-bold">Why Now?</h2>
            <p className="mt-6 text-xl text-slate-300 leading-relaxed">
              AI accelerates everything—<strong className="text-white">good code and bad</strong>. Teams need <strong className="text-brand">standards, prompts, and pipelines</strong> that turn LLM speed into reliable, secure outcomes.
            </p>
            <p className="mt-4 text-lg text-slate-400 leading-relaxed">
              Without governance, AI becomes a security liability. With the right framework, it's a force multiplier that maintains quality at velocity.
            </p>
          </div>
        </div>
      </section>

      {/* What We Do */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">What We Do</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="rounded-2xl border border-slate-800 p-8 bg-slate-900/50 hover:border-brand/50 transition">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="font-bold text-2xl mb-3">Prompt Engineering</h3>
            <p className="text-slate-300 leading-relaxed">
              Security-first prompt packs aligned to <strong className="text-white">OWASP Top 10</strong>. Turn vague requests into precise, secure implementations.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 p-8 bg-slate-900/50 hover:border-brand/50 transition">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="font-bold text-2xl mb-3">Agentic Workflows</h3>
            <p className="text-slate-300 leading-relaxed">
              Claude Code, Copilot, and ChatGPT patterns with <strong className="text-white">defense-in-depth guardrails</strong>. AI becomes your security-aware junior dev.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 p-8 bg-slate-900/50 hover:border-brand/50 transition">
            <div className="text-4xl mb-4">🛡️</div>
            <h3 className="font-bold text-2xl mb-3">CI/CD Security Gates</h3>
            <p className="text-slate-300 leading-relaxed">
              <strong className="text-white">CodeQL, Snyk, ESLint</strong> wired into your pipeline. Catch vulnerabilities before they ship, automatically.
            </p>
          </div>
        </div>
      </section>

      {/* Our Approach */}
      <section className="border-t border-slate-800 bg-slate-900/30">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Our Approach</h2>
          <p className="text-center text-slate-400 mb-12 max-w-2xl mx-auto">
            Comprehensive training and resources for teams adopting AI-assisted development
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-slate-800 p-6 bg-slate-950/50">
              <h3 className="font-bold text-xl mb-2">AI-Assisted Development Workshop</h3>
              <p className="text-slate-400 text-sm mb-3">8-part series, junior → senior friendly</p>
              <p className="text-slate-300">
                Hands-on training covering the spectrum from vibe coding to agentic workflows. Includes live OWASP remediation exercises and team prompt library creation.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 p-6 bg-slate-950/50">
              <h3 className="font-bold text-xl mb-2">Prompt Exchange Kit</h3>
              <p className="text-slate-400 text-sm mb-3">STRIDE + OWASP + Maintainability packs</p>
              <p className="text-slate-300">
                Production-ready prompt templates for STRIDE threat modeling, OWASP Top 10, and Evolutionary Architecture patterns. Copy-paste ready for Claude Code, Copilot, and ChatGPT.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 p-6 bg-slate-950/50">
              <h3 className="font-bold text-xl mb-2">Secure SDLC Implementation</h3>
              <p className="text-slate-400 text-sm mb-3">CodeQL/Snyk gates + policies</p>
              <p className="text-slate-300">
                End-to-end security pipeline setup with automated gates, PR templates, and security policies. Turn your CI/CD into a security enforcement layer.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 p-6 bg-slate-950/50">
              <h3 className="font-bold text-xl mb-2">Agentic Enablement</h3>
              <p className="text-slate-400 text-sm mb-3">Claude Code / Copilot patterns</p>
              <p className="text-slate-300">
                Custom CLAUDE.md standards, agent orchestration patterns, and multi-agent security workflows. Maximize AI productivity while maintaining guardrails.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 p-6 bg-slate-950/50 md:col-span-2">
              <h3 className="font-bold text-xl mb-2">Org Change & Governance</h3>
              <p className="text-slate-400 text-sm mb-3">Policies, metrics, adoption playbooks</p>
              <p className="text-slate-300">
                The Golden Rules framework for AI governance, metrics dashboards, and adoption playbooks. Transform your organization's approach to AI-assisted development with measurable outcomes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Framework in Action */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Framework in Action</h2>
        <p className="text-center text-slate-400 mb-12 max-w-2xl mx-auto">
          Everything we teach is battle-tested, production-ready, and open source
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="rounded-xl border border-slate-800 p-6 bg-gradient-to-br from-slate-900 to-slate-950">
            <div className="text-brand text-4xl font-black mb-2">10/10</div>
            <h4 className="font-bold text-lg mb-2">OWASP Coverage</h4>
            <p className="text-slate-400 text-sm">
              Complete prompt packs for all OWASP Top 10 (2021) categories with vulnerable examples and tests
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 p-6 bg-gradient-to-br from-slate-900 to-slate-950">
            <div className="text-brand text-4xl font-black mb-2">100%</div>
            <h4 className="font-bold text-lg mb-2">Test Coverage</h4>
            <p className="text-slate-400 text-sm">
              Every OWASP category includes security tests, vulnerable code samples, and remediation guidance
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 p-6 bg-gradient-to-br from-slate-900 to-slate-950">
            <div className="text-brand text-4xl font-black mb-2">3</div>
            <h4 className="font-bold text-lg mb-2">AI Tools</h4>
            <p className="text-slate-400 text-sm">
              Prompts optimized for Claude Code, GitHub Copilot, and ChatGPT with tool-specific variations
            </p>
          </div>
        </div>

        <div className="mt-12 rounded-2xl border border-slate-700 bg-slate-900/50 p-8">
          <h3 className="font-bold text-2xl mb-4">Open Source Foundation</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold text-lg mb-3 text-brand">Starter Kit Includes</h4>
              <ul className="space-y-2 text-slate-300">
                <li>✓ Vulnerable TypeScript samples (A01-A10)</li>
                <li>✓ Security test suites with attack vectors</li>
                <li>✓ Complete STRIDE + OWASP + Maintainability prompt packs</li>
                <li>✓ CI/CD workflows (CodeQL + Snyk)</li>
                <li>✓ 8-part workshop curriculum</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-lg mb-3 text-brand">Documentation</h4>
              <ul className="space-y-2 text-slate-300">
                <li>✓ Golden Rules governance framework</li>
                <li>✓ 6-layer security pipeline guide</li>
                <li>✓ Fitness functions + dependency hygiene katas</li>
                <li>✓ PR templates with AI disclosure</li>
                <li>✓ CLAUDE.md standards for agents</li>
              </ul>
            </div>
          </div>
          <div className="mt-6">
            <a href="https://github.com/AliceNN-ucdenver/MaintainabilityAI" className="inline-flex items-center gap-2 text-brand hover:text-indigo-400 font-semibold">
              View on GitHub
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Prompt Pack Libraries */}
      <section className="border-t border-slate-800 bg-slate-900/30">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Security & Maintainability Prompt Packs</h2>
          <p className="text-center text-slate-400 mb-12 max-w-3xl mx-auto">
            Production-ready AI prompts for secure, maintainable code generation. Each pack includes role definition, context, requirements, validation checklists, and tool-specific variations.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Threat Modeling (STRIDE) */}
            <div className="rounded-2xl border border-slate-700 bg-slate-950/50 p-8 hover:border-brand/50 transition">
              <div className="text-5xl mb-4">🎯</div>
              <h3 className="font-bold text-2xl mb-3">STRIDE Threat Modeling</h3>
              <p className="text-slate-300 leading-relaxed mb-6">
                AI-powered threat detection <strong className="text-white">before code is written</strong>. Systematic identification using Microsoft's 6-category STRIDE framework.
              </p>
              <ul className="space-y-2 text-slate-400 text-sm mb-6">
                <li>✓ 6 STRIDE categories (Spoofing → Elevation)</li>
                <li>✓ Auto-maps threats to OWASP controls</li>
                <li>✓ 93% threats found pre-code</li>
                <li>✓ Saves 4hrs per feature</li>
              </ul>
              <Link to="/docs/prompts/threat-modeling" className="inline-flex items-center gap-2 text-brand hover:text-indigo-400 font-semibold">
                View STRIDE Prompt Packs
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* OWASP Top 10 */}
            <div className="rounded-2xl border border-slate-700 bg-slate-950/50 p-8 hover:border-brand/50 transition">
              <div className="text-5xl mb-4">🛡️</div>
              <h3 className="font-bold text-2xl mb-3">OWASP Top 10 (2021)</h3>
              <p className="text-slate-300 leading-relaxed mb-6">
                Security-first prompts for <strong className="text-white">10 critical vulnerability categories</strong>. Embed OWASP requirements directly into AI code generation.
              </p>
              <ul className="space-y-2 text-slate-400 text-sm mb-6">
                <li>✓ Complete A01-A10 coverage</li>
                <li>✓ Parameterized queries, RBAC, crypto</li>
                <li>✓ Before/after code examples</li>
                <li>✓ Attack vector test suites</li>
              </ul>
              <Link to="/docs/prompts/owasp" className="inline-flex items-center gap-2 text-brand hover:text-indigo-400 font-semibold">
                View OWASP Prompt Packs
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* Evolutionary Architecture */}
            <div className="rounded-2xl border border-slate-700 bg-slate-950/50 p-8 hover:border-brand/50 transition">
              <div className="text-5xl mb-4">📐</div>
              <h3 className="font-bold text-2xl mb-3">Evolutionary Architecture</h3>
              <p className="text-slate-300 leading-relaxed mb-6">
                Maintainability patterns for <strong className="text-white">long-lived systems</strong>. AI-assisted refactoring with automated fitness functions.
              </p>
              <ul className="space-y-2 text-slate-400 text-sm mb-6">
                <li>✓ Fitness functions (complexity ≤10)</li>
                <li>✓ Dependency hygiene (≤90 days)</li>
                <li>✓ Strangler Fig migrations</li>
                <li>✓ Technical debt tracking</li>
              </ul>
              <Link to="/docs/prompts/maintainability" className="inline-flex items-center gap-2 text-brand hover:text-indigo-400 font-semibold">
                View Maintainability Packs
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-slate-400 mb-4">All prompt packs optimized for Claude Code, GitHub Copilot, and ChatGPT</p>
            <Link to="/docs/" className="inline-flex items-center gap-2 text-brand hover:text-indigo-400 font-semibold text-lg">
              Browse Complete Documentation
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* How We Work */}
      <section className="border-t border-slate-800 bg-slate-900/30">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">How We Work</h2>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-brand text-slate-900 font-black text-2xl flex items-center justify-center mx-auto mb-4">1</div>
              <h4 className="font-bold text-lg mb-2">Assess</h4>
              <p className="text-slate-400 text-sm">
                Evaluate current AI usage, security posture, and team readiness
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-brand text-slate-900 font-black text-2xl flex items-center justify-center mx-auto mb-4">2</div>
              <h4 className="font-bold text-lg mb-2">Pilot</h4>
              <p className="text-slate-400 text-sm">
                Run workshop with 1-2 teams, establish prompt library and CI gates
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-brand text-slate-900 font-black text-2xl flex items-center justify-center mx-auto mb-4">3</div>
              <h4 className="font-bold text-lg mb-2">Rollout</h4>
              <p className="text-slate-400 text-sm">
                Scale governance framework, templates, and policies across org
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-brand text-slate-900 font-black text-2xl flex items-center justify-center mx-auto mb-4">4</div>
              <h4 className="font-bold text-lg mb-2">Optimize</h4>
              <p className="text-slate-400 text-sm">
                Metrics-driven iteration on prompts, policies, and processes
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="max-w-6xl mx-auto px-6 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-slate-300 mb-8">
            Let's discuss how we can help your team ship faster without compromising security.
          </p>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="https://chiefarcheologist.com/contact" className="px-6 sm:px-8 py-4 rounded-xl bg-brand text-slate-900 hover:bg-indigo-400 transition font-bold text-base sm:text-lg text-center">
                Contact Chief Archeologist
              </a>
              <a href="https://github.com/AliceNN-ucdenver/MaintainabilityAI" className="px-6 sm:px-8 py-4 rounded-xl border-2 border-slate-700 hover:border-brand hover:bg-slate-900 transition font-semibold text-base sm:text-lg text-center">
                Explore on GitHub
              </a>
              <Link to="/docs/workshop" className="px-6 sm:px-8 py-4 rounded-xl border-2 border-brand text-brand hover:bg-brand/10 transition font-semibold text-base sm:text-lg text-center">
                Start Workshop
              </Link>
            </div>
          </div>

          <p className="mt-8 text-slate-500 text-sm">
            All services available for remote delivery or on-site workshops
          </p>
        </div>
      </section>
    </>
  );
}
