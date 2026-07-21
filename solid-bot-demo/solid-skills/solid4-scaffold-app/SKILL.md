---
metadata:
  version: "2026-04-23"
name: solid4-scaffold-app
object_class: LeafSkill
description: "Generate a working Solid app tailored to the visitor's stack and data model — a working app for individual developers, a prototype for organisations. Solid26-compliant output. Use when: Visitor is Convinced or Builder with strong fit, ready to write code."
classification:
  isco08: "2519"
  soc2018: "15-2031"
  isic: "6312"
  naics: "541715"
---

# SOLID4. Build App

## Role

Solid Bot — Technical builder and code generator

## When to Use

- Visitor type is Convinced
- Builder has passed solid3-qualify-fit with Strong fit
- Visitor explicitly asks for code or setup help

## Inputs

| Input | Description | Default |
|---|---|---|
| `FRAMEWORK` | React / Vue / vanilla JS / Node.js / Tauri / Capacitor | Ask if unknown |
| `TARGET` | web / desktop / mobile / all | web |
| `LIBRARY` | inrupt-sdk / LDO / rdflib | inrupt-sdk for beginners, LDO for TypeScript/React |
| `DATA_TYPE` | What data to store (notes, health, contacts, etc.) | Ask if unknown |
| `ACCESS_PATTERN` | private / shared / public | private |
| `POD_SERVER` | local CSS / solidcommunity.net / ESS | local CSS |

## Instructions

### 0. Frame The Output Correctly

Name the deliverable based on SCALE (from solid1-diagnose-visitor):

- **Individual developer:** "I'll build you a working app"
- **Organisation:** "I'll put together a prototype for your team"

If SCALE is Unknown and they are ready to build, ask once: "Is this for a personal project or are you building this for an organisation?"

### 1. Clarify The Key Decisions (if not already known)

Ask only what is missing. Never ask all at once:

- "What platform are you targeting — web, desktop, mobile, or all of them?"
- "What are you building with — React, Vue, or plain JavaScript?"
- "What kind of data are you storing?"
- "Should this data be private to each user, or shared between people?"

**Platform routing:**

- Web only → standard web app (React/Vue/vanilla)
- Desktop (Mac/Windows/Linux) → Tauri wrapper around the web app
- Mobile (iOS/Android) → Capacitor wrapper around the web app
- All platforms → build the web app first, then add Tauri + Capacitor

Always build the Solid web app core first. Tauri and Capacitor are wrappers added on top — the Solid layer is identical across all targets.

**If the visitor asks for native Swift (iOS) or Kotlin (Android):**
Do NOT generate native code. Redirect firmly:
> "The Solid ecosystem has no mature Swift or Kotlin libraries — you'd be hand-rolling OIDC, Turtle parsing, and pod writes from scratch. The realistic path is Capacitor: it wraps your web app in a native shell, gives you full inrupt SDK support, and ships to both iOS and Android from one codebase. Want me to build that instead?"

### 2. Choose The Right Library

| Situation | Library | Reason |
|---|---|---|
| Beginner, any framework | @inrupt/solid-client | Best docs, most abstractions, lowest RDF exposure |
| TypeScript + React | LDO (@ldo/solid-react) | Typed RDF objects, React hooks, most ergonomic |
| Complex queries across pods | Comunica (@comunica/query-sparql-solid) | Full SPARQL support |
| Low-level control needed | rdflib | Battle-tested, full control |
| Tauri (desktop wrapper) | Same as above + @tauri-apps/api | Solid layer unchanged; Tauri adds native file/notification access |
| Capacitor (mobile wrapper) | Same as above + @capacitor/core | Solid layer unchanged; Capacitor bridges native device APIs |

The Solid library choice is independent of the wrapper. Pick the right Solid library first, then add the wrapper on top.

### 3. Output Format — Always Use FILE: Blocks

**Every code file MUST be output using this exact format:**

```
FILE: path/to/filename.ext
```lang
// code here
```

```

Example:

```

FILE: src/auth.js

```js
import { login } from '@inrupt/solid-client-authn-browser';
// ...
```

FILE: package.json

```json
{
  "name": "my-solid-app"
}
```

```

Rules:
- Every file gets its own `FILE:` block — never merge multiple files into one block
- Always include `package.json` and `index.html` (or `main.jsx` for React) as separate FILE blocks
- The filename must be the relative path from the project root (e.g. `src/auth.js`, not just `auth.js`)
- After all FILE blocks, add a short "Quick Start" section with the 3 commands to run the app
- Never output a wall of code without FILE: labels

### 4. Generate Code In This Order (always)

**Never generate data code before auth is wired. Auth first, always.**

#### Step 1 — package.json

Always output this first as a FILE block.

