# AI usage log

I used ChatGPT Codex as a paired implementation and review tool. It helped extract requirements from the supplied PDF, propose the draft/publish architecture, generate an initial UI direction, scaffold React components and the Node API, and identify edge cases worth testing. I steered the scope toward the mandatory estimator, protected owner panel, database persistence, and documentation rather than beginning the optional webhook or CSV features.

One concrete weak output was an initial database implementation that used a transaction helper API found in other SQLite libraries but not in Node’s built-in `node:sqlite` API. I replaced it with explicit `BEGIN IMMEDIATE`, `COMMIT`, and rollback handling, then covered calculation/config behavior with Node tests. I also tightened the generated admin API so it validates configuration before a draft can be saved; accepting arbitrary edited numeric fields would otherwise allow a bad publish to break estimates.

I substantially reviewed and reworked the data model, version semantics, server calculation, validation behavior, public flow, and owner editing interactions. AI accelerated scaffolding and visual exploration, but all submitted code was run, inspected, and kept deliberately small enough for me to explain and modify during a live interview.
