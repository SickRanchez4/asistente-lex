CREATE TABLE juridico.application_settings (
    id boolean PRIMARY KEY DEFAULT true CHECK (id),
    global_message varchar(1000) NOT NULL DEFAULT '',
    support_email varchar(254) NOT NULL DEFAULT ''
);
INSERT INTO juridico.application_settings (id) VALUES (true);