# Plan: Personas

## Estado

En progreso. Plan aprobado por el responsable el 2026-11-08. Implementación propia verificada; aceptación integrada C12 pendiente de 007/008. Evidencia en [tareas](./tasks.md).

## Resumen técnico

MS-01 mantiene personas naturales/jurídicas por cuenta en PostgreSQL; React ofrece listado, búsqueda, registro y actualización mediante GraphQL. Personas es una ficha reutilizable, separada de participaciones y servicios.

Cumplir principios IV y X de la [constitución](../../docs/constitution.md). No añadir eliminación, consulta a registros oficiales, fusión de duplicados ni datos personales no aprobados.

## Diseño y componentes

- Dominio Persona: tipo natural/jurídica; nombres/apellidos o razón social; identificación vacía o con tipo/número/país completos. Tipo de documento libre; teléfono, correo y domicilio opcionales.
- Casos de uso registrar, consultar, buscar/filtrar y actualizar; repositorio propio de MS-01 y DTO limitados al alcance.
- React: listado con filtros por nombre/razón social, tipo y documento; ficha y formulario según tipo. Reutilizar [formularios y errores de 001](../001-experiencia-y-ui-compartida/plan.md).
- MS-01 valida datos obligatorios y duplicados incluso cuando no se usa la interfaz.
- No copiar roles de expedientes a la ficha ni confundir Persona con usuario autenticado.

## Flujo de datos

La identidad validada determina la cuenta. MS-01 valida la entrada, consulta/persiste solo dentro de ella y devuelve la ficha. Al actualizar, excluye la propia ficha de la detección de duplicados.

La UI conserva valores ante rechazo y muestra errores en campos identificados. Personas sin identificación siguen disponibles para 008 y 014; completar identificación posteriormente no cambia su identificador.

## Interfaces y contratos

GraphQL y REST propietario para registro, detalle, búsqueda y actualización conforme a [002](../002-gateway-y-contratos-base/plan.md). La cuenta no es argumento de autoridad.

La búsqueda es paginada y combina filtros aprobados. Nombre/razón social y número de documento se buscan por subcadena literal sin distinguir mayúsculas/minúsculas; `%` y `_` no son comodines. El documento se conserva como texto. Orden estable por UUID con cursor ligado a cuenta y filtros; página de 1 a 100 fichas (25 por defecto). No exponer operaciones de eliminar.

Contrato de consulta/validación para MS-03 en 014: permite comprobar existencia y pertenencia de contratante sin acceso directo al esquema `juridico`. Los errores de duplicado se limitan a la cuenta solicitante.

## Persistencia y migraciones

Tabla Persona en `juridico`, con identificador, cuenta y campos según tipo; usar migraciones de MS-01 acordadas en [003](../003-autenticacion-y-acceso/plan.md).

Proponer una restricción única de base por cuenta + tipo de documento + número + país cuando exista identificación completa, además de validación del caso de uso. Así se impiden duplicados concurrentes, no solo los detectados antes de insertar. La misma identificación en otra cuenta es válida.

Rechazar identificación parcial en aplicación y restringirla en base. Normalizar espacios exteriores y comparación de mayúsculas/minúsculas coherentemente en validación/índice; conservar significado y ceros iniciales. La unicidad solo aplica a ternas completas y excluye la propia ficha al actualizar.

Indexar búsquedas necesarias y pertenencia por cuenta según consultas reales. No duplicar tablas en otros servicios ni añadir relaciones entre esquemas.

## Seguridad y privacidad

MS-01 exige rol Abogado y limita consultas/escrituras a su cuenta. El Administrador no accede a fichas. Identificadores ajenos no revelan nombres ni existencia privada.

Mensajes de unicidad y registros no contienen datos de otra cuenta ni documentos completos. Los servicios consumidores solo reciben la proyección necesaria.

## Observabilidad y manejo de errores

