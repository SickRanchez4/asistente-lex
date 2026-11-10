CREATE TABLE documental.files (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL,
  case_id UUID NOT NULL,
  original_name VARCHAR(180) NOT NULL CHECK (length(btrim(original_name)) > 0),
  format VARCHAR(4) NOT NULL CHECK (format IN ('PDF','JPEG','PNG')),
  size INTEGER NOT NULL CHECK (size BETWEEN 1 AND 10485760),
  classification VARCHAR(10) NOT NULL CHECK (classification IN ('FILING','DECISION','EVIDENCE','OTHER')),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT date_trunc('milliseconds', clock_timestamp()),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  availability VARCHAR(14) NOT NULL CHECK (availability IN ('STAGING','AVAILABLE','DELETE_PENDING'))
);
CREATE INDEX files_case_date ON documental.files(account_id,case_id,uploaded_at DESC,id DESC);
CREATE INDEX files_classification ON documental.files(account_id,case_id,classification,format);