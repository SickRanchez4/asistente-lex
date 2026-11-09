# Plan: Actuaciones y notas

## Estado

Lista. Plan aprobado por el responsable el 2026-11-08; implementación y verificación pendientes.

## Resumen técnico

MS-01 mantiene Actuación jurídica y Nota personal como entidades separadas en PostgreSQL. React presenta cronología y notas en secciones distintas; lectura en cualquier estado y escrituras solo en Abierto.

Aplicar principios IV y X de la [constitución](../../docs/constitution.md). No añadir eliminación ni mezclar estrategia/notas con información destinada al cliente.

## Diseño y componentes

- Actuación: expediente/cuenta, tipo cerrado (Audiencia, Presentación de escrito, Resolución, Notificación u Otra), fecha civil hoy/pasada de Bolivia y descripción; correcciones con valores anteriores, fecha y autor.
- Nota personal: expediente/cuenta, contenido vigente y fecha, sin historial de versiones; identificada privada y excluida de toda IA/informe. Estrategia interna se registra solo aquí.
- Casos de uso de registrar, consultar/filtrar y corregir actuaciones; registrar, buscar/consultar y corregir notas.
- React: cronología ordenada por fecha, filtros tipo/período y formulario de actuación; lista/búsqueda y formulario de notas con identificación privada.
- Reutilizar [001](../001-experiencia-y-ui-compartida/plan.md) para validación y solo lectura. La consulta offline se implementa en 013, no mediante llamadas remotas sin conexión aquí.

## Flujo de datos

MS-01 valida cuenta y estado del expediente. Al corregir actuación, guarda nuevo valor e historial en una transacción local; no sobrescribe la única evidencia anterior.

Cronología obtiene solo actuaciones, con orden estable por fecha y desempate técnico. Notas tienen contrato separado y nunca se incorporan a IA/informes, ni siquiera como fuente opcional en esta fase.

La generación para cliente usa una proyección autorizada sin notas desde su origen, conforme a [012](../012-informes-juridicos/plan.md). Marcar privacidad es necesario, pero no basta si el consumidor ignora la marca.

## Interfaces y contratos

GraphQL y REST separados conforme a [002](../002-gateway-y-contratos-base/plan.md). Actuación usa fecha civil sin desplazamiento horario y validación de no futura respecto de Bolivia.

Filtros de actuaciones por tipo y rango de fechas; búsqueda de notas con alcance aprobado. Respuestas de notas indican contenido privado mediante un tipo/campo contractual explícito acordado.

Contratos de 011/012/013 mantienen separación: offline incluye notas para propietario; chat y todos los informes las excluyen desde el origen.

## Persistencia y migraciones

Tablas propias de actuaciones, historial de correcciones y notas en `juridico`, vinculadas a expediente/cuenta. Usar migraciones de MS-01 de [003](../003-autenticacion-y-acceso/plan.md).

Indexar expediente/fecha/tipo para cronología y filtros necesarios. Modificación e historial de actuación se guardan juntos; control local de concurrencia evita escritura tras un cierre.

Sin historial de notas ni administración de tipos. No guardar notas en auditoría administrativa, proveedor IA o logs.

## Seguridad y privacidad

Solo Abogado propietario; rechazar Administrador y cuentas ajenas. Mantener notas fuera de registros, mensajes y contenidos para terceros.

No enviar notas a proveedores IA en esta fase. Estrategia solo en notas; el contrato de cliente de 012 restringe fuentes por lista permitida, no por un filtro del navegador.

## Observabilidad y manejo de errores

Comunicar campos incompletos, conflicto por estado y fallos de persistencia según 002. Conservar texto de formulario ante error sin registrarlo.

Una búsqueda fallida no se representa como ausencia de actuaciones/notas. El historial de correcciones no admite edición que borre trazabilidad.

## Verificación

Responsabilidad del desarrollador, sin crear archivos de testing. Comprobar UI, contratos directos y persistencia.

| Criterio de la spec | Comprobación |
|---|---|
| 1. Cronología | Registrar fechas desordenadas: presentación ordenada establemente por fecha. |
| 2. Obligatorios | Omitir tipo, fecha o descripción: rechazo con faltantes. |
| 3. Corrección | Corregir en Abierto: actual visible y anteriores conservados con fecha/autor. |
| 4. Filtros | Tipo y rango individual/combinado: solo coincidencias, incluidos límites acordados. |
| 5. Nota separada | Registrar nota: fecha visible en notas y ausencia en cronología. |
| 6. Escritura restringida | Registrar/corregir ambas entidades por API en Cerrado/Archivado: rechazo. |
| 7. Consulta | Actuaciones/notas propias consultables con conexión en los tres estados. |
| 8. Contrato privado | Revisar respuesta de notas y consumidor: identificación privada explícita y exclusión para cliente en 012. |
| 9. Aislamiento | A intenta leer registros de B: rechazo sin texto ajeno. |
| 10. Administrador | Consulta directa: no autorizado. |
| 11. Fecha futura | Registrar/corregir futura: rechazo backend según fecha de Bolivia. |
| 12. Notas y versiones | Ningún contexto IA contiene notas; corregir nota no crea historial de versiones. |

Verificar también ausencia de contenido de notas en errores/logs. Marcar pendientes dependientes de 011/012/013 en las tareas.

## Decisiones

- Separar entidades y contratos; reutilizar las herramientas de MS-01, sin ADR por CRUD ordinario.
- Registrar respuestas de privacidad y fechas antes de integrar consumidores; una decisión de uso de datos por IA requiere coordinación con 011 y aprobación.

## Riesgos y preguntas abiertas

- El usuario debe registrar estrategia solo en notas; una etiqueta no puede detectar automáticamente texto privado escrito en otro lugar.
- La proyección para cliente de 012 excluye además documentos e identificaciones/contacto. No quedan preguntas funcionales abiertas.