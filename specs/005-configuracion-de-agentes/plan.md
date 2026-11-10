# Plan: Configuración de agentes

## Estado

En progreso. Plan aprobado por el responsable el 2026-11-08. Implementadas las capacidades propias de MS-04, Gateway, Angular y selector React. Biblioteca Markdown C12–C16 verificada con chat/informes reales de 011/012; credencial dedicada, recepción y reenvío idempotente de auditoría confirmados posteriormente. Aceptación administrativa completa pendiente. Evidencia y límites en tasks.

## Resumen técnico

MS-04 mantiene exactamente Penalista y Civilista en MongoDB, con configuración vigente, disponibilidad e historial. Angular administra instrucciones, modelo OpenAI como texto libre, herramientas internas de catálogo y habilitación mediante GraphQL. Los consumidores consultan disponibilidad mediante contrato propietario.

Aplicar principios IV, VIII y X de la [constitución](../../docs/constitution.md). No añadir agentes, entrenar modelos, ofrecer creación/eliminación ni desarrollar chat aquí.

## Diseño y componentes

- Refinamiento de prompts 2026-11-10: instrucciones profesionales compartidas y perfiles penal/civil diferenciados en las instrucciones iniciales del dominio. No modificar política fija, contratos ni modelo. Publicar las instrucciones en los agentes existentes por GraphQL administrativo con CAS y auditoría, conservando herramientas, disponibilidad, bibliotecas e historial. Verificar ensamblado en chat/informes y respuestas OpenAI reales con fuentes REST autorizadas, sin crear conversaciones de prueba persistentes.
- Ampliación 2026-11-10: biblioteca Markdown integrada en revisiones inmutables de cada agente, sin nuevos servicios ni colecciones. Documentos con UUID, nombre, texto UTF-8, SHA-256, autor y fecha; máximo 10 y 256 KiB sumados. La lectura de revisiones anteriores sin biblioteca usa lista vacía. Alta/retirada reutilizan compare-and-set y auditoría `AGENT_CONFIGURATION_CHANGED`; catálogo público sin biblioteca y detalle de contenido solo administrativo. GraphQL/REST y Angular incorporan carga, consulta de texto y retirada confirmada. Chat e informes reciben la instantánea completa como fuentes `LAW`, subordinadas a la política fija, mantienen el contexto obligatorio del expediente y los límites existentes; exceso se rechaza sin truncar. El contenido no se renderiza como HTML ni se considera normativa oficialmente verificada.
- Dominio: agente estable, instrucciones, identificador de modelo, selección de herramientas internas, habilitación y revisiones.
- Casos de uso de consultar catálogo/configuración/historial, modificar configuración con confirmación y habilitar/deshabilitar.
- Puertos para repositorio MongoDB y registro REST de auditoría en MS-01; framework y clientes fuera del dominio.
- Angular: catálogo, detalle y formulario con instrucciones, modelo libre y selección de herramientas de catálogo; historial y acciones de disponibilidad. Reutilizar [001](../001-experiencia-y-ui-compartida/plan.md).
- React: selector con agentes visibles y motivo cuando están deshabilitados; la creación de expedientes y chat pertenecen a 007 y 011.
- Mantener orientación a Bolivia y revisión profesional en la configuración inicial y mensajes acordados. No interpretar la edición administrativa como autorización para quitar requisitos de jurisdicción.

## Flujo de datos

1. Administrador consulta o envía un cambio por GraphQL; MS-04 valida identidad y rol.
2. MS-04 valida instrucciones y concurrencia, conserva anterior/nuevo, autor y fecha, y establece la revisión vigente para consultas posteriores.
3. MS-04 informa la acción a MS-01 por REST autenticado; el resultado se comunica según la política de auditoría acordada en 004.
4. MS-01 al crear expedientes y MS-04 al recibir nuevas consultas comprueban disponibilidad vigente. Un estado visual anterior no autoriza una consulta.

Cambiar configuración no modifica conversaciones ni respuestas anteriores. Cada pregunta usa configuración capturada al iniciarse. Deshabilitar deja terminar preguntas iniciadas y rechaza nuevas; archivo de 007 prevalece. Si el agente inicial está deshabilitado, pedir alternativa explícita habilitada, sin cambiarlo; se permite deshabilitar ambos con aviso.

## Interfaces y contratos

