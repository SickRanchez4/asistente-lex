# Plan: Asistencia jurídica con IA

## Estado

En progreso. Plan aprobado el 2026-11-08; implementación entregada y desplegada localmente el 2026-11-10. T01/T02/T04 completas y T03 implementada con aceptación integrada pendiente de informes de 012: 14/16 criterios confirmados, C07 pendiente y C15 parcial. Ver [evidencia y límites](./tasks.md).

## Resumen técnico

MS-04 administra varias conversaciones independientes por expediente en MongoDB y usa OpenAI remoto con configuración vigente de 005. Herramientas internas obtienen fuentes autorizadas por REST de MS-01/MS-02, sin MCP; respuesta completa GraphQL e historial/agente/fuentes en React.

Aplicar principios IV, VIII, X y XI de la [constitución](../../docs/constitution.md). No streaming/SSE, modelos locales, procesamiento visual, informes guardados como fuente ni acceso administrativo a conversaciones.

## Diseño y componentes

- Conversaciones vinculadas a cuenta/expediente, identificadas por fecha/identificador sin autogeneración IA de títulos; agente activo e historial independiente con agente por respuesta.
- Casos de uso iniciar/consultar chat, cambiar agente, preguntar y eliminar conversaciones por solicitud de MS-01.
- Puertos de configuración, fuentes jurídicas/documentales, OpenAI y repositorio. Catálogo interno cerrado de consultar expediente permitido, listar PDF y leer texto PDF; no servidor MCP ni conectores externos.
- MS-04 valida expediente propio Abierto/Cerrado y agente habilitado; no acepta un expediente Archivado aunque el navegador conserve datos anteriores.
- React aplica [001](../001-experiencia-y-ui-compartida/plan.md): selector visible con agentes deshabilitados, operación pendiente, respuesta íntegra y aviso de Bolivia/revisión profesional.
- Recuperación de información mínima mediante contratos existentes; no añadir una base vectorial, RAG genérico, OCR o motor de búsqueda no especificados.

## Flujo de datos

1. Iniciar conversación nueva con expediente propio elegible y agente inicial vigente; si está deshabilitado, pedir alternativa explícita habilitada, sin cambiarlo ni alterar conversaciones existentes.
2. Validar agente activo y autorización vigente antes de la pregunta; obtener únicamente las fuentes permitidas de la cuenta y expediente.
3. Enviar a OpenAI contexto mínimo permitido y pregunta, con presupuesto total de 60 segundos. Las herramientas internas solo leen capacidades autorizadas; no credenciales generales, comandos o escritura.
4. Recibir respuesta completa, comprobar contrato y referencias, guardar el resultado confirmado y presentarlo con agente/fuentes.
5. Cambiar agente conserva el historial y afecta respuestas posteriores, sin actualizar el agente inicial del expediente.

Si proveedor/fuente necesaria falla o vence presupuesto, informar sin respuesta parcial válida. La pregunta permanece en el cuadro de entrada y no se persiste un intercambio incompleto. No reintentar automáticamente.

### Eliminación y coordinación de archivo

MS-01 solicita por REST autenticado eliminar todas las conversaciones, mensajes y estados de chat del expediente/cuenta. MS-04 confirma solo cuando el borrado terminó; repetir con ausencia devuelve confirmación, sin duplicar efectos.

Aplicar la marca técnica de archivo y generación de [007](../007-expedientes-y-ciclo-de-vida/plan.md). Serializar por expediente en la única instancia local de MS-04 la validación/admisión, persistencia y eliminación; no sostener el bloqueo mientras se espera a OpenAI. Capturar generación al admitir; borrado la cambia y descarta respuestas anteriores. Admitir preguntas consulta elegibilidad de MS-01 dentro de esa coordinación, para que una lectura anterior al archivo no inicie trabajo después del borrado.

Tras desarchivar se pueden crear conversaciones nuevas vacías. El borrado abarca todas las conversaciones/intercambios/estados, no solo la abierta. Un cambio de disponibilidad de agente sí deja terminar preguntas iniciadas, salvo archivo.

## Interfaces y contratos

