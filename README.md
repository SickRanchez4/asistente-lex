# Asistente Lex

Plataforma de gestión jurídica, documental, administrativa y asistencia con IA para abogados independientes.

Este repositorio se desarrolla con Spec Driven Development (SDD):

- [Especificación integral](docs/Asistente_Lex_Especificacion_Integral.md): alcance, requisitos y casos de uso del producto.
- [Constitución](docs/constitution.md): reglas de trabajo, arquitectura y gobernanza.
- [Specs](specs/README.md) e [índice de specs](specs/index.md): desarrollo de cada capacidad.
- [Decisiones de arquitectura (ADR)](docs/decisions/): stack, versiones, entorno local y persistencia.
- [AGENTS.md](AGENTS.md): punto de entrada para agentes de IA.

Este documento explica cómo preparar, ejecutar y comprobar el entorno local de la [plataforma base](specs/000-plataforma-base/spec.md).

## Estructura

```text
compose.yaml               Entorno local con Docker Compose
.env.example               Variables del entorno local (valores ficticios)
infra/                     Aprovisionamiento PostgreSQL y certificados locales
src/
├── frontend/
│   ├── shell/             Application Shell (single-spa + TypeScript)
│   ├── abogado/           Microfrontend del abogado (React)
│   └── admin/             Microfrontend de administración (Angular)
├── gateway/               Gateway GraphQL (Apollo Server)
└── services/
    ├── ms-01-juridico/    Java / Spring Boot
    ├── ms-02-documental/  Next.js / TypeScript
    ├── ms-03-erp/         PHP / Laravel
    └── ms-04-ia/          Python / FastAPI
```

Cada microservicio separa las capas `domain`, `application` (con sus puertos), `adapters` e `infrastructure`. MS-01 implementa identidad, sesiones, administración, auditoría, personas y la capacidad propietaria de expedientes; archivo integrado, participantes y operaciones económicas continúan pendientes de sus specs.

## Requisitos previos

- Docker con Docker Compose v2.
- Una instancia PostgreSQL 18.x y MongoDB externas accesibles desde Docker. Usa almacenes dedicados a desarrollo, no datos de producción.
- Cliente `psql` 18 y un administrador para preparar PostgreSQL. Estas credenciales se usan solo al aprovisionar, no en la configuración de la app.
- Memoria para Docker: se recomienda asignar al menos 4 GB, porque la construcción de las imágenes de Java y Angular requiere más memoria que la ejecución en reposo.

Para ejecutar un componente directamente, fuera de Docker, se necesitan además las versiones del [ADR 0001](docs/decisions/0001-stack-y-versiones.md):

| Componente | Requisitos |
|---|---|
| MS-01 | JDK 25. Maven no es necesario: se usa el wrapper `mvnw`. |
| MS-02, gateway, shell y microfrontends | Node.js 26. |
| MS-03 | PHP 8.5 con la extensión `pdo_pgsql`, y Composer 2. |
| MS-04 | Python 3.15. |

## Puesta en marcha con Docker Compose

1. Copia las variables de entorno si todavía no tienes `.env`:

   ```sh
   cp .env.example .env
   ```

   En PowerShell: `Copy-Item .env.example .env`.

