# Tareas: Gateway y contratos base

## Estado

Pendiente de ejecución y verificación. Spec y plan aprobados el 2026-11-08.

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