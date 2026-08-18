# Decisions

## Assumptions and product choices

I interpreted “must not take the site down while I’m editing prices” as both an availability and consistency requirement. Owner edits are therefore saved to a draft; the public API continues serving the last published version until the owner explicitly publishes. Each estimator session holds the version it started with, and submission is calculated against that exact stored version. Publishing archives the old version rather than mutating it, so a homeowner halfway through a flow never sees mismatched questions or pricing.

The brief asks to turn questions off but the supplied formula depends on five known keys. Every question therefore has a database-backed fallback used only while it is hidden; the owner sees and can edit that fallback. This keeps the calculation valid without inventing answers in front-end code. In a real build I would make calculation rules configuration-driven too, but inventing a safe general-purpose expression language inside 24 hours would add more risk than value. The public UI contains no question, option, or rate constants; all of those arrive from the database through the API.

## Calculation

The server computes a midpoint as: `roof area × (1 + waste factor) × material rate × pitch multiplier × story multiplier + roof area × tear-off rate + permit fee`. The low and high estimates are the midpoint reduced/increased by `range_spread_pct`. Money is rounded to whole dollars only at the end. The server rejects missing, out-of-range, unknown, and non-numeric inputs. Historical seed estimates are preserved exactly and are not recalculated because the brief says they came from older client logic.

## Seed-data issues handled

The medium-pitch multiplier is the string `"1.12"` while the other numbers are numeric, so the calculation deliberately normalizes configured numeric values and tests that case. Bill Tanner’s version-1 answers reference questions/options absent from version 3; the lead viewer preserves and displays that historical payload instead of pretending current labels describe it. The brief’s instruction to let owners edit “multipliers” also conflicts slightly with turning calculation-critical questions off; neutral defaults are the least surprising fail-safe for this demo.

## Deliberately not built

I did not add new-question creation, CSV export, webhooks, password management, audit identities, or a full configuration history screen. These are useful, but the safe edit/publish flow, core estimator, lead persistence, validation, authentication, documentation, and tests directly protect the required path. Basic auth is intentionally used because the brief permits it; a client build would use per-user accounts and audit logs.

## Questions for Dale

I would ask whether the estimate should include labor and tax; whether minimum project pricing applies; how unknown roof area should be handled; whether hidden calculation inputs should use a neutral value or block publishing; what disclaimer and consent language counsel approves; which team members need access; how long leads should be retained; and whether follow-up should go to a CRM, email, or both.

## With another week

I would add Playwright end-to-end coverage, per-user authentication with roles, configuration diff/history and rollback, lead CSV export, webhook delivery with retries, accessible owner-side validation summaries, observability and backups, rate limiting, and deployment health checks. I would also model calculation rules explicitly in the database after agreeing on the business formula with Dale.
