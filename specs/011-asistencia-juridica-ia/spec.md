# Asistencia jurídica con IA

## Estado

Lista. Aprobada por el responsable el 2026-11-08; implementación y verificación pendientes.

## Fuente y trazabilidad

- Especificación integral: [Asistente Lex](../../docs/Asistente_Lex_Especificacion_Integral.md), secciones 3.2 (MongoDB para conversaciones), 3.3 (operaciones por estado) y 6.3 (coordinación entre servicios); requisitos RF-007, RF-016, RF-017, RF-018 y RF-032; caso de uso CU-10; reglas RN-01, RN-08, RN-09, RN-10 y RN-15; requisitos RNF-11, RNF-12 y RNF-13.
- Constitución: [principios IV, VIII, X y XI](../../docs/constitution.md).

## Contexto y problema

El abogado necesita consultar a agentes especializados, Penalista y Civilista, sobre sus expedientes y documentos, en lenguaje natural y con orientación a la jurisdicción boliviana.

Las conversaciones contienen información confidencial, deben vincularse a un expediente elegible y deben eliminarse al archivarlo. Además, las respuestas solo pueden basarse en información autorizada: nunca en informes guardados ni en datos de otras cuentas.

## Objetivos

- Permitir chats vinculados a expedientes Abiertos o Cerrados con un agente habilitado.
- Responder preguntas en lenguaje natural con respuestas completas que identifiquen al agente.
- Permitir cambiar de agente dentro del chat conservando el historial.
- Analizar documentos y expedientes, mostrando las fuentes cuando estén disponibles.
- Eliminar las conversaciones de un expediente cuando MS-01 lo solicita al archivarlo.

## No objetivos

- Configurar los agentes (spec 005).
- Generar informes (spec 012).
- Usar la IA sin conexión o con modelos locales (fuera del MVP).
- Entregar respuestas en streaming o mediante SSE (RNF-12).
- Procesar imágenes con modelos visuales (fuera del MVP).
- Usar informes guardados como fuentes (RN-15).
- Integrar MCP, servidores externos personales o Google Drive en esta fase; se difieren. Se usan herramientas internas mínimas de consulta autorizada.

## Usuarios y escenarios

- Como abogado, quiero hacer preguntas sobre un expediente a un agente especializado, para analizarlo con apoyo de IA.
- Como abogado, quiero cambiar de Penalista a Civilista dentro del mismo chat, para obtener otra perspectiva sin perder el contexto.
- Como abogado, quiero ver qué fuentes se usaron en una respuesta, para verificarla.
- Como abogado, quiero saber qué agente respondió cada mensaje, para interpretar la respuesta.

## Requisitos

### Funcionales

- El abogado inicia un chat vinculado a un expediente propio.
- Un expediente puede tener varias conversaciones, cada una con historial y agente activo independientes.
- Solo los expedientes Abiertos o Cerrados se ofrecen y se aceptan. MS-04 rechaza los expedientes Archivados.
- El chat requiere conexión.
- Al iniciar el chat, se activa el agente inicial del expediente.
- Si ese agente está deshabilitado, se explica el motivo y se permite elegir explícitamente el otro habilitado. Si ninguno está habilitado no se inicia una consulta; no se cambia el agente inicial del expediente.
- El abogado envía una pregunta y recibe una respuesta completa mediante GraphQL, sin streaming.
- Cada respuesta registra y muestra el agente que la generó.
- El abogado cambia al otro agente dentro del chat:
  - El historial de la conversación se conserva.
  - Las respuestas posteriores registran el nuevo agente.
  - El agente inicial del expediente no se modifica.
- Los agentes deshabilitados se muestran como no seleccionables. MS-04 rechaza las consultas dirigidas a ellos.
- El abogado formula preguntas sobre documentos concretos o sobre el expediente completo. MS-04 obtiene información autorizada de MS-01 y MS-02 mediante contratos.
- Las respuestas muestran las fuentes utilizadas cuando están disponibles.
- MS-04 no usa como fuentes:
  - Los informes guardados.
  - Información de otras cuentas.
