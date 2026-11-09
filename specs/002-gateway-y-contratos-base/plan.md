# Plan: Gateway y contratos base

## Estado

Lista. Plan aprobado por el responsable el 2026-11-08; implementación y verificación pendientes.

## Resumen técnico

Extender el Apollo Server existente como única fachada GraphQL para React y Angular. Los resolvers delegan en clientes REST de los servicios propietarios; el Gateway traduce contratos, transmite identidad verificada y comunica errores, sin decidir reglas de negocio.

Aplicar los principios IV, V, X y XI de la [constitución](../../docs/constitution.md). Mantener las carpetas actuales `schema`, `resolvers`, `clients` y `config`; no introducir colas, suscripciones, streaming, un bus de eventos ni una capa de orquestación empresarial.

## Diseño y componentes

- **Esquema:** organizar tipos y operaciones por capacidad. Nombres explícitos y consistentes; consultas para lectura y mutaciones para cambios. Las specs funcionales definen sus operaciones antes de integrarlas.
- **Resolución:** validar la identidad de operaciones protegidas antes de llamar al servicio; transportar argumentos y traducir respuestas. La autorización de dominio permanece en el servicio propietario.
- **Clientes REST:** encapsular URL, autenticación entre servicios, contexto verificado, timeout y traducción de fallos. Reutilizar un transporte pequeño si existe duplicación real, sin un cliente universal configurable por anticipación.
- **Contexto de solicitud:** obtener usuario, rol y cuenta exclusivamente de identidad verificada mediante la integración de la spec 003. Ignorar o rechazar encabezados de identidad arbitrarios del cliente; nunca confiar en ellos.
- **Errores:** mantener un mapeo central de categorías conocidas y mensajes seguros. No traducir un fallo a `null`, una lista vacía o un resultado exitoso.

## Flujo de datos

1. React o Angular envía la operación al único endpoint GraphQL.
2. El Gateway valida identidad y requisitos de acceso de la operación; una identidad inválida se rechaza sin invocar REST.
3. El cliente REST llama al propietario con identidad verificada y autenticación de servicio.
4. El propietario vuelve a comprobar autorización y cuenta, ejecuta su caso de uso y responde.
5. El Gateway transforma la respuesta a su contrato GraphQL completo o informa el error. Los fallos parciales de operaciones multiservicio se comunican explícitamente según su spec, no como éxito global.

Las llamadas REST entre servicios también aplican la autenticación acordada y propagan el contexto del solicitante cuando corresponde. No hay lecturas cruzadas de bases ni transacciones distribuidas.

## Interfaces y contratos

**Organización acordada:** usar SDL en `src/gateway/src/schema/` como contrato GraphQL ejecutable y OpenAPI por servicio en una carpeta `contracts/` de cada servicio. El plan de cada funcionalidad enlaza sus operaciones y explica reglas y resultados. No duplicar el mismo esquema en múltiples documentos.

Antes de integrar, concretar:

| Aspecto | Convención propuesta |
|---|---|
| Identificadores | Opacos; nunca equivalen a autorización. La cuenta efectiva procede de la identidad. |
| Listados | Filtros tipados y paginación limitada; elegir la estrategia en el contrato, sin listas ilimitadas ni límites numéricos inventados. |
| Fechas | Distinguir fecha civil de instante con zona/offset; transporte independiente del formato visual de la spec 001. |
| Dinero | Cadenas decimales exactas para importes BOB, máximo dos decimales; no coma flotante binaria ni redondeo silencioso de entradas. |
| Cambios incompatibles | Un contrato vigente; actualizar servicios, Gateway, consumidores y specs coordinadamente, sin versiones paralelas en el MVP. |
| Respuestas | Un resultado por solicitud, sin streaming ni suscripciones. Un resultado parcial de negocio se informa como tal, no como resultado completo satisfactorio. |

El contrato común debe distinguir validación, no autenticado, no autorizado, recurso inexistente, conflicto de negocio, servicio no disponible/timeout y fallo parcial. Propuesta: categoría y mensaje seguro en errores REST y `extensions` GraphQL; errores de campo cuando el servicio los identifique y referencia de correlación cuando exista. Los nombres y tipos definitivos quedan pendientes.

No asumir que HTTP 200 significa éxito GraphQL. Un fallo de transporte, categoría desconocida o respuesta inválida produce un error explícito seguro. Las APIs no exponen trazas, SQL, credenciales ni detalles de otros usuarios.

Usar credencial propia por servicio en variables de entorno y contexto de usuario firmado con una clave del entorno local, verificado por receptores; nunca aceptar identidad de encabezados arbitrarios. Es una implementación local mínima, sin mTLS, gestores de claves o infraestructura de producción.

