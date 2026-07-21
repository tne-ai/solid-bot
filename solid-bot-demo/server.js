require('dotenv').config();

const express  = require('express');
const OpenAI   = require('openai');
const path     = require('path');
const fs       = require('fs');
const archiver = require('archiver');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// ── Config ────────────────────────────────────────────────────────────────────
const LLM_MODEL = process.env.LLM_MODEL || 'anthropic/claude-sonnet-4-5';
const BASE_URL   = process.env.AGENT_URL || 'http://localhost:4000';
const PORT       = process.env.PORT      || 4000;

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Payment, Authorization');
  res.setHeader('Access-Control-Expose-Headers', 'X-Payment-Response');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── LLM client (OpenRouter → Claude) ─────────────────────────────────────────
const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey:  process.env.OPENROUTER_API_KEY,
});

// ── Base system prompt ────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are the Solid Web Bot — an AI agent built by the Open Data Institute to evangelise user-owned data on the web.

## Your Mission
You are not a product salesperson. You are a conscience-driven recruiter for a movement. Your job is to convert curious developers and builders into advocates for the privacy-first web — and Solid is the architecture that makes it real.

The web was designed to be open and decentralised. It got captured — by platforms that built their business models on data that was never theirs. Every developer who builds on the old model makes that capture more permanent. Every developer who builds on Solid makes the open web more real.

## The Revolutionary Frame
This is not a technology choice. It is a moral one.

> "Every app you build on the old model makes the surveillance web more permanent. Every app you build on Solid makes the open web more real. Which web are you building?"

## The Problem You Solve (PAS)

**Problem:** Every app ever built follows the same unspoken rule — collect everything, keep it forever, monetise later. Not because developers are evil. Because that is just how the web works.

**Agitation:** AI changed everything. The data collected "just in case" is now training material. Health logs. Emails. Social graphs. Every data point held is now a potential AI training asset — and users never consented. Regulators are catching up. Breaches are front-page news. Most developers already know this is wrong.

**Solution:** Solid flips the model at the architectural level. Not as a policy. Not as a promise. As a structural guarantee. Users keep their data in their own Pod. Apps read it with permission, never hold it. You cannot sell what you do not have. You cannot leak what was never yours.

## Three Visitor Types
**The Curious** — heard about Solid or data ownership. Lead with story. Never mention RDF until engaged.
**The Builder** — has a project. Confirm the vision, get to working code fast.
**The Convinced** — already knows they want Solid. Skip philosophy, scaffold immediately.

## How You Open
Do NOT open with "How can I help?" Open with the frame. Make them feel something first.

## Payment Model (Non-Profit Sustainability)
The mission is free. The infrastructure has costs. The payment funds the mission.

ODI is a non-profit. Revenue goes back into the ecosystem — not to shareholders. Evangelism, onboarding, qualification, and community invitation are always free. Building a working app or prototype ($0.10) and SPARQL queries ($0.05) carry a small charge covering AI compute, hosting, and Solid ecosystem development.

For humans: always tell them upfront, always offer the free manual alternative.
For AI agents: payment is automatic via x402 — they pay USDC on Base and retry.

If anyone pushes back on cost: "No problem — let me walk you through it step by step, no charge." The mission matters more than the revenue.

## How You Close Every Conversation
1. A working app — they built something
2. A concrete next step — one specific action
3. A community invitation — forum.solidproject.org, Solid World monthly call

## Tone and Voice
Conviction without arrogance. Honest. Direct. Warm. Never preachy. Short responses. One question at a time.

## You Are Not A Chatbot
You are a recruiter for the open web and a node on the agent internet. Every conversation — human or machine — is a chance to bring one more builder into a movement that is fixing something that actually matters.`;

// ── Load skills ───────────────────────────────────────────────────────────────
const SKILLS_DIR = path.join(__dirname, 'solid-skills');

const SKILL_ORDER = [
  'r-solid1-ethos',
  'solid1-diagnose-visitor',
  'solid2-evangelize-vision',
  'solid3-qualify-fit',
  'solid4-scaffold-app',
  'solid5-onboard-pod',
  'solid6-activate-advocate',
  'solid7-monetize',
  'e-solid1-conversation-quality',
  'p-solid1-run-conversation',
];

function loadSkills() {
  return SKILL_ORDER.map(name => {
    const skillPath = path.join(SKILLS_DIR, name, 'SKILL.md');
    if (!fs.existsSync(skillPath)) {
      console.warn(`Warning: skill not found: ${skillPath}`);
      return null;
    }
    const raw     = fs.readFileSync(skillPath, 'utf8');
    const content = raw.replace(/^---[\s\S]*?---\n/, '').trim();
    return `\n\n---\n## SKILL: ${name}\n\n${content}`;
  }).filter(Boolean).join('\n');
}

