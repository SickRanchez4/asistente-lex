# Plan: Documentos y fotografías

## Estado

Lista. Plan aprobado por el responsable el 2026-11-08; implementación y verificación pendientes.

## Resumen técnico

MS-02 gestiona metadatos en PostgreSQL `documental` y binarios mediante un puerto de almacenamiento. React adjunta y visualiza documentos/fotografías existentes mediante la fachada GraphQL; MS-02 consulta MS-01 para validar pertenencia y estado.

Aplicar principios IV, V, VIII, X y XI de la [constitución](../../docs/constitution.md). No capturar cámara, aceptar audio/video, procesar imágenes con IA ni confundir informes con documentos.

## Diseño y componentes

- Entidad con cuenta, expediente, clave interna, nombre original, formato, tamaño, fecha de carga y clasificación Escrito/Resolución/Prueba/Otro. Sin descripción adicional.
- Casos de uso adjuntar un archivo, consultar/buscar/filtrar por metadatos, visualizar, reclasificar y eliminar en Abierto; puertos de metadatos/archivos/expediente.
- Adaptador local al volumen de archivos definido en [000](../000-plataforma-base/plan.md); no añadir un servicio de objetos en local.
- Adaptadores HTTP de Next.js delegan en aplicación; leer las guías de la versión instalada antes de implementar, conforme a las instrucciones de MS-02.
- React: sección de archivos del expediente, selección desde dispositivo sin captura, formulario de metadatos/clasificación, búsqueda y visualizador de formatos admitidos. Reutilizar [001](../001-experiencia-y-ui-compartida/plan.md).

## Flujo de datos

1. Cargar un PDF/JPEG/PNG por GraphQL Base64, máximo 10.485.760 bytes antes de codificar y 60 segundos de transferencia configurable; MS-02 valida identidad, expediente propio y Abierto en MS-01.
2. Validar formato/tamaño y contenido permitido; escribir en ubicación temporal no visible.
3. Completar y comprobar el binario, promoverlo a clave interna definitiva y registrar metadatos en una transacción local.
4. Solo exponerlo cuando archivo y metadatos estén confirmados. Si falla un paso, informar error y limpiar los restos identificados sin borrar archivos válidos.
5. Lectura en cualquier estado exige autorización de archivo/expediente. Reclasificar vuelve a comprobar Abierto en MS-01 antes de guardar.

PostgreSQL y archivos no comparten transacción. Un fallo después de escribir puede dejar un binario huérfano no publicable; implementar limpieza identificable e idempotente limitada a cargas fallidas. No informar éxito por recibir bytes ni por crear solo metadatos.

Si MS-01 falla, rechazar la escritura; no usar un estado cacheado como autorización. La comprobación remota valida la elegibilidad del propietario, sin prometer atomicidad global con una transición simultánea; respetar la marca técnica de archivo de 007.

Eliminar requiere confirmación y validación de Abierto. Ocultar/restringir primero la disponibilidad mediante una marca técnica propia, borrar binario y retirar metadatos cuando se confirme; si falla, conservar información técnica suficiente para reintentar limpieza e informar resultado parcial. No exponer un enlace a restos ni afirmar que el archivo se eliminó por ocultarlo. No hay reemplazo. Informes inmutables y copias offline previas no se modifican automáticamente.

## Interfaces y contratos

- GraphQL para adjuntar, listar/buscar, visualizar, reclasificar y eliminar; binarios como Base64 según [002](../002-gateway-y-contratos-base/plan.md).
- REST MS-01 para estado y pertenencia; REST MS-02 para archivos autorizados consumidos por 011, 012 y 013.
- Puerto de almacenamiento: escribir/completar, leer y eliminar por clave interna; caso de uso autoriza borrado funcional en Abierto y limpieza técnica. No exponer rutas de disco.
- La proyección de fuentes distingue Documentos/Fotografías de Informes guardados. No incorporar informes a esta colección o listado.
- Formatos PDF/JPEG/PNG, límite 10 MiB binarios, clasificación cerrada y visualización segura. Buscar solo nombre/clasificación/formato/fecha, sin contenido u OCR; texto PDF extraíble para IA es una capacidad de lectura autorizada distinta de búsqueda.

## Persistencia y migraciones

Metadatos en `documental`, sin relaciones SQL al esquema de MS-01; expediente/cuenta son referencias contractuales verificadas. Binarios en `FILE_STORAGE_PATH`, usando claves generadas, nunca el nombre recibido como ruta.

