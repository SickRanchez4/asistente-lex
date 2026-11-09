# Expedientes y ciclo de vida

## Estado

Lista. Aprobada por el responsable el 2026-11-08; implementación y verificación pendientes.

## Fuente y trazabilidad

- Especificación integral: [Asistente Lex](../../docs/Asistente_Lex_Especificacion_Integral.md), secciones 3.1 (modelo de dominio), 3.3 (estados del expediente) y 5.1 (robustez y secuencia del archivo); requisitos RF-004, RF-005, RF-006 y RF-007; caso de uso CU-03; reglas RN-01, RN-05, RN-06, RN-07, RN-08 y RN-10; requisitos RNF-14 y RNF-15.
- Constitución: [principios II, IV, X y XI](../../docs/constitution.md).

## Contexto y problema

El expediente es la carpeta de trabajo jurídico del abogado, de área Civil o Penal, y el núcleo del producto. Su estado (Abierto, Cerrado o Archivado) determina qué operaciones están permitidas en el resto de capacidades: contenido jurídico, documentos, chat, informes y ERP.

Archivar un expediente tiene un efecto irreversible en otro servicio: se eliminan sus conversaciones de IA. Esa coordinación entre MS-01 y MS-04 debe manejar los fallos sin dejar al abogado con un resultado engañoso.

## Objetivos

- Crear expedientes con sus datos generales y un agente inicial habilitado.
- Consultar, filtrar y actualizar los datos generales de expedientes Abiertos.
- Gestionar las transiciones de estado autorizadas.
- Eliminar las conversaciones al archivar y no recuperarlas al desarchivar.
- Exponer el estado del expediente a los servicios que lo necesitan.

## No objetivos

- Gestionar participantes, actuaciones, notas o documentos (specs 008, 009 y 010).
- Modelar etapas procesales obligatorias (RN-05).
- Eliminar expedientes.
- Implementar el chat (spec 011); esta spec solo solicita la eliminación de conversaciones.

## Usuarios y escenarios

- Como abogado, quiero crear un expediente con su área y su agente inicial, para organizar un caso.
- Como abogado, quiero encontrar mis expedientes por estado, área, código o título, para retomar el trabajo.
- Como abogado, quiero cerrar un expediente y reabrirlo si es necesario, para reflejar su situación.
- Como abogado, quiero archivar un expediente cerrado sabiendo que se eliminan sus chats, para conservarlo como histórico.

## Requisitos

### Funcionales

- El abogado crea un expediente con código interno, título, área (Civil o Penal) y agente inicial obligatorios; descripción opcional. Se crea en estado Abierto.
- El código interno es único dentro de la cuenta, no globalmente; la restricción también se aplica al editar y frente a solicitudes concurrentes.
- MS-01 rechaza la creación si faltan datos obligatorios o si el agente inicial no está habilitado, consultando su disponibilidad a MS-04.
- El abogado consulta sus expedientes y los filtra al menos por estado, área, código y título.
- Los datos generales solo se actualizan mientras el expediente está Abierto.
- Se pueden editar código, título, descripción, área y agente inicial. Al cambiar agente inicial debe estar habilitado; el cambio solo afecta chats nuevos, sin alterar agente activo ni historial de los existentes.
- Cambiar de agente dentro del chat no modifica el agente inicial del expediente (RN-10).
- Transiciones permitidas:
  - Abierto → Cerrado (cerrar).
  - Cerrado → Abierto (reabrir).
  - Cerrado → Archivado (archivar).
  - Archivado → Cerrado (desarchivar).
- MS-01 rechaza cualquier otra transición como conflicto con una regla de negocio.
- Al archivar:
  1. MS-01 solicita a MS-04 eliminar las conversaciones y estados de chat del expediente.
  2. Solo si MS-04 confirma la eliminación, MS-01 cambia el estado a Archivado.
  3. Si la eliminación falla, el expediente permanece Cerrado y se informa el error.
  4. Si la eliminación se completa pero falla el cambio de estado, se informa el error y el abogado puede reintentar el archivo.
