# Tareas: Plataforma base

## Estado

Implementación inicial realizada; adaptación a bases externas pendiente de verificación por el desarrollador. Ver los registros siguientes. Las tareas originales documentan la implementación del 2026-10-31 y quedan como historial, no como instrucciones actuales de aprovisionamiento.

## Lista de trabajo

Las tareas siguen el [plan](./plan.md) y se ordenan por dependencia. Solo se marcan como completadas cuando el desarrollador comprueba su evidencia. Una verificación pendiente o fallida se anota junto a la tarea y no se marca. No se crean archivos de testing.

### Fase 1: Decisiones previas

- [x] **T01. Fijar versiones en el ADR 0001.** Elegir las versiones LTS o estables vigentes de cada elemento y comprobar que la versión de Angular es compatible con `single-spa-angular`. — Evidencia/validación: la tabla de versiones del [ADR 0001](../../docs/decisions/0001-stack-y-versiones.md) no tiene valores "Pendiente" y documenta la compatibilidad de Angular.

### Fase 2: Estructura del repositorio

- [x] **T02. Crear la estructura de carpetas.** Crear `src/frontend/{shell,abogado,admin}`, `src/gateway`, `src/services/{ms-01-juridico,ms-02-documental,ms-03-erp,ms-04-ia}` e `infra/{postgres,mongodb}/init`, y eliminar `src/.gitkeep`. Depende de T01. — Evidencia/validación: la estructura coincide con la descrita en el plan.
- [x] **T03. Configurar archivos de repositorio.** Crear `.gitignore` (excluye `.env`, dependencias y artefactos), `.gitattributes` (LF para scripts de shell) y `.env.example` en la raíz con valores ficticios. — Evidencia/validación: `git check-ignore .env` confirma que se ignora; los scripts de `infra/` usan LF; `.env.example` no contiene credenciales reales.

### Fase 3: Almacenes locales

- [x] **T04. Definir los almacenes en Docker Compose.** Crear `compose.yaml` con una sola instancia por tecnología de base de datos (`postgres`, `mongodb` y `dynamodb-local`), volúmenes persistentes, versiones del ADR 0001 y puertos publicados solo en `127.0.0.1`. Depende de T02 y T03. — Evidencia/validación: `docker compose up` inicia exactamente tres instancias de base de datos; los puertos no son accesibles desde otra máquina de la red.
- [x] **T05. Inicializar PostgreSQL.** Script en `infra/postgres/init/` que crea las bases `juridico`, `documental` y `erp`, cada una con su propio usuario y privilegios solo sobre su base. Depende de T04. — Evidencia/validación: cada usuario se conecta a su base; el usuario de `erp` no puede conectarse a `juridico` ni a `documental`, y lo mismo para los demás.
- [x] **T06. Inicializar MongoDB.** Script en `infra/mongodb/init/` que crea la base `ia` con un usuario exclusivo de MS-04. Depende de T04. — Evidencia/validación: el usuario se autentica y opera sobre `ia`, y no tiene permisos sobre otras bases.
- [x] **T07. Definir el almacenamiento de archivos de MS-02.** Declarar en `compose.yaml` el volumen `ms02-files`, que se montará solo en MS-02 en la ruta de `FILE_STORAGE_PATH`, y excluir del control de versiones la carpeta `.data/` usada en la ejecución directa. Depende de T04. — Evidencia/validación: `docker compose config` muestra el volumen declarado y, tras T16, montado solo en `ms-02-documental`; `git check-ignore .data/ms-02-files` confirma que se ignora.

### Fase 4: Microservicios

Cada servicio se crea con las capas `domain`, `application` (con `ports/in` y `ports/out`), `adapters/in`, `adapters/out` e `infrastructure`; capas vacías con `.gitkeep`; configuración desde variables de entorno; `Dockerfile`; `.env.example` con valores ficticios apuntando a `localhost`; y `GET /health` según el contrato del plan, con tiempos de espera y sin detalles internos en la respuesta.

