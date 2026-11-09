# Tareas: Gateway y contratos base

## Estado

En progreso. Implementación de base realizada el 2026-11-09 (ver registro). Las casillas quedan sin marcar: la verificación corresponde al desarrollador y parte depende de 003, 010 y 011.

## Lista de trabajo

Basadas en la [spec](./spec.md) y el [plan](./plan.md). C01–C12 corresponden al orden de criterios de la spec. Esta base entrega capacidades consumibles; sus comprobaciones de integración se completan con operaciones reales, no con un API de negocio ficticia.

- [ ] **002-T01. Consumir una fachada tipada que informa correctamente los fallos de sus dependencias.**
  - **Valor/entrega:** extender schema/resolvers/clients existentes, SDL ejecutable y OpenAPI por propietario, contrato único y traducción de categorías seguras, incluidos validación y parcial. Transporte REST con timeout configurable ordinario de 10 segundos y soporte de plazos específicos. Mantener la comprobación técnica existente sin añadir reglas de negocio.
  - **Depende de:** [000](../000-plataforma-base/tasks.md), Gateway y servicios disponibles.
  - **Evidencia/validación:** una operación real atraviesa Apollo/REST; dependencia caída, lenta o respuesta inválida da error seguro, nunca lista vacía o éxito; contrato documentado antes de integrar cada operación y cambios incompatibles coordinados.
  - **Cobertura:** C01, C06, C07, C09, C10, C12.

- [ ] **002-T02. Transmitir identidad verificable y rechazar llamadas no autenticadas.**
  - **Valor/entrega:** contexto Gateway validado por MS-01, credenciales internas fuera del código y usuario/rol/cuenta firmados y verificados por los receptores. Sin reenviar operación protegida con sesión inválida, confiar en encabezados del navegador o consultar almacenes ajenos; sin mTLS ni infraestructura de producción.
  - **Depende de:** 002-T01 y el contrato de sesión operativo de [003-T01](../003-autenticacion-y-acceso/tasks.md). 003-T01 solo necesita el transporte de 002-T01: no requiere esta tarea completa para arrancar el login.
  - **Evidencia/validación:** con la sesión real, MS-01 verifica identidad y propietarios reciben contexto auténtico; sin credencial interna o con cuenta/rol manipulados se rechaza. Comprobar los propietarios al integrar sus operaciones funcionales, no declarar aislamiento a partir de CORS.
  - **Cobertura:** C02, C03, C04, C05, C08.

- [ ] **002-T03. Mantener transferencias e IA dentro de límites fiables de la fachada.**
  - **Valor/entrega:** protección del cuerpo codificado/bytes decodificados y respuestas Base64; plazos de 60 segundos por archivo y 60 segundos totales IA con presupuesto restante propagado, sin reintentos automáticos de escrituras ni rutas REST de archivos en el frontend.
  - **Depende de:** 002-T01, 002-T02 y operaciones reales de [010-T01](../010-documentos-y-fotografias/tasks.md) y [011-T02](../011-asistencia-juridica-ia/tasks.md). Esas entregas implementan límites del propietario con el transporte configurable de 002-T01; esta tarea cierra la protección conjunta de la fachada.
  - **Evidencia/validación:** binario admitido viaja exclusivamente por GraphQL, carga sobre límite se rechaza antes de procesarse indebidamente y timeout no produce éxito. Una generación de varios pasos no consume 60 segundos por paso. Comprobar también descargas PDF/CSV al existir 012/016.
  - **Cobertura:** C01, C06, C11, C12.

## Verificación de aceptación

- [ ] El desarrollador revisa los 12 criterios de la [spec](./spec.md) con consumidores reales; identidad requiere 003 y binarios requieren las funcionalidades respectivas.
- [ ] Ejecutar las validaciones del [plan](./plan.md) y registrar evidencia o bloqueo; sin archivos nuevos de testing.
- [ ] Sincronizar contratos, spec, plan e [índice](../index.md); no marcar completa mientras falten comprobaciones de integración.

## Registro de implementación

Implementación del 2026-11-09. Contrato concretado en la sección "Contrato común concretado" del [plan](./plan.md).

| Tarea | Entregado | Observado durante la implementación | Pendiente |
|---|---|---|---|
| 002-T01 | SDL ejecutable en `src/gateway/src/schema/*.graphql`; OpenAPI en `contracts/openapi.yaml` de cada servicio y `src/services/contracts/common.yaml`; `errors.ts` (categorías y `formatError` sin trazas); `clients/rest-client.ts` (credencial, contexto firmado, correlación, plazo 10 s configurable, sin reintentos); errores HTTP previos a GraphQL con el mismo formato. `platformStatus` se mantiene. | `tsc` sin errores. Con servicios inaccesibles, `platformStatus` devuelve `UNAVAILABLE`; consulta inválida → `VALIDATION` sin `stacktrace`; JSON mal formado → 400 `VALIDATION`; origen no permitido → 403 `FORBIDDEN`. Cliente REST contra servidor simulado: timeout, respuesta no JSON, 401 y error sin categoría → `SERVICE_UNAVAILABLE`; 409 con categoría → `CONFLICT` con mensaje y `fields`; credencial vacía → sin llamada; los registros no contienen credenciales. | Probar con la primera operación real (003-T01) y con Node 26 en Docker. |
| 002-T02 | Gateway: `context.ts` con `requireIdentity` e identidad solo de la sesión verificada (hoy siempre `null`); firma HMAC del contexto. Receptores: filtro/middleware/proxy en MS-01 (Spring), MS-02 (Next `proxy.ts`), MS-03 (Laravel) y MS-04 (FastAPI) que exigen `Bearer` e invalidan contextos manipulados o vencidos; variables en Compose y `.env.example`. | MS-02 (build Next 16) y MS-04 (Python 3.12 local): sin credencial, credencial errónea, contexto alterado/vencido o rol inválido → 401 `UNAUTHENTICATED`; credencial válida → 404 de ruta inexistente; contexto válido expone `userId`/`role`/`accountId`; `GET /health` público. | Compilar y probar MS-01 y MS-03 (Docker no disponible durante la implementación). Resolver la identidad desde la sesión de MS-01 al entregar 003-T01 y comprobar C02–C05 con operaciones reales. |
| 002-T03 | Límite de cuerpo GraphQL de 14 680 064 bytes (413 `VALIDATION`), `decodeBase64` con validación previa de formato y tamaño, `FILE_TRANSFER_TIMEOUT_MS` y presupuesto IA total (`startDeadline`, propagado en `X-Lex-Deadline-Ms`). | Cuerpo de 15 MB → 413; Base64 inválido o sobre el límite → `VALIDATION`; presupuesto de 500 ms corta a ~500 ms y un presupuesto agotado no llama al servicio. | Integrar con 010-T01 y 011-T02; límite documentado de respuestas PDF/CSV con 012/016. |