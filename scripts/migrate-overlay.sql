-- Доверенные сборки overlay (регистрируются build-скриптом)
CREATE TABLE IF NOT EXISTS overlay_builds (
    id         SERIAL PRIMARY KEY,
    version    VARCHAR(20)  NOT NULL,
    hash       VARCHAR(64)  NOT NULL UNIQUE,
    platform   VARCHAR(20)  DEFAULT 'win32',
    created_at TIMESTAMPTZ  DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Сессии overlay (для fingerprint-мониторинга)
CREATE TABLE IF NOT EXISTS overlay_sessions (
    id          SERIAL PRIMARY KEY,
    wallet      VARCHAR(100) NOT NULL,
    fingerprint VARCHAR(32)  NOT NULL,
    version     VARCHAR(20),
    created_at  TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (wallet, fingerprint, version)
);

CREATE INDEX IF NOT EXISTS idx_overlay_sessions_wallet ON overlay_sessions (wallet, created_at);