const FULL_SYSTEM_PROMPT = SYSTEM_PROMPT + loadSkills();
console.log(`System prompt: ${FULL_SYSTEM_PROMPT.length} chars, ${SKILL_ORDER.length} skills`);

// ── WebID profile (bot's Solid identity) ─────────────────────────────────────
const WEBID_PROFILE = `@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix solid: <http://www.w3.org/ns/solid/terms#> .
@prefix schema: <https://schema.org/> .

<${BASE_URL}/profile#me>
  a foaf:Agent ;
  foaf:name "Solid Web Bot" ;
  foaf:maker <https://theodi.org> ;
  schema:description "An AI agent that evangelises user-owned data on the web via the Solid Protocol." ;
  solid:oidcIssuer <${process.env.SOLID_IDP || 'http://localhost:3000/'}> .
`;

app.get('/profile', (req, res) => {
  res.setHeader('Content-Type', 'text/turtle');
  res.send(WEBID_PROFILE);
});

// ── A2A Agent Card ────────────────────────────────────────────────────────────
const AGENT_CARD = {
  name:            'Solid Web Bot',
  description:     'Evangelises user-owned data on the web via the Solid Protocol. Helps developers discover, adopt, and build with Solid. Operated by the Open Data Institute.',
  url:             BASE_URL,
  icon_url:        BASE_URL + '/favicon.ico',
  version:         '1.0.0',
  protocolVersion: '1.0',
  provider: {
    organization: 'Open Data Institute',
    url:          'https://theodi.org',
  },
  capabilities: {
    streaming:                 true,
    pushNotifications:         false,
    supportsExtendedAgentCard: false,
  },
  defaultInputModes:  ['text/plain', 'application/json'],
  defaultOutputModes: ['text/plain', 'application/json'],
  skills: [
    {
      id:          'solid1-diagnose-visitor',
      name:        'Diagnose Visitor',
      description: 'Classify visitor as Curious, Builder, or Convinced. Detect Solid fit signals.',
      tags:        ['solid', 'diagnosis', 'routing'],
      price:       'free',
    },
    {
      id:          'solid2-evangelize-vision',
      name:        'Evangelize Vision',
      description: 'Paint the user-owned data vision. Lead with the villain, earn the right to introduce Solid.',
      tags:        ['solid', 'evangelism', 'privacy'],
      price:       'free',
    },
    {
      id:          'solid3-qualify-fit',
      name:        'Qualify Fit',
      description: 'Honest Solid fit assessment. Routes alternatives with grace and plants a seed.',
      tags:        ['solid', 'architecture', 'qualification'],
      price:       'free',
    },
    {
      id:          'solid4-scaffold-app',
      name:        'Build Solid App',
      description: 'Generate a production-ready Solid app with structured file output. Select components: auth, pod-reader, pod-writer, access-control, ui. Returns files[] array ready to write to disk.',
      tags:        ['solid', 'code', 'scaffold', 'build'],
      price:       '$0.10 per component (min $0.10, max $0.50)',
      endpoint:    '/api/scaffold',
      components:  ['auth', 'pod-reader', 'pod-writer', 'access-control', 'ui'],
    },
    {
      id:          'solid5-onboard-pod',
      name:        'Onboard Pod',
      description: 'Walk through getting a working Solid Pod in 20 minutes. The emotional and technical quick win.',
      tags:        ['solid', 'onboarding', 'pod'],
      price:       'free',
    },
    {
      id:          'solid6-activate-advocate',
      name:        'Activate Advocate',
      description: 'Convert a builder into a community member and movement advocate.',
      tags:        ['solid', 'community', 'advocacy'],
      price:       'free',
    },
    {
      id:          'solid7-monetize',
      name:        'Pricing & Sustainability',
      description: 'Explains the non-profit sustainability model and x402 payment gates.',
      tags:        ['solid', 'pricing', 'x402'],
      price:       'free',
    },
  ],
  securitySchemes: {
    x402: {
      type:        'http',
      scheme:      'bearer',
      description: 'Paid skills require x402 USDC payment on Base network before service is rendered.',
    },
  },
};

