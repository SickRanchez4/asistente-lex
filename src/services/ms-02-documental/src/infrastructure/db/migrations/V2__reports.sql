CREATE TABLE documental.reports (
 id uuid PRIMARY KEY,
 account_id uuid NOT NULL,
 case_id uuid NOT NULL,
 request_id uuid NOT NULL,
 fingerprint varchar(64) NOT NULL,
 kind varchar(20) NOT NULL CHECK (kind IN ('EXECUTIVE','CLIENT','NATURAL')),
 status varchar(20) NOT NULL DEFAULT 'STAGING' CHECK (status IN ('STAGING','COMPLETE')),
 created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
 content jsonb,
 size integer,
 UNIQUE(account_id,case_id,request_id),
 CHECK ((status='STAGING' AND content IS NULL AND size IS NULL) OR (status='COMPLETE' AND content IS NOT NULL AND size BETWEEN 1 AND 10485760))
);
CREATE INDEX reports_case_page_idx ON documental.reports(account_id,case_id,created_at DESC,id DESC) WHERE status='COMPLETE';