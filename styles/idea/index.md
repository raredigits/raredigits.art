---
layout: page.njk
title: "The Idea"
section: "Styles"
displaySidebar: true
permalink: '/styles/idea/'
---

Most organizations do not suffer from a shortage of components. They suffer from an abundance of them.

There is a Power BI instance, an ERP, several internal portals, historical reporting templates, a brand book, a design system, a component library, and often a second component library that was supposed to replace the first one. There are board presentations, investor presentations, operational dashboards, and a few legacy screens still running on institutional memory and mild superstition. Individually, all of these things make sense. Together, they create the familiar enterprise condition in which everyone has tools, everyone has data, everyone has a format, and somehow every important screen still begins with an argument about what should be important.

Every department has its own priorities. Every stakeholder has a view on what deserves attention. Every team has a slightly different idea of what “important” should look like. The dashboard contains the right numbers, but nobody quite knows where to look first. The report is technically complete, but requires interpretation before it can be understood. The management screen tries to emphasize everything and ends up emphasizing nothing. The problem is rarely the information itself. The problem is that most organizations have no shared logic for presenting it.

Rare Styles was built for that problem.

Business information is usually produced by people who know what it means, then presented by people who know how screens work, then reviewed by people who know what they like. This is a reasonable workflow, in the same way that a committee is a reasonable way to choose lunch for twelve people and end up with a spreadsheet. The analyst has the facts. The designer has the layout. The frontend developer has the components. The stakeholder has comments. Everyone is doing their job. That is not always the same as helping the business make a decision.

Rare Styles starts from a different assumption. The form of business information should follow the job it has to do. Not the available component. Not the loudest opinion in the meeting. Not the current fashion in SaaS dashboards, where every metric apparently needs a card, an icon, a gradient, and a small performance as a strategic insight. The question is simpler and less decorative: what should this person understand, compare, trust, ignore, or decide?

## Presentation as a business system

Most companies already have brand rules, component libraries, templates, reporting habits, and a few surviving pieces of legacy interface culture that nobody wants to touch because they are load-bearing in the spiritual sense. Rare Styles does not pretend those things do not exist. It is designed for the place where they meet the actual work of presenting business information.

Rare Styles is designed to sit on top of existing systems rather than replace them. ERP remains ERP. BI tools remain BI tools. Internal platforms keep their workflows, permissions, integrations, and data models. What changes is the presentation layer: the way information is structured, prioritized, and made readable for people whose job is to make decisions.

That is also why Rare Styles is not an atomic utility kit in the usual sense. It does not begin by handing teams a bucket of neutral primitives and asking them to compose a presentation logic from scratch. It ships a ready shell for business and data-heavy pages: page structure, reading rhythm, hierarchy, supporting text, data surfaces, and operational detail are meant to work together before the team starts improvising.

A company can change the colors. It can adapt the details to its brand. What should not be redesigned every week is the logic of presentation: how hierarchy works, how dense information remains readable, how supporting content steps back, how emphasis behaves, how tables, notes, captions, metrics, summaries, long text, and operational details sit together without turning the page into a polite riot.

This is where a style library becomes more than styling. It becomes a way to remove low-value decisions from the system.

The useful decision is rarely “What should this block look like?” The useful decision is “What is this block doing for the reader?” Once that is answered, most visual choices become much less mysterious. A number that changes a decision needs emphasis. A note that supports the argument should not compete with it. A table should be readable before it is impressive. A highlight should earn its volume. A screen should help someone act, not merely prove that a team has been busy.

## Digital Rareism in practice

Rare Styles is the technical expression of <a href="/manifesto/">Digital Rareism</a>. The manifesto is deliberately loud because manifestos are allowed to behave badly in public. The library is calmer. Its job is not to shout about reduction. Its job is to make reduction usable.

The principle is simple. Remove what does not help a decision. Keep what does. Make the difference visible.

This is not minimalism as interior decoration. Minimalism often removes things until the page looks pure enough to be photographed beside a concrete wall. Rareism is less romantic. It removes things because attention is finite, meetings are expensive, and senior people should not have to decode a dashboard like it is an archaeological site.

<div class="highlight">Clarity is not an aesthetic preference here.<br>It is an operating requirement.</div>

In practice, that means the library has opinions. Typography should help reading and scanning. Spacing should separate meaning. Accents should act as signals. Hierarchy should be visible, limited, and deliberate. Supporting elements should support. Components should not be invited onto the page merely because they exist.

The point is not to make every page look the same. The point is to make every page obey the same discipline.

## Why this matters to teams

Business interfaces are rarely ruined by one bad design decision. They are usually ruined by many defensible decisions made independently. One team adds a larger card for visibility. Another adds a colored label for urgency. Someone adds an explanation block because the chart is unclear. Someone else adds a tooltip because the explanation block is long. Soon the interface is no longer presenting information. It is presenting the history of its own compromises.

This becomes particularly important at management and board level. Senior people are rarely exploring a system. They are judging the state of a business. They need to see exceptions, trends, risks, ownership, and context quickly enough to ask better questions. They should not have to decode a dashboard the way an archaeologist decodes a ruin.

Rare Styles gives teams a shared answer before the argument starts. It gives designers a doctrine that can survive stakeholder weather. It gives frontend developers defaults strong enough to avoid improvising hierarchy on every screen. It gives product managers a way to discuss business purpose instead of visual preference. It gives leadership a reasonable sentence to say in meetings: this is the system we use, and the system exists so that business information remains legible.

That sentence is more powerful than it looks. It moves the conversation away from taste. Taste is endless. Everyone has taste, which is one of civilization’s less successful experiments. Business purpose is narrower. It asks whether the page helps the right person make the right judgment with less effort and fewer distractions.

Rare Styles is built for that narrower conversation.

## Why so opinionated

Most CSS libraries optimize for flexibility. Flexibility is wonderful when the main problem is creative possibility. It is less wonderful when the main problem is that six teams already have six slightly different ways to show the same revenue number.

Rare Styles optimizes for decision-grade presentation: dashboards, reports, documentation, internal tools, investor-facing material, management interfaces, analytical pages, and structured business communication. In that domain, too much freedom often becomes operational cost. Every optional style is another place for drift. Every unconstrained component is another small invitation to turn business logic into decoration.

So this library is not trying to win the game of maximum composability. It is not a utility-first sandbox and not a neutral framework for inventing a screen language from zero on every project. It is a pre-assembled presentation system for business pages and applications, where the shell matters as much as the parts inside it.

So the library makes many decisions in advance. Reading rhythm is defined. Density has limits. Emphasis has rules. Narrative content, data content, support content, and system content have different roles. The defaults are not neutral because the problem is not neutral. The problem is noise pretending to be useful.

You can call that restrictive. We would call it governance.

## The promise

Rare Styles makes business information predictable, legible, and disciplined across a team.

It does not promise that nobody will ever complain about design again. That would be a religious claim, and the market for miracles is crowded. It promises something more practical: fewer arbitrary decisions, fewer visual negotiations, fewer pages that treat every fact as equally important, and fewer interfaces where the reader has to provide the structure themselves.

If the library is doing its job, the designer spends less time decorating around uncertainty. The developer spends less time rebuilding the same hierarchy. The product manager spends less time translating business intent into layout arguments. The reader spends less attention deciding where to look.

The business gets closer to the signal.

That is the idea.
