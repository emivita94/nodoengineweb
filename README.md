# NODO Engine — Panel Web

Panel de administración SaaS para facturación electrónica SET Paraguay.

---

## 🚀 Setup completo — paso a paso

### 1. Configurar Supabase Storage (para logos)

En tu proyecto Supabase:

1. Ir a **Storage** → **New bucket**
2. Nombre: `logos`
3. Marcar **Public bucket** ✅
4. Click **Create**

### 2. Configurar credenciales locales

```bash
# Desde la carpeta del proyecto:
cp js/config.example.js js/config.js
```

Abrí `js/config.js` y completá:

```js
export const CONFIG = {
  // Supabase Dashboard → Settings → API
  SUPABASE_URL:  'https://TUPROYECTO.supabase.co',
  SUPABASE_ANON: 'eyJhbGciOiJI...tu_anon_key',

  // URL de tu API en Railway
  API_URL: 'https://tu-nodo-engine.railway.app/api/v1',
};
```

> ⚠️ `config.js` está en `.gitignore` — nunca se sube a GitHub.

### 3. Subir a GitHub con GitHub Desktop

1. Abrí **GitHub Desktop**
2. Ir a **File → Add Local Repository** → seleccioná la carpeta del proyecto
3. En la lista de cambios (izquierda) van a aparecer todos los archivos
4. Escribí un mensaje: `feat: NODO Engine panel inicial`
5. Click **Commit to main**
6. Click **Push origin** (botón azul arriba a la derecha)

### 4. Deploy en Cloudflare Pages ⚠️ Configuración exacta

1. Ir a https://dash.cloudflare.com
2. **Workers & Pages** → **Create application** → tab **Pages**
3. **Connect to Git** → elegís el repo de GitHub
4. En la pantalla de build settings:

| Campo | Valor |
|-------|-------|
| Framework preset | `None` |
| Build command | *(vacío — no escribir nada)* |
| Build output directory | `/` |

5. Click **Save and Deploy**

> El error `wrangler.json not found` pasa si el proyecto fue creado como Worker en vez de Pages. Si te pasó, borrá el proyecto y crealo de nuevo eligiendo el tab **Pages**.

### 5. Configurar variable de entorno en Cloudflare (para producción)

En Cloudflare Pages → tu proyecto → **Settings → Environment variables**:

```
SUPABASE_URL  = https://TUPROYECTO.supabase.co
SUPABASE_ANON = eyJhbGciOiJI...tu_anon_key
API_URL       = https://tu-api.railway.app/api/v1
```

> Para que las env vars funcionen en HTML puro necesitás un build step (Vite, etc).  
> Por ahora, para desarrollo y staging usá el `config.js` local.

---

## 📁 Estructura del proyecto

```
nodo-engine/
├── index.html              ← Login + lista de empresas
├── panel.html              ← Panel empresa con sidebar
├── css/
│   ├── theme.css           ← Variables CSS dark/light
│   ├── base.css            ← Componentes reutilizables
│   ├── layout.css          ← Topbar, sidebar, shell
│   └── responsive.css      ← Mobile + tablet breakpoints
├── js/
│   ├── app.js              ← Estado global, tema, navegación
│   ├── api.js              ← Supabase + Railway API client
│   ├── data.js             ← Mock data (docs, lotes demo)
│   ├── config.example.js   ← Template de credenciales ✅ en repo
│   └── config.js           ← Credenciales reales ❌ NO en repo
├── _headers                ← Headers de seguridad HTTP
├── .gitignore
└── README.md
```

---

## 🔐 Autenticación

El panel usa **Supabase Auth** (email + password).

Para crear el primer usuario admin:
1. Supabase Dashboard → **Authentication** → **Users** → **Invite user**
2. O desde SQL: usar `supabase.auth.admin.createUser()`

---

## 🗄 Tablas Supabase necesarias

El proyecto ya tiene el schema SQL en `src/db/schema.sql` del motor SIFEN.  
Asegurate de que estas tablas existan:

- `tenants` — con columnas: `logo_url`, `smtp_host`, `smtp_port`, `smtp_user`, `smtp_ssl`, `smtp_from`, `smtp_from_name`
- `api_keys`
- `establecimientos`
- `puntos_expedicion`
- `timbrados`
- `documentos`
- `sifen_logs`

Columnas extra a agregar si no existen:

```sql
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS nombre_fantasia VARCHAR(200);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS email VARCHAR(200);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS telefono VARCHAR(50);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS smtp_host VARCHAR(200);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS smtp_port INT DEFAULT 587;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS smtp_user VARCHAR(200);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS smtp_pass TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS smtp_ssl BOOLEAN DEFAULT true;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS smtp_from VARCHAR(200);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS smtp_from_name VARCHAR(200);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS id_csc VARCHAR(10) DEFAULT '0001';
```

---

## 📱 Responsive

- **Mobile** (< 768px): sidebar se oculta, se abre con botón hamburger
- **Tablet** (768–1023px): sidebar colapsado mostrando solo íconos  
- **Desktop** (>= 1024px): sidebar completo siempre visible

---

## 🎨 Temas

Toggle dark/light en el topbar y en la pantalla de login.  
Se guarda automáticamente en `localStorage` con la key `nodo-theme`.
