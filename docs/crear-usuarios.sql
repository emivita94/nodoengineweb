-- ============================================================
-- NODO Engine — Tabla de usuarios del panel
-- Ejecutar en Supabase → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS usuarios (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email          VARCHAR(200) NOT NULL UNIQUE,
  password_hash  VARCHAR(64)  NOT NULL,  -- SHA-256 hex
  nombre         VARCHAR(200) NOT NULL,
  rol            VARCHAR(20)  NOT NULL DEFAULT 'admin',  -- superadmin | admin | viewer
  activo         BOOLEAN      NOT NULL DEFAULT true,
  ultimo_acceso  TIMESTAMPTZ,
  creado_en      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ============================================================
-- Insertar primer usuario admin
-- Email:    info@nodoinformatica.com
-- Password: Abc1234*
-- Hash SHA-256 de "Abc1234*":
-- ============================================================

INSERT INTO usuarios (email, password_hash, nombre, rol)
VALUES (
  'info@nodoinformatica.com',
  'a0264fc409a71e50e8fa38e4f529a6692b600c0f5e4fbbeca23c37e09b254b25',
  'Admin NODO',
  'superadmin'
)
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- Verificar que se insertó correctamente
-- ============================================================
SELECT id, email, nombre, rol, activo, creado_en
FROM usuarios;
