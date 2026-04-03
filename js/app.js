// ============================================================
// NODO Engine — app.js
// State, theme toggle, navigation, shared utilities
// ============================================================

// ── THEME ────────────────────────────────────────────────────
const THEME_KEY = 'nodo-theme';

export function getTheme() {
  return localStorage.getItem(THEME_KEY) || 'dark';
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  // Update all theme toggle icons
  document.querySelectorAll('[data-theme-icon]').forEach(el => {
    el.textContent = theme === 'dark' ? '☀️' : '🌙';
    el.title = theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
  });
}

export function toggleTheme() {
  const current = getTheme();
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

// ── APP STATE ────────────────────────────────────────────────
export const state = {
  currentTenant: null,
};

// ── SCREEN NAVIGATION ────────────────────────────────────────
export function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

// ── PAGE NAVIGATION (inside panel) ──────────────────────────
export function showPage(id) {
  document.querySelectorAll('.pg').forEach(p => p.classList.remove('on'));
  document.querySelectorAll('.nav').forEach(n => n.classList.remove('on'));
  const pg = document.getElementById('pg-' + id);
  const nv = document.getElementById('n-' + id);
  if (pg) pg.classList.add('on');
  if (nv) nv.classList.add('on');
  const main = document.querySelector('.main');
  if (main) main.scrollTop = 0;
}

// ── ENTER TENANT ─────────────────────────────────────────────
export function enterTenant(tenant) {
  state.currentTenant = tenant;

  // Topbar tenant info
  const nameEl = document.getElementById('p-name');
  const rucEl  = document.getElementById('p-ruc');
  const envEl  = document.getElementById('p-env');
  if (nameEl) nameEl.textContent = tenant.name;
  if (rucEl)  rucEl.textContent  = 'RUC: ' + tenant.ruc;
  if (envEl) {
    if (tenant.env === 'prod') {
      envEl.textContent = '🚀 Producción';
      envEl.classList.add('prod');
    } else {
      envEl.textContent = '⚙ Test';
      envEl.classList.remove('prod');
    }
  }

  // Update page subtitles
  ['ph-dash-sub', 'ph-cfg-sub', 'ph-doc-sub'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = tenant.name + ' · RUC ' + tenant.ruc;
  });

  // Update sidebar company card if present
  const sbName = document.getElementById('sb-company-name');
  const sbRuc  = document.getElementById('sb-company-ruc');
  if (sbName) sbName.textContent = tenant.name;
  if (sbRuc)  sbRuc.textContent  = 'RUC: ' + tenant.ruc;

  showPage('dash');
  showScreen('scr-panel');
}

// ── NOTIFICATION PANEL ───────────────────────────────────────
export function toggleNotif() {
  document.getElementById('notif-overlay')?.classList.toggle('on');
}

// ── TAB SWITCHING ────────────────────────────────────────────
export function switchTab(el, tabId, allIds) {
  el.closest('[data-tabs]').querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
  el.classList.add('on');
  allIds.forEach(id => {
    const pane = document.getElementById(id);
    if (pane) pane.style.display = id === tabId ? 'block' : 'none';
  });
}

// ── ENV SWITCH ───────────────────────────────────────────────
export function setEnv(el) {
  el.closest('.env-sw').querySelectorAll('.env-opt').forEach(o => o.classList.remove('on'));
  el.classList.add('on');
}

// ── MODAL ────────────────────────────────────────────────────
export function openModal(id)  { document.getElementById(id)?.classList.add('on'); }
export function closeModal(id) { document.getElementById(id)?.classList.remove('on'); }

// ── FILTER PILL TOGGLE ───────────────────────────────────────
export function filterPill(el) {
  el.closest('.filter-bar').querySelectorAll('.filter-pill').forEach(p => p.classList.remove('on'));
  el.classList.add('on');
}

// ── LOGO UPLOAD PREVIEW ──────────────────────────────────────
export function handleLogoUpload(inputEl, previewId) {
  const file = inputEl.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const preview = document.getElementById(previewId);
    if (!preview) return;
    preview.innerHTML = `<img src="${e.target.result}" alt="Logo">`;
    preview.closest('.upload-zone')?.classList.add('has-file');
  };
  reader.readAsDataURL(file);
}

// ── TOAST ────────────────────────────────────────────────────
export function toast(msg, type = 'ok') {
  const colors = { ok: 'var(--green)', err: 'var(--red)', warn: 'var(--yellow)' };
  const t = document.createElement('div');
  t.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:999;
    background:var(--bg3);border:1px solid var(--border2);
    border-left:3px solid ${colors[type]};
    border-radius:8px;padding:12px 18px;
    font-size:13px;font-family:'Poppins',sans-serif;
    color:var(--text);box-shadow:0 8px 32px rgba(0,0,0,.4);
    animation:pgIn .18s ease;
  `;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

// ── NODO LOGO SVG (shared) ───────────────────────────────────
export function nodoSvg(size = 17) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 22 22" fill="none">
    <circle cx="11" cy="11" r="3" fill="#000"/>
    <circle cx="4"  cy="6"  r="2" fill="#000" opacity=".85"/>
    <circle cx="18" cy="6"  r="2" fill="#000" opacity=".85"/>
    <circle cx="4"  cy="16" r="2" fill="#000" opacity=".85"/>
    <circle cx="18" cy="16" r="2" fill="#000" opacity=".85"/>
    <line x1="6"  y1="7"  x2="9"  y2="10" stroke="#000" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="16" y1="7"  x2="13" y2="10" stroke="#000" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="6"  y1="15" x2="9"  y2="12" stroke="#000" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="16" y1="15" x2="13" y2="12" stroke="#000" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`;
}

// ── SHARED TOPBAR HTML ───────────────────────────────────────
export function buildTopbar(containerSelector, extra = '') {
  const el = document.querySelector(containerSelector);
  if (!el) return;
  el.innerHTML = `
    <div class="tb-logo">
      <div class="tb-logo-icon">${nodoSvg(17)}</div>
      <span class="tb-logo-text"><span>NODO</span> Engine</span>
    </div>
    <div class="divider"></div>
    <span class="fs-12 text-3">Panel de administración</span>
    ${extra}
    <div class="tb-spacer"></div>
    <div class="tb-actions">
      <button class="theme-btn" data-theme-icon onclick="import('./js/app.js').then(m=>m.toggleTheme())" title="Modo claro/oscuro">☀️</button>
      <div class="icon-btn" onclick="import('./js/app.js').then(m=>m.toggleNotif())" title="Notificaciones">
        <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        <div class="notif-dot"></div>
      </div>
      <div class="divider"></div>
      <div class="avatar" title="Admin">A</div>
    </div>
  `;
}

// ── INIT ─────────────────────────────────────────────────────
export function init() {
  applyTheme(getTheme());
}