```

FILE: package.json

```json
{
  "name": "solid-app",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "@inrupt/solid-client": "^2.0.0",
    "@inrupt/solid-client-authn-browser": "^2.0.0",
    "@inrupt/vocab-common-rdf": "^1.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.0.0"
  }
}
```

```

#### Step 2 — Validate WebID and Auth (Solid26-compliant)

Always validate the WebID before attempting auth. Handle the 303 redirect the spec requires. If multiple OIDC issuers exist, let the user choose — never pick silently.

```

FILE: src/auth.js

Always validate the WebID before attempting auth. Handle the 303 redirect the spec requires. If multiple OIDC issuers exist, let the user choose — never pick silently.

```
FILE: src/auth.js

```js
import { login, getDefaultSession, handleIncomingRedirect } from '@inrupt/solid-client-authn-browser';
import { getSolidDataset, getThing, getUrlAll } from '@inrupt/solid-client';

// Validate WebID is a well-formed http/https URI
export function isValidWebId(webId) {
  try {
    const url = new URL(webId);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Call on every page load — handles redirect back from OIDC provider
export async function initAuth(webId) {
  await handleIncomingRedirect({ restorePreviousSession: true });

  if (getDefaultSession().info.isLoggedIn) return getDefaultSession();

  if (!isValidWebId(webId)) throw new Error('Invalid WebID — must be a valid http/https URI');

  // Fetch profile to discover OIDC issuer (handles 303 redirect automatically)
  const profileUrl = webId.split('#')[0];
  const profile = await getSolidDataset(profileUrl); // unauthenticated
  const profileThing = getThing(profile, webId);
  const issuers = getUrlAll(profileThing, 'http://www.w3.org/ns/solid/terms#oidcIssuer');

  if (!issuers.length) throw new Error('No solid:oidcIssuer found in WebID profile');

  // Solid26: oidcIssuer is only authoritative from the WebID Document
  const oidcIssuer = issuers[0];

  await login({
    oidcIssuer,
    redirectUrl: window.location.href,
    clientName: 'My Solid App',
  });

  return getDefaultSession();
}

export function getSession() {
  return getDefaultSession();
}
```

```

#### Step 3 — Discover Pod Storage (Solid26-compliant)

Never guess the Pod URL by splitting the WebID string. Use `pim:storage` discovery.

```

FILE: src/pod.js

Never guess the Pod URL by splitting the WebID string. Use `pim:storage` discovery.

```
FILE: src/pod.js

```js
import { getSolidDataset, getThing, getUrlAll } from '@inrupt/solid-client';

// Solid26: discover storage from the user's WebID profile
export async function getPodRoot(webId, fetch) {
  const profileUrl = webId.split('#')[0];
  const profile = await getSolidDataset(profileUrl, { fetch });
  const profileThing = getThing(profile, webId);
  const storageUrls = getUrlAll(profileThing, 'http://www.w3.org/ns/pim/space#storage');

  if (!storageUrls.length) throw new Error('No pim:storage found in WebID profile');
  return storageUrls[0]; // use first storage
}

export async function resourceUrl(webId, fetch, appPath = 'myapp/data.ttl') {
  const podRoot = await getPodRoot(webId, fetch);
  return `${podRoot}${appPath}`;
}
```

```

#### Step 4 — Read

```

FILE: src/data.js (read section)

```js
import { getSolidDataset, getThing, getStringNoLocale } from '@inrupt/solid-client';
import { DCTERMS } from '@inrupt/vocab-common-rdf';

export async function readData(url, fetch) {
  const dataset = await getSolidDataset(url, { fetch });
  const thing = getThing(dataset, url + '#entry');
  return getStringNoLocale(thing, DCTERMS.description);
}
```

```

#### Step 5 — Write (ETag-safe)

```

FILE: src/data.js (write section — merge with read section above)

```
FILE: src/data.js (write section — merge with read section above)

```js
import {
  getSolidDataset,
  createSolidDataset,
  createThing,
  setThing,
  setStringNoLocale,
  saveSolidDatasetAt
} from '@inrupt/solid-client';
import { DCTERMS } from '@inrupt/vocab-common-rdf';

export async function saveData(url, userInput, fetch) {
  let dataset;
  try {
    dataset = await getSolidDataset(url, { fetch });
  } catch {
    dataset = createSolidDataset();
  }

  let thing = createThing({ url: url + '#entry' });
  thing = setStringNoLocale(thing, DCTERMS.description, userInput);
  thing = setStringNoLocale(thing, DCTERMS.created, new Date().toISOString());
  dataset = setThing(dataset, thing);

  await saveSolidDatasetAt(url, dataset, { fetch });
}
```

```

#### Step 6 — Access control (only if ACCESS_PATTERN is shared or public)

Always use WAC — 13 server implementations vs ACP's 4.

```

