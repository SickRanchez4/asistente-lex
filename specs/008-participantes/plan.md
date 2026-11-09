# Plan: Participantes

## Estado

Lista. Plan aprobado por el responsable el 2026-11-08; implementación y verificación pendientes.

## Resumen técnico

MS-01 gestiona Participación como vínculo contextual entre una persona y un expediente de la misma cuenta. React ofrece gestión dentro del expediente mediante GraphQL y [patrones de 001](../001-experiencia-y-ui-compartida/plan.md).

Aplicar principios IV y X de la [constitución](../../docs/constitution.md). No registrar personas aquí, duplicar sus fichas ni asociar automáticamente participantes a contratantes de servicios.

## Diseño y componentes

- Participación contiene expediente, persona, rol y detalle obligatorio para Otro. Roles: Persona defendida o representada, Contraparte, Testigo, Representante y Otro. Una participación por persona/expediente.
- Casos de uso vincular, listar, cambiar rol y desvincular; validación y repositorio en MS-01.
- React muestra personas registradas de la cuenta para selección, rol contextual y lista de participantes. Edición solo Abierto; consulta en cualquier estado.
- Desvincular elimina la relación, no la persona. Informar esa consecuencia según el patrón de acciones destructivas de 001.
- Registrar cambios de participación en el historial jurídico pertinente, separado de auditoría administrativa y conversaciones.

## Flujo de datos

MS-01 obtiene cuenta de identidad, comprueba expediente/persona propios, estado Abierto y compatibilidad aprobada; modifica participación y registra el cambio en una transacción local.

Consultar participantes no depende de que el expediente esté Abierto. La ficha se obtiene desde Persona, sin reescribirla al cambiar el rol. Una misma persona puede participar con roles distintos en otros expedientes.

## Interfaces y contratos

GraphQL y REST de participantes conforme a [002](../002-gateway-y-contratos-base/plan.md). Reutilizar [006](../006-personas/plan.md) para búsqueda de personas y [007](../007-expedientes-y-ciclo-de-vida/plan.md) para estado.

Roles y multiplicidad quedan cerrados en la spec. Incompatibilidad es duplicar la misma persona/expediente, además de existencia/pertenencia/estado; no añadir reglas entre roles. Ausencia y pertenencia ajena no revelan información privada.

Contratante de 014 no necesita participación. Desvincular una participación en Abierto no bloquea ni altera Persona o servicios, aunque sea contratante. No exponer historial interno por API del Abogado.

## Persistencia y migraciones

Tabla de participaciones y registro de cambios en `juridico`, con relaciones a personas/expedientes propios. Usar migraciones de MS-01 de [003](../003-autenticacion-y-acceso/plan.md).

Restricción única persona/expediente; garantizar pertenencia de ambos extremos y control concurrente con estado dentro de la transacción local.

Desvincular preserva Persona y el historial requerido. No crear tablas en MS-03 ni relaciones entre esquemas.

## Seguridad y privacidad

Exigir Abogado propietario en todas las lecturas y cambios. Administrador y otras cuentas no acceden; el selector no revela personas ajenas.

No registrar nombres/documentos de personas ni contenido jurídico en errores. Verificar todos los identificadores recibidos, no solo el del expediente.

## Observabilidad y manejo de errores

Errores de validación, inexistencia, autorización y conflicto de estado/relación según 002; no modificar parcialmente una relación. UI conserva selección y muestra motivo si el expediente ya no admite escritura.

Historial jurídico y modificación se guardan juntos; si falla la transacción no informar éxito. El historial es interno y no dispone de pantalla/consulta para Abogado en esta fase.

## Verificación

El desarrollador valida sin crear archivos de testing ni documentos adicionales.

| Criterio de la spec | Comprobación |
|---|---|
| 1. Vincular | Expediente Abierto y persona propia: participante con rol correcto e historial del cambio. |
| 2. Rol contextual | Misma persona en dos expedientes con distintos roles: roles independientes. |
| 3. Actualizar rol | En Abierto, cambio efectivo sin alterar ficha de Persona. |
| 4. Desvincular | Relación desaparece; persona intacta y reutilizable. |
| 5. Solo Abierto | API directa de vincular/cambiar/desvincular en Cerrado y Archivado: rechazo. |
| 6. Consultar | Lista accesible en los tres estados con roles correctos. |
| 7. Persona inválida/ajena | Vinculación rechazada sin información de otra cuenta. |
| 8. Duplicado | Segunda participación de la misma persona/expediente rechazada. |
| 9. Otro | Rol Otro requiere descripción; los roles fuera del catálogo se rechazan. |
| 10. Contratante | Desvincular en Abierto conserva ficha y servicios del contratante. |

Comprobar además acceso de otra cuenta/Administrador, relaciones incompatibles aprobadas y concurrencia con cierre de expediente. Registrar pendientes en tareas.

## Decisiones

- Mantener participación separada de ficha y contratación; no unificar conceptos.
- No crear ADR para la gestión simple. Registrar respuestas funcionales y actualizar la spec tras aprobación.

## Riesgos y preguntas abiertas

- No confundir vinculación jurídica con contratación: se gestionan por separado.
- Una participación tiene un solo rol modificable; Otro requiere detalle. No quedan preguntas funcionales abiertas.