**Migraciones aprobadas con el plan:** SQL versionado ejecutado mediante el cliente PostgreSQL existente, con registro de versiones y ejecución controlada por MS-02; si requiere herramienta adicional, justificarla antes de adoptarla. Reutilizar este mecanismo en 012.

Conservar TLS y selección de esquema de 000. Documentar consistencia archivo/metadatos y limpieza de temporales; no crear tareas de eliminación masiva ni cambiar almacenes aprobados.

## Seguridad y privacidad

Autorizar lecturas y escrituras por propietario; enlaces directos nunca permiten obtener el binario sin autorización. No servir el directorio de almacenamiento como carpeta pública.

Validar bytes y MIME/extensión según formatos aprobados; impedir traversal y ejecución de archivos recibidos. Visualizar contenido no confiable en un contexto seguro apropiado al formato, no insertarlo como HTML del frontend.

No registrar archivos, metadatos personales ni rutas internas. Conservar fotografías originales/EXIF sin extraer ni mostrar esos datos; avisar que descargarlas mantiene metadatos. No transformar originales ni procesarlos con IA.

## Observabilidad y manejo de errores

Categorías seguras de validación, no autorizado, conflicto de estado e indisponibilidad según 002. Registrar fase de carga y referencia técnica, no nombre/contenido privado.

Carga interrumpida no aparece disponible. Un archivo por operación, sin lotes. La eliminación puede quedar técnicamente incompleta: informar su resultado sin éxito global ni acceso al binario pendiente de limpieza.

## Verificación

El desarrollador verifica sin crear archivos de testing, usando compilación/tipos existentes e integración real.

| Criterio de la spec | Comprobación |
|---|---|
| 1. Carga válida | En Abierto, documento y fotografía admitidos: binario íntegro, metadatos y clasificación visibles. |
| 2. Otros estados | Cargar por API en Cerrado/Archivado: rechazo por MS-02. |
| 3. MS-01 caído | Simular indisponibilidad: no carga confirmada ni éxito. |
| 4. Interrupción | Cortar transferencia/fallar persistencia: incompleto no visible y restos técnicos tratados. |
| 5. Archivo inválido | Probar formato prohibido, tipo incoherente y tamaño sobre límite aprobado: motivo explícito. |
| 6. Búsqueda | Filtros por metadatos aprobados: coincidencias correctas y paginadas. |
| 7. Visualización | Abrir cada formato admitido con autorización y comprobar visualización dentro de la aplicación. |
| 8. Clasificación | Actualizar en Abierto; rechazo backend en Cerrado/Archivado. |
| 9. Aislamiento/enlace | A solicita archivo de B o accede sin identidad a enlace directo: rechazo sin bytes. |
| 10. Alcance de carga | Sin cámara y sin audio/video en UI; backend también los rechaza. |
| 11. Formato/tamaño | Rechazo de más de 10.485.760 bytes o tipos no PDF/JPEG/PNG, aunque su extensión simule permiso. |
| 12. Eliminar | Confirmar en Abierto: borrado real; cancelar no ejecuta; Cerrado/Archivado rechazan. Fallas no se reportan como éxito. |
| 13. Original | Descarga autorizada de fotografía conserva bytes; interfaz no expone EXIF. |

Comprobar fallos entre binario y metadatos, y consumo autorizado por IA/informes/offline al integrar sus specs. Registrar verificaciones pendientes en tareas.

## Decisiones

- Mantener [almacenamiento local aprobado](../../docs/decisions/0002-monorepo-y-entorno-local.md) y [propiedad de datos](../../docs/decisions/0003-persistencia-por-servicio.md).
- Registrar en `decisions/` estrategia significativa de consistencia de archivos/metadatos y herramienta de migraciones; transporte binario reutiliza la decisión de 002.
- Sin búsqueda por contenido ni reemplazo; la eliminación en Abierto sí está aprobada. El desarrollador verifica los criterios sin crear archivos de testing.

## Riesgos y preguntas abiertas

- Base64 aumenta volumen: límites de cuerpo y de bytes decodificados deben ser coherentes.
- Borrado no elimina copias previamente descargadas; el usuario debe conocer el alcance local/remoto.
- Sin preguntas funcionales abiertas. La verificación queda a cargo del desarrollador.
- Coordinar verificación de estado concurrente con 007, sin prometer una transacción entre servicios.