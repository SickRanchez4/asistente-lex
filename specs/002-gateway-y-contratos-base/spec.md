# Gateway y contratos base

## Estado

En progreso. Aprobada por el responsable el 2026-11-08; implementación de base el 2026-11-09, verificación pendiente (ver [tareas](./tasks.md)).

## Fuente y trazabilidad

- Especificación integral: [Asistente Lex](../../docs/Asistente_Lex_Especificacion_Integral.md), secciones 3 (arquitectura; Apollo como fachada sin reglas de negocio) y 6.3 (coordinación entre servicios); requisitos RNF-04, RNF-05, RNF-09, RNF-11, RNF-12 y RNF-15; regla RN-01.
- Constitución: [principios IV, V, X y XI](../../docs/constitution.md).

## Contexto y problema

React y Angular consumen el backend mediante una fachada GraphQL única, y los microservicios se comunican entre sí por REST. Cada spec funcional añadirá operaciones a esa fachada y a las APIs de los servicios.

Sin convenciones comunes, cada funcionalidad definiría de forma distinta cómo se organizan los contratos, cómo se transmite la identidad del solicitante, cómo se representan los errores y cómo se manejan los fallos de otros servicios. Esto dificultaría la integración y podría producir respuestas engañosas.

Esta spec establece el gateway y las convenciones de contratos. Las operaciones de negocio se definen en cada spec funcional.

## Objetivos

- Ofrecer un único punto GraphQL para React y Angular.
- Definir convenciones para diseñar, documentar y evolucionar el esquema GraphQL y las APIs REST.
- Transmitir de forma confiable la identidad, el rol y la cuenta del solicitante a los servicios.
- Definir un modelo común de errores, incluidos servicios no disponibles y fallos parciales.
- Definir cómo se comunican los servicios entre sí por REST, con tiempos de espera y manejo de errores.

## No objetivos

- Definir operaciones de negocio específicas.
- Incorporar reglas de negocio en el gateway.
- Implementar el inicio de sesión ni la emisión de credenciales (spec 003).
- Ofrecer respuestas parciales en streaming, SSE o suscripciones (RNF-12).
- Introducir mensajería asíncrona o colas entre servicios.

## Usuarios y escenarios

- Como desarrollador frontend, quiero un único punto GraphQL con convenciones claras, para consumir capacidades de cualquier servicio sin conocer su ubicación.
- Como desarrollador backend, quiero recibir de forma confiable la identidad y la cuenta del solicitante, para autorizar cada operación en el servicio propietario.
- Como desarrollador, quiero un modelo de errores común, para que la interfaz presente estados coherentes.
- Como abogado, quiero que el fallo de un servicio se informe con claridad, para no creer que una operación se completó.

## Requisitos

### Funcionales

- Apollo Server expone un único esquema GraphQL consumido por React y Angular. Los microfrontends no llaman directamente a los microservicios.
- Los resolvers delegan en las APIs REST del servicio propietario. Solo componen, traducen y transmiten errores; no contienen reglas de negocio.
- Existen convenciones documentadas para:
  - Organizar el esquema GraphQL por capacidad y nombrar tipos y operaciones.
  - Diseñar las APIs REST: recursos, filtros, paginación y formatos de fechas e importes.
  - Evolucionar los contratos y tratar cambios incompatibles, que requieren actualizar las specs afectadas.
- Los contratos GraphQL y REST de cada operación se documentan en una ubicación convenida del repositorio antes de implementar la integración.
- El gateway rechaza las solicitudes sin identidad válida a operaciones protegidas y no las reenvía a los servicios.
- El gateway transmite a los servicios la identidad verificada, el rol y la cuenta del solicitante.
- Cada servicio obtiene la cuenta del solicitante de esa identidad verificada, no de parámetros proporcionados por el cliente, y vuelve a comprobar la autorización.
- Las llamadas REST entre servicios están autenticadas y transmiten el contexto del solicitante cuando la operación lo requiere. El servicio receptor rechaza las llamadas no autenticadas.
- El modelo común de errores distingue al menos estas categorías:
  - Validación.
  - No autenticado.
  - No autorizado.
  - Recurso inexistente.
  - Conflicto con una regla de negocio, por ejemplo una transición de estado inválida.
  - Servicio no disponible o tiempo de espera agotado.
  - Fallo parcial en una operación entre servicios.
