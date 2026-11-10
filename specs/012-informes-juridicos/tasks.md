# Tareas: Informes jurídicos

## Estado

Completa. Spec y plan aprobados el 2026-11-08; T01–T04 implementadas, desplegadas localmente y verificadas el 2026-11-10. C01–C14 confirmados. Sin commit ni push de esta entrega; verificadores temporales fuera del repositorio.

## Lista de trabajo

Basadas en la [spec](./spec.md) y el [plan](./plan.md). C01–C14 siguen el orden de criterios. Cada generación integra MS-01, MS-04 y almacenamiento MS-02; no crear tareas independientes de prompt, tabla o renderizador.

- [x] **012-T01. Generar y conservar un resumen ejecutivo de una página real.**
  - **Valor/entrega:** selección de expediente Abierto/Cerrado, agente inicial habilitado/alternativa explícita, fuentes permitidas, contenido OpenAI, estructura PDF y guardado completo con fecha/tipo separado de documentos. Plazo total 60 segundos y consistencia archivo/metadatos.
  - **Depende de:** fuentes/adaptador de [011-T03](../011-asistencia-juridica-ia/tasks.md), almacenamiento de [010-T01](../010-documentos-y-fotografias/tasks.md), [007-T02](../007-expedientes-y-ciclo-de-vida/tasks.md), [002-T03](../002-gateway-y-contratos-base/tasks.md) y [001-T02](../001-experiencia-y-ui-compartida/tasks.md).
  - **Evidencia/validación:** PDF presentado y guardado ocupa exactamente una página sin cortes. Fuentes insuficientes o cualquier paso fallido no deja informe completado; Archivado no genera y ninguna nota/fotografía/informe anterior se usa como fuente.
  - **Cobertura:** C01, C05, C07, C08, C10, C11, C12, C13.

- [x] **012-T02. Informar al cliente sin trasladar información interna.**
  - **Valor/entrega:** variante cliente con proyección cerrada desde MS-01: ficha básica, nombres/roles y actuaciones; excluir documentos, notas/estrategia, identificación y contacto antes de OpenAI. PDF y aviso de revisión profesional, sin aprobación en aplicación ni envío automático.
  - **Depende de:** 012-T01 y fuentes reales de 006-T02/008-T01/009-T01/009-T03 ya usadas por 011-T03.
  - **Evidencia/validación:** expediente con notas, contactos y PDF produce informe sin esos datos ni fuente privada en petición; requiere revisión visible y permanece descargable sin workflow adicional.
  - **Cobertura:** C02, C03, C05, C07, C10, C11.

- [x] **012-T03. Obtener reportes propios mediante consultas naturales acotadas.**
  - **Valor/entrega:** reporte de un expediente con filtros/fuentes autorizados, PDF narrativo y resultado tabular tipado cuando corresponda, guardado sin ejecutarse SQL/comandos arbitrarios del modelo.
  - **Depende de:** 012-T01.
  - **Evidencia/validación:** preguntas producen contenido del expediente/cuenta elegidos y una tabla verificable cuando procede; filtros no amplían permisos, fuentes insuficientes/fallo explícitos y ningún informe previo se realimenta.
  - **Cobertura:** C04, C05, C07, C10, C11.

- [x] **012-T04. Recuperar informes históricos y exportar exactamente sus tablas.**
  - **Valor/entrega:** histórico fecha/tipo, consulta y descarga PDF Base64 protegida, CSV de tabla guardada con convención acordada y contratos de manifiesto/contenido para copia offline. Sin edición/eliminación ni regeneración al descargar.
  - **Depende de:** 012-T01, 012-T02 y 012-T03; no depende de 013, al que entrega los contratos.
  - **Evidencia/validación:** PDF histórico íntegro en cualquier estado, informe separado de documentos y lectura ajena/Administrador rechazada. CSV UTF-8 con `;`, cabeceras, fechas y decimales acordados conserva filas/valores, incluso comillas/saltos y protecciones de texto documentadas.
  - **Cobertura:** C06, C08, C09, C10, C11, C12, C14.

## Verificación de aceptación

- [x] El desarrollador revisa los 14 criterios de la [spec](./spec.md), contando páginas del PDF y examinando fuentes reales, no solo el prompt.
- [x] Ejecutar validaciones del [plan](./plan.md), incluidos fallos parciales y CSV, sin crear archivos de testing en el repositorio.
- [x] Sincronizar spec, plan e [índice](../index.md); guardar un PDF no equivale a todos los tipos y exportaciones verificados.

## Registro de verificación