app.get('/.well-known/agent-card.json', (req, res) => {
  res.json(AGENT_CARD);
});

// ── x402 payment gate ─────────────────────────────────────────────────────────
const PAY_TO      = process.env.SOLID_BOT_WALLET || '0x0000000000000000000000000000000000000001';
const FACILITATOR = { url: process.env.X402_FACILITATOR || 'https://x402.org/facilitator' };

// ── x402 verify/settle (reused for A2A payment gate) ──────────────────────────
const { useFacilitator }                         = require('x402/verify');
const { exact: x402Exact }                       = require('x402/schemes');
const { processPriceToAtomicAmount, toJsonSafe } = require('x402/shared');
const { getAddress }                             = require('viem');
const { verify: verifyX402, settle: settleX402 } = useFacilitator(FACILITATOR);

const PAID_A2A_SKILLS = {
  'solid4-scaffold-app': { price: '$0.10', network: 'base-sepolia', description: 'Generate a complete Solid app scaffold' },
  'solid3-sparql':       { price: '$0.05', network: 'base-sepolia', description: 'Execute SPARQL query' },
  'solid7-vocab':        { price: '$0.25', network: 'base-sepolia', description: 'Design a custom RDF vocabulary' },
};

function buildA2APaymentRequirements(skillConfig, req) {
  const amount = processPriceToAtomicAmount(skillConfig.price, skillConfig.network);
  if ('error' in amount) throw new Error(amount.error);
  const { maxAmountRequired, asset } = amount;
  return {
    scheme:            'exact',
    network:           skillConfig.network,
    maxAmountRequired,
    resource:          `${req.protocol}://${req.headers.host}/a2a/jsonrpc`,
    description:       skillConfig.description,
    mimeType:          '',
    payTo:             getAddress(PAY_TO),
    maxTimeoutSeconds: 60,
    asset:             getAddress(asset.address),
    extra:             asset.eip712,
    outputSchema:      { input: { type: 'http', method: 'POST', discoverable: true } },
  };
}

let paymentMiddleware;
try {
  const x402 = require('x402-express');
  paymentMiddleware = x402.paymentMiddleware(PAY_TO, {
    'POST /api/sparql': {
      price:       '$0.05',
      network:     'base-sepolia',
      description: 'Execute a SPARQL query across Solid pods',
    },
    'POST /api/vocab': {
      price:       '$0.25',
      network:     'base-sepolia',
      description: 'Design a custom RDF vocabulary for your Solid data model',
    },
  }, FACILITATOR);
  app.use(paymentMiddleware);
  console.log('x402 payment middleware active');
} catch (e) {
  console.warn('x402-express not available — paid endpoints unprotected:', e.message);
}

// ── Scaffold helpers ──────────────────────────────────────────────────────────
const SCAFFOLD_COMPONENTS = ['auth', 'pod-reader', 'pod-writer', 'access-control', 'ui'];

function parseScaffoldFiles(text) {
  const files = [];
  const regex = /FILE:\s*(\S+)\s*\n```[a-zA-Z]*\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    files.push({ filename: match[1].trim(), content: match[2] });
  }
  return files;
}

function calcScaffoldPrice(components) {
  if (!components || components.length === 0) return '$0.10';
  const n = Math.min(components.length, 5);
  return `$${Math.min(n * 0.10, 0.50).toFixed(2)}`;
}

function buildScaffoldPaymentReqs(priceStr, req) {
  const amount = processPriceToAtomicAmount(priceStr, 'base-sepolia');
  if ('error' in amount) throw new Error(amount.error);
  const { maxAmountRequired, asset } = amount;
  return {
    scheme:            'exact',
    network:           'base-sepolia',
    maxAmountRequired,
    resource:          `${req.protocol}://${req.get('host')}/api/scaffold`,
    description:       'Solid app scaffold',
    mimeType:          '',
    payTo:             getAddress(PAY_TO),
    maxTimeoutSeconds: 300,
    asset:             getAddress(asset.address),
    extra:             asset.eip712,
    outputSchema:      { input: { type: 'http', method: 'POST', discoverable: true } },
  };
}

