// ============================================================
// NODO Engine — api.js
// Auth: tabla usuarios en Supabase
// DB: service role key (acceso total, sin RLS)
// ============================================================

// ── CONFIG ───────────────────────────────────────────────────
let CONFIG = {
  SUPABASE_URL:     '',
  SUPABASE_SERVICE: '',
  API_URL:          '',
};

try {
  const mod = await import('./config.js');
  CONFIG = { ...CONFIG, ...(mod.CONFIG || {}) };
} catch {
  console.warn('[NODO] config.js no encontrado');
}

function getKey() {
  return CONFIG.SUPABASE_SERVICE || '';
}

function hasConfig() {
  return CONFIG.SUPABASE_URL &&
         !CONFIG.SUPABASE_URL.includes('TUPROYECTO') &&
         CONFIG.SUPABASE_SERVICE &&
         !CONFIG.SUPABASE_SERVICE.includes('PEGAR_AQUI');
}

// ── SUPABASE REST ────────────────────────────────────────────
async function sb(path, opts = {}) {
  if (!hasConfig()) throw new Error('Supabase no configurado — completá js/config.js');

  const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      'apikey':        getKey(),
      'Authorization': `Bearer ${getKey()}`,
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

// ── SESIÓN ───────────────────────────────────────────────────
const SESSION_KEY = 'nodo-session';

export function getSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { return null; }
}

export function isLoggedIn() {
  const s = getSession();
  if (!s?.email || !s?.loginAt) return false;
  return (Date.now() - s.loginAt) < 8 * 60 * 60 * 1000; // 8 horas
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

// ── LOGIN ─────────────────────────────────────────────────────
// Valida contra la tabla `usuarios` en Supabase
// La contraseña se guarda como SHA-256 en la tabla
export async function login(email, password) {
  if (!hasConfig()) throw new Error('Sistema no configurado');

  // Hash SHA-256 de la contraseña
  const passHash = await sha256(password);

  const rows = await sb(
    `usuarios?email=eq.${encodeURIComponent(email.toLowerCase())}&password_hash=eq.${passHash}&activo=eq.true&limit=1`
  );

  if (!rows || rows.length === 0) {
    throw new Error('Email o contraseña incorrectos');
  }

  const user = rows[0];

  // Guardar sesión
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    id:      user.id,
    email:   user.email,
    nombre:  user.nombre,
    rol:     user.rol,
    loginAt: Date.now(),
  }));

  // Actualizar último acceso
  sb(`usuarios?id=eq.${user.id}`, {
    method: 'PATCH',
    body:   JSON.stringify({ ultimo_acceso: new Date().toISOString() }),
    prefer: 'return=minimal',
  }).catch(() => {});

  return user;
}

export function logout() {
  clearSession();
  window.location.href = 'index.html';
}

// ── SHA-256 helper ────────────────────────────────────────────
async function sha256(text) {
  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

// Exportar para usarla desde otros lados si hace falta
export { sha256 };

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
    status:         certDays !== null && certDays < 30
                      ? 'cert-warn'
                      : (row.activo ? 'active' : 'inactive'),
    plan:           row.plan || 'starter',
    avatar:         (name[0] || '?').toUpperCase(),
    avatarGradient: avatarColor(row.ruc || ''),
    logo:           row.logo_url || null,
    docsHoy:        row.docs_hoy  || 0,
    docsmes:        row.docs_mes  || 0,
    aprobados:      row.pct_aprobados || 0,
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
    razonSocial:  'razon_social',    nombreFantasia: 'nombre_fantasia',
    direccion:    'direccion',        telefono:       'telefono',
    email:        'email',            ambiente:       'ambiente',
    csc:          'codigo_seguridad', idCsc:          'id_csc',
    smtpHost:     'smtp_host',        smtpPort:       'smtp_port',
    smtpUser:     'smtp_user',        smtpPass:       'smtp_pass',
    smtpSsl:      'smtp_ssl',         smtpFrom:       'smtp_from',
    smtpFromName: 'smtp_from_name',
  };
  Object.entries(fields).forEach(([k, v]) => {
    if (map[k] && v !== undefined) body[map[k]] = v;
  });
  const rows = await sb(`tenants?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH', body: JSON.stringify(body),
  });
  return rows?.[0] ? mapTenant(rows[0]) : null;
}

export async function uploadLogo(tenantId, file) {
  const ext      = file.name.split('.').pop().toLowerCase();
  const filePath = `${tenantId}/logo.${ext}`;
  const key      = getKey();
  const res = await fetch(`${CONFIG.SUPABASE_URL}/storage/v1/object/logos/${filePath}`, {
    method:  'POST',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': file.type, 'x-upsert': 'true' },
    body: file,
  });
  if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.message || 'Error subiendo logo'); }
  const logoUrl = `${CONFIG.SUPABASE_URL}/storage/v1/object/public/logos/${filePath}`;
  await sb(`tenants?id=eq.${encodeURIComponent(tenantId)}`, {
    method: 'PATCH', body: JSON.stringify({ logo_url: logoUrl }),
  });
  return logoUrl;
}

export async function getApiKeys(tenantId) {
  return sb(`api_keys?tenant_id=eq.${encodeURIComponent(tenantId)}&activa=eq.true&order=creada_en.desc`);
}

export async function revokeApiKey(keyId) {
  return sb(`api_keys?id=eq.${encodeURIComponent(keyId)}`, {
    method: 'PATCH', body: JSON.stringify({ activa: false }),
  });
}

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

export async function getDocumentos(tenantId, { estado, limit = 20, offset = 0 } = {}) {
  let q = `documentos?tenant_id=eq.${tenantId}&order=creado_en.desc&limit=${limit}&offset=${offset}`;
  if (estado) q += `&estado=eq.${estado}`;
  return sb(q);
}
