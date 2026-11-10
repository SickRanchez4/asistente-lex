CREATE TABLE juridico.cases (
    id uuid PRIMARY KEY,
    account_id uuid NOT NULL REFERENCES juridico.accounts(id),
    code varchar(100) NOT NULL CHECK (code = btrim(code) AND code <> ''),
    title varchar(300) NOT NULL CHECK (btrim(title) <> ''),
    description varchar(10000),
    area varchar(20) NOT NULL CHECK (area IN ('CIVIL', 'PENAL')),
    initial_agent_id varchar(100) NOT NULL CHECK (initial_agent_id IN ('civilista', 'penalista')),
    state varchar(20) NOT NULL DEFAULT 'OPEN' CHECK (state IN ('OPEN', 'CLOSED', 'ARCHIVED')),
    version integer NOT NULL DEFAULT 1 CHECK (version > 0),
    archive_attempt_id uuid,
    CHECK (archive_attempt_id IS NULL OR state = 'CLOSED')
);
CREATE UNIQUE INDEX cases_account_code_uq ON juridico.cases(account_id, lower(btrim(code)));
CREATE INDEX cases_account_page_idx ON juridico.cases(account_id, id);
CREATE INDEX cases_account_state_area_idx ON juridico.cases(account_id, state, area, id);
CREATE TABLE juridico.case_transitions (
    id uuid PRIMARY KEY,
    case_id uuid NOT NULL REFERENCES juridico.cases(id),
    previous_state varchar(20) NOT NULL,
    new_state varchar(20) NOT NULL,
    occurred_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    author_id uuid NOT NULL REFERENCES juridico.accounts(id),
    version integer NOT NULL CHECK (version > 1),
    UNIQUE (case_id, version),
    CHECK ((previous_state = 'OPEN' AND new_state = 'CLOSED')
        OR (previous_state = 'CLOSED' AND new_state IN ('OPEN', 'ARCHIVED'))
        OR (previous_state = 'ARCHIVED' AND new_state = 'CLOSED'))
);