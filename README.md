# NODO Engine — Panel Web

Panel de administración para el motor de facturación electrónica SET Paraguay.

---

## 🚀 Deploy en Cloudflare Pages

### Paso 1 — Subir a GitHub

```bash
git init
git add .
git commit -m "feat: panel inicial NODO Engine"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/nodo-engine-panel.git
git push -u origin main
```

### Paso 2 — Crear proyecto en Cloudflare Pages

1. Ir a https://dash.cloudflare.com
2. Menú izquierdo → **Workers & Pages**
3. Click **Create application** → tab **Pages**
4. Click **Connect to Git** → autorizar GitHub → seleccionar el repo

### Paso 3 — Configuración de build ⚠️ MUY IMPORTANTE

En la pantalla "Set up builds and deployments":

| Campo | Valor correcto |
|-------|----------------|
| **Framework preset** | `None` |
| **Build command** | *(VACÍO — no escribir nada)* |
| **Build output directory** | `/` |
| **Root directory (advanced)** | *(vacío)* |

**El error `npx wrangler deploy` ocurre cuando el campo "Build command" tiene algo escrito.**
Borrarlo y dejarlo vacío soluciona el problema.

### Paso 4 — Deploy

Click **Save and Deploy**.  
En ~30 segundos el panel queda en: `https://nodo-engine-panel.pages.dev`

Cada `git push` a `main` redespliega automáticamente.

---

## 📁 Estructura del proyecto

```
nodo-engine/
├── index.html       ← Login + lista de empresas
├── panel.html       ← Panel empresa con sidebar
├── css/
│   ├── theme.css    ← Variables CSS dark/light
│   ├── base.css     ← Componentes reutilizables
│   └── layout.css   ← Topbar, sidebar, shell
├── js/
│   ├── app.js       ← Estado, tema, navegación
│   └── data.js      ← Mock data (reemplazar con fetch)
├── _headers         ← Headers de seguridad HTTP
├── .gitignore
└── README.md
```

---

## 🔗 Conectar con la API

Editar `js/app.js` y agregar la URL base:

```js
export const API_BASE = 'https://tu-api.railway.app/api/v1';
```

Luego reemplazar los datos mock por llamadas reales:

```js
import { API_BASE } from './app.js';

const res = await fetch(`${API_BASE}/tenants`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data } = await res.json();
```

---

## 🎨 Temas dark/light

El toggle está en el topbar y en la pantalla de login.  
Se guarda automáticamente en `localStorage`.

---

## 📦 Stack

Sin framework, sin build step, sin node_modules.  
HTML5 + CSS3 + JavaScript ES Modules nativos.  
Compatible con cualquier CDN o hosting estático.
