\set ON_ERROR_STOP on

-- Ejecutar con psql 18 y un administrador sobre una base de mantenimiento.
-- No crea tablas ni datos de negocio; no cambia passwords de roles existentes.
\if :{?db_name}
\else
  \set db_name asistente_lex
\endif
\if :{?app_user}
\else
  \set app_user asistente_lex
\endif

DO $$
BEGIN
  IF current_setting('server_version_num')::integer NOT BETWEEN 180000 AND 189999 THEN
    RAISE EXCEPTION 'Este script requiere PostgreSQL 18.x';
  END IF;
END
$$;

SELECT :'db_name' ~ '^[a-z][a-z0-9_]*$'
   AND :'app_user' ~ '^[a-z][a-z0-9_]*$'
   AND octet_length(:'db_name') <= 63
   AND octet_length(:'app_user') <= 63
   AND :'db_name' NOT IN ('postgres', 'template0', 'template1')
   AND :'app_user' <> current_user
   AND :'app_user' NOT LIKE 'pg\_%'
   AS valid_names \gset
\if :valid_names
\else
  DO $$ BEGIN
    RAISE EXCEPTION 'Usa nombres dedicados a la app, en minusculas, de hasta 63 bytes';
  END $$;
\endif

SELECT EXISTS (SELECT FROM pg_roles WHERE rolname = :'app_user') AS role_exists \gset
\if :role_exists
  SELECT NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole
     AND NOT rolreplication AND NOT rolbypassrls AND rolcanlogin
     AND NOT EXISTS (
       SELECT FROM pg_auth_members WHERE member = pg_roles.oid
     ) AS safe_role
  FROM pg_roles WHERE rolname = :'app_user' \gset
  \if :safe_role
  \else
    DO $$ BEGIN
      RAISE EXCEPTION 'El usuario existente debe ser LOGIN, sin privilegios administrativos ni membresias';
    END $$;
  \endif
\else
  SELECT format(
    'CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS',
    :'app_user'
  ) \gexec
  -- psql solicita el password sin incluirlo en el archivo ni en argumentos.
  \password :app_user
\endif

-- CREATE DATABASE no puede ejecutarse dentro de una transaccion.
SELECT format('CREATE DATABASE %I', :'db_name')
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = :'db_name') \gexec

\connect :db_name

BEGIN;
REVOKE ALL ON DATABASE :"db_name" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"db_name" TO :"app_user";
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM :"app_user";

CREATE SCHEMA IF NOT EXISTS juridico AUTHORIZATION :"app_user";
CREATE SCHEMA IF NOT EXISTS documental AUTHORIZATION :"app_user";
CREATE SCHEMA IF NOT EXISTS erp AUTHORIZATION :"app_user";

-- No adopta silenciosamente esquemas existentes de otro propietario.
SELECT count(*) = 3 AS owned_schemas
FROM pg_namespace
WHERE nspname IN ('juridico', 'documental', 'erp')
  AND nspowner = (SELECT oid FROM pg_roles WHERE rolname = :'app_user') \gset
\if :owned_schemas
\else
  ROLLBACK;
  DO $$ BEGIN
    RAISE EXCEPTION 'Los tres esquemas deben pertenecer al usuario de la app; no se cambiaron sus propietarios';
  END $$;
\endif

REVOKE ALL ON SCHEMA juridico, documental, erp FROM PUBLIC;
-- Cada microservicio elige su esquema en la conexion; no hay uno global.
ALTER ROLE :"app_user" IN DATABASE :"db_name" SET search_path = pg_catalog;
COMMIT;

\echo 'Base y tres esquemas preparados. No se insertaron registros de negocio ni demo.'
