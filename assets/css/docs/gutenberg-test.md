# Gutenberg — consumer-driven release plan (proposal)

**Status:** proposal. Not merged into `docs/BACKLOG.md`, nothing here is scheduled or decided.
**Created:** 1 October 2026. **Library state analysed:** `v0.6.19`, `main` at `ae45177`.
**Backlog revision this was written against:** 1275 lines, 266 `CSS-NNN` ids, latest `CSS-341`. All references below were verified against that revision.
**Purpose:** record what a fourth live consumer needs from the library and how that changes the release order, so the two can be reviewed together and folded into the main backlog.

New work carries temporary `GUT-NNN` ids to avoid collisions; the `CSS-NNN` sequence is occupied through `CSS-341`, so these renumber from `CSS-342` on merge.

## The candidate consumer

`gut39.ru` — a commercial multi-page site for a printing and advertising-production company. Measured on 27 September 2026 at commit `aed6771`:

| Metric | Value |
|---|---|
| Public routes | 46 |
| Stylesheets | 57 files, 24 153 lines |
| Split | 44 page-specific files (23 125 lines) vs 13 shared (1 028) |
| Declarations | 8 635 total, 2 488 unique — **71% repeats** |
| Hero block declared locally | **41 of 44 page files** |
| Distinct `max-width` breakpoints inside `@media` | **34** |
| Lead forms | 19 components, 305 fields — the site's primary CTA is a form |
| Files depending on `container-type` / `cqi` | 12 |
| `@font-face` declarations | **0** — system Arial/Georgia by design |
| Display headings | `clamp()` up to 94px, `font-weight: 950`, uppercase, `letter-spacing: -.055em` |
| CSS shipped | 753.7 KB raw, 128.1 KB gzip |

Two properties make this consumer a useful test of the embed promise. It is heavy — 23 125 lines of page CSS that must keep working during migration. And it is opinionated — a brand display scale and system fonts that the library's theme layer must not override.

## What already fits, unchanged

| Existing task | Why it fits |
|---|---|
| `CSS-318` / `CSS-319` / `CSS-320` / `CSS-338` — `rare.embed.css`, layer extraction, hostile-host fixture (`v0.6.21`) | Exactly the shape this consumer needs: structure and components without the page theme or shell. Solves coexistence with the existing page CSS and keeps the consumer's system fonts — the 458 KB of self-hosted families stay out of the embed build |
| `CSS-100`–`CSS-105` — forms through one `.rd-form` container | Matches the consumer's markup: plain `label`/`input`/`select` inside a form, no per-field classes. All 19 forms share one submission pipeline and one stylesheet, so a container-scoped form module replaces it directly |
| `CSS-150` / `CSS-160` — page layouts (`v0.6.22`) | Covers the shell the consumer currently reimplements per page |

`CSS-338` deserves a note: this consumer is a ready-made real-world hostile host. A 23 125-line legacy stylesheet with 34 breakpoints is a stronger fixture than a synthetic one.

## Tasks to pull forward

Nothing here is new work — it is scheduling. All five already exist in the backlog, but sit after the point where this consumer would need them.

| ID | Task | Current milestone | Proposed | Why the current slot does not work |
|---|---|---|---|---|
| `CSS-100`–`CSS-105` | Forms | `v0.7.0` | `v0.6.22` | The site's primary conversion action is a form. 305 fields across 19 components; a migration that cannot carry forms is not a migration |
| `CSS-164` | Fluid type scale | `0.8.1` | `v0.6.22` | The display scale **is** the brand. Today the library tops out at `--font-size-xxxl: 3.5rem` fixed, consumed by `h1`; the consumer runs `clamp()` to 94px |
| `CSS-130` | `@layer reset, vendor, base, tokens, components, utilities` at the root | `0.8.1` | `v0.6.21` | Needed from day one, not at the end. `CSS-318`/`CSS-319` already extract layers for the embed build, so most of the work lands there anyway |
| `CSS-310` | Longread furniture incl. hero/masthead | post-1.0 P2 | `v0.6.22` | Hero is declared locally in 41 of 44 page files — the single most repeated pattern in the consumer |
| `CSS-312` | Pagination + breadcrumbs | post-1.0 P2 | `v0.6.23` | Breadcrumbs appear on nearly every route |
| `CSS-300` | Container queries for adaptive components | post-1.0 P2 | `v0.6.22` | 12 files in the consumer depend on container-based sizing. These are not decoration — they are the fix for a class of overflow defects whose root cause was sizing against the viewport inside a constrained column. Migrating without them reintroduces closed defects. See `GUT-002` for the scope difference |

The pattern is consistent: `CSS-164` and `@layer` currently sit **after** the deliberate breaking boundary at `v0.7.0`, which is the wrong side of it for a consumer whose identity is typography and whose migration starts with cascade coexistence.

## New work

Six items with no equivalent in the current backlog.

