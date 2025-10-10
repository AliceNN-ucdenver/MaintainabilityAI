# MaintainabilityAI

![CI](https://img.shields.io/badge/CI-passing-brightgreen)
![Security](https://img.shields.io/badge/Security-OWASP%20Top%2010-blueviolet)
![License](https://img.shields.io/badge/License-MIT-yellow)

A pragmatic framework and workshop kit for **security‑first AI‑assisted engineering**.  
This repo now **publishes the bold Tailwind site** as the main GitHub Pages site, while nesting the **docs** under `/docs/` inside that site.

- Live site (after you push): `https://AliceNN-ucdenver.github.io/MaintainabilityAI/`
- Docs path: `/docs/`
- Custom domain (optional): `maintainability.ai`

## Quick Start
```bash
# install
npm i

# build + test (examples are TypeScript)
npm run build && npm run test

# local dev for the Tailwind site
cd site-tw
npm i
npm run dev
```

## Structure
- `site-tw/` — Tailwind + Vite marketing site (deployed to Pages). Includes **Workshop Agenda** and links to docs.
- `docs/` — Jekyll docs (just‑the‑docs). Built by the Pages workflow and copied under `/docs/` in the deployed artifact.
- `.github/workflows/pages.yml` — Builds **both** the Tailwind site and the Jekyll docs, then deploys a single artifact.
