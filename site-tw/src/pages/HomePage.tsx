import React from 'react';
import { Link } from 'react-router-dom';
import {
  availableWorkshopParts,
  storySteps,
  systemLayers,
  workshopRoadmapParts,
} from '../content/siteContent';

export default function HomePage() {
  return (
    <main>
      <section className="site-hero home-hero min-h-[82vh]">
        <div className="home-hero-scene" aria-hidden="true">
          <div className="home-hero-orbit home-hero-orbit-one"></div>
          <div className="home-hero-orbit home-hero-orbit-two"></div>
          <div className="home-hero-line home-hero-line-one"></div>
          <div className="home-hero-line home-hero-line-two"></div>
          <div className="home-hero-node home-hero-node-architecture">
            <span>Architecture</span>
            <strong>CALM + BARs</strong>
          </div>
          <div className="home-hero-node home-hero-node-security">
            <span>Security</span>
            <strong>OWASP + STRIDE</strong>
          </div>
          <div className="home-hero-node home-hero-node-evidence">
            <span>Evidence</span>
            <strong>Tests + scans</strong>
          </div>
          <div className="home-hero-brain">
            <span>MaintainabilityAI</span>
            <strong>Governance brain</strong>
            <em>policy, context, gates</em>
          </div>
          <div className="home-hero-agent">GitHub coding agents</div>
        </div>
        <div className="site-hero-overlay"></div>
        <div className="site-shell relative py-20 md:py-28">
          <div className="home-hero-content">
            <p className="site-eyebrow-cyan">
              Architecture-first governance for agentic coding
            </p>
            <h1 className="site-hero-title home-hero-title">
              Give AI agents the context, constraints, and controls they need to ship safely.
            </h1>
            <p className="site-lede max-w-3xl text-xl text-slate-200 md:text-2xl">
              MaintainabilityAI turns CALM architecture, OWASP prompt packs, fitness functions, and Red Queen policy into the control plane for human and autonomous software engineering.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row flex-wrap gap-4">
              <Link to="/docs/framework" className="site-button-primary-large">
                See the Framework
              </Link>
              <Link to="/docs/workshop" className="site-button-cyan-large">
                Start the Workshop
              </Link>
              <a href="https://marketplace.visualstudio.com/items?itemName=chiefarcheologist.maintainabilityai" className="site-button-secondary-large">
                Install the Extension
              </a>
            </div>
          </div>

          <div className="mt-16 grid gap-3 sm:grid-cols-3 max-w-4xl">
            <div className="site-metric border-emerald-400/40 bg-emerald-400/10">
              <div className="site-metric-value text-emerald-300">70%</div>
              <p className="mt-1 text-sm text-emerald-50">AI handles boilerplate, CRUD, and scaffolding well.</p>
            </div>
            <div className="site-metric border-rose-400/40 bg-rose-400/10">
              <div className="site-metric-value text-rose-300">30%</div>
              <p className="mt-1 text-sm text-rose-50">Architecture, security posture, and governance still decide outcomes.</p>
            </div>
            <div className="site-metric border-cyan-400/40 bg-cyan-400/10">
              <div className="site-metric-value text-cyan-300">1</div>
              <p className="mt-1 text-sm text-cyan-50">Control plane shared by developers, reviewers, and coding agents.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="site-band-bottom">
        <div className="site-shell site-section-tight">
          <div className="grid md:grid-cols-[0.9fr_1.1fr] gap-10 items-start">
            <div>
              <p className="site-eyebrow">What this is</p>
              <h2 className="site-heading">The missing brain between your architecture and your AI coding agents.</h2>
            </div>
            <div className="space-y-4 text-lg text-slate-300 leading-relaxed">
              <p>
                Prompt packs help, but prompts are advisory. MaintainabilityAI makes the architecture model, security controls, and quality gates visible to the people and agents doing the work.
              </p>
              <p>
                The result is a practical external-facing framework: teach the team, scaffold the repo, guide the agent, validate the change, and keep improving the system with measurable feedback.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="site-shell site-section">
        <div className="max-w-3xl">
          <p className="site-eyebrow">The system</p>
          <h2 className="site-heading">Three capabilities, one governed workflow.</h2>
          <p className="site-lede text-slate-400">
            Looking Glass gives agents the architectural map. Cheshire turns secure intent into implementation-ready artifacts. Red Queen enforces the rules when autonomy increases.
          </p>
        </div>

        <div className="mt-10 grid lg:grid-cols-3 gap-6">
          {systemLayers.map((layer) => (
            <Link key={layer.title} to={layer.href} className="site-system-card">
              <div className="aspect-[16/10] bg-slate-950 overflow-hidden">
                <img src={layer.image} alt={`${layer.title} preview`} className="site-system-image" />
              </div>
              <div className="p-6">
                <div className="text-xs uppercase tracking-[0.18em] text-cyan-300 font-semibold">{layer.label}</div>
                <h3 className="mt-2 text-2xl font-bold text-white">{layer.title}</h3>
                <p className="mt-3 text-slate-300 leading-relaxed">{layer.body}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="site-band">
        <div className="site-shell site-section">
          <div className="max-w-3xl">
            <p className="site-eyebrow">Human path</p>
            <h2 className="site-heading">A site journey that matches how teams adopt the work.</h2>
          </div>
          <div className="mt-10 grid md:grid-cols-4 gap-4">
            {storySteps.map((step, index) => (
              <Link key={step.title} to={step.href} className="site-card-link">
                <div className="text-brand text-sm font-bold">0{index + 1}</div>
                <h3 className="mt-3 text-xl font-bold">{step.title}</h3>
                <p className="mt-3 text-sm text-slate-400 leading-relaxed">{step.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="site-shell site-section">
        <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-10">
          <div>
            <p className="site-eyebrow">Workshop</p>
            <h2 className="site-heading">Teach the full arc from prompt discipline to governed autonomy.</h2>
            <p className="site-lede">
              The canonical learner path lives in the docs workshop. The agenda page stays focused on delivery format, audience, and outcomes for teams deciding whether to bring the workshop in.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link to="/docs/workshop" className="site-button-primary">
                Begin Learner Path
              </Link>
              <Link to="/agenda" className="site-button-secondary">
                View Team Agenda
              </Link>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <div className="text-sm uppercase tracking-[0.18em] text-emerald-300 font-semibold">Available now: All 8 parts</div>
              <div className="mt-3 grid sm:grid-cols-2 gap-3">
                {availableWorkshopParts.map(({ part, title, body }) => (
                  <div key={part} className="site-card-compact border-emerald-400/25 bg-emerald-400/5">
                    <div className="text-xs text-emerald-300 font-semibold">{part}</div>
                    <h3 className="mt-1 font-bold text-white">{title}</h3>
                    <p className="mt-2 text-sm text-slate-400">{body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm uppercase tracking-[0.18em] text-cyan-300 font-semibold">Roadmap: Research + PRD agents</div>
              <div className="mt-3 grid sm:grid-cols-2 gap-3">
                {workshopRoadmapParts.map(({ part, title, subtitle, body, href }) => {
                  const card = (
                    <div key={part + title} className="site-card-compact border-cyan-400/20 bg-cyan-400/5 h-full">
                      <div className="text-xs text-cyan-300 font-semibold">{part}</div>
                      <h3 className="mt-1 font-bold text-white">{title}</h3>
                      {subtitle ? <div className="mt-1 text-xs text-cyan-200/80">{subtitle}</div> : null}
                      <p className="mt-2 text-sm text-slate-400">{body}</p>
                    </div>
                  );
                  return href
                    ? <Link key={part + title} to={href} className="block hover:opacity-95 transition-opacity">{card}</Link>
                    : card;
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="site-band">
        <div className="site-shell site-section">
          <div className="max-w-3xl">
            <p className="site-eyebrow">Reusable assets</p>
            <h2 className="site-heading">Prompt packs and docs that support the same operating model.</h2>
            <p className="site-lede">
              STRIDE starts the design conversation. OWASP shapes the secure implementation. Maintainability packs keep the architecture evolvable after the first release.
            </p>
          </div>

          <div className="mt-10 grid md:grid-cols-3 gap-6">
            <Link to="/docs/prompts/threat-modeling" className="docs-card docs-card-orange">
              <h3 className="docs-card-title docs-card-title-lg">STRIDE Threat Modeling</h3>
              <p className="docs-card-body">Design-phase prompts that turn architecture context into threat scenarios and OWASP control mappings.</p>
            </Link>
            <Link to="/docs/prompts/owasp" className="docs-card docs-card-rose">
              <h3 className="docs-card-title docs-card-title-lg">OWASP Top 10</h3>
              <p className="docs-card-body">Implementation prompts, attack vectors, review checklists, and validation steps for secure code generation.</p>
            </Link>
            <Link to="/docs/prompts/maintainability" className="docs-card docs-card-emerald">
              <h3 className="docs-card-title docs-card-title-lg">Evolutionary Architecture</h3>
              <p className="docs-card-body">Fitness functions, dependency hygiene, technical debt, and refactoring prompts for long-lived systems.</p>
            </Link>
          </div>
        </div>
      </section>

      <section id="contact" className="site-shell site-section">
        <div className="grid lg:grid-cols-[1fr_0.8fr] gap-10 items-center">
          <div>
            <p className="site-eyebrow">Ready path</p>
            <h2 className="site-heading">Start with the framework, then bring the workshop to your team.</h2>
            <p className="site-lede">
              The public docs are open for self-guided teams. The workshop and extension help organizations turn the framework into daily practice across developers, reviewers, and GitHub coding agents.
            </p>
          </div>
          <div className="site-card">
            <div className="flex flex-col gap-3">
              <a href="https://chiefarcheologist.com/contact" className="site-button-primary">
                Contact Chief Archeologist
              </a>
              <a href="https://github.com/AliceNN-ucdenver/MaintainabilityAI" className="site-button-secondary">
                Explore on GitHub
              </a>
              <Link to="/docs/impossible-things" className="site-button-cyan">
                Read Impossible Things
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