2. Completa las variables de conexión en `.env`:

   | Variable | Uso |
   |---|---|
   | `POSTGRES_HOST`, `POSTGRES_PORT` | Servidor PostgreSQL externo. Desde Docker, `localhost` es el propio contenedor; si el servidor está en Windows usa `host.docker.internal`. |
   | `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Una base y un usuario de aplicación compartidos por MS-01, MS-02 y MS-03. |
   | `POSTGRES_SSLMODE` | `verify-full` (predeterminado): verifica CA y hostname. `disable` únicamente para desarrollo local sin TLS. No se admite desactivar la verificación manteniendo una conexión TLS. |
   | `POSTGRES_SSLROOTCERT` | Ruta dentro del contenedor: `/certs/postgresql-ca.crt`. Copia la CA del proveedor a `infra/certificates/postgresql-ca.crt`. |
   | `MONGO_URI` | URI completa del proveedor, `mongodb://` o `mongodb+srv://`, con credenciales y opciones de autenticación/TLS. |
   | `MONGO_DB` | Base de MS-04; por defecto `ia`. |
   | `USER_CONTEXT_SIGNING_KEY` | Clave local (mínimo 32 caracteres) con la que el gateway firma el contexto de usuario y los servicios lo verifican. |
   | `MS01_INTERNAL_API_TOKEN` … `MS04_INTERNAL_API_TOKEN` | Credencial propia de cada servicio para llamadas REST internas. Sin ella, el servicio rechaza todo salvo `GET /health`. |

   Genera cada clave/credencial con `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. Son valores del entorno local, no secretos de producción.

   No incluyas usuarios administradores. Para MongoDB crea un usuario limitado a `MONGO_DB`; el script PostgreSQL no aprovisiona MongoDB. Codifica los caracteres especiales de las credenciales en la URI y usa comillas simples en `.env` si contiene `$`. Si MongoDB necesita una CA propia, colócala en `infra/certificates` y usa su ruta `/certs/...` en la opción `tlsCAFile` de la URI. Los certificados de esa carpeta no se versionan.

   Permite la IP de salida correspondiente en el proveedor y comprueba VPN/firewall/DNS desde Docker. Los tiempos de espera son configurables si la conexión remota requiere más latencia.

3. Prepara PostgreSQL como se explica en la sección siguiente.

4. Levanta solo DynamoDB Local:

   ```sh
   docker compose up -d
   ```

5. Prepara identidad según la sección siguiente y levanta los nueve contenedores del entorno completo, con el perfil `app`:

   ```sh
   docker compose --profile app up -d --build
   ```

6. Para ver los registros: `docker compose logs -f <servicio>`. Para detener el entorno: `docker compose --profile app down`.

PostgreSQL y MongoDB no se levantan ni se detienen con Compose. Los componentes no esperan a que sus almacenes estén disponibles: informan su estado en `GET /health`. Compose exige que completes las variables obligatorias; no imprime secretos si lo validas con `docker compose --profile app config --quiet`.

### Preparar PostgreSQL 18.x

El script [bootstrap.sql](infra/postgres/bootstrap.sql) crea una base dedicada, los esquemas `juridico`, `documental` y `erp`, y un usuario de aplicación no administrativo. Los tres servicios comparten ese usuario, pero cada conexión selecciona su esquema.

Ejecuta con `psql` 18 desde la raíz, usando un administrador con permisos para crear bases y roles. No guardes su password en `.env`; `-W` lo solicita:

```powershell
psql -X -W -h SERVIDOR -p 5432 -U ADMINISTRADOR -d postgres `
  -v db_name=asistente_lex -v app_user=asistente_lex `
  -f .\infra\postgres\bootstrap.sql
