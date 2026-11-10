# Consistencia de archivos y migraciones de MS-02

## Estado

Decisión de implementación del plan aprobado de 010, 2026-11-10. No cambia almacenes ni introduce transacciones distribuidas.

## Decisión

- PostgreSQL `documental` mantiene metadatos y estado técnico `STAGING`, `AVAILABLE` o `DELETE_PENDING`. Las consultas nunca publican STAGING; fuentes solo incluyen AVAILABLE. Un borrado pendiente puede aparecer como metadato con reintento, nunca como enlace o contenido disponible.
- Cada carga usa un UUID interno y un temporal exclusivo; se escribe y sincroniza, se promueve dentro del mismo volumen y se confirma disponibilidad en SQL. Un fallo limpia solo esa clave y retira el registro STAGING si confirma limpieza. Una terminación abrupta conserva la referencia técnica para limpieza individual posterior.
- Antes de borrar bytes se persiste DELETE_PENDING; solo se retiran metadatos después de confirmar el borrado. Fallo conserva referencia y comunica `deleted=false, cleanupPending=true`. El reintento exige autorización vigente y Abierto. No modifica copias descargadas ni informes.
- Operaciones sobre un archivo se serializan con bloqueo SQL de su fila. No se mantienen transacciones SQL durante llamadas a MS-01; se valida pertenencia/estado/marca de archivo inmediatamente antes de escribir, sin prometer atomicidad con un cierre remoto.
- SQL versionado y checksums mediante `pg` existente, registro de versiones y bloqueo transaccional durante preparación explícita. Sin nueva herramienta, arranque migratorio, tablas en otro esquema ni FK entre servicios.
- Limpieza técnica explícita por un ID: solo STAGING antiguo (más de 15 minutos, superior al plazo de transferencia) o DELETE_PENDING. Nunca recorre/elimina cargas válidas ni ejecuta borrado masivo.
- Validación con Sharp y PDF.js; fotografías originales nunca se reescriben. Extracción PDF autorizada sin OCR con máximo 200000 caracteres y estado explícito sin texto parcial al exceder. Sin texto no equivale a analizado. Sharp conserva su límite predeterminado de descompresión; no se extrae ni muestra EXIF en la interfaz.

## Alternativas y consecuencias

Publicar antes de confirmar ambos almacenes permitiría archivos inexistentes; borrar metadatos primero impediría identificar restos. Un almacén de objetos o una cola añadirían infraestructura fuera del plan. La alternativa elegida conserva restos identificables, no garantiza ausencia de huérfanos después de un corte y exige limpieza explícita por referencia.