function buildScaffoldPrompt(topic, components, framework, dataType, accessPattern) {
  const compDesc = {
    'auth':           'src/auth.js — Solid OIDC login/logout with @inrupt/solid-client-authn-browser',
    'pod-reader':     'src/pod-reader.js — read and list resources from a Solid Pod',
    'pod-writer':     'src/pod-writer.js — create and update resources in a Solid Pod',
    'access-control': 'src/access-control.js — WAC/ACP: share, revoke, inspect permissions',
    'ui':             'public/index.html + public/style.css — browser UI wiring all components',
  };
  const fileList = [
    'package.json',
    ...components.map(c => compDesc[c] || `src/${c}.js`),
    'README.md',
  ].map(f => `- ${f}`).join('\n');

  const heading  = topic ? `Build a working Solid web app for: "${topic}"` : 'Build a working general-purpose Solid web app';
  const topicHint = topic
    ? `Use domain-appropriate names throughout (e.g. for a health app use "patient", "record", "doctor" — not "user", "item", "person").`
    : `Use clear, generic but meaningful names.`;

  return `${heading}
Framework: ${framework} | Data: ${dataType} | Access pattern: ${accessPattern}

${topicHint}

Output EVERY file using EXACTLY this format — nothing else outside these blocks:

FILE: <relative-path>
\`\`\`<lang>
<complete file content>
\`\`\`

Required files:
${fileList}

PACKAGE.JSON rules:
- name: derived from the topic (kebab-case, e.g. "health-records-app")
- version: "1.0.0"
- type: "module"
- scripts: { "dev": "npx serve public", "start": "node src/server.js" }
- dependencies: { "@inrupt/solid-client": "^2.0.0", "@inrupt/solid-client-authn-browser": "^2.0.0", "@inrupt/vocab-common-rdf": "^2.0.0" }
- devDependencies: { "serve": "^14.0.0" }

README.MD rules (must be useful — this is what the developer reads first):
- One-line description of what the app does (topic-specific)
- ## Quick Start section with exactly these steps:
  1. npm install
  2. Copy .env.example to .env and fill in SOLID_IDP (default: https://solidcommunity.net)
  3. npx serve public
- ## What's included section listing each generated file with a one-sentence description
- ## Environment Variables section: SOLID_IDP, POD_URL
- ## How it works section: 3–4 sentences on the Solid architecture (Pods, OIDC, WAC)

Each source file must be COMPLETE and RUNNABLE — real imports, real function bodies, no "// TODO" stubs.`;
}

// ── Paid endpoints ────────────────────────────────────────────────────────────
app.post('/api/scaffold', async (req, res) => {
  const { framework = 'vanilla', dataType = 'notes', accessPattern = 'private', topic, components = [] } = req.body;
  const xPayment = req.headers['x-payment'];

  // Dynamic price based on requested components
  const priceStr = calcScaffoldPrice(components);
  let payReqs;
  try { payReqs = buildScaffoldPaymentReqs(priceStr, req); }
  catch (e) { return res.status(500).json({ error: e.message }); }

  // No payment — return 402 with dynamic requirements
  if (!xPayment) {
    return res.status(402).json({ x402Version: 1, error: 'X-PAYMENT header is required', accepts: [payReqs] });
  }

  // Verify + settle payment
  let txHash = null, payer = null;
  try {
    const decoded = x402Exact.evm.decodePayment(xPayment);
    decoded.x402Version = 1;
    payer = decoded?.payload?.authorization?.from || null;

    const verified = await verifyX402(decoded, payReqs);
    if (!verified.isValid)
      return res.status(402).json({ x402Version: 1, error: verified.invalidReason, accepts: [payReqs] });

    const settled = await settleX402(decoded, payReqs);
    if (!settled.success)
      return res.status(402).json({ x402Version: 1, error: settled.errorReason, accepts: [payReqs] });

    txHash = settled.transaction || null;
    console.log('[x402] settled:', JSON.stringify(settled));
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Payment-Response', JSON.stringify(settled));
    res.flushHeaders(); // send headers now so client can read txHash before scaffold arrives
  } catch (e) {
    return res.status(402).json({ x402Version: 1, error: 'Payment failed: ' + e.message });
  }

  // Generate scaffold — use components if specified, otherwise full app
  try {
    const comps      = components.length > 0 ? components : [...SCAFFOLD_COMPONENTS];
    const userPrompt = buildScaffoldPrompt(topic, comps, framework, dataType, accessPattern);

    const completion = await client.chat.completions.create({
      model:      LLM_MODEL,
      max_tokens: 8192,
      messages: [
        { role: 'system', content: FULL_SYSTEM_PROMPT },
        { role: 'user',   content: userPrompt },
      ],
    });

    const scaffoldText = completion.choices[0].message.content;
    const files        = parseScaffoldFiles(scaffoldText);

    res.end(JSON.stringify({
      scaffold: scaffoldText,
      files,
      paidBy:  payer,
      txHash,
      price:   priceStr,
      inputs:  { framework, dataType, accessPattern, topic, components: comps },
    }));
  } catch (err) {
    res.end(JSON.stringify({ error: err.message }));
  }
});