```

Configura también el TLS del cliente psql según el proveedor (`PGSSLMODE=verify-full` y `PGSSLROOTCERT` con una ruta de tu máquina). Cambia los parámetros `db_name` y `app_user` si elegiste otros nombres y hazlos coincidir con `.env`.

- Si el usuario no existe, el script solicita su password dos veces sin incluirlo en argumentos ni en el archivo. Ese password es el que usarás en `POSTGRES_PASSWORD`.
- Si ya existe, conserva su password y exige un rol LOGIN sin privilegios administrativos ni membresías.
- Si la base ya existe, debe estar dedicada a esta app: el script modifica permisos de conexión y del esquema `public`. No lo ejecutes en una base de otras aplicaciones.
- Puede repetirse: no duplica base/esquemas, borra tablas ni cambia propietarios de esquemas existentes. Si encuentra otro propietario, falla explícitamente.
- El administrador debe poder modificar los permisos de la base y los esquemas. Si el proveedor no permite crear bases/roles, pídele al administrador que los prepare antes de ejecutar el script.
- **No crea tablas ni registros iniciales o demo.** La plataforma base no los necesita; las migraciones y semillas se definirán con las specs funcionales.
- La creación de base y rol no es completamente transaccional; si un paso falla, esos recursos pueden quedar creados. La preparación de esquemas/permisos se realiza en una transacción y el script detiene la ejecución ante errores.

### Preparar identidad y demo local

Después de preparar el esquema PostgreSQL `juridico` y levantar DynamoDB, ejecuta desde la raíz:

```sh
docker compose --profile app build ms-01-juridico
docker compose --profile app run --rm --no-deps -e AUTH_PREPARE=true -e AUTH_DEMO=true ms-01-juridico
```

El proceso aplica las migraciones Flyway sobre `juridico`, aprovisiona `lex-access-events-v1` y sus índices y termina. V2 corrige la ubicación de las tablas de V1 si el pooler las creó en `public`, conservando los datos y el historial. Repetirlo conserva las cuentas y contraseñas existentes. El arranque ordinario no migra ni crea tablas o cuentas. Para preparar sin demo, omite `-e AUTH_DEMO=true`.

Las demos públicas son `admin@demo.com` / `password` (Administrador) y `abogado@demo.com` / `password` (Abogado). Solo se preparan con `APP_ENV=local`, `AUTH_PREPARE=true` y `AUTH_DEMO=true`. Si ya existe el administrador anterior `admi@demo.com`, la preparación cambia únicamente su correo a `admin@demo.com`, conservando identificador, nombre, contraseña, estado e historial. Un conflicto de correo o rol se rechaza sin sobrescribir cuentas. Repetir la preparación no duplica cuentas ni restablece contraseñas o estados existentes. No existe registro público; el Administrador puede crear otras cuentas Abogado desde 004.

Las sesiones duran como máximo 8 horas, con 30 minutos de inactividad. Son opacas, persisten como digest en PostgreSQL y el navegador recibe únicamente una cookie HttpOnly, SameSite=Strict, limitada a `/graphql`. Configura `COOKIE_SECURE=true` al servir por HTTPS. El Shell usa `/graphql` del mismo origen, mediante nginx en Docker o proxy de desarrollo. Las solicitudes GraphQL exigen POST JSON y `X-Lex-Request: 1`; CORS por sí solo no protege frente a CSRF.

MS-01 consulta las tablas con el prefijo `juridico` y comprueba la existencia del esquema sin depender de `search_path`, para admitir poolers transaccionales y proveedores que rechazan ese parámetro de inicio JDBC. La adquisición de conexiones tiene su propio límite de 10 segundos: `MS01_DB_CONNECTION_TIMEOUT_MS` en la raíz y `DB_CONNECTION_TIMEOUT_MS` en ejecución directa. TLS sigue verificando CA y hostname; este límite no sustituye los plazos del Gateway.

Auditoría de mejor esfuerzo: una caída de DynamoDB no revierte un login/logout ya aplicado ni convierte un rechazo en acceso. Se comunica explícitamente como fallo de registro. Sin bloqueo de intentos, colas ni garantía de producción.

### Administración y auditoría

Con una sesión Administrador, el panel Angular ofrece `/admin/cuentas`, `/admin/parametros` y `/admin/auditoria`. Permite crear Abogados, consultar sus datos de cuenta, suspender/reactivar y restablecer contraseña sin editar nombre/correo/rol ni eliminar cuentas. Suspender y restablecer invalidan sus sesiones; reactivar no cambia la contraseña ni los datos.

La preparación explícita de MS-01 anterior aplica también V3, que crea los parámetros cerrados en `juridico`. No hay migración automática al arrancar. Mensaje global y correo de soporte son opcionales; el Shell consulta solo esa proyección pública y no interpreta HTML. No se configura SMTP, secretos ni claves arbitrarias desde el panel.

Los cambios devuelven `applied` y `auditRecorded` por separado. Si el cambio se guardó pero falló DynamoDB, se informa `PARTIAL_FAILURE`; no se repite el cambio para intentar auditarlo. Un fallo de transporte no confirma que la operación haya fallado: consulta su estado antes de reenviarla.

La auditoría se consulta en páginas acotadas (25 por defecto, máximo 100), con filtros combinables por tipo/usuario y período RFC3339: inicio inclusivo, final exclusivo. Las páginas filtradas pueden estar vacías y aun tener cursor siguiente. No hay API de modificación/borrado ni TTL.

La recepción `/audit/events` exige una credencial distinta para MS-04: `MS04_AUDIT_API_TOKEN` en los entornos de MS-01 y MS-04, más contexto firmado del autor. Genera un valor aleatorio fuera del repositorio con el procedimiento de `.env.example`; vacía deja ese ingreso bloqueado. MS-04 ya emite los cambios de agentes; si falta esta credencial o falla el receptor, conserva el cambio e informa parcial. No se habilita demo ni se crean cuentas de prueba automáticamente en la base externa.

### Configuración de agentes

El panel `/admin/agentes` permite consultar y editar Penalista y Civilista, sus instrucciones, modelo OpenAI libre, tres herramientas internas y disponibilidad, con confirmación e historial anterior/nuevo/autor/fecha. No se crean ni eliminan agentes, ni se consultan conversaciones. El Abogado ve solo nombre, especialidad y disponibilidad desde React; un agente deshabilitado sigue visible y no se selecciona automáticamente otro.

Antes de usar el catálogo, define `AGENT_INITIAL_MODEL` en `.env` y ejecuta la preparación explícita:

```sh
docker compose build ms-04-ia
docker compose run --rm --no-deps -e AGENTS_PREPARE=true ms-04-ia python -m app.infrastructure.prepare_agents
docker compose --profile app up -d --no-deps ms-04-ia gateway admin abogado shell
```

El entorno inicial usa `gpt-4o-mini`, elegido por el responsable. Ambos agentes se aprovisionan habilitados con las tres herramientas. La preparación v1 usa `MONGO_DB`; repetirla no sobrescribe configuración ni revisiones. El arranque ordinario no aprovisiona. Sin catálogo preparado, las operaciones responden indisponibilidad, aunque la sonda técnica MongoDB pueda estar `UP`.

`OPENAI_API_KEY` es un secreto del entorno de MS-04: complétala únicamente en `.env` privado cuando vayas a usar OpenAI. No aparece en GraphQL, configuración de agentes ni historial. En 005 no se llama al proveedor ni se valida la existencia del modelo: su rechazo real y el uso de herramientas pertenecen a 011, sin reemplazar silenciosamente el identificador elegido.

Las herramientas tienen catálogo cerrado: `CASE_LEGAL_DATA`, `CASE_PDF_LIST`, `CASE_PDF_TEXT`. No son conexiones configurables; sus implementaciones autorizadas de expediente/PDF pertenecen a los flujos de 011 y sus propietarios. No se registran URLs, comandos, credenciales ni servidores MCP. La política de Bolivia, fuentes autorizadas y revisión profesional se conserva separada de las instrucciones editables.

MS-04 expone `GET /agents` como proyección mínima y `GET /agents/{id}/availability` para consumidores internos; esta última devuelve `CONFLICT` si el agente está deshabilitado. Todas requieren la credencial de MS-04; el Gateway exige además sesión para la consulta del Abogado. 007 ya valida disponibilidad al crear un expediente o cambiar su agente inicial; 011 debe usar `capture_for_question` dentro de MS-04 para capturar una revisión al admitir la pregunta. La interfaz no es autorización: siguen pendientes el flujo de preguntas y su descarte por archivo.

Las revisiones MongoDB son inmutables por API. Primero se inserta la revisión y después se publica el puntero mediante compare-and-set; una revisión no publicada no cuenta como historia aplicada. El historial recorre la cadena en páginas de hasta 100 con cursor firmado ligado al agente, sin truncarla ni exigir transacciones MongoDB. Un conflicto exige recargar antes de confirmar otra edición.

Tras publicar, MS-04 intenta una sola entrega de `AGENT_ACTION` a MS-01, usando la revisión como ID estable y sin enviar instrucciones ni modelo. `MS04_AUDIT_API_TOKEN` debe tener el mismo valor dedicado en ambos servicios; después de configurarla en la raíz, recrea ambos con `docker compose --profile app up -d --no-deps ms-01-juridico ms-04-ia`. No reutilices la credencial del Gateway. Sin confirmación se informa `applied=true`, `auditRecorded=false`, `PARTIAL_FAILURE`; no hay cola, rollback ficticio ni reintento del cambio.

### Personas

Con una cuenta Abogado activa, `/abogado/personas` ofrece listado paginado, búsqueda combinada por nombre/razón social, tipo y número de documento, ficha, registro y edición. Natural requiere nombres/apellidos; jurídica requiere razón social. La identificación puede omitirse o completarse después, siempre con tipo libre, número y país juntos. Contacto y domicilio son opcionales; no se eliminan personas.

La búsqueda usa subcadenas literales sin distinguir mayúsculas/minúsculas; no interpreta `%` o `_` como comodines. La comparación de duplicados recorta espacios exteriores y aplica `lower` en PostgreSQL, conserva ceros iniciales y exige unicidad de la terna dentro de la cuenta, también con escrituras concurrentes. Otra cuenta puede registrar la misma identificación. El Administrador no consulta fichas ni el cliente elige la cuenta de autoridad.

Para actualizar un entorno existente, aplica expresamente V4 con el mecanismo de preparación, sin demo:

```sh
docker compose build ms-01-juridico gateway abogado shell
docker compose run --rm --no-deps -e AUTH_PREPARE=true ms-01-juridico
docker compose --profile app up -d --no-deps ms-01-juridico gateway abogado shell
docker compose restart shell
```

V4 crea `juridico.people` y sus restricciones/índices; el arranque normal no migra ni crea personas. Reiniciar Shell refresca la dirección interna de Gateway que nginx resolvió al arrancar cuando se recreó ese contenedor.

REST propietario ofrece `/people`, `/people/{id}`, `/people/selections` y `/people/{id}/selection`; las dos últimas proyecciones contienen solo ID, tipo y nombre para participantes/contratantes, sin documento ni contacto. Exigen token interno y contexto firmado del propietario vigente. GraphQL expone altas, actualización y consultas equivalentes, sin operación de eliminación ni argumento de cuenta.

Las consultas distinguen vacío de indisponibilidad. El formulario conserva datos rechazados y errores por campo. Si una escritura no recibe confirmación, bloquea su reenvío inmediato y exige consultar el estado. Editar la ficha no consulta ni altera expedientes/participaciones; la prueba con vínculos reales Cerrados/Archivados y su selección en 008/014 siguen pendientes según [tareas de 006](specs/006-personas/tasks.md).

### Expedientes y ciclo de vida

Con una cuenta Abogado activa, `/abogado/expedientes` ofrece alta, listado paginado con estado/área/código/título, ficha, edición en Abierto e historial de transiciones con fecha y autor. Código y título son texto; el código conserva ceros y es único por cuenta comparando `lower(btrim(code))`, también al editar y frente a solicitudes simultáneas. Los filtros de texto son subcadenas literales sin distinguir mayúsculas; no hay filtro de fecha. El Administrador y otros abogados no acceden.

La preparación explícita mostrada en Personas aplica también V5 (`juridico.cases` y `juridico.case_transitions`). El arranque ordinario no migra. MS-01 necesita `MS04_URL` y `MS04_API_TOKEN` al ejecutarse directamente; Compose usa el destino interno de MS-04 y su `MS04_INTERNAL_API_TOKEN`, nunca una nueva credencial pública.

REST `/cases`, `/cases/{id}`, `/cases/{id}/transitions` y `/cases/{id}/eligibility` exigen token del receptor y contexto firmado del propietario vigente. Elegibilidad solo devuelve ID, estado, agente inicial, versión, marca y permiso de preguntas; otros servicios no consultan tablas de MS-01. GraphQL no acepta cuenta autoritativa del cliente. Edición y transiciones exigen `expectedVersion`; un conflicto o resultado incierto requiere consultar la ficha antes de repetir.

Cerrar lleva de Abierto a Cerrado; reabrir, de Cerrado a Abierto. Estado e historial se guardan juntos. Archivar solo se solicita desde Cerrado y exige confirmar la eliminación irreversible de conversaciones. MS-01 persiste un intento estable, bloquea elegibilidad de nuevas preguntas/reapertura y pide borrado completo a MS-04 antes de guardar Archivado. Un fallo conserva Cerrado con marca; no vence automáticamente ni se desbloquea con una reapertura. Si el borrado se confirmó pero falló la transición local, se comunica pérdida irreversible y resultado parcial. Consultar el estado antes de reintentar reutiliza el intento sin duplicar historia.

**Límite actual:** el contrato `POST /cases/{id}/conversations/delete` está definido, pero el handler y la coordinación por generación/recibos de borrado pertenecen a 011 y todavía no existen. Solicitar archivo ahora informa indisponibilidad y deja Cerrado con archivo pendiente; no confirma borrado ni éxito. Desarchivar está implementado como Archivado→Cerrado, sin restaurar chats ni escribir contenido/documentos. Su aceptación completa y el comportamiento de chats existentes/nuevos requieren 008/009/010/011 según [tareas de 007](specs/007-expedientes-y-ciclo-de-vida/tasks.md). No se declara esta integración lista para producción.

### Puertos

Todos los puertos se publican solo en `127.0.0.1` y pueden cambiarse en `.env`.

| Componente | URL |
|---|---|
| Application Shell | http://localhost:9000 |
| Microfrontend del abogado | http://localhost:9100/asistente-lex-abogado.js |
| Microfrontend de administración | http://localhost:9200/main.js |
| Gateway GraphQL | http://localhost:4000/graphql |
| MS-01 | http://localhost:8081/health |
| MS-02 | http://localhost:8082/health |
| MS-03 | http://localhost:8083/health |
| MS-04 | http://localhost:8084/health |
| DynamoDB Local | http://localhost:8000 |

## Comprobación del entorno

### Salud de cada servicio

```sh
curl http://localhost:8081/health
```

Cada servicio responde `200` cuando él y sus almacenes están disponibles, y `503` si alguno no lo está:

```json
{"service":"ms-01-juridico","status":"UP","dependencies":{"postgresql":"UP","dynamodb":"UP"}}
```

| Servicio | Dependencias que comprueba |
|---|---|
| MS-01 | `postgresql`, `dynamodb` |
| MS-02 | `postgresql`, `fileStorage` |
| MS-03 | `postgresql` |
| MS-04 | `mongodb` |

Para comprobar una caída local, detén DynamoDB (`docker compose stop dynamodb-local`) y consulta MS-01: debe responder `503`. Para PostgreSQL/MongoDB externos usa una conexión de desarrollo inaccesible o una interrupción controlada; no detengas bases compartidas o de producción. En PostgreSQL también se comprueba que el esquema configurado exista y sea accesible.

### Estado de la plataforma en el gateway

```sh
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
   -H "X-Lex-Request: 1" \
  -d '{"query":"{ platformStatus { services { name status } } }"}'
