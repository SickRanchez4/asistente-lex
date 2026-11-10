DO $$
BEGIN
    IF to_regclass('juridico.accounts') IS NULL THEN
        ALTER TABLE public.accounts SET SCHEMA juridico;
    END IF;
    IF to_regclass('juridico.sessions') IS NULL THEN
        ALTER TABLE public.sessions SET SCHEMA juridico;
    END IF;
END
$$;