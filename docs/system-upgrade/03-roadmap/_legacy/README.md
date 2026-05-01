# Legacy Roadmap Archive

These three docs are the **historical source material** for the merged `master-roadmap.md`.
They are kept here for diff/audit purposes only — **do not edit them** and do not reference them
from new docs.

| File | Original purpose | Folded into |
|------|-----------------|-------------|
| `12-migration-roadmap.md` | Phased Jinja2 → Next.js migration plan (Phase 0–4) | `master-roadmap.md §3, §8, §9` |
| `35-platform-capabilities-build-order.md` | Capability dependency graph + R023–R032 round breakdown | `master-roadmap.md §5, §6, §11` |
| `47-generic-platform-foundation-roadmap.md` | Pillars, full capability inventory, AI vision, ADRs | `master-roadmap.md §1, §2, §4` + spec content lives in `04-capabilities/`, `05-ai/` |

For current authoritative plan: see `../master-roadmap.md`.

## Retention decision (verified 2026-05-01)

**Keep indefinitely — do NOT delete.** Per the coverage audit
(`../../planning-artifacts/reorg-coverage-audit-2026-05-01.md`), these files
contain deep prose that has no equivalent elsewhere:

- Doc 12: section-level explanations of each phase's deliverables (master-roadmap is a summary table).
- Doc 35: per-capability paragraphs explaining each dependency edge in the graph.
- Doc 47: §4 capability inventory by domain (11 domains × ~10 capabilities each), §9 Data Sources schema spec, §13 risks register, §17 open questions.

The master-roadmap is the SSOT for **plan-level** decisions; this archive is the SSOT for **deep capability/pillar prose**. Both are valid reads, used for different depths of inquiry.