```

En PowerShell:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:4000/graphql -ContentType 'application/json' `
   -Headers @{ 'X-Lex-Request' = '1' } `
  -Body '{"query":"{ platformStatus { services { name status } } }"}' | ConvertTo-Json -Depth 5
```

Cada servicio aparece como:

- `UP`: el servicio y sus almacenes están disponibles.
- `DOWN`: el servicio responde, pero algún almacén no está disponible.
- `UNAVAILABLE`: el servicio no responde o excede el tiempo de espera.

### Application Shell

Abre http://localhost:9000:

- Sin sesión, cualquier ruta muestra el acceso con correo y contraseña.
- El rol Abogado monta React en `/abogado`; el Administrador monta Angular en `/admin`. No hay selector de rol y la otra interfaz permanece desmontada.
- `/cuenta` permite cambiar la contraseña propia; cerrar sesión invalida el registro de servidor.
- Una sesión pendiente o cuya verificación falla no mantiene contenido privado montado. Los sondeos no renuevan inactividad; la actividad real se comunica por separado.

Las funcionalidades posteriores deben usar los guards de identidad, rol y pertenencia del Gateway y comprobar permisos en sus propietarios. El aislamiento visual no sustituye la autorización de cada recurso. El Shell emite `al-session-changed` sin secretos y `al-password-changed` para la integración posterior de 013; todavía no hay copias offline.

