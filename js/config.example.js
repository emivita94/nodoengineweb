// ============================================================
// NODO Engine — config.example.js
// ✅ ESTE archivo SÍ va al repo (es solo un ejemplo)
// ❌ Copiá esto como "config.js" y completá tus credenciales
//    config.js está en .gitignore y NO se sube a GitHub
// ============================================================
//
// PASOS:
// 1. Copiá este archivo: cp js/config.example.js js/config.js
// 2. Abrí js/config.js y completá los valores reales
// 3. Nunca commitees js/config.js
//
// ¿Dónde encontrar los valores?
// - SUPABASE_URL y SUPABASE_ANON:
//   Supabase Dashboard → tu proyecto → Settings → API
// - API_URL:
//   URL de tu servicio en Railway (nodo engine backend)

export const CONFIG = {
  // Supabase
  SUPABASE_URL:  'https://XXXXXXXXXX.supabase.co',
  SUPABASE_ANON: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.COMPLETAR',

  // NODO Engine API en Railway
  API_URL: 'https://tu-api.railway.app/api/v1',
};