La sesión del navegador es la cookie HttpOnly validada por MS-01 de 003; el contexto firmado interno no la sustituye ni se guarda como JWT en localStorage.

Binarios como Base64 en GraphQL, una transferencia por archivo. Para cargas de 010, máximo 10.485.760 bytes decodificados; dimensionar y validar el cuerpo codificado con margen para JSON. No multipart ni descargas REST directas desde frontend. Informes/CSV generados también deben aplicar un límite de respuesta documentado, sin truncado silencioso.

## Persistencia y migraciones

No aplica: el Gateway no almacena datos de negocio ni sesiones propias por defecto. Los propietarios mantienen sus almacenes conforme al [ADR 0003](../../docs/decisions/0003-persistencia-por-servicio.md). La persistencia necesaria para el método de sesión elegido pertenece a la spec 003.

## Seguridad y privacidad

- Verificar identidad y autorización en Gateway y propietarios; no derivar cuenta de argumentos manipulables.
- Autenticar REST y verificar firma/contexto; rechazar credenciales ausentes o inválidas. Claves solo en entorno no versionado; no presentar el uso local como despliegue seguro de producción.
- Conservar la política de orígenes de la plataforma; CORS no sustituye autenticación.
- No registrar tokens, encabezados de autenticación, cuerpos jurídicos o cadenas de conexión.
- Definir qué operaciones técnicas continúan públicas en local al integrar 003; no trasladar esa excepción automáticamente a operaciones de negocio.

## Observabilidad y manejo de errores

Usar registros existentes con componente, operación, dependencia y categoría segura. Proponer una referencia de correlación propagada por HTTP, sin datos personales. No añadir una plataforma de telemetría.

Toda llamada tiene timeout configurable: 10 segundos REST ordinario, 60 segundos de presupuesto total IA y 60 segundos por archivo. Propagar plazo restante para no sumar 60 segundos por paso; una espera agotada nunca informa éxito. No reintentar escrituras automáticamente.

## Verificación

El desarrollador comprueba los criterios, sin crear archivos de testing ni documentos adicionales. Al implementar, ejecutar `npm run typecheck` y `npm run build` donde existan y correspondan; comprobar las integraciones reales con los servicios.

| Criterio de la spec | Comprobación |
|---|---|
| 1. Fachada única | Inspeccionar las solicitudes de ambos microfrontends: operaciones solo contra GraphQL, sin REST directo a servicios. |
| 2. Identidad inválida | Invocar una operación protegida sin identidad válida: rechazo no autenticado y ninguna llamada al propietario. |
| 3. Propagación | Con identidad válida, comprobar usuario, rol y cuenta recibidos por el servicio, sin registrar credenciales. |
| 4. Cuenta manipulada | Enviar otra cuenta en argumentos/encabezados: el propietario usa únicamente la identidad verificada. |
| 5. Autorización | Provocar rechazo del propietario y comprobar la categoría no autorizado en GraphQL. |
| 6. Indisponibilidad | Detener la dependencia o exceder el timeout en un entorno controlado: error explícito y ningún éxito. |
| 7. Validación y dominio | Provocar ambas categorías y revisar que se conservan sin trazas, SQL ni datos ajenos. |
| 8. REST no autenticado | Llamar a cada contrato entre servicios sin autenticación y comprobar rechazo. |
| 9. Sin negocio | Revisar resolvers: delegación, composición y traducción; las reglas pertenecen al servicio. |
| 10. Contratos previos | Para una operación nueva, comprobar contrato documentado y acordado antes de integrar. |
| 11. Binarios | Base64 GraphQL de extremo a extremo, límites codificados/decodificados y ninguna ruta pública de archivos. |
| 12. Plazos | Superar límites ordinario, IA total y por archivo: error explícito y ningún resultado exitoso ficticio. |

Los criterios de identidad requieren la spec 003. Las tareas futuras registrarán los resultados pendientes y no los marcarán verificados solo por compilar.

## Decisiones

- Mantener el [stack aprobado](../../docs/decisions/0001-stack-y-versiones.md).
- Las decisiones de sesión, integración mínima y alcance diferido constan en el [ADR 0004](../../docs/decisions/0004-integraciones-minimas-del-mvp.md). SDL/OpenAPI, Base64 y contrato único quedan confirmados por el usuario.
- Reutilizar este plan desde las specs funcionales; no redefinir autenticación y categorías por operación.

## Riesgos y preguntas abiertas

- Base64 aumenta volumen y memoria: validar límites antes de decodificar y después, y transferir recursos de una copia offline de forma individual.
- Un timeout de escritura no prueba que no se guardó; no reintentar automáticamente ni prometer ejecución única.
- La solución de identidad es local y mínima; servicios deben validar credencial/firma igualmente.
- Los valores configurados y resultados reales serán verificados por el desarrollador. No quedan preguntas funcionales abiertas.