# Plan: Configuración de agentes

## Estado

Lista. Plan aprobado por el responsable el 2026-11-08; implementación y verificación pendientes.

## Resumen técnico

MS-04 mantiene exactamente Penalista y Civilista en MongoDB, con configuración vigente, disponibilidad e historial. Angular administra instrucciones, modelo OpenAI como texto libre, herramientas internas de catálogo y habilitación mediante GraphQL. Los consumidores consultan disponibilidad mediante contrato propietario.

Aplicar principios IV, VIII y X de la [constitución](../../docs/constitution.md). No añadir agentes, entrenar modelos, ofrecer creación/eliminación ni desarrollar chat aquí.

## Diseño y componentes

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

- Mantener stack aprobado y usar MongoDB/PyMongo existentes; no crear otro servicio de catálogo.
- OpenAI, modelo libre y herramientas internas sin MCP constan en la spec y el [ADR 0004](../../docs/decisions/0004-integraciones-minimas-del-mvp.md).
- Auditoría multiservicio reutiliza la decisión de 004; no definir una garantía distinta aquí.

## Riesgos y preguntas abiertas

- Modelo libre puede no existir o carecer de capacidad/permisos: explicar fallo sin éxito ficticio.
- Catálogo cerrado de herramientas internas: consultar datos jurídicos permitidos, listar PDF y leer texto PDF, sin notas/informes/imágenes/ERP.
- No crear servidor MCP, conectores personales, Google Drive o editor de conexiones: están diferidos.
- Revisiones con compare-and-set evitan sobrescribir una edición concurrente sin exigir réplica/transacciones MongoDB.
- Sin preguntas funcionales abiertas; el desarrollador verifica integración e historial.