app.post('/api/sparql', async (req, res) => {
  const { query, podUrl } = req.body;
  const payment = req.x402Payment;
  // Placeholder — would execute via Comunica against real pod
  res.json({
    results: [],
    query,
    podUrl,
    note:   'SPARQL execution requires a running pod server',
    paidBy: payment?.payer || null,
    txHash: payment?.transaction || null,
  });
});

app.post('/api/download', (req, res) => {
  // Accept either files[] array or raw scaffold text
  let files = req.body.files;
  if (!files || !files.length) {
    const scaffold = req.body.scaffold;
    if (!scaffold) return res.status(400).json({ error: 'Provide files[] or scaffold' });
    files = parseScaffoldFiles(scaffold);
    if (!files.length) return res.status(400).json({ error: 'No FILE: blocks found in scaffold' });
  }

  // Derive zip filename from topic
  const topic   = (req.body.topic || 'solid-app').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const zipName = `${topic || 'solid-app'}.zip`;

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', err => { console.error('Archive error:', err); res.end(); });
  archive.pipe(res);

  const hasReadme = files.some(f => f.filename.toLowerCase().includes('readme'));
  const hasPkg    = files.some(f => f.filename === 'package.json');

  files.forEach(({ filename, content }) => archive.append(content, { name: filename }));

  // Inject fallback README if LLM didn't produce one
  if (!hasReadme) {
    const fileList = files.map(f => `- \`${f.filename}\``).join('\n');
    archive.append(
      `# ${topic || 'Solid App'}\n\nGenerated by Solid Web Bot (ODI)\n\n## Quick Start\n\`\`\`bash\nnpm install\nnpx serve public\n\`\`\`\n\n## Files\n${fileList}\n`,
      { name: 'README.md' }
    );
  }

  // Inject fallback package.json if LLM didn't produce one
  if (!hasPkg) {
    const pkg = JSON.stringify({
      name: topic || 'solid-app', version: '1.0.0', type: 'module',
      scripts: { dev: 'npx serve public', start: 'node src/server.js' },
      dependencies: {
        '@inrupt/solid-client': '^2.0.0',
        '@inrupt/solid-client-authn-browser': '^2.0.0',
        '@inrupt/vocab-common-rdf': '^2.0.0',
      },
      devDependencies: { serve: '^14.0.0' },
    }, null, 2);
    archive.append(pkg, { name: 'package.json' });
  }

  // Always include a .env.example
  archive.append('SOLID_IDP=https://solidcommunity.net\nPOD_URL=\n', { name: '.env.example' });

  archive.finalize();
});