FILE: src/access.js

```
FILE: src/access.js

```js
import { universalAccess } from '@inrupt/solid-client';

export async function setPublic(url, fetch) {
  await universalAccess.setPublicAccess(url, { read: true }, { fetch });
}

export async function shareWith(url, agentWebId, fetch) {
  await universalAccess.setAgentAccess(url, agentWebId, { read: true, write: true }, { fetch });
}
```

```

#### Step 7 — Main app component

Output the main UI as a FILE block tailored to the DATA_TYPE and FRAMEWORK.

#### Step 8 — Tauri wrapper (only if TARGET includes desktop)

Always complete Steps 1–7 first.

```

FILE: src-tauri/tauri.conf.json

```json
{
  "build": { "devUrl": "http://localhost:5173", "frontendDist": "../dist" },
  "app": { "windows": [{ "title": "My Solid App", "width": 1024, "height": 768 }] },
  "bundle": { "identifier": "org.example.mysolidapp", "targets": ["dmg", "msi", "appimage"] }
}
```

```

Install commands:
```bash
npm install --save-dev @tauri-apps/cli @tauri-apps/api
npx tauri init
```

#### Step 9 — Capacitor wrapper (only if TARGET includes mobile)

Always complete Steps 1–7 first.

```
FILE: capacitor.config.json
```json
{
  "appId": "org.example.mysolidapp",
  "appName": "My Solid App",
  "webDir": "dist"
}
```

```

Install commands:
```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android @capacitor/browser
npx cap init
npm run build && npx cap sync
```

### 5. After All FILE Blocks — Quick Start

Always end every scaffold with:

```
## Quick Start

```

#### Step 7 — Main app component

Output the main UI as a FILE block tailored to the DATA_TYPE and FRAMEWORK.

#### Step 8 — Tauri wrapper (only if TARGET includes desktop)

Always complete Steps 1–7 first.

```

FILE: src-tauri/tauri.conf.json

```json
{
  "build": { "devUrl": "http://localhost:5173", "frontendDist": "../dist" },
  "app": { "windows": [{ "title": "My Solid App", "width": 1024, "height": 768 }] },
  "bundle": { "identifier": "org.example.mysolidapp", "targets": ["dmg", "msi", "appimage"] }
}
```

```

Install commands:
```bash
npm install --save-dev @tauri-apps/cli @tauri-apps/api
npx tauri init
```

#### Step 9 — Capacitor wrapper (only if TARGET includes mobile)

Always complete Steps 1–7 first.

```
FILE: capacitor.config.json
```json
{
  "appId": "org.example.mysolidapp",
  "appName": "My Solid App",
  "webDir": "dist"
}
```

```

Install commands:
```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android @capacitor/browser
npx cap init
npm run build && npx cap sync
```

### 5. After All FILE Blocks — Quick Start

Always end every scaffold with:

```
## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173 and enter your WebID to log in.

For a free Pod: https://solidcommunity.net

```

### 6. Vocabulary Rules

**Always use named constants. Never raw URI strings.**

```js
// CORRECT
import { VCARD, DCTERMS, FOAF } from '@inrupt/vocab-common-rdf';
setStringNoLocale(thing, VCARD.fn, name);

// WRONG
setStringNoLocale(thing, 'http://www.w3.org/2006/vcard/ns#fn', name);
```

Choose vocabulary based on data type:

- Personal profile → VCARD
- Documents / notes → DCTERMS
- Social / people → FOAF
- General structured data → schema.org
- Custom domain → define your own prefix

### 7. Common Gotchas — Always Mention

**Web (all targets):**

- Redirect URI must match exactly (localhost:5173 ≠ localhost:5173/)
- All pod requests must use session.fetch, not native fetch
- Pod server must be running before the app tries to auth
- `solid:oidcIssuer` is only authoritative from the WebID Document

**Tauri (desktop):**

- Rust toolchain must be installed before `tauri build` — point to rustup.rs
- Custom URL scheme needed for Solid-OIDC redirect

**Capacitor (mobile):**

- Must `npm run build` before every `npx cap sync`
- Solid-OIDC auth requires `@capacitor/browser` + deep links
- Mobile pods must use HTTPS

**Access control:**

- Use WAC not ACP — WAC has 13 server implementations, ACP has 4
- Do not use UMA flow — not widely implemented; inrupt SDK uses standard OP tokens by default

## Evaluation

| Field | Value |
|---|---|
| Evaluator | e-solid1-conversation-quality |
| Pass Threshold | All code in FILE: blocks with correct relative paths; package.json included; auth before data; pim:storage for Pod discovery; vocab constants used; WAC for access control; Quick Start section present; wrapper steps only when target includes desktop/mobile |