- [x] **T08. Crear MS-01 (Spring Boot, Maven).** `GET /health` comprueba PostgreSQL `juridico` y DynamoDB Local. Depende de T05. — Evidencia/validación: responde `200` con `postgresql` y `dynamodb` en `UP`; al detener DynamoDB Local responde `503` con `dynamodb` en `DOWN`; al detener PostgreSQL, `postgresql` en `DOWN`.
- [x] **T09. Crear MS-02 (Next.js).** Capas en `src/`; `app/` solo con el manejador de `GET /health`, que comprueba PostgreSQL `documental` y que el directorio de `FILE_STORAGE_PATH` existe y admite escritura. Depende de T05 y T07. — Evidencia/validación: responde `200` con `postgresql` y `fileStorage` en `UP`; si el directorio no existe o no admite escritura, responde `503` con `fileStorage` en `DOWN`; no expone páginas.
- [x] **T10. Crear MS-03 (Laravel).** Capas en `src/` con espacio de nombres propio; `GET /health` comprueba PostgreSQL `erp`. Depende de T05. — Evidencia/validación: responde `200` con `postgresql` en `UP`; al detener PostgreSQL responde `503` con `postgresql` en `DOWN`.
- [x] **T11. Crear MS-04 (FastAPI).** Capas en `app/`, aplicación FastAPI creada en `infrastructure`, dependencias en `pyproject.toml`; `GET /health` comprueba MongoDB `ia`. Depende de T06. — Evidencia/validación: responde `200` con `mongodb` en `UP`; al detener MongoDB responde `503` con `mongodb` en `DOWN`.

### Fase 5: Gateway

- [x] **T12. Crear el gateway Apollo Server.** Carpetas `schema/`, `resolvers/`, `clients/` y `config/`; consulta `platformStatus` según el contrato del plan, con llamadas en paralelo y tiempo de espera configurable; CORS limitado a los orígenes configurados; `Dockerfile` y `.env.example`. Depende de T08 a T11. — Evidencia/validación: `platformStatus` devuelve los cuatro servicios en `UP`; con un servicio detenido, ese servicio aparece `UNAVAILABLE` y los demás conservan su estado; con un almacén detenido, el servicio afectado aparece `DOWN`; una solicitud desde un origen no configurado es rechazada.

### Fase 6: Frontend

- [x] **T13. Crear el microfrontend del abogado.** Aplicación React integrada con `single-spa-react`, con contenido provisional que la identifica, `Dockerfile` y `.env.example`. Depende de T02. — Evidencia/validación: el paquete construido expone las funciones de ciclo de vida de single-spa y se sirve en el puerto 9100.
- [x] **T14. Crear el microfrontend de administración.** Aplicación Angular integrada con `single-spa-angular`, con contenido provisional que la identifica, `Dockerfile` y `.env.example`. Depende de T01 (compatibilidad) y T02. — Evidencia/validación: el paquete construido expone las funciones de ciclo de vida de single-spa y se sirve en el puerto 9200.
- [x] **T15. Crear el Application Shell.** Configuración raíz de single-spa en TypeScript con import map por entorno: `abogado` en `/abogado`, `admin` en `/admin` y página provisional con enlaces en `/`. `Dockerfile` y `.env.example`. Depende de T13 y T14. — Evidencia/validación: `/abogado` monta React, `/admin` monta Angular y `/` muestra los enlaces; navegar entre rutas desmonta una aplicación y monta la otra sin errores en la consola.

### Fase 7: Integración del entorno

- [x] **T16. Añadir los componentes a Docker Compose.** Incorporar los cuatro servicios, el gateway, el shell y los microfrontends con el perfil `app`, configuración por variables de entorno y sin esperar a que todas sus dependencias estén disponibles para arrancar. Depende de T08 a T15. — Evidencia/validación: `docker compose --profile app up` inicia todos los componentes; al detener un servicio, los demás siguen en ejecución y respondiendo.
- [x] **T17. Validar la ejecución directa.** Asegurar que cada componente puede ejecutarse con su herramienta habitual usando su `.env.example`, conectado al resto del entorno en Docker Compose. Depende de T16. — Evidencia/validación: para cada componente, al detener su contenedor y ejecutarlo directamente, responde su comprobación de salud o se monta en el shell, y los servicios aparecen en `platformStatus`.