- Los agentes consumen OpenAI remoto con modelo e instrucciones vigentes y herramientas internas autorizadas de la spec 005, sin protocolo MCP en esta fase.
- Las herramientas internas consultan datos jurídicos permitidos, listan PDF del expediente y leen texto extraíble de un PDF autorizado. Excluyen notas personales, informes guardados, fotografías y ERP.
- Un PDF sin texto extraíble se informa como no analizable o fuente insuficiente; no se aplica OCR ni se envían páginas como imágenes.
- La interfaz indica que las respuestas se orientan a Bolivia y requieren revisión profesional.
- Si la IA no está disponible temporalmente, se informa el error. No se presenta una respuesta incompleta como válida.
- La operación completa tiene un presupuesto configurable de 60 segundos según la spec 002. Ante fallo o timeout, la pregunta queda solo en el cuadro de entrada; no se persiste un intercambio incompleto ni se reintenta automáticamente.
- MS-04 guarda conversaciones y mensajes en MongoDB, vinculados al expediente y a la cuenta.
- MS-04 elimina las conversaciones y estados de chat de un expediente cuando MS-01 lo solicita:
  - La operación puede repetirse sin error si ya no quedan conversaciones.
  - Tras eliminarlas, el historial no puede recuperarse.
- Tras desarchivar un expediente, el chat comienza sin historial previo.
- El archivo de 007 prevalece sobre preguntas en curso: bloquear nuevas y descartar respuestas pendientes para que no vuelvan a guardar historial eliminado. Deshabilitar un agente, por sí solo, sí permite terminar una pregunta ya iniciada.
- Las conversaciones solo son accesibles para el abogado propietario. El Administrador no accede a ellas.

### No funcionales

- Privacidad: el contenido de las conversaciones no aparece en registros ni mensajes de error.
- Jurisdicción: respuestas orientadas a Bolivia y sujetas a revisión profesional (RNF-13).
- Coordinación: la eliminación de conversaciones informa con exactitud su resultado a MS-01.

## Criterios de aceptación

- [ ] Dado un expediente Abierto o Cerrado, cuando el abogado inicia un chat, entonces se activa el agente inicial del expediente.
- [ ] Dado un expediente Archivado, cuando se intenta iniciar o continuar un chat, entonces MS-04 lo rechaza y la interfaz no lo ofrece.
- [ ] Dada una pregunta, cuando el agente responde, entonces la respuesta llega completa e indica qué agente la generó.
- [ ] Dado un chat con historial, cuando el abogado cambia de agente y envía otra pregunta, entonces el historial se conserva, la nueva respuesta indica el nuevo agente y el agente inicial del expediente no cambia.
- [ ] Dado un agente deshabilitado, cuando se intenta seleccionarlo o enviarle una consulta directamente a MS-04, entonces se rechaza.
- [ ] Dada una pregunta sobre un documento del expediente, cuando el agente responde usando ese documento, entonces la respuesta muestra la fuente.
- [ ] Dado un expediente con informes guardados, cuando el agente responde, entonces ninguna fuente es un informe guardado.
- [ ] Dada la IA temporalmente no disponible, cuando el abogado envía una pregunta, entonces se informa el error y no se muestra una respuesta.
- [ ] Dado un expediente con conversaciones, cuando MS-01 solicita su eliminación, entonces se eliminan todas, la operación lo confirma y repetirla no produce error.
- [ ] Dado un expediente desarchivado, cuando el abogado abre el chat, entonces no ve conversaciones previas.
- [ ] Dados dos abogados A y B, cuando A intenta consultar las conversaciones de B, entonces se rechaza.
- [ ] Dado un administrador, cuando intenta consultar conversaciones, entonces recibe "no autorizado".
- [ ] Dadas varias conversaciones del mismo expediente, cuando se consulta o cambia agente en una, entonces las otras conservan su historial y agente activo.
- [ ] Dado un fallo o timeout de IA, cuando termina, entonces la pregunta permanece en el cuadro de entrada y no aparece un intercambio incompleto en el historial.
- [ ] Dado un PDF sin texto, cuando se solicita analizarlo, entonces se informa la limitación sin OCR ni procesamiento visual; notas, fotografías e informes no llegan al proveedor.
- [ ] Dada una respuesta pendiente al archivar, cuando llega, entonces no se publica ni recrea el historial borrado.

## Dependencias

- Specs 000, 001, 002 y 003.
- Spec 005: catálogo y configuración de agentes.
- Spec 007: estado del expediente y solicitud de eliminación al archivar.
- Specs 006, 008, 009 y 010: información jurídica y documental usada como fuente.
- Externas: OpenAI con clave configurada fuera del código. MCP y conexiones personales quedan diferidos.

## Preguntas abiertas

Ninguna de alcance para esta fase.
