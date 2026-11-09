# ADR 0003: Persistencia por servicio

- **Estado:** Aceptado
- **Fecha:** 2026-11-08
- **Responsable:** responsable del proyecto
- **Spec relacionada:** [000-plataforma-base](../../specs/000-plataforma-base/spec.md)

## Contexto

La [especificación integral](../Asistente_Lex_Especificacion_Integral.md) define la persistencia en términos de tecnologías y de propiedad lógica de los datos, no de instancias:

- Datos del documento: "tres tecnologías de persistencia".
- RNF-06: PostgreSQL, MongoDB y DynamoDB "con propiedad lógica de datos por dominio".
- Sección 3.2: MS-01 y MS-03 usan PostgreSQL, MS-02 "puede usar su propio esquema o base lógica", y no se comparten tablas entre servicios.

La [constitución](../constitution.md) (principio VII) exige además que cada entidad tenga un servicio propietario y que los demás accedan a sus datos solo mediante contratos API.

Inicialmente se aprobaron tres bases lógicas y usuarios distintos en PostgreSQL. El 2026-11-08 el responsable aprobó sustituirlas por una sola base externa, tres esquemas y un usuario de aplicación compartido, aceptando expresamente la pérdida de aislamiento por permisos.

## Opciones consideradas

- **Instancias de base de datos:**
  - Una instancia por tecnología, con una base lógica y un usuario por servicio.
  - Una instancia por servicio.
  - Una base compartida con un esquema y un usuario por servicio.
  - Una base compartida con un esquema por servicio y un usuario común (elegida).
- **Metadatos de MS-02:**
  - Base lógica PostgreSQL propia.
  - Almacenarlos sin PostgreSQL.

## Decisión

| Servicio | Almacén | Uso |
|---|---|---|
| MS-01 | PostgreSQL, esquema `juridico` de `asistente_lex` | Datos jurídicos e identidad. |
| MS-01 | DynamoDB | Eventos de acceso, intentos de autenticación y auditoría administrativa. |
| MS-02 | PostgreSQL, esquema `documental` de `asistente_lex` | Metadatos de documentos, fotografías e informes. |
| MS-02 | Almacenamiento de archivos (en local, volumen de Docker `ms02-files`) | Contenido binario de documentos, fotografías e informes. |
| MS-03 | PostgreSQL, esquema `erp` de `asistente_lex` | Servicios, honorarios, cobros y gastos. |
| MS-04 | MongoDB, base `ia` | Conversaciones, mensajes y configuración de agentes. |

- Hay tres instancias de base de datos, una por tecnología:
  - PostgreSQL externo 18.x, con una base (nombre configurable) y los esquemas `juridico`, `documental` y `erp`.
  - MongoDB externo, con la base `ia` (nombre configurable).
  - DynamoDB Local en Docker, usado solo por MS-01.
- El almacenamiento de archivos no es una base de datos y se cuenta aparte.
- MS-01, MS-02 y MS-03 comparten un usuario PostgreSQL de aplicación, sin privilegios administrativos, propietario de los tres esquemas. Cada conexión selecciona el esquema de su servicio. Esto organiza los datos, pero NO impide acceder a otros esquemas con esas credenciales.
- Sigue prohibido compartir tablas o consultar los datos de otro servicio directamente. Esta regla se aplica por diseño y revisión del código, no por permisos de PostgreSQL.
- MongoDB conserva un usuario de aplicación limitado a su base. El volumen de archivos solo se monta en MS-02.
- Ningún servicio recibe la configuración ni las credenciales de los almacenes de otro.
- La herramienta de migraciones de cada almacén se define en el plan de la primera spec que crea datos en él.

## Consecuencias

- Se simplifica la configuración de PostgreSQL. Se acepta que un fallo o compromiso de cualquiera de sus consumidores pueda afectar a los tres esquemas.
- `search_path` selecciona el esquema de trabajo; no es una frontera de seguridad. No se incluyen relaciones ni consultas entre esquemas.
- El script [bootstrap.sql](../../infra/postgres/bootstrap.sql) prepara base, usuario y esquemas con un administrador, separado de las credenciales de ejecución de la app. No crea entidades ni datos demo.
- Las migraciones y semillas de negocio pertenecen a las futuras specs de cada servicio.
- Se reducen los recursos necesarios y la cantidad de instancias que operar.
- Un fallo de la instancia de PostgreSQL afecta a MS-01, MS-02 y MS-03 a la vez.
- Separar esquemas en bases o usuarios distintos exigiría revisar conexiones, migraciones y este ADR.
- DynamoDB Local no aplica permisos; ver [ADR 0002](./0002-monorepo-y-entorno-local.md).