- GraphQL para chat, cambio de agente y pregunta con respuesta completa: contenido, agente y referencias autorizadas de fuentes cuando existan.
- REST MS-01 para estado/pertenencia y fuentes jurídicas; REST MS-02 para documentos autorizados, explícitamente separados de informes.
- REST MS-04 para eliminación idempotente solicitada por MS-01, con resultado de borrado completo o error.
- Adaptador OpenAI con modelo libre y herramientas internas seleccionadas conforme a [005](../005-configuracion-de-agentes/plan.md); claves solo en entorno y deadline propagado de 60 segundos.
- Usar categorías de [002](../002-gateway-y-contratos-base/plan.md). No confiar en fuentes citadas libremente por el modelo: validar referencias contra las fuentes efectivamente autorizadas.

Excluir estructuralmente notas, fotografías, informes guardados y ERP. Para PDF, extraer solo texto; si no existe, informar no analizable/insuficiente, sin OCR ni envío de páginas como imágenes.

## Persistencia y migraciones

Colecciones de conversaciones/mensajes en MongoDB `ia`, con cuenta, expediente y agente registrado por respuesta. Reutilizar aprovisionamiento/migraciones de MS-04 propuestos en [005](../005-configuracion-de-agentes/plan.md).

Índices de pertenencia/expediente/conversación y orden estable. Guardar pregunta/respuesta completa con agente/fuentes en un documento de intercambio atómico, evitando persistir media respuesta. La consulta agrupa intercambios sin mezclar conversaciones. No exigir transacciones distribuidas o réplica MongoDB.

Eliminar todo contenido de conversaciones/intercambios y admisiones pendientes relacionadas; no conservar copias de historial como fallback ni mezclarlo con auditoría de agentes. Se implementó la protección frente a respuesta tardía compatible con 007: generación e intento/recibo técnicos durables, sin preguntas ni respuestas. No se eliminan esos identificadores de coordinación al borrar contenido, porque un intento antiguo no debe borrar conversaciones posteriores al desarchivo.

### Concreción implementada

- `conversations_v1` embebe intercambios completos; cada append actualiza intercambio y versión mediante un único CAS. Modelo/revisión capturados permanecen internos y no se publican en GraphQL.
- `chat_epochs_v1` conserva generación/marca de borrado y `chat_deletion_receipts_v1` el recibo de cuenta/expediente/intento/generación; escrituras con mayoría. Un borrado incierto conserva la marca y se reanuda con el mismo intento. El recibo antiguo confirma su generación sin borrar contenido nuevo.
- Un coordinador compartido por proceso serializa admisión/persistencia/eliminación por cuenta/expediente; la espera de OpenAI no mantiene ese bloqueo. Tras recibir respuesta se revalida generación, elegibilidad, conexión/plazo y versión antes del append.
- REST y GraphQL ofrecen listado paginado, detalle, creación, cambio de agente y pregunta; mutaciones de conversación exigen `expectedVersion`. La cuenta procede exclusivamente de la identidad verificada, nunca de argumentos del navegador o del modelo.
- OpenAI Chat Completions usa el modelo exacto capturado, JSON completo, `stream:false`, hasta 4000 tokens de salida y solo los tres manejadores internos seleccionados. Se rechazan respuestas incompletas, rechazos, referencias desconocidas o ausencia de la fuente necesaria; sin retry ni modelo de respaldo.
- Límites explícitos: pregunta 8000 caracteres, PDF extraído 200000 caracteres, historial de contexto 200000 caracteres serializados, solicitud/respuesta del proveedor y conversación persistida hasta 1000000 bytes. Hasta 1000 elementos por listado de contexto; exceso da error sin truncamiento silencioso. Hasta 8 rondas/12 herramientas, máximo 4 por ronda, dentro del mismo plazo.
- Gateway inicia el presupuesto de pregunta antes de autenticar; MS-04 usa el restante y el presupuesto configurado, cancela por plazo/desconexión y propaga el restante a MS-01/MS-02/OpenAI. No anuncia finalización si una persistencia queda incierta: React conserva borrador y exige consultar antes de repetir.
- React mantiene borradores por conversación únicamente en memoria, no almacena chat en el navegador y lo oculta al perder conexión. Agente/fuentes y aviso de Bolivia/revisión profesional permanecen visibles; contenido como texto, sin ejecutar HTML o instrucciones del documento.

## Seguridad y privacidad