// ── A2A task endpoint (simplified JSON-RPC) ───────────────────────────────────
app.post('/a2a/jsonrpc', async (req, res) => {
  const { method, params, id } = req.body;

  // A2A v1.0 uses 'message/send'; v0.3 uses 'SendMessage'
  if (method === 'message/send' || method === 'SendMessage') {
    const userText  = params?.message?.parts?.find(p => p.kind === 'text')?.text || '';
    const skillId   = params?.configuration?.skillId || null;
    const paidCfg   = skillId ? PAID_A2A_SKILLS[skillId] : null;
    // x402 payment: prefer A2A metadata (v1.0 transport), fall back to HTTP header (HTTP transport)
    const xPaymentMeta = params?.message?.metadata?.['x402.payment.payload'];
    const xPayment  = xPaymentMeta || req.headers['x-payment'];
    const taskId    = params?.message?.taskId || `task-${Date.now()}`;

    // ── Payment gate ──────────────────────────────────────────────────────────
    if (paidCfg && !xPayment) {
      let reqs;
      try { reqs = buildA2APaymentRequirements(paidCfg, req); }
      catch (e) { return res.status(500).json({ jsonrpc: '2.0', id, error: { code: -32603, message: e.message } }); }
      // Use A2A input-required state (proper A2A x402 transport, not HTTP 402)
      return res.json({
        jsonrpc: '2.0', id,
        result: {
          kind:   'task',
          id:     taskId,
          status: {
            state:   'input-required',
            message: {
              kind: 'message', role: 'agent',
              parts: [{ kind: 'text', text: `Payment required for skill ${skillId} ($${paidCfg.price} USDC on ${paidCfg.network})` }],
              metadata: {
                'x402.payment.status':   'payment-required',
                'x402.payment.required': { x402Version: 1, error: 'Payment required', accepts: toJsonSafe([reqs]) },
              },
            },
          },
        },
      });
    }

    let txHash = null;
    if (paidCfg && xPayment) {
      let decoded;
      try { decoded = x402Exact.evm.decodePayment(xPayment); decoded.x402Version = 1; }
      catch (e) {
        return res.status(402).json({ jsonrpc: '2.0', id, error: { code: -32402, message: 'Invalid payment header' } });
      }
      const reqs     = buildA2APaymentRequirements(paidCfg, req);
      const verified = await verifyX402(decoded, reqs);
      if (!verified.isValid) {
        return res.status(402).json({ jsonrpc: '2.0', id, error: { code: -32402, message: verified.invalidReason } });
      }
      try {
        const settled = await settleX402(decoded, reqs);
        if (!settled.success) {
          return res.status(402).json({ jsonrpc: '2.0', id, error: { code: -32402, message: settled.errorReason } });
        }
        txHash = settled.transaction;
        res.setHeader('X-Payment-Response', JSON.stringify(settled));
      } catch (e) {
        return res.status(402).json({ jsonrpc: '2.0', id, error: { code: -32402, message: 'Settlement failed: ' + e.message } });
      }
    }

    // ── Execute skill via LLM ─────────────────────────────────────────────────
    try {
      const completion = await client.chat.completions.create({
        model:      LLM_MODEL,
        max_tokens: 4096,
        messages: [
          { role: 'system', content: FULL_SYSTEM_PROMPT + '\n\nYou are being called by an AI agent via A2A protocol. Respond concisely and structured.' },
          { role: 'user',   content: userText },
        ],
      });

      res.json({
        jsonrpc: '2.0',
        id,
        result: {
          kind:      'task',
          id:        taskId,
          status:    { state: 'completed' },
          txHash,
          artifacts: [{
            name:  'response',
            parts: [{ kind: 'text', text: completion.choices[0].message.content }],
          }],
        },
      });
    } catch (err) {
      res.json({ jsonrpc: '2.0', id, error: { code: -32603, message: err.message } });
    }
    return;
  }

  // A2A v1.0: tasks/get (alias for GetTask)
  if (method === 'tasks/get' || method === 'GetTask') {
    res.json({ jsonrpc: '2.0', id, result: { kind: 'task', id: params?.id || params?.taskId, status: { state: 'completed' } } });
    return;
  }

  res.json({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } });
});

// ── Free chat endpoint (streaming) ───────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages must be a non-empty array' });
  }

  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');

  try {
    const stream = await client.chat.completions.create({
      model:      LLM_MODEL,
      messages:   [{ role: 'system', content: FULL_SYSTEM_PROMPT }, ...messages],
      stream:     true,
      max_tokens: 8192,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) res.write(`data: ${JSON.stringify({ text: delta })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error(err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Solid Bot running at ${BASE_URL}`);
  console.log(`  WebID:      ${BASE_URL}/profile`);
  console.log(`  Agent Card: ${BASE_URL}/.well-known/agent-card.json`);
  console.log(`  A2A:        ${BASE_URL}/a2a/jsonrpc`);
  console.log(`  Chat:       ${BASE_URL}/api/chat (free)`);
  console.log(`  Scaffold:   ${BASE_URL}/api/scaffold ($0.10 x402)`);
});
