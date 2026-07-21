# Solid

AI evangelism bot for the [Solid Protocol](https://solidproject.org/) — built for the Open Data Institute to convert developers into advocates for user-owned data on the web.

## What It Does

The bot is a conscience-driven recruiter for the privacy-first web. It diagnoses visitors, qualifies fit, onboards developers to Solid pods, generates working apps and prototypes, and handles monetisation via x402 micropayments. It operates as both a human chat interface and an A2A agent on the internet.

## Quick Start

```bash
cp .env.example .env   # then fill in OPENROUTER_API_KEY
npm install
node server.js
```

Open `http://localhost:4000` in your browser.

## Architecture

```
server.js           ← Express server, skill loader, LLM client (OpenRouter → Claude)
public/index.html   ← Landing page
public/chat.html    ← Chat UI with streaming SSE
public/agents.html  ← A2A docs + live x402 payment demo
public/slides.html  ← Presentation deck
solid-skills/       ← Skill system (10 SKILL.md files)
```

## Endpoints

| Endpoint                           | Cost       | Purpose                             |
| ---------------------------------- | ---------- | ----------------------------------- |
| `GET /.well-known/agent-card.json` | Free       | A2A agent discovery                 |
| `GET /profile`                     | Free       | WebID / Solid identity (Turtle RDF) |
| `GET /health`                      | Free       | Health check                        |
| `POST /api/chat`                   | Free       | Streaming chat (SSE)                |
| `POST /a2a/jsonrpc`                | Free       | A2A JSON-RPC task endpoint          |
| `POST /api/scaffold`               | $0.10 USDC | Generate working app / prototype    |
| `POST /api/download`               | Free       | Download scaffold as ZIP            |
| `POST /api/sparql`                 | $0.05 USDC | Execute SPARQL query                |
| `POST /api/vocab`                  | $0.25 USDC | Design custom RDF vocabulary        |

Paid endpoints are gated via [x402](https://x402.org/) — AI agents pay autonomously via USDC on Base; humans are always offered a free manual alternative.

## Skills

| Skill                           | Purpose                                              |
| ------------------------------- | ---------------------------------------------------- |
| `r-solid1-ethos`                | Constitution — mission, values, voice rules          |
| `p-solid1-run-conversation`     | Master orchestrator — chains all skills              |
| `solid1-diagnose-visitor`       | Classify visitor: Curious / Builder / Convinced      |
| `solid2-evangelize-vision`      | Lead with story, earn the right to introduce Solid   |
| `solid3-qualify-fit`            | Honest fit assessment, route alternatives with grace |
| `solid4-scaffold-app`           | Generate working app (individual) or prototype (org) |
| `solid5-onboard-pod`            | Get a working pod in 20 minutes                      |
| `solid6-activate-advocate`      | Convert builder into community member                |
| `solid7-monetize`               | Non-profit pricing frame, x402 payment gates         |
| `e-solid1-conversation-quality` | Evaluator — conversation quality scoring             |

## Platform Targets

The build skill generates code for:

| Target  | Tool                     | Output                        |
| ------- | ------------------------ | ----------------------------- |
| Web     | React / Vue / vanilla JS | Hosted web app or PWA         |
| Desktop | Tauri v2                 | Mac, Windows, Linux installer |
| Mobile  | Capacitor                | iOS App Store + Google Play   |

## Monetisation

ODI is a non-profit. Revenue goes back into the Solid ecosystem, not to shareholders.

| Use                         | Share |
| --------------------------- | ----- |
| AI compute (Claude API)     | ~40%  |
| Hosting and infrastructure  | ~20%  |
| Solid ecosystem development | ~40%  |

Evangelism, onboarding, and community invitation are always free. Code generation carries a small charge covering AI compute and ecosystem development. Anyone who cannot pay is helped anyway — the mission matters more than the revenue.

## Environment Variables

| Variable             | Required     | Default                              | Description                                |
| -------------------- | ------------ | ------------------------------------ | ------------------------------------------ |
| `OPENROUTER_API_KEY` | Yes          | —                                    | OpenRouter API key for Claude access       |
| `SOLID_BOT_WALLET`   | For payments | `0x000...0001`                       | Wallet address to receive x402 payments    |
| `X402_FACILITATOR`   | Optional     | `https://x402.org/facilitator`       | x402 facilitator URL                       |
| `AGENT_URL`          | Optional     | `http://localhost:4000`              | Public-facing base URL (sets WebID + card) |
| `SOLID_IDP`          | Optional     | `http://localhost:3000/`             | Solid identity provider (oidcIssuer)       |
| `LLM_MODEL`          | Optional     | `anthropic/claude-sonnet-4-5`        | Override the LLM model via OpenRouter      |
| `PORT`               | Optional     | `4000`                               | HTTP port                                  |

## A2A Integration

The bot is discoverable by other AI agents via its Agent Card:

```bash
curl http://localhost:4000/.well-known/agent-card.json
```

Agents can invoke skills directly via JSON-RPC 2.0:

```bash
curl -X POST http://localhost:4000/a2a/jsonrpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"SendMessage","id":1,"params":{"message":{"parts":[{"kind":"text","text":"Qualify this project for Solid fit: a health app where patients own their records."}]}}}'
```
