# Configuración de agentes

## Estado

En progreso. Aprobada por el responsable el 2026-11-08. Catálogo, configuración, historial, disponibilidad y emisor de auditoría implementados y verificados por capas. Pendientes aceptación autenticada completa, auditoría con credencial configurada y flujos consumidores de 007/011; no se declara completa.

## Fuente y trazabilidad

- Especificación integral: [Asistente Lex](../../docs/Asistente_Lex_Especificacion_Integral.md), sección 3.2 (MongoDB para configuración de agentes); requisitos RF-030 (acciones sobre agentes), RF-031 y RF-032; caso de uso CU-17; reglas RN-01, RN-09 y RN-21; requisitos RNF-12 y RNF-13.
- Constitución: [principios IV, VIII y X](../../docs/constitution.md).

## Contexto y problema

El MVP ofrece exactamente dos agentes de IA especializados: Penalista y Civilista. Su configuración y disponibilidad las gestiona únicamente el Administrador, y otras capacidades dependen de ellas: crear un expediente requiere un agente habilitado y el chat solo admite agentes habilitados.

Se necesita un catálogo con la configuración vigente de cada agente, su historial y su disponibilidad, accesible para quienes lo consumen y protegido frente a cambios no autorizados.

## Objetivos

- Mantener un catálogo con los agentes Penalista y Civilista.
- Permitir al Administrador consultar y modificar la configuración de cada agente.
- Permitir habilitar y deshabilitar cada agente.
- Conservar el historial de configuración y auditar cada cambio.
- Exponer la disponibilidad de los agentes a las capacidades que la consumen.

## No objetivos

- Crear o eliminar agentes, o añadir especialidades (RN-21).
- Conversar con los agentes (spec 011).
- Acceder a las conversaciones de los abogados.
- Entrenar o desarrollar modelos propios (fuera del MVP).

## Usuarios y escenarios

- Como administrador, quiero consultar los dos agentes y su configuración vigente, para conocer su estado.
- Como administrador, quiero modificar las instrucciones de un agente, para ajustar su comportamiento.
- Como administrador, quiero deshabilitar un agente, para impedir nuevas consultas cuando sea necesario.
- Como abogado, quiero ver qué agentes están disponibles, para elegir uno válido al crear un expediente o en el chat.

## Requisitos

### Funcionales

- El catálogo contiene exactamente dos agentes: Penalista y Civilista. No existen operaciones para crear ni eliminar agentes.
- El Administrador consulta el catálogo con el estado de cada agente (habilitado o deshabilitado) y su configuración vigente.
- El Administrador modifica las instrucciones de un agente y confirma el cambio. La nueva configuración queda vigente para las consultas posteriores.
- También configura el identificador de modelo OpenAI como texto libre y selecciona herramientas internas de consulta de un catálogo cerrado. No registra servidores, URL, comandos ni credenciales arbitrarias.
- El proveedor de esta fase es OpenAI; las claves se suministran fuera del panel y del repositorio. MCP y conexiones personales externas quedan diferidos.
- El catálogo interno ofrece consultar datos jurídicos permitidos del expediente, listar sus PDF y leer texto de un PDF autorizado. Excluye notas, informes guardados, imágenes y ERP como fuentes de IA.
- Cada cambio de configuración se conserva en un historial con autor, fecha, valor anterior y valor nuevo.
- El historial cubre instrucciones, modelo y selección de herramientas; no expone secretos. Un identificador de modelo rechazado por OpenAI produce error explícito, sin sustituirlo silenciosamente.
- El Administrador habilita y deshabilita cada agente.
- Un agente deshabilitado:
  - Permanece visible en el catálogo.
  - No puede seleccionarse para crear expedientes ni para nuevas consultas.
  - Hace que MS-04 rechace las nuevas consultas dirigidas a él, aunque la interfaz no lo impida.
