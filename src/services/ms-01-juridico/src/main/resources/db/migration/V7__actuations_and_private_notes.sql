CREATE TABLE juridico.actuations (
    id uuid PRIMARY KEY,
    account_id uuid NOT NULL REFERENCES juridico.accounts(id),
    case_id uuid NOT NULL,
    type varchar(30) NOT NULL CHECK (type IN ('HEARING', 'FILING', 'DECISION', 'NOTIFICATION', 'OTHER')),
    act_date date NOT NULL CHECK (act_date >= DATE '0001-01-01' AND act_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')::date),
    description varchar(10000) NOT NULL CHECK (length(btrim(description)) > 0),
    version integer NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    author_id uuid NOT NULL REFERENCES juridico.accounts(id),
    FOREIGN KEY (case_id, account_id) REFERENCES juridico.cases(id, account_id),
    UNIQUE (id, account_id, case_id)
);
CREATE INDEX actuations_chronology_idx ON juridico.actuations(account_id, case_id, act_date, id);
CREATE INDEX actuations_type_idx ON juridico.actuations(account_id, case_id, type, act_date, id);

CREATE TABLE juridico.actuation_corrections (
    id uuid PRIMARY KEY,
    actuation_id uuid NOT NULL,
    account_id uuid NOT NULL,
    case_id uuid NOT NULL,
    previous_type varchar(30) NOT NULL CHECK (previous_type IN ('HEARING', 'FILING', 'DECISION', 'NOTIFICATION', 'OTHER')),
    previous_date date NOT NULL,
    previous_description varchar(10000) NOT NULL,
    new_type varchar(30) NOT NULL CHECK (new_type IN ('HEARING', 'FILING', 'DECISION', 'NOTIFICATION', 'OTHER')),
    new_date date NOT NULL,
    new_description varchar(10000) NOT NULL,
    occurred_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    author_id uuid NOT NULL REFERENCES juridico.accounts(id),
    version integer NOT NULL CHECK (version > 1),
    FOREIGN KEY (actuation_id, account_id, case_id) REFERENCES juridico.actuations(id, account_id, case_id),
    UNIQUE (actuation_id, version)
);
CREATE INDEX actuation_corrections_scope_idx ON juridico.actuation_corrections(account_id, case_id, occurred_at, id);

CREATE TABLE juridico.private_notes (
    id uuid PRIMARY KEY,
    account_id uuid NOT NULL REFERENCES juridico.accounts(id),
    case_id uuid NOT NULL,
    text varchar(20000) NOT NULL CHECK (length(btrim(text)) > 0),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version integer NOT NULL DEFAULT 1 CHECK (version > 0),
    FOREIGN KEY (case_id, account_id) REFERENCES juridico.cases(id, account_id)
);
CREATE INDEX private_notes_scope_idx ON juridico.private_notes(account_id, case_id, created_at DESC, id DESC);