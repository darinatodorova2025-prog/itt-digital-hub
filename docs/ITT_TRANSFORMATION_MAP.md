# ITT transformation map

CIT was immutable source only. This table records how the copied implementation is reused for ITT Digital Hub. CIT seed, campus photos, News/Insights overlays and the CIT build-pack docs have been removed from this repository.

| Current CIT | New ITT purpose | Decision | Notes |
| --- | --- | --- | --- |
| Next.js App Router, BG/EN, Tailwind tokens, fonts, motion, Container/Section/Header/Footer | App shell | KEEP | Isolated copy only; no CIT git/Vercel coupling. |
| `Hero`, `SectionHeading`, `ButtonLink`, `ArrowLink` | Summit homepage framing | ADAPT | Editorial hero, no university video. Eyebrow = Applied AI Consultancy. |
| Homepage section spy + primary nav | One-page Summit IA | ADAPT | Work, What we solve, Approach, About, Contact. |
| `ProjectListItem` / `ProjectMeta` / project routes | Selected work | ADAPT | Three honest examples; no wine/tourism; no fabricated metrics. |
| `PersonPortrait` / team presentation | Three team profiles on one desktop row | ADAPT | Ivan Todorov, Ivan Tomchev, Nikolay Milkov. No join-us vacancy theatre. |
| Ten-stage academic methodology | How we work | REMOVE | Three-step Understand / Design / Build. Unused academic content files are empty. |
| Pillars (education / research / applied science) | Problems we help solve | ADAPT pattern | Problem classes, not a service catalogue. |
| Institutional anchor / university photography | Experience across | NEW on existing grid | Textual engagements only. No invented clients or logos. |
| News, Insights, campus photos, university mark | Academic-centre identity | REMOVE | Routes redirect home. Seed, overlays and unused assets deleted. |
| `/admin`, CMS, Supabase adapters | Editorial platform | KEEP unused | Do not redesign. Public site is static-first. Internal env names may still use `CIT_*`. |
| Collaboration four-route catalogue | Contact | REPLACE | Short enquiry form (name, company, phone, problem). Inbox via env; no invented email. |
| Privacy page | Privacy | ADAPT | ITT wording; contact-form fields disclosed. No registration. |
| Vercel Analytics, indexing flag, robots | Independent deploy | ADAPT | New Vercel project only. `ITT_ALLOW_INDEXING`. |
