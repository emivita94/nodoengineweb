// ============================================================
// NODO Engine — api.js
// Todas las operaciones con Supabase y la API Railway
// Usamos Supabase REST API directamente (sin SDK) para
// mantener el proyecto sin build step.
// ============================================================

import { CONFIG } from './config.js';

// ── SUPABASE REST HELPER ─────────────────────────────────────
// Llama directamente a la PostgREST API de Supabase

async function sb(path, opts = {}) {
  const url  = `${CONFIG.SUPABASE_URL}/rest/v1/${path}`;
  const token = getAuthToken();
  const res  = await fetch(url, {
    ...opts,
    headers: {
      'apikey':        CONFIG.SUPABASE_ANON,
      'Authorization': `Bearer ${token || CONFIG.SUPABASE_ANON}`,
      'Content-Type':  'application/json',
      'Prefer':        opts.prefer || 'return=representation',
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || err.hint || `HTTP ${res.status}`);
  }
  // 204 No Content
  if (res.status === 204) return null;
  return res.json();
}

// ── SUPABASE AUTH ────────────────────────────────────────────

async function sbAuth(path, body) {
  const res = await fetch(`${CONFIG.SUPABASE_URL}/auth/v1/${path}`, {
    method:  'POST',
    headers: {
      'apikey':       CONFIG.SUPABASE_ANON,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || 'Error de autenticación');
  return data;
}

// ── TOKEN MANAGEMENT ─────────────────────────────────────────

const TOKEN_KEY = 'nodo-auth-token';
const USER_KEY  = 'nodo-auth-user';

export function getAuthToken()  { return localStorage.getItem(TOKEN_KEY); }
export function getAuthUser()   { try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; } }
export function isLoggedIn()    { return !!getAuthToken(); }

function saveSession(session) {
  localStorage.setItem(TOKEN_KEY, session.access_token);
  localStorage.setItem(USER_KEY,  JSON.stringify(session.user));
}
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// ── AUTH API ─────────────────────────────────────────────────

export async function login(email, password) {
  const data = await sbAuth('token?grant_type=password', { email, password });
  saveSession(data);
  return data.user;
}

export async function logout() {
  clearSession();
  window.location.href = 'index.html';
}

// ── TENANTS API ───────────────────────────────────────────────
// Mapea la tabla `tenants` de Supabase al formato del panel

function mapTenant(row) {
  const name = row.razon_social || row.nombre || '';
  return {
    id:              row.id,
    name,
    ruc:             row.ruc,
    env:             row.ambiente || 'test',
    status:          mapStatus(row),
    plan:            row.plan || 'starter',
    avatar:          (name[0] || '?').toUpperCase(),
    avatarGradient:  avatarColor(row.ruc),
    logo:            row.logo_url || null,
    docsHoy:         row.docs_hoy    || 0,
    docsmes:         row.docs_mes    || 0,
    aprobados:       row.pct_aprobados || 0,
    lastActivity:    row.ultima_actividad || 'Sin actividad',
    certDays:        row.cert_dias_restantes ?? null,
    certWarn:        (row.cert_dias_restantes ?? 999) < 30,
    // Config fields
    nombreFantasia:  row.nombre_fantasia || '',
    direccion:       row.direccion || '',
    telefono:        row.telefono || '',
    email:           row.email || '',
    csc:             row.codigo_seguridad || '',
    idCsc:           row.id_csc || '0001',
    certAlias:       row.cert_alias || '',
    certDate:        row.cert_vencimiento || '',
    smtpHost:        row.smtp_host || '',
    smtpPort:        row.smtp_port || 587,
    smtpUser:        row.smtp_user || '',
    smtpSsl:         row.smtp_ssl !== false,
    smtpFrom:        row.smtp_from || '',
    smtpFromName:    row.smtp_from_name || '',
    activo:          row.activo !== false,
    // Raw for editing
    _raw: row,
  };
}

function mapStatus(row) {
  if (!row.activo)                         return 'inactive';
  if ((row.cert_dias_restantes ?? 999) < 30) return 'cert-warn';
  return 'active';
}

function avatarColor(ruc = '') {
  const colors = [
    'linear-gradient(135deg,#FF8C00,#FFC857)',
    'linear-gradient(135deg,#4D9EFF,#82C4FF)',
    'linear-gradient(135deg,#00C48C,#00E8A7)',
    'linear-gradient(135deg,#9B59B6,#BF7FD8)',
    'linear-gradient(135deg,#E74C3C,#F1948A)',
    'linear-gradient(135deg,#27AE60,#58D68D)',
    'linear-gradient(135deg,#F39C12,#F7DC6F)',
    'linear-gradient(135deg,#1ABC9C,#48C9B0)',
  ];
  const idx = ruc.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
  return colors[idx];
}

// GET /tenants — lista todos
export async function getTenants() {
  // Usamos una vista que ya incluye estadísticas agregadas
  // Si no tenés la vista, hacé SELECT a la tabla base
  const rows = await sb('tenants?order=creado_en.desc&activo=eq.true');
  return (rows || []).map(mapTenant);
}

// GET /tenants/:id
export async function getTenant(id) {
  const rows = await sb(`tenants?id=eq.${id}&limit=1`);
  if (!rows || !rows.length) throw new Error('Tenant no encontrado');
  return mapTenant(rows[0]);
}

// POST /tenants — crear tenant nuevo
export async function createTenant({ ruc, razonSocial, nombreFantasia, email, telefono, ambiente, plan }) {
  const rows = await sb('tenants', {
    method: 'POST',
    body: JSON.stringify({
      ruc,
      razon_social:    razonSocial,
      nombre:          razonSocial,
      nombre_fantasia: nombreFantasia || null,
      email:           email || null,
      telefono:        telefono || null,
      ambiente:        ambiente || 'test',
      plan:            plan || 'starter',
      activo:          true,
    }),
  });
  return mapTenant(rows[0]);
}

// PATCH /tenants/:id — actualizar datos fiscales
export async function updateTenant(id, fields) {
  const body = {};
  if (fields.razonSocial)    body.razon_social    = fields.razonSocial;
  if (fields.nombreFantasia !== undefined) body.nombre_fantasia = fields.nombreFantasia;
  if (fields.direccion !== undefined)      body.direccion       = fields.direccion;
  if (fields.telefono !== undefined)       body.telefono        = fields.telefono;
  if (fields.email !== undefined)          body.email           = fields.email;
  if (fields.ambiente)       body.ambiente        = fields.ambiente;
  if (fields.csc !== undefined)            body.codigo_seguridad = fields.csc;
  if (fields.idCsc !== undefined)          body.id_csc          = fields.idCsc;
  if (fields.smtpHost !== undefined)       body.smtp_host       = fields.smtpHost;
  if (fields.smtpPort !== undefined)       body.smtp_port       = fields.smtpPort;
  if (fields.smtpUser !== undefined)       body.smtp_user       = fields.smtpUser;
  if (fields.smtpPass !== undefined)       body.smtp_pass       = fields.smtpPass;
  if (fields.smtpSsl  !== undefined)       body.smtp_ssl        = fields.smtpSsl;
  if (fields.smtpFrom !== undefined)       body.smtp_from       = fields.smtpFrom;
  if (fields.smtpFromName !== undefined)   body.smtp_from_name  = fields.smtpFromName;

  const rows = await sb(`tenants?id=eq.${id}`, {
    method: 'PATCH',
    body:   JSON.stringify(body),
  });
  return rows && rows[0] ? mapTenant(rows[0]) : null;
}

// POST logo — upload a Supabase Storage y guarda URL
export async function uploadLogo(tenantId, file) {
  // 1. Upload al bucket "logos"
  const ext      = file.name.split('.').pop();
  const filePath = `${tenantId}/logo.${ext}`;
  const uploadRes = await fetch(
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
  if (!uploadRes.ok) {
    const e = await uploadRes.json().catch(() => ({}));
    throw new Error(e.message || 'Error subiendo logo');
  }

  // 2. Obtener URL pública
  const logoUrl = `${CONFIG.SUPABASE_URL}/storage/v1/object/public/logos/${filePath}`;

  // 3. Guardar URL en la tabla tenants
  await sb(`tenants?id=eq.${tenantId}`, {
    method: 'PATCH',
    body:   JSON.stringify({ logo_url: logoUrl }),
  });

  return logoUrl;
}

// POST certificado — va al motor SIFEN (Railway API)
export async function uploadCertificado(tenantId, { base64, alias, password, vencimiento }) {
  const res = await fetch(`${CONFIG.API_URL}/tenants/${tenantId}/certificado`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify({
      certificadoBase64: base64,
      alias,
      password,
      vencimiento,
    }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || 'Error subiendo certificado');
  }
  return res.json();
}

// ── ESTABLECIMIENTOS / PUNTOS / TIMBRADOS ────────────────────

export async function getEstablecimientos(tenantId) {
  return sb(`establecimientos?tenant_id=eq.${tenantId}&order=codigo.asc`);
}

export async function getPuntos(tenantId) {
  return sb(`puntos_expedicion?tenant_id=eq.${tenantId}&order=codigo.asc`);
}

export async function getTimbrados(tenantId) {
  return sb(`timbrados?tenant_id=eq.${tenantId}&order=creado_en.desc`);
}

export async function createPunto({ tenantId, estCodigo, puntoCodigo, descripcion, timbrado, tipoDocumento, vigDesde, vigHasta, numeroMax }) {
  // 1. Crear o reusar establecimiento
  let estRows = await sb(`establecimientos?tenant_id=eq.${tenantId}&codigo=eq.${estCodigo}`);
  let estId;
  if (!estRows || !estRows.length) {
    const created = await sb('establecimientos', {
      method: 'POST',
      body: JSON.stringify({ tenant_id: tenantId, codigo: estCodigo, nombre: `Establecimiento ${estCodigo}` }),
    });
    estId = created[0].id;
  } else {
    estId = estRows[0].id;
  }

  // 2. Crear punto de expedición
  let pRows = await sb(`puntos_expedicion?establecimiento_id=eq.${estId}&codigo=eq.${puntoCodigo}`);
  let pId;
  if (!pRows || !pRows.length) {
    const created = await sb('puntos_expedicion', {
      method: 'POST',
      body: JSON.stringify({ establecimiento_id: estId, tenant_id: tenantId, codigo: puntoCodigo, descripcion }),
    });
    pId = created[0].id;
  } else {
    pId = pRows[0].id;
  }

  // 3. Crear timbrado
  await sb('timbrados', {
    method: 'POST',
    body: JSON.stringify({
      tenant_id:          tenantId,
      establecimiento_id: estId,
      punto_id:           pId,
      numero_timbrado:    timbrado,
      tipo_documento:     tipoDocumento || 1,
      numero_max:         numeroMax || 9999999,
      vigencia_desde:     vigDesde,
      vigencia_hasta:     vigHasta,
    }),
  });

  return { estId, pId };
}

// ── API KEYS ──────────────────────────────────────────────────

export async function getApiKeys(tenantId) {
  return sb(`api_keys?tenant_id=eq.${tenantId}&order=creada_en.desc`);
}

export async function createApiKey(tenantId, nombre, ambiente) {
  // La creación real la hace el motor (genera hash + prefix)
  const res = await fetch(`${CONFIG.API_URL}/tenants/${tenantId}/api-keys`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify({ nombre, ambiente }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || 'Error creando API Key');
  }
  return res.json(); // { key, prefix, nombre }
}

export async function revokeApiKey(keyId) {
  return sb(`api_keys?id=eq.${keyId}`, {
    method: 'PATCH',
    body: JSON.stringify({ activa: false }),
  });
}

// ── DOCUMENTOS ────────────────────────────────────────────────

export async function getDocumentos(tenantId, { estado, desde, hasta, limit = 20, offset = 0 } = {}) {
  let q = `documentos?tenant_id=eq.${tenantId}&order=creado_en.desc&limit=${limit}&offset=${offset}`;
  if (estado) q += `&estado=eq.${estado}`;
  if (desde)  q += `&creado_en=gte.${desde}`;
  if (hasta)  q += `&creado_en=lte.${hasta}`;
  return sb(q, { headers: { 'Prefer': 'count=exact' } });
}

// ── LOTES ─────────────────────────────────────────────────────

export async function getLotes(tenantId, { limit = 20, offset = 0 } = {}) {
  return sb(`sifen_logs?tenant_id=eq.${tenantId}&accion=eq.envio&order=creado_en.desc&limit=${limit}&offset=${offset}`);
}
