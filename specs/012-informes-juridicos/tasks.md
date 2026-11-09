# Tareas: Informes jurídicos

## Estado

Pendiente de ejecución y verificación. Spec y plan aprobados el 2026-11-08.

## Lista de trabajo

Basadas en la [spec](./spec.md) y el [plan](./plan.md). C01–C14 siguen el orden de criterios. Cada generación integra MS-01, MS-04 y almacenamiento MS-02; no crear tareas independientes de prompt, tabla o renderizador.

- [ ] **012-T01. Generar y conservar un resumen ejecutivo de una página real.**
  - **Valor/entrega:** selección de expediente Abierto/Cerrado, agente inicial habilitado/alternativa explícita, fuentes permitidas, contenido OpenAI, estructura PDF y guardado completo con fecha/tipo separado de documentos. Plazo total 60 segundos y consistencia archivo/metadatos.
  - **Depende de:** fuentes/adaptador de [011-T03](../011-asistencia-juridica-ia/tasks.md), almacenamiento de [010-T01](../010-documentos-y-fotografias/tasks.md), [007-T02](../007-expedientes-y-ciclo-de-vida/tasks.md), [002-T03](../002-gateway-y-contratos-base/tasks.md) y [001-T02](../001-experiencia-y-ui-compartida/tasks.md).
  - **Evidencia/validación:** PDF presentado y guardado ocupa exactamente una página sin cortes. Fuentes insuficientes o cualquier paso fallido no deja informe completado; Archivado no genera y ninguna nota/fotografía/informe anterior se usa como fuente.
  - **Cobertura:** C01, C05, C07, C08, C10, C11, C12, C13.

- [ ] **012-T02. Informar al cliente sin trasladar información interna.**
  - **Valor/entrega:** variante cliente con proyección cerrada desde MS-01: ficha básica, nombres/roles y actuaciones; excluir documentos, notas/estrategia, identificación y contacto antes de OpenAI. PDF y aviso de revisión profesional, sin aprobación en aplicación ni envío automático.
  - **Depende de:** 012-T01 y fuentes reales de 006-T02/008-T01/009-T01/009-T03 ya usadas por 011-T03.
  - **Evidencia/validación:** expediente con notas, contactos y PDF produce informe sin esos datos ni fuente privada en petición; requiere revisión visible y permanece descargable sin workflow adicional.
  - **Cobertura:** C02, C03, C05, C07, C10, C11.

- [ ] **012-T03. Obtener reportes propios mediante consultas naturales acotadas.**
  - **Valor/entrega:** reporte de un expediente con filtros/fuentes autorizados, PDF narrativo y resultado tabular tipado cuando corresponda, guardado sin ejecutarse SQL/comandos arbitrarios del modelo.
  - **Depende de:** 012-T01.
  - **Evidencia/validación:** preguntas producen contenido del expediente/cuenta elegidos y una tabla verificable cuando procede; filtros no amplían permisos, fuentes insuficientes/fallo explícitos y ningún informe previo se realimenta.
  - **Cobertura:** C04, C05, C07, C10, C11.

- [ ] **012-T04. Recuperar informes históricos y exportar exactamente sus tablas.**
  - **Valor/entrega:** histórico fecha/tipo, consulta y descarga PDF Base64 protegida, CSV de tabla guardada con convención acordada y contratos de manifiesto/contenido para copia offline. Sin edición/eliminación ni regeneración al descargar.
  - **Depende de:** 012-T01, 012-T02 y 012-T03; no depende de 013, al que entrega los contratos.
  - **Evidencia/validación:** PDF histórico íntegro en cualquier estado, informe separado de documentos y lectura ajena/Administrador rechazada. CSV UTF-8 con `;`, cabeceras, fechas y decimales acordados conserva filas/valores, incluso comillas/saltos y protecciones de texto documentadas.
  - **Cobertura:** C06, C08, C09, C10, C11, C12, C14.

## Verificación de aceptación

- [ ] El desarrollador revisa los 14 criterios de la [spec](./spec.md), contando páginas del PDF y examinando fuentes reales, no solo el prompt.
- [ ] Ejecutar validaciones del [plan](./plan.md), incluidos fallos parciales y CSV, sin crear archivos de testing.
- [ ] Sincronizar spec, plan e [índice](../index.md); guardar un PDF no equivale a todos los tipos y exportaciones verificados.