### Patrones UI compartidos

- El Shell carga una sola vez [ui.css](./src/frontend/shared/ui.css) y sirve el logotipo desde sus propios archivos estáticos, sin CDN o fuentes externas.
- React reutiliza [ui.tsx](./src/frontend/abogado/src/ui.tsx); Angular reutiliza [ui.components.ts](./src/frontend/admin/src/app/ui.components.ts). Incluyen estados, campos, acciones no disponibles, selector de agentes y confirmación modal con cancelación y retorno de foco.
- En Angular usa `controlId` para identificar el control interno; no reutilices el `id` del elemento host como identificador del campo. En React se usa `id`.
- [formats.ts](./src/frontend/shared/formats.ts) recibe fechas civiles ISO, instantes con zona e importes como cadenas decimales exactas. Presenta `08/11/2026`, hora de Bolivia y `BOB 1.234,56`; ausencias permitidas son «Sin dato» e inválidos producen error, no cero o fecha actual.
- [presentation.ts](./src/frontend/shared/presentation.ts) define estados de presentación, no contratos GraphQL. El consumidor traduce las categorías seguras de 002, conserva sus valores de formulario y activa `pending` antes de enviar una operación. Solo un resultado confirmado puede producir éxito; parcial o incierto no autoriza reintentar una escritura automáticamente.
- [navigation.ts](./src/frontend/shared/navigation.ts) define el contexto UI de sesión y destinos por rol. El Shell lo alimenta con la verificación real de MS-01; no almacena credenciales ni define subrutas funcionales.