| ID | Type | Task | Estimate |
|---|---|---|---|
| `GUT-001` | feat | **Display scale tokens.** The scale is fixed rem with `--font-size-xxxl: 3.5rem` as the display size. Add a display tier above it, expressed fluidly, plus a weight token above `--font-weight-black: 900` — the consumer's approved H1 is `font-weight: 950` and that is a protected brand property on its side. Coordinates with `CSS-164` and the `CSS-136` token renames | M |
| `GUT-002` | feat | **Container *units* for sizing — scope extension to `CSS-300`.** `CSS-300` frames container queries as `@container` rules for adaptive components. The consumer's need is narrower and different: container **units** (`cqi`) for fluid sizing inside a constrained column, with `container-type: inline-size` on the wrapper and no `@container` rule at all — 12 files, 13 usages, zero `@container`. Both belong in the same module; this records that `CSS-300` as written does not cover it | S |
| `GUT-003` | feat | **Breakpoints beyond three steps.** `utilities/_breakpoints.scss` offers `mobile ≤768`, `tablet 769–1023`, `desktop ≥1024` through mixins only. The consumer has a load-bearing navigation breakpoint at 1100px that its own contributor guide requires to be verified on every change. Either expose the step list for configuration or add named steps between tablet and desktop | S |
| `GUT-004` | fix | **Coarse-pointer form baseline.** Any field below 16px makes iOS Safari zoom the page on focus and never restore it. The consumer shipped this defect on 35 of 46 routes before it was found. A form module that ships a `@media (hover:none) and (pointer:coarse)` floor of 16px prevents every consumer from rediscovering it. Belongs with `CSS-100`/`CSS-103` | S |
| `GUT-005` | feat | **Marquee / ticker.** Two variants in the consumer, nothing in the library. Low priority, listed for completeness | S |
| `GUT-006` | chore | **Adopt the consumer as the `CSS-338` fixture.** Rather than a synthetic hostile host, run the embed build against a real 23 125-line legacy stylesheet with 34 breakpoints and an opinionated type scale. Extends `CSS-338`, does not replace it | S |

## Proposed release plan

Only the milestones this proposal touches. Everything not listed is unchanged.

### `v0.6.21` — Embed Build & Layer Extraction

Unchanged scope plus:

- `@layer` pulled forward from `0.8.1` — the layer extraction in `CSS-318`/`CSS-319` already does most of this;
- `GUT-006` — real-world hostile-host fixture alongside the synthetic one.

**Exit criterion added:** the embed build applied to a consumer with a 23 000-line legacy stylesheet changes nothing until a Rare class is used.

### `v0.6.22` — Page Layouts

Unchanged scope plus:

- `CSS-100`–`CSS-105` forms, pulled from `v0.7.0`, with `GUT-004` folded in;
- `CSS-164` fluid type scale, pulled from `0.8.1`, with `GUT-001`;
- `CSS-310` hero/masthead, pulled from post-1.0;
- `CSS-300` container queries, pulled from post-1.0, with `GUT-002`;
- `GUT-003` breakpoint configuration.

**Exit criterion added:** a consumer can replace its own hero, form and display-heading layer with library modules without losing a brand display scale or a non-standard breakpoint.

### `v0.6.23` — Lean Delivery

Unchanged scope plus `CSS-312` breadcrumbs and `GUT-005` ticker.

### `v0.7.0` — Interactive Core & `rd-` Migration Start

Scope reduced: forms move out to `v0.6.22`. The namespace migration is unaffected — forms are built `rd-`-native per `CSS-100`, so moving them earlier does not create unprefixed names to migrate later.

## The `v0.7` boundary, with a fourth consumer

`CSS-340` defines `v0.7.0` as one deliberate breaking boundary, and `Q-11` fixes the namespace migration as a hard cut with no aliases, completing at `v0.7.2`. The entry gate verifies three live consumers against the `v0.6` API snapshot.

Adding Gutenberg makes that four, and the fourth is by far the heaviest. Two consequences worth deciding at the gate rather than discovering during it:

1. **Entry point.** Migrating this consumer onto `v0.6.19` today means it pays the `v0.7` migration a second time. Entering at `v0.6.21`, on the embed build, with forms and display typography already `rd-`-native, means it crosses the boundary once.
2. **Gate load.** `CSS-340` step 3 — verifying live consumers against the snapshot — becomes materially larger with a consumer of this size. Worth sizing before the gate opens.

## Open questions for the maintainer

1. **Scheduling.** Does pulling forms and fluid type into `v0.6.22` fit the milestone's intent, or should this consumer carry its own form and display layer until `v0.7.0`?
2. **Container queries.** `CSS-300` sits in the post-1.0 batch. Pulling it forward, extended per `GUT-002` with container units, is what makes the consumer's existing defect fixes survive migration. Is that acceptable this early, or should the consumer keep container-based sizing in its own layer?
3. **Breakpoints.** Is the three-step model a principle or a default? `GUT-003` only makes sense if it is a default.
4. **Entry point.** `v0.6.19` now, or `v0.6.21` with the embed build?
5. **Fixture.** Is `GUT-006` welcome, given it ties a library test to an external repository?
