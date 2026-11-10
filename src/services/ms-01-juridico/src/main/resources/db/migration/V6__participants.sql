CREATE UNIQUE INDEX cases_id_account_uq ON juridico.cases(id, account_id);
CREATE UNIQUE INDEX people_id_account_uq ON juridico.people(id, account_id);

CREATE TABLE juridico.participants (
    id uuid PRIMARY KEY,
    account_id uuid NOT NULL,
    case_id uuid NOT NULL,
    person_id uuid NOT NULL,
    role varchar(30) NOT NULL CHECK (role IN ('REPRESENTED_PERSON', 'COUNTERPARTY', 'WITNESS', 'REPRESENTATIVE', 'OTHER')),
    detail varchar(2000),
    version integer NOT NULL DEFAULT 1 CHECK (version > 0),
    FOREIGN KEY (case_id, account_id) REFERENCES juridico.cases(id, account_id),
    FOREIGN KEY (person_id, account_id) REFERENCES juridico.people(id, account_id),
    UNIQUE (case_id, person_id),
    CHECK ((role = 'OTHER' AND detail IS NOT NULL AND btrim(detail) <> '') OR (role <> 'OTHER' AND detail IS NULL))
);
CREATE INDEX participants_case_page_idx ON juridico.participants(account_id, case_id, id);

CREATE TABLE juridico.participant_changes (
    id uuid PRIMARY KEY,
    participant_id uuid NOT NULL,
    account_id uuid NOT NULL,
    case_id uuid NOT NULL,
    person_id uuid NOT NULL,
    action varchar(30) NOT NULL CHECK (action IN ('LINK', 'CHANGE_ROLE', 'UNLINK')),
    previous_role varchar(30) CHECK (previous_role IN ('REPRESENTED_PERSON', 'COUNTERPARTY', 'WITNESS', 'REPRESENTATIVE', 'OTHER')),
    previous_detail varchar(2000),
    new_role varchar(30) CHECK (new_role IN ('REPRESENTED_PERSON', 'COUNTERPARTY', 'WITNESS', 'REPRESENTATIVE', 'OTHER')),
    new_detail varchar(2000),
    occurred_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    author_id uuid NOT NULL REFERENCES juridico.accounts(id),
    version integer NOT NULL CHECK (version > 0),
    FOREIGN KEY (case_id, account_id) REFERENCES juridico.cases(id, account_id),
    FOREIGN KEY (person_id, account_id) REFERENCES juridico.people(id, account_id),
    UNIQUE (participant_id, version),
    CHECK ((action = 'LINK' AND previous_role IS NULL AND new_role IS NOT NULL AND version = 1)
        OR (action = 'CHANGE_ROLE' AND previous_role IS NOT NULL AND new_role IS NOT NULL AND version > 1)
        OR (action = 'UNLINK' AND previous_role IS NOT NULL AND new_role IS NULL AND version > 1)),
    CHECK (CASE WHEN previous_role = 'OTHER' THEN previous_detail IS NOT NULL AND btrim(previous_detail) <> '' ELSE previous_detail IS NULL END),
    CHECK (CASE WHEN new_role = 'OTHER' THEN new_detail IS NOT NULL AND btrim(new_detail) <> '' ELSE new_detail IS NULL END)
);
CREATE INDEX participant_changes_case_idx ON juridico.participant_changes(account_id, case_id, occurred_at, id);