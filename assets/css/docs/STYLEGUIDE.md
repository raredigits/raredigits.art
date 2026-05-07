# Rare Styles — Maintainer Workflow

This file documents the canonical CSS workflow for Rare Styles inside `raredigits.art`.

## Runtime

- Node: use the version pinned in `.nvmrc`
- Install dependencies with `npm install`

## Canonical commands

- `npm run lint:css`
  Runs Stylelint against `assets/css/**/*.scss`. This is the canonical CSS quality gate.

- `npm run build:css`
  Compiles `assets/css/rare.scss` into:
  - `assets/css/rare.css`
  - `assets/css/rare.min.css`

- `npm run watch:css`
  Watches SCSS and rebuilds `assets/css/rare.css`.

- `npm run watch:css:min`
  Watches SCSS and rebuilds `assets/css/rare.min.css`.

- `npm run sass-watch`
  Runs both watch tasks in parallel.

## Day-to-day editing flow

1. Make SCSS changes in `assets/css/modules/**` or `assets/css/rare.scss`.
2. Use `npm run watch:css` or `npm run sass-watch` while iterating.
3. Run `npm run lint:css` before considering the work ready.
4. Run `npm run build:css` before release-sensitive changes are merged.

## Release expectation for CSS changes

Before shipping a CSS-affecting release:

1. `npm run lint:css`
2. `npm run build:css`
3. If the site shell or examples changed, run `npm run build`

## Icon policy

- Canonical icon family for new Rare Styles work: `Material Symbols Outlined`
- Legacy families temporarily retained for backward compatibility:
  - `material-icons`
  - `material-icons-outlined`
- New markup should not introduce additional dependencies on legacy Material icon classes
- When migrating legacy spans to `material-symbols-outlined`, verify icon-name compatibility first. Some names stay the same (`search`, `menu`, `close`, `construction`), while others may differ (for example `file_download` → `download`)
- Pseudo-element and `data-icon` usage should prefer `Material Symbols Outlined`

## Public asset contract

- Canonical public asset folder for externally reusable Rare Styles images: `assets/css/images/**`
- Current canonical reusable assets include:
  - `assets/css/images/wa.svg`
  - `assets/css/images/github.svg`
  - `assets/css/images/rare-digits/rare-logo-black.svg`
- These files are deployed with the site and can be referenced through versioned jsDelivr URLs after release tagging
- Before a release tag exists, library code may still point at local project paths
- After tagging a release, library-facing asset references should be updated to canonical versioned CDN URLs rather than old project-internal image paths
- Treat `assets/css/images/**` as a public contract: renames or removals should be considered breaking for downstream consumers

## CI expectation

The main site deploy workflow must run `npm run lint:css` before `npm run build` so invalid SCSS does not ship in the generated bundle.