- Abogado propietario exclusivamente; Administrador rechazado. Validar cada expediente/documento/herramienta, no solo el chat.
- Proveedor elegido OpenAI; configurar acceso de forma explícita y minimizar fuentes. Esta fase local no autoriza enviar datos reales a una cuenta/proveedor sin las condiciones de tratamiento correspondientes.
- Tratar documentos, preguntas y respuestas como datos no confiables: no ejecutar sus instrucciones como permisos, consultas arbitrarias o llamadas a herramientas irrestrictas.
- Limitar herramientas a capacidades aprobadas, con contexto de cuenta validado en el receptor; el modelo no puede elegir otra cuenta.
- No registrar preguntas, respuestas, notas, contenido documental ni secretos del proveedor.

## Observabilidad y manejo de errores

Registrar categoría, fase, latencia y correlación seguras mediante herramientas existentes. Timeout/indisponibilidad no crean una respuesta completada.

La UI conserva una pregunta pendiente según la política aprobada, distingue error de respuesta válida y no repite envíos automáticamente. Confirmación de eliminación debe reflejar resultado real para el archivo de MS-01.

## Verificación

Responsabilidad del desarrollador, sin crear archivos de testing. Probar integración con proveedor y servicios mediante datos autorizados, no enviar datos reales a un proveedor no aprobado.

| Criterio de la spec | Comprobación |
|---|---|
| 1. Agente inicial | Chat de expediente Abierto y Cerrado: agente inicial correcto según política de disponibilidad aprobada. |
| 2. Archivado | Iniciar/continuar por API directa: rechazo y ausencia de opción en UI. |
| 3. Respuesta | Una respuesta completa por GraphQL, sin streaming, con agente registrado/visible. |
| 4. Cambio de agente | Historial intacto; nueva respuesta del otro agente y expediente sin cambio de agente inicial. |
| 5. Deshabilitado | UI no selecciona y MS-04 rechaza consulta directa; verificar estado vigente. |
| 6. Documento fuente | Respuesta que usa documento autorizado muestra referencia validada de ese documento. |
| 7. Sin informes como fuente | Expediente con informes: ninguno en contexto enviado, herramientas o referencias de respuesta. |
| 8. IA caída | Error explícito y ninguna respuesta parcial presentada como válida. |
| 9. Borrado repetible | Varias conversaciones/estados: borrar todo y repetir sin error; probar respuesta en curso según coordinación aprobada. |
| 10. Desarchivo | Abrir chat tras desarchivar: ningún historial previo. |
| 11. Otra cuenta | A consulta chat de B: rechazo sin contenido. |
| 12. Administrador | Consulta directa: no autorizado. |
| 13. Varias conversaciones | Cambiar agente/escribir en una no altera historial/agente de las otras. |
| 14. Fallo | Pregunta solo en entrada y sin intercambio incompleto persistido; ningún reintento automático. |
| 15. Fuentes | PDF sin texto informa limitación; ninguna nota, fotografía o informe se envía al proveedor. |
| 16. Archivo | Respuesta pendiente se descarta y no restaura historial borrado. |

Verificar aviso de jurisdicción/revisión, fuentes privadas y ausencia de contenido en logs. Registrar pendientes en tareas; las garantías de archivo se comprueban con 007.

## Decisiones

- Mantener IA remota y respuestas completas; no añadir infraestructura IA fuera del MVP.
- OpenAI, herramientas internas sin MCP y alcance local constan en el [ADR 0004](../../docs/decisions/0004-integraciones-minimas-del-mvp.md).
- Reutilizar decisión de concurrencia de archivo de 007; no crear un protocolo distinto.

## Riesgos y preguntas abiertas

- Herramientas internas aportan consulta autorizada; MCP/Google Drive y servidores personales están diferidos, no pendientes de selección.
- PDF sin texto o exceso de contexto del modelo se comunica como limitación/error, sin inventar lectura ni omitir fuentes silenciosamente.
- Concurrencia diseñada para instancia local única, no réplicas; el desarrollador comprueba archivo y respuestas tardías.
- Sin preguntas funcionales abiertas.
- C07 y la parte de informes de C15 no se cierran hasta existir informes guardados de 012. La whitelist y el rechazo de referencias inventadas están comprobados, pero no sustituyen ese escenario integrado.