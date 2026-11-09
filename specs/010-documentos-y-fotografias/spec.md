# Documentos y fotografías

## Estado

Lista. Aprobada por el responsable el 2026-11-08; implementación y verificación pendientes.

## Fuente y trazabilidad

- Especificación integral: [Asistente Lex](../../docs/Asistente_Lex_Especificacion_Integral.md), secciones 3.1 (modelo de dominio: DocumentoFotografia), 3.2 (almacenamiento de archivos) y 6.3 (coordinación entre servicios); requisitos RF-011 y RF-012; caso de uso CU-07; reglas RN-01, RN-07 y RN-11; requisitos RNF-07, RNF-11 y RNF-15.
- Constitución: [principios IV, VIII, X y XI](../../docs/constitution.md).

## Contexto y problema

Los expedientes necesitan documentos y fotografías que el abogado ya tiene: escritos, resoluciones, pruebas o imágenes. Estos archivos son además fuente para la IA, los informes y las descargas offline.

Los archivos los administra MS-02, pero el estado del expediente que autoriza adjuntarlos lo decide MS-01. Se necesita gestionar archivos y metadatos respetando esa autoridad y sin dejar cargas incompletas como si fueran válidas.

## Objetivos

- Adjuntar documentos y fotografías existentes a expedientes Abiertos.
- Registrar metadatos y clasificación de cada archivo.
- Consultar, filtrar, buscar y visualizar archivos autorizados.
- Actualizar la clasificación mientras el expediente está Abierto.
- Eliminar archivos con confirmación únicamente mientras el expediente está Abierto, sin reemplazo.
- Exponer los archivos a las capacidades que los consumen.

## No objetivos

- Capturar fotografías con la cámara del dispositivo (RN-11).
- Adjuntar audio o video (RN-11).
- Procesar imágenes con modelos visuales (fuera del MVP).
- Gestionar informes guardados, que son una entidad distinta (spec 012).
- Consultar archivos sin conexión (spec 013).

## Usuarios y escenarios

- Como abogado, quiero adjuntar un documento o una fotografía existente a un expediente, para tener toda la información del caso en un lugar.
- Como abogado, quiero clasificar mis archivos y buscarlos por sus metadatos, para encontrarlos rápidamente.
- Como abogado, quiero visualizar un archivo desde la aplicación, para consultarlo sin descargarlo manualmente.

## Requisitos

### Funcionales

- El abogado adjunta documentos y fotografías preexistentes de su dispositivo a un expediente, con conexión.
- Solo se admiten PDF, JPEG y PNG, con máximo 10 MiB de binario por archivo (10.485.760 bytes). Una operación carga un archivo, codificado como Base64 mediante GraphQL según la spec 002.
- Al recibir la carga, MS-02 consulta a MS-01 que el expediente pertenece a la cuenta del abogado y que está Abierto.
- MS-02 rechaza la carga si:
  - El expediente no está Abierto o no pertenece al abogado.
  - MS-01 no responde.
  - El archivo es inválido.
- Cada archivo se registra con sus metadatos y su clasificación.
- Los metadatos son nombre original, formato, tamaño binario y fecha de carga, obtenidos automáticamente. La clasificación obligatoria pertenece al catálogo Escrito, Resolución, Prueba y Otro; no se añade descripción.
- MS-02 guarda el contenido binario en almacenamiento de archivos u objetos, y sus metadatos en su propio almacén.
- Una carga interrumpida o fallida no deja un archivo visible como disponible.
- El abogado consulta, filtra y busca archivos por sus metadatos, en cualquier estado del expediente.
- La búsqueda se limita a nombre, clasificación, formato y fecha de carga, sin búsqueda de contenido ni OCR.
- El abogado visualiza los documentos y fotografías autorizados desde la aplicación.
- El abogado actualiza la clasificación con conexión y solo mientras el expediente está Abierto.
- El abogado elimina un archivo con conexión solo en Abierto, previa confirmación irreversible; MS-02 valida estado/pertenencia en MS-01. No hay reemplazo. Un fallo de borrado se comunica sin éxito global ni asumir que se revirtió.
- Se conservan los bytes originales de fotografías, incluidos EXIF, sin extraerlos ni mostrarlos en la interfaz. Una descarga autorizada conserva esos metadatos.
- MS-02 expone mediante contratos los archivos de un expediente a las capacidades autorizadas: IA (011), informes (012) y descargas offline (013).
- Los archivos pertenecen a la cuenta del abogado. No pueden obtenerse sin autorización, tampoco mediante enlaces directos.

### No funcionales

- Privacidad: los archivos y sus metadatos no aparecen en registros ni en mensajes de error.
- Coordinación: ninguna carga se informa como exitosa si el archivo o sus metadatos no quedaron registrados.
- Autoridad de reglas: MS-01 decide el estado del expediente; MS-02 no lo infiere por su cuenta.

## Criterios de aceptación

- [ ] Dado un expediente Abierto, cuando el abogado adjunta un documento o fotografía válidos, entonces queda registrado con sus metadatos y clasificación.
- [ ] Dado un expediente Cerrado o Archivado, cuando se intenta adjuntar un archivo, entonces MS-02 lo rechaza aunque la solicitud no pase por la interfaz.
- [ ] Dado MS-01 no disponible, cuando se intenta adjuntar un archivo, entonces la carga se rechaza y no se informa éxito.
- [ ] Dada una carga interrumpida, cuando el abogado consulta los archivos del expediente, entonces el archivo incompleto no aparece como disponible.
- [ ] Dado un archivo inválido, cuando se intenta adjuntar, entonces se rechaza indicando el motivo.
- [ ] Dados varios archivos, cuando el abogado busca o filtra por metadatos, entonces obtiene solo las coincidencias.
- [ ] Dado un archivo autorizado, cuando el abogado lo abre, entonces puede visualizarlo en la aplicación.
- [ ] Dado un expediente Abierto, cuando el abogado cambia la clasificación de un archivo, entonces se guarda; y en un expediente Cerrado o Archivado, se rechaza.
- [ ] Dados dos abogados A y B, cuando A intenta obtener un archivo de B, incluso mediante un enlace directo, entonces la solicitud se rechaza.
- [ ] Dada la interfaz de carga, cuando el abogado adjunta un archivo, entonces no se ofrece captura con cámara ni se admiten audio o video.
- [ ] Dado un archivo de más de 10.485.760 bytes o de formato distinto de PDF/JPEG/PNG, cuando se carga por API, entonces se rechaza aunque su extensión simule un formato válido.
- [ ] Dado un archivo de expediente Abierto, cuando se confirma eliminarlo, entonces deja de estar disponible y se informa el resultado real del borrado; cancelar no ejecuta y en Cerrado/Archivado se rechaza.
- [ ] Dada una fotografía admitida, cuando se descarga autorizadamente, entonces conserva sus bytes originales sin que la interfaz exponga EXIF.

## Dependencias

- Specs 000, 001, 002 y 003.
- Spec 007: estado y pertenencia del expediente.

## Preguntas abiertas

Ninguna de alcance para esta fase.
