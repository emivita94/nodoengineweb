// ============================================================
// NODO Engine — api.js
// ============================================================

// ── CONFIG ───────────────────────────────────────────────────
let CONFIG = { SUPABASE_URL: '', SUPABASE_ANON: '', API_URL: '' };

try {
  const mod = await import('./config.js');
  CONFIG = mod.CONFIG || CONFIG;
} catch {
  console.warn('[NODO] config.js no encontrado');
}

function hasRealConfig() {
  return (
    CONFIG.SUPABASE_URL  &&
    !CONFIG.SUPABASE_URL.includes('TUPROYECTO') &&
    CONFIG.SUPABASE_ANON &&
    !CONFIG.SUPABASE_ANON.includes('TUANON_KEY')
  );
}

// ── SESIÓN ───────────────────────────────────────────────────
const TOKEN_KEY = 'nodo-auth-token';
const USER_KEY  = 'nodo-auth-user';

export function getAuthToken() { return localStorage.getItem(TOKEN_KEY); }
export function getAuthUser()  {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
}

// isLoggedIn valida que el token NO sea demo si hay config real
export function isLoggedIn() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return false;
  // Si hay config real, tokens demo no son válidos
  if (hasRealConfig() && token.startsWith('demo-')) return false;
  return true;
}

function saveSession(session) {
  localStorage.setItem(TOKEN_KEY, session.access_token);
  localStorage.setItem(USER_KEY,  JSON.stringify(session.user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// ── SUPABASE REST ────────────────────────────────────────────
async function sb(path, opts = {}) {
  if (!hasRealConfig()) throw new Error('CONFIG_MISSING');

  const url = `${CONFIG.SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      'apikey':        CONFIG.SUPABASE_ANON,
      'Authorization': `Bearer ${getAuthToken() || CONFIG.SUPABASE_ANON}`,
      'Content-Type':  'application/json',
      'Prefer':        opts.prefer || 'return=representation',
      ...(opts.headers || {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || err.hint || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ── AUTH ─────────────────────────────────────────────────────
export async function login(email, password) {
  // Sin config real → solo acepta la credencial admin fija
  if (!hasRealConfig()) {
    throw new Error('CONFIG_MISSING');
  }

  const res = await fetch(`${CONFIG.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method:  'POST',
    headers: {
      'apikey':       CONFIG.SUPABASE_ANON,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = data.error_description || data.msg || data.message || '';
    if (msg.includes('Invalid login') || msg.includes('invalid_grant')) {
      throw new Error('Email o contraseña incorrectos');
    }
    if (msg.includes('Email not confirmed')) {
      throw new Error('Confirmá tu email antes de iniciar sesión');
    }
    throw new Error(msg || 'Error de autenticación');
  }

  saveSession(data);
  return data.user;
}

export function logout() {
  clearSession();
  window.location.href = 'index.html';
}

// ── TENANTS ──────────────────────────────────────────────────
function mapTenant(row) {
  const name = row.razon_social || row.nombre || '';
  const certDays = row.cert_vencimiento
    ? Math.floor((new Date(row.cert_vencimiento) - new Date()) / 86400000)
    : null;

  return {
    id:             row.id,
    name,
    ruc:            row.ruc,
    env:            row.ambiente || 'test',
    status:         certDays !== null && certDays < 30 ? 'cert-warn' : (row.activo ? 'active' : 'inactive'),
    plan:           row.plan || 'starter',
    avatar:         (name[0] || '?').toUpperCase(),
    avatarGradient: avatarColor(row.ruc || ''),
    logo:           row.logo_url || null,
    docsHoy:        0,
    docsmes:        0,
    aprobados:      0,
    lastActivity:   row.actualizado_en
      ? 'Actualizado ' + timeAgo(row.actualizado_en)
      : 'Recién creado',
    certDays,
    certWarn:       certDays !== null && certDays < 30,
    nombreFantasia: row.nombre_fantasia || '',
    direccion:      row.direccion       || '',
    telefono:       row.telefono        || '',
    email:          row.email           || '',
    csc:            row.codigo_seguridad|| '',
    idCsc:          row.id_csc          || '0001',
    certAlias:      row.cert_alias      || '',
    certDate:       row.cert_vencimiento|| '',
    smtpHost:       row.smtp_host       || '',
    smtpPort:       row.smtp_port       || 587,
    smtpUser:       row.smtp_user       || '',
    smtpSsl:        row.smtp_ssl !== false,
    smtpFrom:       row.smtp_from       || '',
    smtpFromName:   row.smtp_from_name  || '',
    activo:         row.activo !== false,
    _raw: row,
  };
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 2)  return 'hace un momento';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)} días`;
}

function avatarColor(ruc) {
  const palette = [
    'linear-gradient(135deg,#FF8C00,#FFC857)',
    'linear-gradient(135deg,#4D9EFF,#82C4FF)',
    'linear-gradient(135deg,#00C48C,#00E8A7)',
    'linear-gradient(135deg,#9B59B6,#BF7FD8)',
    'linear-gradient(135deg,#E74C3C,#F1948A)',
    'linear-gradient(135deg,#27AE60,#58D68D)',
    'linear-gradient(135deg,#F39C12,#F7DC6F)',
    'linear-gradient(135deg,#1ABC9C,#48C9B0)',
  ];
  const idx = [...ruc].reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length;
  return palette[idx];
}

export async function getTenants() {
  const rows = await sb('tenants?order=creado_en.desc');
  return (rows || []).map(mapTenant);
}

export async function getTenant(id) {
  const rows = await sb(`tenants?id=eq.${encodeURIComponent(id)}&limit=1`);
  if (!rows?.length) throw new Error('Tenant no encontrado');
  return mapTenant(rows[0]);
}

export async function createTenant({ ruc, razonSocial, nombreFantasia, email, telefono, ambiente, plan }) {
  const rows = await sb('tenants', {
    method: 'POST',
    body: JSON.stringify({
      ruc,
      razon_social:    razonSocial,
      nombre:          razonSocial,
      nombre_fantasia: nombreFantasia || null,
      email:           email    || null,
      telefono:        telefono || null,
      ambiente:        ambiente || 'test',
      plan:            plan     || 'starter',
      activo:          true,
    }),
  });
  return mapTenant(rows[0]);
}

export async function updateTenant(id, fields) {
  const body = {};
  const map = {
    razonSocial: 'razon_social', nombreFantasia: 'nombre_fantasia',
    direccion: 'direccion', telefono: 'telefono', email: 'email',
    ambiente: 'ambiente', csc: 'codigo_seguridad', idCsc: 'id_csc',
    smtpHost: 'smtp_host', smtpPort: 'smtp_port', smtpUser: 'smtp_user',
    smtpPass: 'smtp_pass', smtpSsl: 'smtp_ssl', smtpFrom: 'smtp_from',
    smtpFromName: 'smtp_from_name',
  };
  Object.entries(fields).forEach(([k, v]) => {
    if (map[k] && v !== undefined) body[map[k]] = v;
  });
  const rows = await sb(`tenants?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body:   JSON.stringify(body),
  });
  return rows?.[0] ? mapTenant(rows[0]) : null;
}