- La interfaz solicita confirmación antes de archivar e informa que las conversaciones se eliminarán de forma irreversible.
- El archivo tiene prioridad frente a preguntas en curso: bloquea temporalmente nuevas preguntas y descarta resultados pendientes con aviso, evitando que vuelvan a guardar conversaciones eliminadas. No se añade un estado de negocio ni se promete cancelar el procesamiento externo.
- Al desarchivar, el expediente pasa a Cerrado sin recuperar conversaciones y sin alterar su contenido jurídico ni sus documentos.
- Los expedientes en cualquier estado pueden consultarse.
- Se conserva el historial de transiciones de estado con estado anterior, estado nuevo, fecha y autor.
- MS-01 expone a los demás servicios, mediante contrato REST, el estado y la pertenencia de un expediente a una cuenta.
- Los expedientes pertenecen a la cuenta del abogado. Ningún otro abogado ni el Administrador acceden a ellos.

### No funcionales

- Coordinación: el archivo nunca se informa como exitoso si las conversaciones no se eliminaron o si el estado no cambió.
- Trazabilidad: las transiciones de estado quedan registradas.
- Autoridad de reglas: MS-01 es el único que decide el estado del expediente.

## Criterios de aceptación

- [ ] Dados todos los datos obligatorios y un agente habilitado, cuando el abogado crea un expediente, entonces queda en estado Abierto con ese agente inicial.
- [ ] Dado un agente deshabilitado, cuando se intenta crear un expediente con él, entonces MS-01 rechaza la creación aunque la solicitud no pase por la interfaz.
- [ ] Dados datos obligatorios incompletos, cuando se intenta crear un expediente, entonces se rechaza indicando los datos faltantes.
- [ ] Dado un expediente Abierto, cuando el abogado actualiza sus datos generales, entonces los cambios se guardan.
- [ ] Dado un expediente Cerrado o Archivado, cuando se intenta actualizar sus datos generales, entonces se rechaza.
- [ ] Dado un expediente en cada estado, cuando se solicita cada transición, entonces solo se aceptan Abierto→Cerrado, Cerrado→Abierto, Cerrado→Archivado y Archivado→Cerrado.
- [ ] Dado un expediente Cerrado con conversaciones, cuando el abogado confirma el archivo, entonces las conversaciones se eliminan y el expediente queda Archivado.
- [ ] Dado un fallo de MS-04 al eliminar las conversaciones, cuando se archiva, entonces el expediente permanece Cerrado, se informa el error y no se muestra éxito.
- [ ] Dadas conversaciones eliminadas y un fallo posterior al cambiar el estado, cuando se informa el error y el abogado reintenta, entonces el expediente queda Archivado.
- [ ] Dado un expediente Archivado, cuando el abogado lo desarchiva, entonces queda Cerrado, sin conversaciones previas y con su contenido jurídico y documentos intactos.
- [ ] Dadas varias transiciones realizadas, cuando se consulta el historial del expediente, entonces muestra cada cambio con estado anterior, nuevo, fecha y autor.
- [ ] Dados dos abogados A y B, cuando A intenta consultar o modificar un expediente de B, entonces la solicitud se rechaza sin revelar su contenido.
- [ ] Dado un código existente en la cuenta, cuando se crea o actualiza otro expediente con ese código, entonces se rechaza; en otra cuenta se permite.
- [ ] Dado un expediente Abierto, cuando se cambia área o agente inicial habilitado, entonces se guarda; los chats existentes conservan su agente activo e historial y los nuevos usan el agente inicial vigente.
- [ ] Dada una pregunta pendiente al confirmar el archivo, cuando termina la respuesta externa, entonces se descarta y no recrea conversaciones eliminadas.

## Dependencias

- Specs 000, 001, 002 y 003.
- Spec 005: disponibilidad de agentes.
- Spec 011: contrato de eliminación de conversaciones en MS-04. Los criterios de archivo con conversaciones reales se verifican cuando 011 está disponible.

## Preguntas abiertas

Ninguna de alcance para esta fase. Los filtros se limitan a estado, área, código y título, sin fecha de creación.
