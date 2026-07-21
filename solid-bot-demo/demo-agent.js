/**
 * demo-agent.js — Solid Bot A2A + x402 micropayment demo
 *
 * Demonstrates the full agent payment loop:
 *   1. Free skill (no payment)
 *   2. Paid skill probe → HTTP 402
 *   3. Sign EIP-3009 → retry with X-PAYMENT header → settlement
 *
 * Usage:
 *   DEMO_PAYER_PRIVATE_KEY=0x... node demo-agent.js
 *
 * The payer wallet must hold USDC on base-sepolia.
 * Faucet: https://faucet.circle.com  (select Base Sepolia, paste wallet address)
 */

require('dotenv').config();

const { privateKeyToAccount } = require('viem/accounts');
const { createPaymentHeader }  = require('x402/client');

const BOT_URL = process.env.SOLID_BOT_URL || 'http://localhost:4000';
const PRIVATE_KEY = process.env.DEMO_PAYER_PRIVATE_KEY;

// ── helpers ───────────────────────────────────────────────────────────────────

async function a2a(text, skillId, paymentHeader = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (paymentHeader) headers['X-PAYMENT'] = paymentHeader;

  const res = await fetch(`${BOT_URL}/a2a/jsonrpc`, {
    method:  'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id:      `demo-${Date.now()}`,
      method:  'SendMessage',
      params: {
        message:       { parts: [{ kind: 'text', text }] },
        configuration: { skillId },
      },
    }),
  });
  return { status: res.status, body: await res.json() };
}

function hr(label) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${label}`);
  console.log('─'.repeat(60));
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🤖  Solid Bot  ×  A2A + x402 micropayment demo');
  console.log(`    Server: ${BOT_URL}\n`);

  if (!PRIVATE_KEY) {
    console.error('❌  Set DEMO_PAYER_PRIVATE_KEY=0x... in .env (base-sepolia wallet with USDC)');
    console.error('    Faucet: https://faucet.circle.com');
    process.exit(1);
  }

  const account = privateKeyToAccount(PRIVATE_KEY);
  console.log(`    Payer:  ${account.address}`);

  // ── Step 1: Free skill — no payment ──────────────────────────────────────
  hr('Step 1 — Free skill (solid2-evangelize-vision)');
  const free = await a2a('What is Solid Protocol?', 'solid2-evangelize-vision');
  console.log(`HTTP ${free.status}`);
  if (free.body.result) {
    const text = free.body.result.artifacts?.[0]?.parts?.[0]?.text ?? '';
    console.log('\nResponse (first 200 chars):');
    console.log(text.slice(0, 200) + (text.length > 200 ? '…' : ''));
  } else {
    console.log('Result:', JSON.stringify(free.body, null, 2));
  }

  // ── Step 2: Paid skill — probe for 402 ───────────────────────────────────
  hr('Step 2 — Paid skill probe (solid4-scaffold-app) → expect 402');
  const probe = await a2a('Build me a React health app using Solid', 'solid4-scaffold-app');
  console.log(`HTTP ${probe.status}`);

  if (probe.status !== 402) {
    console.error('Expected 402, got:', probe.status, probe.body);
    process.exit(1);
  }

  const accepts = probe.body.error?.data?.accepts;
  if (!accepts?.length) {
    console.error('No payment requirements in response:', probe.body);
    process.exit(1);
  }

  const req = accepts[0];
  console.log(`\n  payTo:   ${req.payTo}`);
  console.log(`  amount:  ${req.maxAmountRequired} USDC atomic units  ($0.10)`);
  console.log(`  asset:   ${req.asset}`);
  console.log(`  network: ${req.network}`);
  console.log(`  ✅ Payment requirement received`);

  // ── Step 3: Sign EIP-3009 + retry ────────────────────────────────────────
  hr('Step 3 — Sign EIP-3009 off-chain → retry with X-PAYMENT');
  console.log('Signing authorization…');
  const paymentHeader = await createPaymentHeader(account, 1, req);
  console.log(`Signed ✓  (${paymentHeader.length} chars)`);

  console.log('\nRetrying with X-PAYMENT header…');
  const paid = await a2a('Build me a React health app using Solid', 'solid4-scaffold-app', paymentHeader);
  console.log(`HTTP ${paid.status}`);

  if (paid.body.result) {
    const scaffold = paid.body.result.artifacts?.[0]?.parts?.[0]?.text ?? '';
    const txHash   = paid.body.result.txHash;
    console.log('\n  ✅ Payment settled — scaffold received');
    if (txHash) console.log(`  TX hash: ${txHash}`);
    console.log('\nScaffold (first 400 chars):');
    console.log(scaffold.slice(0, 400) + (scaffold.length > 400 ? '\n…' : ''));
  } else {
    console.error('Error response:', JSON.stringify(paid.body, null, 2));
  }

  console.log('\n🎉  A2A + x402 demo complete\n');
}

main().catch(err => { console.error(err); process.exit(1); });