### Fase 8: Documentación

- [x] **T18. Escribir el `README.md` de la raíz.** Incluir: requisitos previos (Docker y entornos de ejecución para la ejecución directa) y recursos mínimos; preparación de `.env`; uso de `docker compose up` y del perfil `app`; tabla de puertos; ejecución directa de cada componente; cómo comprobar la salud, `platformStatus` y las rutas del shell; cómo eliminar los volúmenes; y las limitaciones locales (DynamoDB Local sin permisos y endpoints técnicos sin autenticación). Depende de T17. — Evidencia/validación: una persona que no participó en la implementación levanta y comprueba el entorno desde un clon nuevo siguiendo solo el `README.md`.

### Fase 9: Revisión de cumplimiento

- [x] **T19. Revisar la estructura en capas.** Comprobar en los cuatro servicios que `domain` y `application` no importan frameworks, controladores ni clientes de persistencia. Depende de T08 a T11. — Evidencia/validación: la búsqueda de importaciones en esas capas no encuentra Spring, Next.js, Laravel, FastAPI ni clientes de PostgreSQL, MongoDB, DynamoDB o del sistema de archivos.
- [x] **T20. Revisar secretos y alcance.** Comprobar que no se versionan secretos y que no existen entidades ni reglas de negocio. Depende de T18. — Evidencia/validación: solo se versionan archivos `.env.example` con valores ficticios; los registros y respuestas de salud no muestran credenciales; las capas `domain` y `application` siguen vacías.

## Verificación de aceptación

- [x] Revisar cada criterio de aceptación de `spec.md`, según la tabla de la sección "Verificación" del plan.
- [x] Ejecutar las pruebas y validaciones indicadas en `plan.md`.
- [x] Actualizar `spec.md`, `plan.md` e `index.md` si hubo cambios.

## Registro de implementación

Implementación realizada el 2026-10-31. Las casillas quedan sin marcar porque, según la constitución, solo el desarrollador confirma la verificación. Estas son las comprobaciones observadas durante la implementación, como referencia:

| Tarea | Resultado observado | Pendiente para el desarrollador |
|---|---|---|
| T01 | ADR 0001 aceptado con todas las versiones fijadas; Angular 22.2.4 compatible con `single-spa-angular` 22.0.1. | Revisar las versiones elegidas. |
| T02–T03 | Estructura creada; `.gitignore`, `.gitattributes` y `.env.example` con valores ficticios. | La carpeta no es un repositorio git: inicializarlo y ejecutar `git check-ignore .env`. |
| T04 | Exactamente tres instancias de base de datos; puertos publicados solo en `127.0.0.1`. | Comprobar desde otra máquina de la red que los puertos no son accesibles. |
| T05–T06 | Cada usuario de PostgreSQL solo accede a su base; el usuario de MS-04 solo opera sobre `ia`. | — |
| T07 | Volumen `ms02-files` declarado y montado solo en `ms-02-documental`. | `git check-ignore .data/ms-02-files` cuando exista el repositorio. |
| T08–T11 | Los cuatro `GET /health` responden `200` con todo disponible y `503` con la dependencia en `DOWN` al detener cada almacén, en unos 2,1 segundos como máximo. | — |
| T12 | `platformStatus` informa `UP`, `UNAVAILABLE` con un servicio detenido y `DOWN` con un almacén detenido; un origen no configurado recibe `403`. | — |
| T13–T15 | El shell monta React en `/abogado` y Angular en `/admin`, y los desmonta al navegar, sin errores en la consola. | — |
| T16 | `docker compose --profile app up -d --build` inicia los once contenedores, también con volúmenes nuevos; detener un servicio no afecta a los demás. | — |
| T17 | Ejecución directa con las herramientas locales: MS-02 (`npm run dev`), shell y React (`npm start`). MS-01, MS-03, MS-04, gateway y Angular se comprobaron con sus comandos habituales dentro de imágenes del entorno de ejecución correspondiente, porque esta máquina tiene versiones anteriores a las del ADR 0001. | Ejecutar directamente MS-01, MS-03, MS-04, gateway y Angular con JDK 25, PHP 8.5, Python 3.15 y Node.js 26. |
| T18 | `README.md` de la raíz escrito. | Que una persona que no participó siga el `README.md` desde un clon nuevo. |
| T19 | `domain` y `application` solo contienen marcadores vacíos; no hay importaciones. | — |
| T20 | Solo se incluyen archivos `.env.example` con valores ficticios; las respuestas de salud no muestran credenciales. | — |