// ── LOGO UPLOAD ───────────────────────────────────────────────
export async function uploadLogo(tenantId, file) {
  const ext      = file.name.split('.').pop().toLowerCase();
  const filePath = `${tenantId}/logo.${ext}`;
  const res = await fetch(
    `${CONFIG.SUPABASE_URL}/storage/v1/object/logos/${filePath}`,
    {
      method:  'POST',
      headers: {
        'apikey':        CONFIG.SUPABASE_ANON,
        'Authorization': `Bearer ${getAuthToken() || CONFIG.SUPABASE_ANON}`,
        'Content-Type':  file.type,
        'x-upsert':      'true',
      },
      body: file,
    }
  );
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.message || 'Error subiendo logo al storage');
  }
  const logoUrl = `${CONFIG.SUPABASE_URL}/storage/v1/object/public/logos/${filePath}`;
  await sb(`tenants?id=eq.${encodeURIComponent(tenantId)}`, {
    method: 'PATCH',
    body:   JSON.stringify({ logo_url: logoUrl }),
  });
  return logoUrl;
}

// ── CERTIFICADO ───────────────────────────────────────────────
export async function uploadCertificado(tenantId, { base64, alias, password, vencimiento }) {
  if (!CONFIG.API_URL || CONFIG.API_URL.includes('tu-api')) {
    throw new Error('API_URL no configurada');
  }
  const res = await fetch(`${CONFIG.API_URL}/tenants/${tenantId}/certificado`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}` },
    body:    JSON.stringify({ certificadoBase64: base64, alias, password, vencimiento }),
  });
  if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.error || 'Error subiendo certificado'); }
  return res.json();
}

// ── API KEYS ──────────────────────────────────────────────────
export async function getApiKeys(tenantId) {
  return sb(`api_keys?tenant_id=eq.${encodeURIComponent(tenantId)}&order=creada_en.desc`);
}

export async function revokeApiKey(keyId) {
  return sb(`api_keys?id=eq.${encodeURIComponent(keyId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ activa: false }),
  });
}

// ── PUNTOS / TIMBRADOS ────────────────────────────────────────
export async function createPunto({ tenantId, estCodigo, puntoCodigo, descripcion, timbrado, tipoDocumento, vigDesde, vigHasta, numeroMax }) {
  let estRows = await sb(`establecimientos?tenant_id=eq.${tenantId}&codigo=eq.${estCodigo}`);
  let estId;
  if (!estRows?.length) {
    const r = await sb('establecimientos', {
      method: 'POST',
      body: JSON.stringify({ tenant_id: tenantId, codigo: estCodigo, nombre: `Establecimiento ${estCodigo}` }),
    });
    estId = r[0].id;
  } else { estId = estRows[0].id; }

  let pRows = await sb(`puntos_expedicion?establecimiento_id=eq.${estId}&codigo=eq.${puntoCodigo}`);
  let pId;
  if (!pRows?.length) {
    const r = await sb('puntos_expedicion', {
      method: 'POST',
      body: JSON.stringify({ establecimiento_id: estId, tenant_id: tenantId, codigo: puntoCodigo, descripcion }),
    });
    pId = r[0].id;
  } else { pId = pRows[0].id; }

  await sb('timbrados', {
    method: 'POST',
    body: JSON.stringify({
      tenant_id: tenantId, establecimiento_id: estId, punto_id: pId,
      numero_timbrado: timbrado, tipo_documento: tipoDocumento || 1,
      numero_max: numeroMax || 9999999,
      vigencia_desde: vigDesde, vigencia_hasta: vigHasta,
    }),
  });
  return { estId, pId };
}

// ── DOCUMENTOS ────────────────────────────────────────────────
export async function getDocumentos(tenantId, { estado, limit = 20, offset = 0 } = {}) {
  let q = `documentos?tenant_id=eq.${tenantId}&order=creado_en.desc&limit=${limit}&offset=${offset}`;
  if (estado) q += `&estado=eq.${estado}`;
  return sb(q);
}