- Las capacidades consumidoras consultan la disponibilidad de los agentes mediante un contrato de MS-04.
- Cada modificación, habilitación o deshabilitación se informa a la auditoría (spec 004).
- Si falla auditar un cambio ya aplicado, se conserva y se comunica el fallo parcial según la spec 004, sin cola ni rollback ficticio.
- Solo el rol Administrador puede modificar la configuración o la disponibilidad.
- La consulta de la configuración no expone conversaciones de los abogados.
- MS-04 almacena la configuración en MongoDB.
- El Abogado solo consulta nombre, especialidad y disponibilidad; no ve instrucciones, modelo ni herramientas.
- Deshabilitar permite terminar preguntas ya iniciadas, pero rechaza nuevas. Archivar el expediente prevalece y descarta resultados pendientes según 007.
- Si el agente inicial está deshabilitado, el chat muestra el motivo y permite elegir explícitamente el otro habilitado, sin cambiar el agente inicial del expediente.
- Se permite deshabilitar ambos agentes, advirtiendo que impide crear expedientes y enviar nuevas preguntas.
- Ambos agentes se aprovisionan habilitados con las tres herramientas internas. El modelo inicial se suministra en configuración del entorno y luego puede editarse desde el panel, sin fijar una versión de modelo en la spec.

### Instrucciones iniciales

- **Penalista:** asistencia jurídica penal orientada a Bolivia. Analizar únicamente fuentes autorizadas del expediente y texto PDF disponible; distinguir hechos, inferencias y vacíos. No inventar fuentes ni afirmar certeza cuando falte respaldo. No usar notas privadas, informes guardados, imágenes o datos de otras cuentas. Las propuestas requieren revisión profesional del Abogado.
- **Civilista:** asistencia jurídica civil orientada a Bolivia. Analizar únicamente fuentes autorizadas del expediente y texto PDF disponible; explicar alternativas y límites sin inventar hechos, normativa o citas. No usar notas privadas, informes guardados, imágenes o datos de otras cuentas. Las propuestas requieren revisión profesional del Abogado.

### No funcionales

- Privacidad: el Administrador no accede a conversaciones a través de esta funcionalidad.
- Integridad: el historial de configuración no puede modificarse desde la aplicación.
- Jurisdicción: la configuración de los agentes mantiene la orientación a Bolivia y la necesidad de revisión profesional (RNF-13).

## Criterios de aceptación

La aparición de eventos presupone auditoría disponible; si falla después de aplicar el cambio, se comunica el resultado parcial definido en la spec 004.

- [ ] Dado el catálogo inicial, cuando el administrador lo consulta, entonces ve exactamente los agentes Penalista y Civilista y ninguna opción para crear o eliminar agentes.
- [ ] Dado un agente, cuando el administrador modifica sus instrucciones y confirma, entonces la nueva configuración queda vigente y el historial registra autor, fecha, valor anterior y nuevo.
- [ ] Dado un agente habilitado, cuando el administrador lo deshabilita, entonces aparece como deshabilitado y no seleccionable para los abogados.
- [ ] Dado un agente deshabilitado, cuando se envía directamente a MS-04 una nueva consulta dirigida a él, entonces se rechaza.
- [ ] Dado un agente deshabilitado, cuando el administrador lo habilita, entonces vuelve a ser seleccionable.
- [ ] Dado un abogado autenticado, cuando intenta modificar la configuración o disponibilidad de un agente, entonces recibe "no autorizado".
- [ ] Dado un cambio de configuración o disponibilidad, cuando el administrador consulta los eventos de auditoría, entonces el cambio aparece registrado.
- [ ] Dada la consulta de un agente, cuando el administrador la revisa, entonces no se muestran conversaciones de abogados.
- [ ] Dado un cambio de modelo o herramientas, cuando se confirma, entonces se conserva su revisión y las consultas posteriores usan esa configuración sin exponerla al Abogado.
- [ ] Dada una pregunta ya iniciada al deshabilitar un agente, cuando termina, entonces puede completarse, salvo que se haya iniciado el archivo del expediente.
- [ ] Dados ambos agentes deshabilitados, cuando se intenta crear expediente o enviar una pregunta, entonces se rechaza con motivo sin eliminar historial.

## Dependencias

- Spec 000: MS-04 y MongoDB.
- Spec 001: patrones del panel de administración y de elementos no seleccionables.
- Spec 002: contratos y modelo de errores.
- Spec 003: rol Administrador.
- Spec 004: registro y consulta de eventos de auditoría.

## Preguntas abiertas

Ninguna de alcance para esta fase. MCP no es una integración pendiente de implementar: queda expresamente diferido.