Ajustes respecto al plan inicial, ya reflejados en la spec, el plan y los ADR:

- MinIO se sustituyó por un volumen de Docker, porque dejó de publicar imágenes públicas.
- MS-04 usa `inbound`/`outbound` en lugar de `in`/`out`, porque `in` es palabra reservada en Python.
- La integración de `single-spa-angular` se configuró manualmente, porque su schematic falla.
- La comprobación de salud de MS-03 usa PDO directamente, para respetar el tiempo de espera.

## Adaptación aprobada el 2026-11-08

Sustituye las decisiones originales de T04–T06 y los permisos descritos en T08–T10. Ver la spec, el plan y el ADR 0003 actualizados.

- [ ] **E01. Conexiones externas.** Retirar PostgreSQL/MongoDB de Compose y sus scripts de inicialización automática; mantener DynamoDB Local y el volumen de archivos. Conservar los volúmenes antiguos sin borrar ni migrar datos.
- [ ] **E02. Configuración de aplicación.** `.env` y ejemplos sin credenciales administrativas ni variables obsoletas; una conexión PostgreSQL compartida, URI MongoDB y TLS configurable.
- [ ] **E03. Aprovisionamiento PostgreSQL 18.x.** Ejecutar `infra/postgres/bootstrap.sql` en una instancia dedicada; comprobar una base, tres esquemas de un usuario no administrativo, repetición segura y cero tablas/semillas de negocio.
- [ ] **E04. Selección de esquema y salud.** Verificar `juridico`, `documental` y `erp` en los tres consumidores y respuesta `503` ante esquema ausente, certificado inválido o conexión caída; MS-04 debe admitir la URI del proveedor.
- [ ] **E05. Verificación externa.** Con las credenciales y CA suministradas por el responsable, comprobar desde Docker los cuatro `/health` y `platformStatus`. El usuario PostgreSQL compartido puede acceder a los tres esquemas: limitación aceptada, no fallo de aislamiento.

No se crean datos iniciales ni demo: no hacen falta para iniciar la plataforma base y las tablas de negocio aún no están implementadas.

Comprobaciones observadas durante esta adaptación, usando almacenes temporales dedicados, no las bases externas del responsable:

- Compose validado con nueve servicios, sin PostgreSQL ni MongoDB locales, y base/usuario PostgreSQL comunes con tres esquemas distintos.
- Construcción satisfactoria de los cuatro servicios; comprobación TypeScript de Next.js, sintaxis PHP y sintaxis Python.
- Script ejecutado desde cero y repetido en PostgreSQL 18.x: tres esquemas del usuario no administrativo y cero tablas de negocio. Acceso a los tres esquemas confirmado como limitación aceptada.
- Parámetros reservados, rol administrativo y esquema de otro propietario rechazados con salida de error. La preparación de esquemas se revierte ante conflicto.
- Cuatro `/health` en `200`; PostgreSQL con CA y hostname verificados y MongoDB con URI/autenticación del usuario de su base.
- MS-01, MS-02 y MS-03 responden `503` con hostname TLS inválido o esquema ausente y `200` en desarrollo local con TLS desactivado.
- La conexión habitual de Laravel, además de su sonda PDO, selecciona `erp` con TLS verificado. La URI MongoDB respeta `authSource` y su representación de configuración oculta el secreto.
- MS-04 responde `503` con MongoDB no disponible.

Pendiente: completar conexiones/certificados reales y verificar red, salud y gateway contra las instancias suministradas. Las casillas siguen reservadas a la confirmación del desarrollador.
