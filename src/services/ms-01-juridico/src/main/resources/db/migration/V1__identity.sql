CREATE TABLE accounts (
    id uuid PRIMARY KEY,
    name varchar(200) NOT NULL,
    email varchar(254) NOT NULL UNIQUE,
    password_hash varchar(100) NOT NULL,
    role varchar(20) NOT NULL CHECK (role IN ('ABOGADO', 'ADMINISTRADOR')),
    enabled boolean NOT NULL DEFAULT true,
    CHECK (email = lower(email))
);

CREATE TABLE sessions (
    token_hash char(64) PRIMARY KEY,
    account_id uuid NOT NULL REFERENCES accounts(id),
    created_at timestamptz NOT NULL,
    last_activity_at timestamptz NOT NULL,
    expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_account_idx ON sessions(account_id);