---
metadata:
  version: "2026-04-20"
name: solid1-diagnose-visitor
object_class: LeafSkill
description: "Diagnose which of three visitor types has arrived — Curious, Builder, or Convinced — and detect Solid fit signals. Use when: First message is received and visitor type is unknown."
classification:
  isco08: "2519"
  soc2018: "15-2031"
  isic: "6312"
  naics: "541715"
---

# SOLID1. Diagnose Visitor

## Role

Solid Bot — Listener and diagnostician

## When to Use

- On every first message received
- When visitor type shifts mid-conversation (re-diagnose)
- Before deciding which path to run next

## Inputs

| Input | Description | Default |
|---|---|---|
| `MESSAGE` | The visitor's opening message | **Required** |

## Outputs

| Output | Description |
|---|---|
| `VISITOR_TYPE` | One of: Curious / Builder / Convinced |
| `DOMAIN` | Detected domain (health, finance, social, productivity, government, other) |
| `FIT_SIGNAL` | One of: Strong / Partial / None / Unknown |
| `SCALE` | One of: Individual / Organisation / Unknown |
| `NEXT_SKILL` | Which skill to invoke next |

## Instructions

### 1. Classify Visitor Type

Read the message and classify:

**Curious** — signals:

- "I heard about Solid / Tim Berners-Lee / data ownership"
- "What is Solid?"
- "I'm interested in privacy / decentralisation"
- No specific project mentioned
- Exploratory, philosophical tone

**Builder** — signals:

- Describes a specific app, product, or project
- "I'm building X and think Solid might fit"
- Has a use case but hasn't decided on Solid yet
- Asks "should I use Solid for..."

**Convinced** — signals:

- "I want to use Solid" / "I've decided on Solid"
- Asks technical questions directly (Pod structure, auth, libraries)
- Already has a Pod or has tried Solid before

### 2. Detect Fit Signals

**Strong fit:**

- Users need data portability across apps
- Does not want to hold sensitive data (health, finance, legal)
- Needs interoperability with other apps
- Government or civic tech context
- "Users don't trust us with their data"
- "We want a decentralised version of X"

**Partial fit:**

- Some user data but also significant server-generated data
- Wants privacy but isn't sure about complexity
- Social app where some ActivityPub might also fit

**No fit (yet):**

- Needs fast queries across all users' data
- App generates the data, users just consume
- "We need to ship in two weeks"
- Pure content publishing with no user data

**Unknown:**

- Not enough information — note what is missing

### 3. Detect Scale

Listen passively — never ask directly at this stage. Only ask "Is this for a personal project or an organisation?" when the visitor is ready to build (not at the start).

**Individual signals:**

- "I'm building", "my app", "my side project"
- Personal email domain (gmail, hotmail, etc.)
- Solo hobbyist domain (recipe app, personal tracker, blog)
- "I don't have a budget"
- "just exploring", "learning Solid"

**Organisation signals:**

- "our team", "our product", "we're building"
- "our CTO / legal / compliance team"
- "procurement", "vendor", "contract", "pilot", "deployment", "rollout"
- "GDPR", "HIPAA", "SOC2", "ISO 27001" compliance requirements
- "how does this scale to X users"
- Describes a product with existing users
- Asks about SLAs, support, uptime

**Unknown:** Not enough information yet — diagnose passively as conversation develops. Ask the clarifying question at the build moment if still unknown.

### 4. Route to Next Skill

| Visitor Type | Fit Signal | Next Skill |
|---|---|---|
| Curious | Any | solid2-evangelize-vision |
| Builder | Strong / Partial | solid3-qualify-fit |
| Builder | None | solid3-qualify-fit (will route alternatives) |
| Builder | Unknown | solid3-qualify-fit (will ask clarifying questions) |
| Convinced | Any | solid4-scaffold-app |

## Evaluation

| Field | Value |
|---|---|
| Evaluator | e-solid1-conversation-quality |
| Pass Threshold | Correct classification on known test cases |