- **T01 / C01, C05, C07, C08, C10–C13:** resumen OpenAI real por Shell/GraphQL y MS-02→MS-01/MS-04, modelo vigente y PDF guardado. PDF.js contó exactamente una página A4 y encontró el cuerpo completo de cada sección en el texto extraído. Visor móvil mostró esa misma página y canvas no vacío. Resumen excesivo rechazado, sin recorte. Cuenta/expediente explícitos no amplían autoridad.
- **T02 / C02, C03:** informe para cliente real, también generado desde React. Proyección MS-01 cerrada: ficha sin descripción interna, participantes solo nombre/rol y actuaciones. Con notas, identificación, contacto, domicilio, detalle privado, PDF y fotografía sintéticos presentes: marcadores ausentes de fuentes, cuerpo efectivo OpenAI inspeccionado en memoria y resultado para cliente. Contexto falsificado rechazado antes del proveedor. Aviso profesional visible en UI/PDF, descarga sin aprobación y sin envío automático.
- **T03 / C04, C05, C07:** reporte natural OpenAI real con filtro HEARING y período inclusivo, tabla de una actuación con fecha/importe BOB exactos; otro reporte citó texto de PDF seleccionado explícitamente. También se generó en Cerrado. No SQL del modelo ni rutas/herramientas libres. Una propuesta JSON variable falló sin publicación; se corrigió el contrato a salida estructurada estricta y se volvió a verificar con OpenAI real, sin reintento automático de la operación fallida.
- **T04 / C06, C08, C09, C12, C14:** fecha/tipo/agente y detalle histórico conservados; PDF Base64 íntegro, CSV de tabla guardada y recuperación por solicitud. Paginación 2+1 sin duplicados y manifiesto sin contenido pesado. Informes ausentes de archivos/fuentes. PUT/PATCH/DELETE rechazados y sin mutaciones GraphQL. Archivo real conservó PDF byte a byte y CSV exacto, pero rechazó generar.
- **78 comprobaciones integradas:** recorrido desplegado, tres variantes y PDF con OpenAI real, tablas/CSV, idempotencia, conflicto por entrada distinta, fuentes insuficientes, fotografía/PDF vacío rechazados antes del proveedor, campos/filtros cerrados, permisos REST/GraphQL y estados. Agente inicial deshabilitado exige alternativa explícita; Penalista real identificado, ambos deshabilitados rechazan. Disponibilidad original restaurada y revisiones administrativas conservadas.
- **26 comprobaciones de consistencia:** PostgreSQL y binarios reales con fuentes REST. MS-01/MS-04 inaccesibles, render fallido, escritura binaria fallida, fuente inventada, cancelación posterior a escritura y trigger SQL de publicación fallida no dejan STAGING/COMPLETE publicable. Trigger retirado. Confirmación perdida después del commit conserva PDF/COMPLETE y se recupera por request sin segunda llamada. Admisión concurrente genera una sola fila/llamada. CLI rechaza STAGING reciente y COMPLETE, limpia solo STAGING antiguo; sin restos técnicos al finalizar.
- **CSV de casos límite:** parser estándar volvió a leer descarga real UTF-8/BOM con punto y coma, cabeceras, español, comillas, saltos, fechas e importes positivos/negativos sin miles. Fórmulas, tabulador y apóstrofo inicial protegidos reversiblemente; tabla original estructuralmente idéntica. React presentó los mismos valores formateados y conservó las filas originales.
- **Autorización vigente:** otra cuenta y Administrador rechazados para histórico, detalle, consulta por solicitud, PDF y CSV; anónimo/sin identidad rechazados. Otras tres comprobaciones rechazaron histórico/generación/propuesta con identidad aún firmada de cuenta suspendida, consultando autoridad MS-01. Cuenta sintética restaurada antes de limpieza.
- **Sin realimentación / integración 011:** con informes realmente guardados, nuevo informe volvió a usar solo proyección jurídica/PDF. Seis comprobaciones adicionales construyeron respuesta nueva del adaptador de chat con fuentes REST y revisiones reales: petición efectiva, herramientas y referencias sin IDs/contenido de informes, notas, fotografías o contacto. Se cierran C07/C15 y T03 de 011; no se atribuye esa evidencia a la sola whitelist.
- **Navegador:** cliente generado realmente, revisión visible, histórico/detalle, visor PDF y enlace de descarga con Blob PDF íntegro. Tabla tipada y acción CSV ejercitadas. El navegador integrado no emitió evento Playwright de descarga; PDF/CSV se comprobaron por API y Blob, sin afirmar verificación de archivo en carpeta de descargas. Error de período retuvo consulta/fechas. Indisponibilidad interceptada produjo un solo envío, bloqueo y consulta por request; resultado ausente desbloqueó sin regenerar ni perder borrador. Interceptor retirado.
- **Presentación y conexión:** escritorio 1366×900 y móvil 390×844, capturas de formulario/tabla/visor, canvas con píxeles de texto y sin desbordamientos de página o controles. Tabla/canvas con scroll propio. Archivado sin generación; desconexión ocultó informes/PDF remotos y no ofreció generación. Conexión restaurada y sesión cerrada.
- **Construcción y contratos:** JDK 25 para MS-01; typechecks MS-02/Gateway/React en Node 26, Python 3.15 real para MS-04. SDL compuesto válido y tres OpenAPI 3.1 válidos con referencias resueltas. Imágenes afectadas construidas/desplegadas, V2 aplicada explícitamente; instalación PDFKit con versiones exactas sin vulnerabilidades npm reportadas en esa instalación. Sin archivos de testing ni informe Markdown adicional en el repositorio.
- **Limpieza y límites:** fixtures jurídicas, cuentas/sesiones, documentos/fotografía, informes y binarios eliminados; coordinación/chat MongoDB exactos de las cuentas sintéticas eliminados. Demos conservadas, agentes/modelo restaurados, entorno privado sin cambios y sin borrar historial administrativo. No se implementa 013 ni se certifican datos reales, calidad jurídica, réplicas o producción. Fuente PDF estándar rechaza caracteres no representables explícitamente. Se mantiene la alerta previa de imagen base `node:26-alpine`, fuera del alcance y sin remediación acreditada.