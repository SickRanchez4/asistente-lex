# Plan: Participantes

## Estado

En progreso. Plan aprobado por el responsable el 2026-11-08. Implementación propietaria disponible y C01–C09 verificadas; aceptación de C10 bloqueada hasta disponer de servicios reales de 014.

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

### Resultado de verificación

- MS-01 compilado con JDK 25; Gateway, Abogado y Shell construidos con Node 26. Tipos de Gateway, Abogado, Shell y Admin y contratos OpenAPI/SDL comprobados. Sin nuevas dependencias de aplicación.
- 75 comprobaciones con servicio y PostgreSQL reales: roles, autorización vigente, aislamiento, versiones, duplicados concurrentes, historial atómico con rollback forzado, FK de ambos extremos, paginación y cursores ligados al expediente. El bloqueo de la fila de expediente serializa cierre y escritura en ambos órdenes, sin cambios posteriores a un cierre ganador.
- 89 comprobaciones REST/GraphQL reales: proyecciones mínimas, `no-store`, errores seguros, paginación 25+2, altas/cambios/desvinculación, consulta en los tres estados y rechazo de las tres escrituras en Cerrado/Archivado. Se corrigió el parámetro obligatorio ausente para devolver VALIDATION/400, no indisponibilidad. Persona natural y jurídica conservadas tras desvincular; nombres vigentes sin alterar roles ni relaciones.
- Navegador: selector real paginado 25+6 y filtrado, selección conservada al paginar, Otro obligatorio, alta/cambio y confirmación de desvinculación. Cancelar no envía mutación; confirmar envía una. Cierre concurrente real conserva el formulario y bloquea reenvío hasta consultar. Fallos controlados de lectura y transporte distinguen vacío e incertidumbre; interceptores retirados. Escape y retorno de foco comprobados.
- Capturas y comprobaciones a 1366×900 y 390×844: marca cargada, formulario y diálogo dentro del viewport, sin desbordamiento de página; la tabla desplaza dentro de su contenedor móvil.
- V6 aplicada mediante preparación explícita. Cuentas sintéticas, participaciones, historial, expedientes, personas y sesiones eliminados; demos conservadas. Verificadores temporales fuera del repositorio, sin archivos de testing ni informes adicionales versionados. Sin llamadas a OpenAI, cambios de secretos, commit ni push.
- Archivado se comprobó como estado persistido con fixture controlado sin conversaciones: acredita reglas de 008, no el protocolo de archivo/borrado de 007/011. C10 queda abierto: no hay servicios reales de 014 ni tablas o simulaciones de contratación creadas para aparentar su aceptación.

## Decisiones

- Roles contractuales: `REPRESENTED_PERSON`, `COUNTERPARTY`, `WITNESS`, `REPRESENTATIVE`, `OTHER`. Otro exige detalle recortado no vacío (máximo 2000 caracteres, sin controles); cambiar a otro rol elimina ese detalle contextual, nunca la ficha Persona.
- REST en `/cases/{caseId}/participants` (GET/POST) y `/{id}` (PUT/DELETE), GraphQL equivalente y proyección mínima `PersonSelection`. Páginas de 1 a 100 por UUID con cursor ligado a cuenta/expediente. Sin API ni pantalla de historial interno.
- Cada escritura bloquea primero la fila del expediente propio con `FOR UPDATE`, comprueba Abierto y guarda relación/historial en una transacción. Comparte exclusión con las transiciones de 007 sin mantener bloqueos durante REST. Cambiar/desvincular requiere versión de participación, independiente de la versión de ficha del expediente.
- Migración V6: participaciones e historial de cambios jurídicos propios de MS-01; claves compuestas garantizan pertenencia de Persona y expediente a la cuenta. Restricción única persona/expediente. El historial conserva antes/después, operación, fecha y autor aunque se retire la relación; sin FK que lo borre en cascada.
- Mantener participación separada de ficha y contratación; no unificar conceptos.
- No crear ADR para la gestión simple. Registrar respuestas funcionales y actualizar la spec tras aprobación.

## Riesgos y preguntas abiertas

- No confundir vinculación jurídica con contratación: se gestionan por separado.
- Una participación tiene un solo rol modificable; Otro requiere detalle. No quedan preguntas funcionales abiertas.