Con `npm start` en los tres frontends, las rutas `/abogado` y `/admin` muestran un desplegable **Patrones compartidos · solo desarrollo**. Son ejemplos locales sin acciones de negocio, datos privados o catálogo real. La galería no se renderiza en los builds de producción.

Para entrar desde el Shell hacen falta Gateway, MS-01 y sus almacenes preparados. En ejecución directa, el proxy del Shell apunta a `http://localhost:4000`; puede cambiarse con `GATEWAY_URL`. Si el Node global es anterior, Angular debe ejecutarse con un runtime compatible; por ejemplo, desde su carpeta:

```powershell
npm exec --yes --package=node@26.13.0 -- node node_modules\@angular\cli\bin\ng.js serve
```

Cada frontend conserva sus dependencias independientes. El contexto Docker de los tres es ahora `src/frontend`, para incluir los recursos fuente compartidos; Compose ya selecciona el Dockerfile correspondiente. Para construir individualmente desde la raíz en Windows:

```powershell
docker build -f .\src\frontend\shell\Dockerfile -t asistente-lex/shell:dev .\src\frontend
docker build -f .\src\frontend\abogado\Dockerfile -t asistente-lex/abogado:dev .\src\frontend
docker build -f .\src\frontend\admin\Dockerfile -t asistente-lex/admin:dev .\src\frontend
```

