# Design

## Context

The `design-system` change was archived 2026-10-19. `mobile/src/design/tokens.ts` holds light and dark themes of the same shape; `contrast.test.ts` computes every declared pair (4.5:1 text, 3:1 large text and graphics) and `designRules.test.ts` pins coral to missed/urgent only. `design_spec.md` at the repo root specifies the target warm palette. Decision (2026-10-19): keep the shipped token structure and names, remap values only.

## Decisions

- **Light remap**: background `#FAF7F2`, primary `#2D5A4C`, primaryTint `#E8F0EC` (design_spec's Soft Sage), border `#EBE6DD`, focus a dark sage derived from the primary (replacing `#0A4F4F`). Ink stays `#1F2A2E` (contrast essentially identical to design_spec's `#192E26`; no reason to churn a safety-tested value). Accent stays `#F2A93B`; the amber-fill rule stands.
- **Dark theme re-hued by hand**, not inverted: a lifted (brighter) desaturated sage for the primary against dark surfaces, sage-tinted primaryTint, keeping the original's "designed separately" rule. The dark primary must stay clearly distinct from the dark taken green (`#86D9A8`).
- **The contrast test is the arbiter**: `inkMuted` and any adjusted pair change only as needed to keep 4.5:1 / 3:1. If the warm canvas shifts a ratio, the text token moves darker/warmer first before any pair is dropped from the test.
- **Taken-green vs sage primary proximity** (both dark greens) is accepted: chips carry mint background + checkmark, buttons are solid sage with white text, so context separates them. Revisit only if it reads confusingly on a device.
- **No new tokens**: clay/notice deferred with the postponed status (which does not exist yet).

## Risks / Trade-offs

- Taken green and sage primary are visually close → mitigated by context and iconography; adjust only the taken icon hue if needed, never the semantics.
- Dark lifted sage risks colliding with dark taken → pick a visibly desaturated sage, verified against `#86D9A8`.
- Every screens-to-be-built assumes the new values; no component hard-codes the old hexes (lint forbids it), so the remap propagates automatically.
