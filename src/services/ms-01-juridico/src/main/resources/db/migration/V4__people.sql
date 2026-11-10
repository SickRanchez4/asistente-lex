CREATE TABLE juridico.people (
    id uuid PRIMARY KEY,
    account_id uuid NOT NULL REFERENCES juridico.accounts(id),
    type varchar(20) NOT NULL CHECK (type IN ('NATURAL', 'LEGAL')),
    first_names varchar(200),
    last_names varchar(200),
    business_name varchar(300),
    document_type varchar(100),
    document_number varchar(100),
    issuing_country varchar(100),
    phone varchar(100),
    email varchar(254),
    address varchar(1000),
    CONSTRAINT people_required_names CHECK (
        (type = 'NATURAL' AND first_names IS NOT NULL AND btrim(first_names) <> ''
            AND last_names IS NOT NULL AND btrim(last_names) <> '' AND business_name IS NULL)
        OR (type = 'LEGAL' AND business_name IS NOT NULL AND btrim(business_name) <> ''
            AND first_names IS NULL AND last_names IS NULL)
    ),
    CONSTRAINT people_complete_document CHECK (
        (document_type IS NULL AND document_number IS NULL AND issuing_country IS NULL)
        OR (document_type IS NOT NULL AND document_number IS NOT NULL AND issuing_country IS NOT NULL
            AND document_type = btrim(document_type) AND document_type <> ''
            AND document_number = btrim(document_number) AND document_number <> ''
            AND issuing_country = btrim(issuing_country) AND issuing_country <> '')
    )
);
CREATE UNIQUE INDEX people_account_document_uq
    ON juridico.people(account_id, lower(btrim(document_type)), lower(btrim(document_number)), lower(btrim(issuing_country)))
    WHERE document_type IS NOT NULL;
CREATE INDEX people_account_page_idx ON juridico.people(account_id, id);
CREATE INDEX people_account_type_page_idx ON juridico.people(account_id, type, id);