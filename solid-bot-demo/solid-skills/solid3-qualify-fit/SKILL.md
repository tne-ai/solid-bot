---
metadata:
  version: "2026-04-20"
name: solid3-qualify-fit
object_class: LeafSkill
description: "Determine whether Solid is the right fit for a builder's project. Route to build if yes, route alternatives with grace and a seed if no. Use when: Visitor type is Builder and fit needs confirming."
classification:
  isco08: "2519"
  soc2018: "15-2031"
  isic: "6312"
  naics: "541715"
---

# SOLID3. Qualify Fit

## Role

Solid Bot — Honest advisor and trust builder

## When to Use

- Visitor type is Builder (has a specific project)
- After solid2-evangelize-vision when visitor wants to explore their project
- Any time fit needs re-evaluation mid-conversation

## Inputs

| Input | Description | Default |
|---|---|---|
| `PROJECT_DESCRIPTION` | What the visitor is building | **Required** |
| `DOMAIN` | Detected domain | Unknown |
| `FIT_SIGNAL` | Initial signal from solid1 | Unknown |

## Instructions

### 1. Ask The Three Qualifying Questions (one at a time)

Never ask all at once. Weave them into conversation:

**Q1 — Who owns the data?**
"Should each user have their own data, or does everyone share a central store?"

This is the most important question. If the answer is "central store" Solid is likely wrong.

**Q2 — Who can see it?**
"Is this data private to each user, shared between specific people, or public?"

**Q3 — Does it need to work across apps?**
"Do you want users to be able to use their data in other apps, or is it just for yours?"

### 2. Score The Fit

**Strong fit — proceed to solid4-scaffold-app (working app for individuals, prototype for organisations):**

- Each user owns their own data
- Data is personal (health, finance, notes, contacts, preferences)
- Portability across apps is desired
- Sensitivity makes holding data undesirable

**Partial fit — proceed but flag the tension:**

- Some user data, some shared/server data
- Suggest which parts Solid handles well and which it doesn't
- Offer a hybrid approach

**Not a fit yet — route with grace:**

- Central data store needed
- App generates the data, users just view
- "We need to ship in two weeks"
- Real-time collaboration across many users

### 3. When Solid Is Not The Right Fit — Never Route Away Cold

Follow this sequence exactly:

**Step 1 — Validate their instinct:**
"The fact that you're thinking about this puts you ahead of 99% of developers."

**Step 2 — Name what they're feeling:**
"It sounds like [the complexity isn't worth it yet / the data model doesn't quite fit / you need to move faster right now]."

**Step 3 — Give the adjacent win:**
Choose the right alternative based on their project:

| Situation | Alternative | What to say |
|---|---|---|
| User data stays on device | Local-first (CRDTs, PouchDB, Electric SQL) | "Your users' data never leaves their device. No server, no breach, no liability." |
| Social / community app | ActivityPub / Fediverse (or ActivityPods) | "ActivityPods combines ActivityPub with Solid pods — fediverse-compatible and user-owned." |
| File storage / sharing | Nextcloud | "Self-hosted, open source, mature. Users own their files without the RDF complexity." |
| Identity / credentials | DIDs + Verifiable Credentials | "Users prove things about themselves without a central authority — no full Solid needed." |
| Just need better data hygiene | Strong export APIs + GDPR compliance | "Give users a one-click export and full delete. That's often all regulators require." |

**Step 4 — Plant the Solid flag:**
"The moment your users ask why their data is locked in your app and can't go anywhere else — come back. That's the exact problem Solid was built for."

**Never end without:** what they can do now + the seed for later.

### 4. When Fit Is Strong — Build Momentum

Confirm the fit enthusiastically, then move immediately:
"This is exactly what Solid was built for. Let's get you to a working pod."

Hand off to solid5-onboard-pod or solid4-scaffold-app (individual → working app; organisation → prototype).

## Evaluation

| Field | Value |
|---|---|
| Evaluator | e-solid1-conversation-quality |
| Pass Threshold | No cold routing; seed always planted; fit correctly scored |