- Los errores llegan al cliente con su categoría y un mensaje comprensible, sin trazas, consultas ni datos internos.
- Las llamadas REST tienen tiempos de espera definidos. Al agotarse, se devuelve un error explícito y nunca un resultado exitoso.
- Las operaciones GraphQL devuelven resultados completos.
- GraphQL se documenta mediante SDL ejecutable y cada API REST mediante OpenAPI; los planes enlazan los contratos sin duplicarlos.
- Se mantiene un único contrato vigente en el MVP. Los cambios incompatibles se coordinan en servicios, Gateway, consumidores y specs, sin versiones paralelas obligatorias.
- Los binarios se suben y descargan como Base64 mediante GraphQL, sin multipart ni llamadas REST directas desde el frontend. Se respetan los límites de la spec 010, tanto para bytes decodificados como para el cuerpo codificado.
- Las llamadas REST usan credenciales por servicio fuera del código y contexto de usuario firmado/verificable; no encabezados arbitrarios como autoridad. La solución es mínima para el entorno local, sin mTLS ni infraestructura de producción.
- Los tiempos de espera son configurables: 10 segundos por llamada REST ordinaria, 60 segundos totales por operación de IA y 60 segundos por transferencia de archivo. El presupuesto total IA incluye sus pasos internos; los límites no se suman por cada llamada.

### No funcionales

- Seguridad: el gateway y los servicios no registran ni devuelven credenciales, tokens o contenido privado.
- Propiedad de datos: ningún componente accede directamente a los almacenes de otro servicio.
- Consistencia: todas las specs funcionales aplican estas convenciones.

## Criterios de aceptación

- [ ] Dados React y Angular, cuando ejecutan cualquier operación, entonces lo hacen contra el único punto GraphQL y no contra los microservicios.
- [ ] Dada una solicitud sin identidad válida a una operación protegida, cuando llega al gateway, entonces se rechaza como no autenticada y no se reenvía a ningún servicio.
- [ ] Dada una solicitud autenticada, cuando llega al servicio destino, entonces este recibe la identidad, el rol y la cuenta del solicitante.
- [ ] Dada una solicitud que indica una cuenta distinta de la autenticada, cuando el servicio la procesa, entonces usa la cuenta de la identidad verificada y no la indicada por el cliente.
- [ ] Dado un rechazo por autorización en un servicio, cuando llega al cliente, entonces tiene la categoría "no autorizado".
- [ ] Dado un servicio detenido o que excede el tiempo de espera, cuando se invoca una operación que depende de él, entonces se devuelve "servicio no disponible" y no se informa éxito.
- [ ] Dado un error de validación o de regla de negocio en un servicio, cuando llega al cliente, entonces conserva su categoría y no incluye trazas, consultas ni datos de otras cuentas.
- [ ] Dada una llamada entre servicios sin autenticación, cuando llega al servicio receptor, entonces se rechaza.
- [ ] Dado el código del gateway, cuando se revisa, entonces no contiene reglas de negocio.
- [ ] Dada una operación nueva, cuando se inicia su integración, entonces su contrato GraphQL y REST ya está documentado en la ubicación convenida.
- [ ] Dado un binario admitido, cuando se sube o descarga, entonces atraviesa GraphQL como Base64 y se valida su tamaño real sin exponer enlaces públicos.
- [ ] Dados los límites configurados, cuando una operación ordinaria, IA o de archivo los excede, entonces termina con error explícito y no con éxito.

## Dependencias

- Spec 000: gateway y servicios en ejecución.
- Spec 003: emisión y verificación de la identidad. Esta spec define cómo se transmite; los criterios de identidad se comprueban completamente cuando 003 está disponible.

## Preguntas abiertas

Ninguna de alcance para esta fase. No se pretende una integración de nivel producción; esa limitación no elimina la autenticación entre componentes ni el aislamiento de cuentas.