- GraphQL administrativo: catálogo, configuración, historial y cambios, sin conversaciones.
- Lectura para Abogado/consumidores: identificador, nombre/especialidad y habilitación, sin instrucciones/modelo/herramientas para el Abogado.
- REST MS-04 para disponibilidad de agentes, utilizado por MS-01; nuevas consultas rechazan agentes deshabilitados en el propio MS-04.
- REST de auditoría hacia MS-01 conforme a [004](../004-administracion-y-auditoria/plan.md), con identificación estable para reconocer reenvíos.
- Definir tipos, validación y resultado de conflicto de concurrencia conforme a [002](../002-gateway-y-contratos-base/plan.md). No publicar operaciones de crear/eliminar agentes.

## Persistencia y migraciones

MongoDB `ia`, propiedad de MS-04 según [ADR 0003](../../docs/decisions/0003-persistencia-por-servicio.md). Catálogo con identificadores únicos e historial inmutable por API.

Usar aprovisionamiento versionado e idempotente con PyMongo, sin otra plataforma: ambos agentes habilitados, instrucciones de la spec, tres herramientas internas y modelo inicial requerido desde entorno. No sobrescribir revisiones existentes al reiniciar.

Para no exigir transacciones MongoDB ni historial embebido ilimitado, guardar revisiones inmutables con referencia a la anterior y una referencia de revisión vigente en el agente. Insertar primero la revisión y después cambiar la referencia vigente mediante compare-and-set. Si hay conflicto, no publicarla y devolver conflicto; la revisión no enlazada no es historia aplicada. Consultar historial recorriendo de forma paginada la cadena vigente. Nunca apuntar a una revisión que aún no existe ni truncar historia.

Distinguir atomicidad local de MongoDB de entrega de auditoría en DynamoDB: la primera no garantiza la segunda.

## Seguridad y privacidad

Solo Administrador modifica instrucciones/disponibilidad. Los abogados obtienen solo la proyección permitida del catálogo; ninguna consulta de configuración devuelve conversaciones.

No guardar claves del proveedor en instrucciones ni historial; credenciales en configuración segura del entorno. El historial no dispone de API de edición/borrado. Validar REST y autor verificados al emitir auditoría.

## Observabilidad y manejo de errores

Informar validación, conflicto por edición concurrente, no autorizado e indisponibilidad conforme a 002. No mostrar éxito si no queda vigente la configuración requerida.

Si falla auditoría después de guardar, conservar cambio y comunicar resultado parcial según 004, sin recuperación garantizada. Modelo libre inválido/no autorizado/incompatible produce error explícito del adaptador OpenAI, sin sustitución silenciosa. Registrar categoría/agente, no instrucciones, claves o conversaciones.

## Verificación

Desarrollador responsable, sin crear archivos de testing. Comprobar contratos reales y compilar componentes afectados mediante comandos existentes.

| Criterio de la spec | Comprobación |
|---|---|
| 1. Catálogo fijo | Inicialización/reinicialización: exactamente Penalista y Civilista; sin creación/eliminación en UI o API. |
| 2. Instrucciones | Editar y confirmar: nueva revisión usada en la consulta posterior e historial con autor, fecha y anterior/nuevo. |
| 3. Deshabilitar | Deshabilitar: visible pero no seleccionable en creación/chat, con motivo. |
| 4. Validación backend | Enviar nueva consulta directamente a MS-04 para agente deshabilitado: rechazo. |
| 5. Habilitar | Habilitar y volver a consultar catálogo: seleccionable nuevamente. |
| 6. Acceso indebido | Abogado envía cambios directamente: no autorizado, sin modificación. |
| 7. Auditoría | Modificar, habilitar y deshabilitar: eventos consultables en 004, según política aprobada de fallos/reenvío. |
| 8. Privacidad | Consultar configuración como Administrador: ninguna conversación de abogados. |
| 9. Configuración completa | Cambiar modelo/herramientas: revisión conservada y usada en preguntas posteriores, sin filtración al Abogado. |
| 10. Operación iniciada | Deshabilitar durante pregunta: puede terminar; si se archiva, su respuesta se descarta. |
| 11. Ambos deshabilitados | Creación de expediente/nueva pregunta rechazadas con motivo, sin borrar historial. |

Comprobar además ediciones concurrentes y fallas al conservar historial. Las verificaciones de consultas reales requieren 011 y las de auditoría, 004.

## Decisiones

