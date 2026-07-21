import {
  login,
  logout,
  getDefaultSession,
  handleIncomingRedirect,
} from '@inrupt/solid-client-authn-browser';

import {
  getSolidDataset,
  getThing,
  getStringNoLocale,
  setStringNoLocale,
  setThing,
  saveSolidDatasetAt,
  createSolidDataset,
  createThing,
  getThingAll,
} from '@inrupt/solid-client';

import { VCARD, DCTERMS } from '@inrupt/vocab-common-rdf';

// ── DOM refs ────────────────────────────────────────────────────────────────
const loginSection   = document.getElementById('login-section');
const profileSection = document.getElementById('profile-section');
const issuerInput    = document.getElementById('issuer');
const loginBtn       = document.getElementById('login-btn');
const loginStatus    = document.getElementById('login-status');
const logoutBtn      = document.getElementById('logout-btn');
const profileName    = document.getElementById('profile-name');
const profileWebId   = document.getElementById('profile-webid');
const notesUrl       = document.getElementById('notes-url');
const noteInput      = document.getElementById('note-input');
const saveBtn        = document.getElementById('save-btn');
const saveStatus     = document.getElementById('save-status');
const noteList       = document.getElementById('note-list');

function setStatus(el, msg, type = 'info') {
  el.textContent = msg;
  el.className = `status ${type}`;
}

// ── Auth ─────────────────────────────────────────────────────────────────────
loginBtn.addEventListener('click', async () => {
  const issuer = issuerInput.value.trim();
  if (!issuer) return;
  setStatus(loginStatus, 'Redirecting to login…', 'info');
  await login({
    oidcIssuer: issuer,
    redirectUrl: window.location.href,
    clientName: 'Solid App (local)',
  });
});

logoutBtn.addEventListener('click', async () => {
  await logout();
  profileSection.style.display = 'none';
  loginSection.style.display   = 'block';
});

// ── Profile ───────────────────────────────────────────────────────────────────
async function loadProfile(webId, fetchFn) {
  profileName.textContent  = webId;
  profileWebId.textContent = webId;
  try {
    const ds      = await getSolidDataset(webId, { fetch: fetchFn });
    const profile = getThing(ds, webId);
    const name    = getStringNoLocale(profile, VCARD.fn)
                 || getStringNoLocale(profile, VCARD.name)
                 || webId;
    profileName.textContent = name;
  } catch {
    // profile may not be readable — show webId as fallback
  }
}

// ── Notes ─────────────────────────────────────────────────────────────────────
function notesResource(webId) {
  // store notes at <pod>/solid-app/notes.ttl
  const base = webId.split('/profile/')[0] || webId.replace(/#.*$/, '');
  return `${base}/solid-app/notes.ttl`;
}

async function loadNotes(webId, fetchFn) {
  const url = notesResource(webId);
  notesUrl.textContent = url;
  noteList.innerHTML = '';

  let ds;
  try {
    ds = await getSolidDataset(url, { fetch: fetchFn });
  } catch {
    noteList.innerHTML = '<li class="empty">No notes yet.</li>';
    return;
  }

  const things = getThingAll(ds).filter(t => !t.url.endsWith('/notes.ttl'));
  if (!things.length) {
    noteList.innerHTML = '<li class="empty">No notes yet.</li>';
    return;
  }

  // sort newest first
  things.sort((a, b) => {
    const da = getStringNoLocale(a, DCTERMS.created) || '';
    const db = getStringNoLocale(b, DCTERMS.created) || '';
    return db.localeCompare(da);
  });

  things.forEach(t => {
    const text    = getStringNoLocale(t, DCTERMS.description) || '';
    const created = getStringNoLocale(t, DCTERMS.created) || '';
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="note-text">${escHtml(text)}</span>
      <span class="note-date">${created ? new Date(created).toLocaleString() : ''}</span>`;
    noteList.appendChild(li);
  });
}

saveBtn.addEventListener('click', async () => {
  const text = noteInput.value.trim();
  if (!text) return;
  const { webId, fetch: fetchFn } = getDefaultSession().info;
  const url = notesResource(webId);

  saveBtn.disabled = true;
  setStatus(saveStatus, 'Saving…', 'info');

  try {
    let ds;
    try {
      ds = await getSolidDataset(url, { fetch: fetchFn });
    } catch {
      ds = createSolidDataset();
    }

    const id      = `${url}#note-${Date.now()}`;
    let   note    = createThing({ url: id });
    note = setStringNoLocale(note, DCTERMS.description, text);
    note = setStringNoLocale(note, DCTERMS.created, new Date().toISOString());
    ds   = setThing(ds, note);

    await saveSolidDatasetAt(url, ds, { fetch: fetchFn });
    noteInput.value = '';
    setStatus(saveStatus, 'Saved!', 'ok');
    await loadNotes(webId, fetchFn);
  } catch (e) {
    setStatus(saveStatus, `Error: ${e.message}`, 'err');
  } finally {
    saveBtn.disabled = false;
  }
});

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Boot ──────────────────────────────────────────────────────────────────────
async function init() {
  await handleIncomingRedirect({ restorePreviousSession: true });
  const session = getDefaultSession();
  if (session.info.isLoggedIn) {
    const { webId, fetch: fetchFn } = session.info;
    loginSection.style.display   = 'none';
    profileSection.style.display = 'block';
    await loadProfile(webId, fetchFn);
    await loadNotes(webId, fetchFn);
  }
}

init();