## Ejecución directa de un componente

Durante el desarrollo puedes ejecutar un componente con su herramienta habitual, conectado al resto del entorno en Docker:

1. Levanta el entorno: `docker compose --profile app up -d`.
2. Detén el contenedor del componente, por ejemplo `docker compose stop ms-04-ia`, para liberar su puerto.
3. En la carpeta del componente, copia `.env.example` como `.env`. Usa las mismas bases externas. Para PostgreSQL mapea `POSTGRES_*` de la raíz a `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSLMODE` y `DB_SSLROOTCERT`; conserva `DB_SCHEMA` propio del servicio. Usa rutas de certificados de Windows, no `/certs`. Para MS-04 usa `MONGO_URI` y `MONGO_DB`; ajusta también cualquier ruta `tlsCAFile` al host. Copia `USER_CONTEXT_SIGNING_KEY` y la credencial interna del servicio (`INTERNAL_API_TOKEN` en servicios, `MS0X_API_TOKEN` en el gateway) desde el `.env` de la raíz.
4. Instala las dependencias y ejecuta el componente:

| Componente | Carpeta | Comandos |
|---|---|---|
| MS-01 | `src/services/ms-01-juridico` | `./mvnw spring-boot:run` (en Windows: `mvnw.cmd spring-boot:run`) |
| MS-02 | `src/services/ms-02-documental` | `npm install`, crear la carpeta indicada en `FILE_STORAGE_PATH` (por defecto `.data/ms-02-files` en la raíz) y `npm run dev` |
| MS-03 | `src/services/ms-03-erp` | `composer install` y `php artisan serve --port=8083` |
| MS-04 | `src/services/ms-04-ia` | `python -m venv .venv`, activar el entorno, `pip install -e .` y `uvicorn app.infrastructure.main:app --port 8084` |
| Gateway | `src/gateway` | `npm install` y `npm start` |
| Shell | `src/frontend/shell` | `npm ci` y `npm start` |
| Abogado | `src/frontend/abogado` | `npm ci` y `npm start` |
| Admin | `src/frontend/admin` | `npm ci` y `npm start` |