- Contratos ejecutables: [REST MS-04](../../src/services/ms-04-ia/contracts/openapi.yaml) y [GraphQL](../../src/gateway/src/schema/agents.graphql). `GET /agents` es proyección mínima para consumidores internos; `GET /agents/{id}/availability` rechaza deshabilitados con `CONFLICT`. El Gateway exige sesión para esa proyección. `GET /admin/agents`, historial paginado y los dos `PUT` administrativos exigen contexto firmado de Administrador en MS-04 y guarda previa en Gateway. DTO cerrados; sin crear/eliminar agentes ni editar/eliminar revisiones.
- [AgentService](../../src/services/ms-04-ia/app/application/agents.py) controla validación, permisos, conflicto y publicación. `capture_for_question` es la entrada interna que 011 deberá usar al admitir una pregunta: valida disponibilidad y entrega una instantánea inmutable con política fija de Bolivia, fuentes autorizadas y revisión profesional, separada de las instrucciones editables. No es un endpoint de chat ni resuelve todavía el archivo prioritario de 007.
- [MongoAgents](../../src/services/ms-04-ia/app/adapters/outbound/mongo_agents.py) usa `agents_v1` y `agent_revisions_v1` en `MONGO_DB`, confirmación de escritura `majority`, identificadores únicos `_id` y compare-and-set del puntero. Las revisiones no enlazadas por conflicto o falla no aparecen en el historial aplicado. Cursores HMAC con separación de propósito y agente, páginas de 1 a 100 y cadena sin truncamiento. Instantes normalizados a milisegundos antes de persistir: el evento conserva fecha e identificador tras releer MongoDB.
- Preparación explícita: `python -m app.infrastructure.prepare_agents`, con `AGENTS_PREPARE=true` y `AGENT_INITIAL_MODEL` requerido. La preparación v1 no se ejecuta al arrancar ni modifica revisiones existentes. Ambos agentes iniciales se aprovisionaron en el MongoDB externo configurado, habilitados y con las tres herramientas internas. El responsable eligió `gpt-4o-mini` para este entorno; no se fija el modelo en el dominio ni se sustituye un modelo editado por el inicial.
- `OPENAI_API_KEY` se recibe como secreto del entorno de MS-04, nunca en DTO, historial ni navegador. En esta spec no se invoca OpenAI: la ejecución, las herramientas jurídicas reales y el error real de modelo inválido/no autorizado/incompatible se comprobarán en 011, sin fallback silencioso.
- [HttpAgentAudit](../../src/services/ms-04-ia/app/adapters/outbound/agent_audit.py) envía `AGENT_ACTION` a MS-01 con la credencial exclusiva `MS04_AUDIT_API_TOKEN`, contexto firmado recibido del autor, correlación y presupuesto restante. `eventId` es la revisión publicada; operaciones cerradas `AGENT_CONFIGURATION_CHANGED`, `AGENT_ENABLED`, `AGENT_DISABLED`. No envía instrucciones, modelo, herramientas ni conversaciones. Sin reintentos, cola ni rollback; credencial vacía, rechazo, fallo de red o respuesta no confirmada producen cambio aplicado/parcial.
- Angular incorpora `/admin/agentes`, formulario cerrado, confirmación y advertencia al deshabilitar el último agente. Tras conflicto o transporte incierto exige consultar estado antes de otra edición; fallar la lectura de historial no oculta el parcial. React reutiliza el selector compartido y `useAvailableAgents`, actualiza por foco/canal/sondeo y no cambia automáticamente una selección deshabilitada. No se implementan flujos de 007/011 para aparentar integración.
- Mantener stack aprobado y usar MongoDB/PyMongo existentes; no crear otro servicio de catálogo.
- OpenAI, modelo libre y herramientas internas sin MCP constan en la spec y el [ADR 0004](../../docs/decisions/0004-integraciones-minimas-del-mvp.md).
- Auditoría multiservicio reutiliza la decisión de 004; no definir una garantía distinta aquí.

## Riesgos y preguntas abiertas

- Modelo libre puede no existir o carecer de capacidad/permisos: explicar fallo sin éxito ficticio.
- Catálogo cerrado de herramientas internas: consultar datos jurídicos permitidos, listar PDF y leer texto PDF, sin notas/informes/imágenes/ERP.
- No crear servidor MCP, conectores personales, Google Drive o editor de conexiones: están diferidos.
- Revisiones con compare-and-set evitan sobrescribir una edición concurrente sin exigir réplica/transacciones MongoDB.
- Sin preguntas funcionales abiertas; el desarrollador verifica integración e historial.
- En el entorno local `OPENAI_API_KEY` y `MS04_AUDIT_API_TOKEN` quedaron vacías para que el responsable configure sus secretos fuera del repositorio. La segunda debe coincidir en MS-01 y MS-04; mientras esté vacía, cambios de agentes devuelven parcial y no se acredita un evento real consultable de extremo a extremo en 004.