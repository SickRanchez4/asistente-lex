# ADR 0004: Integraciones mínimas y límites de esta fase del MVP

- **Estado:** Aceptado. Specs y planes aprobados por el responsable el 2026-11-08; implementación y verificación pendientes.
- **Fecha:** 2026-11-08
- **Origen:** entrevista de aclaración de las specs 001 a 016.
- **Fuentes:** [especificación integral](../Asistente_Lex_Especificacion_Integral.md), [constitución](../constitution.md) e [índice de specs](../../specs/index.md).

## Contexto

Las preguntas abiertas impedían cerrar el alcance. El responsable pidió una solución local mínima, sin infraestructura de producción ni integraciones cuyo valor no justificase su complejidad. Aprobó explícitamente diferir SSO y MCP, conservando separación por rol, propiedad de datos y comunicación fiel de fallos.

## Decisión

- **Acceso:** correo/contraseña, hashes seguros y sesión de servidor MS-01 con cookie HttpOnly; un rol por cuenta. Máximo online 8 horas e inactividad 30 minutos; suspensión invalida sesiones. Sin SSO, recuperación por correo o bloqueo temporal por intentos en esta fase local.
- **Preparación local:** opción explícita demo después de migraciones de identidad, con valores públicos `admi@demo.com` / `password`, persistiendo solo hash y sin sobrescribir cuentas. No es una credencial de producción ni se activa automáticamente fuera de local.
- **Integración:** SDL GraphQL y OpenAPI REST, contrato único vigente. Binarios Base64 por GraphQL, con límites explícitos; REST autenticado por credenciales de servicio y contexto firmado/verificable de usuario, sin mTLS o gestores de secretos de producción.
- **Plazos configurables:** 10 segundos REST ordinario, 60 segundos totales IA y 60 segundos por archivo. No reintento automático de escrituras.
- **Auditoría:** mejor esfuerzo síncrono a MS-01/DynamoDB. Si el cambio se aplicó y el evento falla, conservarlo e informar resultado parcial; sin éxito global, reversión ficticia, cola o recuperación garantizada. Fallo de auditoría no revierte login válido ni logout efectivo.
- **IA:** OpenAI con modelo editable como texto y herramientas internas de catálogo cerrado para fuentes permitidas. No servidor MCP, conectores personales, Google Drive, notas, informes guardados o procesamiento visual como fuentes de esta fase. La responsabilidad de una futura integración MCP sigue perteneciendo a MS-04.
- **Archivo:** prioridad sobre preguntas en curso y descarte de respuestas pendientes. El plan de 007 concreta coordinación local y recuperación del intento sin transacción distribuida ni estado de negocio nuevo; no se promete coordinación de réplicas.
- **Offline:** copias cifradas con la contraseña del login, sin contraseña adicional, vencimiento temporal o recuperación automática de claves. Máximo 10 expedientes por dispositivo/perfil; conservar copia anterior ante actualización fallida. Logout/cambio de cuenta/suspensión conocida online eliminan copias. Sin red no se garantiza revocación remota.
- **ERP:** BOB de máximo dos decimales y aritmética exacta. Honorarios pueden ser cero; cobros/gastos son positivos, sin sobrepago o deduplicación. Sin anulación/eliminación de movimientos. Panel distingue saldo real por expediente de balance temporal.

## Alternativas descartadas o diferidas

SSO inmediato, MCP sin integración externa concreta, conexiones arbitrarias de herramientas, infraestructura de mensajería/recuperación garantizada, contraseñas locales adicionales, múltiples formatos de informe y una plataforma contable o de pagos.

## Consecuencias

- Menos integraciones y operación local más sencilla; no se afirma preparación para producción.
- Base64 aumenta volumen y memoria: cargas PDF/JPEG/PNG limitadas a 10 MiB binarios, con controles de cuerpo codificado/decodificado.
- Se acepta pérdida de auditoría con fallo visible y posibilidad de registrar de nuevo un movimiento tras reenvío; la UI no equivale a garantía de ejecución única.
- Cambio/restablecimiento de contraseña puede requerir borrar y descargar de nuevo copias offline. Un dispositivo sin red puede seguir consultándolas hasta conocer una suspensión.
- Las specs contienen las reglas de producto; sus planes concretan implementación. Este ADR no marca criterios ni tareas como verificados.
- La verificación de comportamiento queda a cargo del desarrollador, sin archivos de testing creados como parte de esta aclaración.