Traducir faltantes a errores de validación y violaciones de unicidad a la categoría acordada en 002. La restricción de base tiene manejo explícito, no error SQL expuesto.

Registrar operación/categoría de forma segura. Fallos de lectura no devuelven listas vacías y fallos de escritura no muestran éxito.

## Verificación

El desarrollador verifica sin crear archivos de testing; compilar componentes afectados y comprobar UI, API directa y persistencia.

| Criterio de la spec | Comprobación |
|---|---|
| 1. Natural incompleta | Registrar sin nombres y luego sin apellidos: rechazo con campo correspondiente. |
| 2. Jurídica incompleta | Registrar sin razón social: rechazo. |
| 3. Sin identificación | Registrar con datos obligatorios y consultar ficha disponible. |
| 4. Duplicado | Registrar/actualizar con misma terna en misma cuenta por UI y API directa; rechazo. Comprobar también solicitudes concurrentes. |
| 5. Terna diferente | Mismo número con otro país o tipo: permitido. |
| 6. Cuenta diferente | Misma identificación en dos cuentas: permitido sin revelar fichas ajenas. |
| 7. Completar después | Añadir identificación a ficha existente: mismo identificador y datos actualizados. |
| 8. Búsqueda | Probar nombre, razón social, documento y tipo con varias fichas, filtros combinados y paginación. |
| 9. Aislamiento | A lista/busca/consulta/modifica: ninguna ficha de B accesible. |
| 10. Administrador | Invocar consulta como Administrador: no autorizado. |
| 11. Grupo de identificación | Parcial rechazada; teléfono, correo y domicilio omitidos siguen válidos. |
| 12. Edición independiente | Persona solo en expedientes Cerrados/Archivados sigue editable sin cambiar participaciones. |

La edición de Persona es independiente del estado de expedientes y muestra ficha vigente, sin snapshots por participación. La implementación actualiza exclusivamente `juridico.people`, sin consultas ni modificaciones de expedientes o participaciones. Esa separación no acredita por sí sola C12: se mantiene pendiente la comprobación con vínculos reales de 007/008. Las verificaciones ejecutadas y sus límites están en tareas.

## Decisiones

- Reutilizar MS-01, migraciones y patrones existentes. La unicidad incluye cuenta y terna, no un documento global.
- Conservar grafía del documento y recortar espacios exteriores en aplicación. La comparación autoritativa y el índice usan las mismas expresiones PostgreSQL `lower(btrim(campo))`; no convertir números, eliminar ceros ni equiparar abreviaturas.
- `/people/selections` y `/people/{id}/selection` devuelven solo `id`, `type` y `displayName`; la segunda permite validar una selección concreta sin documentos ni contacto. Detalle y actualización verifican pertenencia sin aceptar cuenta como argumento. MS-03 podrá consumir estos contratos con contexto firmado en 014.
- V4 crea `juridico.people`, restricciones por tipo/identificación, índice único por cuenta/terna y páginas por cuenta/tipo/UUID. Se aplica con preparación explícita existente, no al arrancar. Las escrituras concurrentes se resuelven con la restricción y error `CONFLICT`, sin reintentos automáticos.
- Errores `VALIDATION`/`CONFLICT` incluyen campos seguros. React conserva valores y bloquea reenvío tras resultado incierto hasta consultar el estado; un fallo de lectura nunca se presenta como vacío. No se añadieron dependencias ni archivos de testing al repositorio.
- No crear ADR por CRUD simple; registrar aquí las respuestas funcionales y actualizar la spec tras aprobación si cambian sus reglas.

## Riesgos y preguntas abiertas

- Tipo de documento libre puede escribirse de varias formas: aplicar normalización mínima coherente sin prometer equivalencia semántica de abreviaturas.
- Los datos de contacto son privados; no enviarlos al informe para cliente de 012.
- No quedan preguntas funcionales abiertas.
- Coordinar proyecciones con 008 y 014 sin duplicar autoridad de identidad.