Para que el gateway en Docker encuentre un servicio ejecutado directamente:

1. Cambia su URL en el `.env` de la raíz, por ejemplo `GATEWAY_MS04_URL=http://host.docker.internal:8084`.
2. Reinicia el gateway: `docker compose --profile app up -d gateway`.
3. El servicio debe escuchar en todas las interfaces de red (por ejemplo, `--host 0.0.0.0` en Uvicorn y en `artisan serve`). Ten en cuenta que así queda accesible desde tu red local. Como alternativa, ejecuta también el gateway directamente, sin cambiar ninguna URL.

Cuando el shell se ejecuta directamente, sigue cargando los microfrontends desde `localhost:9100` y `localhost:9200`, tanto si están en Docker como en ejecución directa.

## Datos locales

- DynamoDB y archivos se conservan en `dynamodb-data` y `ms02-files`.
- PostgreSQL y MongoDB conservan sus datos en los servidores externos. Cambiar `.env` no cambia passwords en el servidor; reinicia los componentes después de actualizar la configuración.
- Los antiguos contenedores y volúmenes PostgreSQL/MongoDB no se eliminan automáticamente. Si tenías datos locales, planifica su migración antes de retirarlos. No uses `down -v` ni elimines volúmenes para aplicar credenciales.

## Persistencia y aislamiento

Hay una instancia por tecnología de base de datos ([ADR 0003](docs/decisions/0003-persistencia-por-servicio.md)):

| Servicio | Almacén |
|---|---|
| MS-01 | PostgreSQL, esquema `juridico` de la base compartida; DynamoDB |
| MS-02 | PostgreSQL, esquema `documental` de la misma base; volumen `ms02-files` |
| MS-03 | PostgreSQL, esquema `erp` de la misma base |
| MS-04 | MongoDB, base `ia` |

Los tres consumidores PostgreSQL usan un único usuario propietario de los tres esquemas, por decisión del responsable. **La separación por esquemas no impide accesos cruzados:** el código debe respetar la propiedad de datos y comunicarse mediante APIs. MongoDB usa un usuario limitado a su base.

## Limitaciones del entorno local

- **DynamoDB Local no valida credenciales ni permisos.** El aislamiento depende de que solo MS-01 tenga su configuración.
- **El almacenamiento de archivos de MS-02 se emula con un volumen de Docker**, porque MinIO dejó de publicar imágenes públicas ([ADR 0002](docs/decisions/0002-monorepo-y-entorno-local.md)). No emula la API de S3.
- **`GET /health` y `platformStatus` no requieren autenticación.** El resto de rutas REST exige la credencial interna del servicio. La sesión de usuario llega con la spec 003; no expongas estos puertos fuera de tu máquina.
- **El microfrontend Angular usa el constructor webpack de Angular**, que Angular marca como obsoleto, porque `single-spa-angular` 22 depende de él.
- **En Windows**, los scripts de `infra/` deben conservar finales de línea LF; `.gitattributes` lo garantiza al trabajar con git.
