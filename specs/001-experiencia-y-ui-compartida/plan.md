# Plan: Experiencia y UI compartida

## Estado

En progreso. Plan aprobado por el responsable el 2026-11-08; revision ejecutiva autorizada el 2026-11-10, implementada y desplegada localmente. Sesion y destinos disponibles integrados; aceptacion completa de navegacion/offline y matriz de estados pendiente.

## Resumen técnico

Definir una base de experiencia común para el Application Shell, el microfrontend React del Abogado y el microfrontend Angular del Administrador. Conservar single-spa, TypeScript y las rutas base `/abogado` y `/admin` de la [spec 000](../000-plataforma-base/plan.md).

La solución comparte convenciones, estilos y pequeñas funciones independientes del framework; cada microfrontend implementa sus componentes de presentación con su framework. No se crea un framework de UI, una biblioteca completa de componentes, un microfrontend adicional ni un motor de reglas.

Este plan es la referencia de navegación, estados, formularios, confirmaciones y formatos para las specs funcionales. No diseña sus pantallas, implementa autenticación, define operaciones de negocio ni construye el modo offline.

Se aplican los principios I, V, VI, IX, X, XI y XII de la [constitución](../../docs/constitution.md): desarrollo desde una spec aprobada, integración mediante GraphQL, autoridad del backend, privacidad y comunicación explícita de fallos.

## Diseño y componentes

### Implementación actual y límites

- Recursos comunes en [shared](../../src/frontend/shared/): CSS, formatos exactos, estados y contrato de navegación de presentación. Los componentes nativos están en [React](../../src/frontend/abogado/src/ui.tsx) y [Angular](../../src/frontend/admin/src/app/ui.components.ts).
- El Shell distribuye CSS/logotipo una vez y muestra fallos de carga o dirección desconocida sin detalles internos. La sesion real controla el montaje y la cabecera de cuenta. Se conservan `/abogado` y `/admin`, sin añadir pantallas funcionales ficticias.
- La galería de React usa un flag de compilación de desarrollo; Angular usa `isDevMode()`. Ninguna se renderiza en producción ni ejecuta operaciones reales.
- Angular utiliza el input `controlId` para controles/diálogos, evitando duplicar el `id` del host y romper etiquetas o referencias ARIA.
- Los formularios son controlados por sus consumidores; el kit no limpia valores ni ejecuta backend. `OperationOutcome` es un contrato UI, no el resultado GraphQL definitivo de 002; éxito exige confirmación del consumidor y fallo parcial/incierto se mantiene explícito.
- Los componentes de navegación aceptan `SessionPresentation` y destinos reales aportados por las funcionalidades. La sesion real de 003 y destinos de 004-012 ya estan integrados; 001-T03 sigue abierta por las pantallas de 013-016, no por ausencia de autenticacion.
- Docker usa contexto común `src/frontend` con un Dockerfile por componente para copiar los recursos fuente. No se comparten instalaciones npm ni se cambia el despliegue de los servicios.

### Responsabilidades y reutilización

| Componente | Responsabilidad |
|---|---|
| Application Shell | Montar la aplicación correspondiente al contexto de sesión de la spec 003; sustituir la navegación provisional entre ambos roles; cargar la base visual común. |
| React / Abogado | Navegación jurídica y económica; componentes de experiencia comunes aplicados a sus funcionalidades. |
| Angular / Administrador | Navegación administrativa; componentes equivalentes con las mismas convenciones y mensajes. |
| Recursos compartidos | Variables CSS, estilos básicos y funciones TypeScript puras de presentación que realmente usen ambos microfrontends, especialmente formatos y traducción de categorías de error. |

Ubicar los recursos independientes del framework en `src/frontend/shared/`, consumidos al construir los proyectos existentes, sin servidor ni publicación de paquetes. Es reutilización de código fuente, no una plataforma de componentes que requiera un ADR propio.

La base CSS se carga una sola vez desde el Shell. Limitar los estilos globales a variables y elementos básicos; usar clases con prefijo `al-` para los patrones compartidos y estilos locales para cada pantalla. Evitar selectores globales que alteren componentes ajenos.

Los componentes React y Angular se mantienen separados. Compartir comportamiento de presentación puro cuando evite duplicación real, no intentar compartir árboles de componentes, inyección de dependencias ni estado de negocio. Reutilizar las dependencias actuales; cualquier dependencia adicional deberá justificarse por una necesidad concreta.

### Navegación por rol

| Rol | Navegación principal | Acceso contextual |
|---|---|---|
| Abogado | Personas; Expedientes; Chat; Servicios; Cobros; Gastos; Panel económico; Descargas offline. | Desde un expediente: participantes, actuaciones, notas personales, documentos e informes. |
| Administrador | Cuentas; Parámetros generales; Eventos de auditoría; Agentes. | Acciones de gestión dentro de cada sección, definidas por sus specs. |

- Mantener los prefijos `/abogado` y `/admin`. Las specs funcionales concretan sus subrutas, parámetros y pantalla inicial, sin crear rutas ficticias aquí.
- Mostrar sección activa, título de página y enlaces contextuales para volver al listado o expediente cuando corresponda.
- Usar enlaces para navegación y botones para acciones. No ofrecer enlaces administrativos al Abogado ni accesos al contenido jurídico o económico al Administrador.
- La navegación depende del rol validado que entregue la spec 003, no de la URL ni de un rol elegido por el usuario.
- Mientras se resuelve la sesión, no mostrar navegación ni contenido privado de ninguno de los roles. Ante sesión ausente o expirada, delegar el acceso en la spec 003.
- Una entrada directa a la ruta del otro rol no debe mostrar ni mantener montada su interfaz privada. La integración de sesión de la spec 003 resuelve el acceso; el backend sigue autorizando cada operación.
- No construir pantallas vacías para todas las funcionalidades. Sus entradas se incorporan con la spec correspondiente; la navegación completa se verifica cuando esas integraciones estén disponibles.

### Identidad visual y terminología

#### Revision ejecutiva 2026-11-10

El responsable prioriza el trabajo diario del Abogado y permite reorganizar la presentacion conservando funciones. Se refina el sistema existente, sin reemplazar la identidad ni introducir fuentes externas. Modo Impeccable: Operate.

- Direccion: espacio de trabajo ejecutivo, negro/dorado en marca y navegacion; contenido blanco sobre gris neutro, bordes precisos y jerarquia compacta.
- Primera vista: cabecera de cuenta compacta, navegacion lateral en escritorio y horizontal adaptable, titulo y accion principal claros. Sin indicadores ficticios ni funciones futuras simuladas.
- Recorrido: Mi espacio ofrece accesos reales; el expediente organiza sus secciones sin perder borradores al cambiar de seccion. Se mantienen los contratos, restricciones y confirmaciones existentes.
- Verificacion: compilacion por superficie, interacciones reales, teclado y capturas agrupadas en escritorio/movil. La aceptacion integrada de offline/ERP sigue condicionada a 013-016.

La navegacion React usa el historial interceptado por el Shell, sin importar otra instancia de single-spa; conserva clics modificados, destinos externos y descargas. Los paneles de expediente usan pestañas con flechas, Inicio/Fin y un unico panel accesible; `hidden` mantiene montados los consumidores para conservar borradores al cambiar de seccion. En movil la franja se desplaza horizontalmente, sin ampliar la pagina.

Mi espacio muestra accesos a Personas/Expedientes y disponibilidad real de agentes, sin selector inerte ni cifras inventadas. `useOnline` reutiliza eventos del navegador para indicador persistente y bloqueos de escrituras de Personas, Expedientes y Participantes; no crea persistencia offline. Se justifica `lucide-react` 1.71.0 para iconos de navegacion y herramientas React, sin cambiar versiones existentes.

Ajustes posteriores solicitados el mismo día: cabecera reducida a marca y menú «Mi cuenta», sin enlace aislado «Contraseña»; eliminado el botón duplicado «Ver expedientes» de la portada. El chat contextual de 011 usa historial lateral plegable en móvil, mensajes diferenciados y compositor inferior; conserva reglas, fuentes, borradores y ausencia de streaming. Login y logout corrigen el destino en 003; primera carga administrativa corregida en el resolver de 004.

Usar una base pequeña de variables CSS para colores semánticos, texto, fondo, bordes, espaciado, tipografía y foco. Identidad acordada: negro/dorado en marca y navegación, fondo claro en contenido y formularios, [logotipo existente](../../src/frontend/shell/src/static/lex-ai-logo.png) y tipografía del sistema. Interfaz solo en español. No añadir temas, modo oscuro, fuentes externas ni personalización por cuenta.

Conservar los términos de las specs: Abogado, Administrador, Expediente, Actuación, Nota personal, Documento, Informe, Agente y BOB. Usar mensajes breves que expliquen el resultado y la acción posible; no depender únicamente de colores o iconos.

Usar HTML semántico, etiquetas asociadas, navegación por teclado, foco visible y contraste legible. Se exigen buenas prácticas básicas, sin conformidad ni certificación WCAG. Soporte del Abogado en escritorio/tableta/móvil desde 360 px CSS; Administrador solo escritorio desde 1024 px.

### Patrones de estados

Los siguientes patrones se aplican a una página, sección u operación según el alcance del resultado, sin sustituir toda la pantalla por el fallo de una sección independiente.

| Situación | Presentación y comportamiento común |
|---|---|
| Operación en curso | Mostrar «Cargando…» o un texto específico de la acción. Evitar envíos duplicados mientras haya una solicitud pendiente; indicar actividad en la región afectada. No informar éxito por iniciar la solicitud. |
| Resultado vacío | Explicar que no hay resultados. Ofrecer creación solo si está permitida y corresponde a la funcionalidad; con filtros activos, ofrecer modificarlos o limpiarlos. Un error nunca se representa como lista vacía. |
| Error recuperable | Mostrar mensaje seguro y ofrecer «Reintentar» cuando repetir la operación sea válido. Conservar los datos del formulario. |
| Falta de permisos | Mostrar «No tienes permiso para realizar esta acción» sin contenido protegido. No sugerir que reintentar resuelve la autorización. |
| Recurso inexistente | Mostrar que el recurso no está disponible y ofrecer volver al contexto válido. No revelar si pertenece a otra cuenta. |
| Servicio no disponible | Informar que la operación no pudo completarse; ofrecer reintento solo cuando sea seguro. No confundirlo con el modo sin conexión. |
| Fallo parcial | Indicar que la operación no se completó y describir solo las partes confirmadas que puedan mostrarse al usuario. No presentar éxito global. La spec funcional determina cómo consultar el estado y continuar. |

### Disponibilidad y restricciones

- **Estado del expediente:** el contenido jurídico de expedientes Cerrados o Archivados se presenta como solo lectura, con el estado y el motivo visibles. Deshabilitar sus acciones de escritura, sin extender automáticamente esa restricción a operaciones económicas u otras acciones: sus specs definen las reglas aplicables.
- **Sin conexión:** mantener visible el indicador «Sin conexión: consulta de solo lectura» en el ámbito del Abogado. Deshabilitar escrituras al backend, chat y generación de informes, indicando «No disponible sin conexión». No crear colas, sincronización, descargas ni almacenamiento local en esta spec.
- **Acciones locales:** no confundir una escritura al backend con la eliminación de una copia local. La disponibilidad y ejecución de la gestión de descargas corresponden a la spec 013.
- **Agente deshabilitado:** conservarlo visible en el selector, marcarlo como no disponible y mostrar el motivo. Impedir su selección también mediante teclado; no depender solo de un estilo visual.
- **Motivos:** asociar una explicación visible a cada acción no disponible, sin depender de un tooltip sobre un botón deshabilitado. Si concurren restricciones, comunicar los motivos aplicables sin mensajes contradictorios.
- **Cambios durante una operación:** usar el contexto más reciente antes del envío. Si el backend rechaza una acción que parecía disponible, mostrar el rechazo real y actualizar el contexto cuando corresponda. La interfaz nunca sustituye la validación del servicio propietario.

### Formularios, confirmaciones y resultados

- Etiquetar los campos y explicar su formato cuando sea necesario. Validar entradas para mejorar la experiencia, sin reproducir un motor de reglas del dominio.
- Mostrar errores junto al campo afectado y asociarlos semánticamente. Si el backend no identifica un campo o devuelve un error general, mostrarlo en el formulario; no asignarlo arbitrariamente.
- Conservar valores tras errores de validación, transporte o dominio. No limpiar el formulario hasta que la operación se confirme o el usuario lo descarte explícitamente.
- Antes de una acción irreversible o destructiva, abrir una confirmación con nombre de la acción, recurso y consecuencias. Usar botones explícitos, por ejemplo «Cancelar» y «Archivar expediente», no «Aceptar» genérico.
- Archivar un expediente debe advertir que elimina sus conversaciones. Eliminar una descarga debe advertir que borra la copia local, sin implicar que elimina el expediente remoto.
- Cancelar o cerrar la confirmación no ejecuta ninguna operación. Gestionar el foco al abrir y cerrar el diálogo y permitir cancelarlo con teclado.
- Confirmar inicia la operación, pero no representa éxito. Mantener la acción pendiente y bloquear envíos duplicados hasta obtener un resultado.
- Mostrar éxito solo cuando el contrato confirme el resultado requerido y no haya un fallo de la operación. La presencia de `data` en una respuesta GraphQL no basta si también contiene errores relevantes.
- Si se pierde la respuesta después de enviar una escritura, indicar que no se pudo confirmar el resultado. No afirmar que nada cambió ni repetir la escritura automáticamente; la spec funcional define cómo comprobar su estado o reintentar con seguridad.
- Mantener los errores y resultados parciales visibles hasta que el usuario pueda comprenderlos y actuar; no comunicarlos únicamente mediante avisos que desaparecen.

### Fechas e importes en BOB

Centralizar el formato con `Intl.DateTimeFormat` e `Intl.NumberFormat`, sin añadir una biblioteca de fechas o monetaria. React y Angular consumen las mismas opciones, no sus valores predeterminados por separado. Preservar importes como cadenas decimales exactas: no convertirlos indiscriminadamente a `Number`; combinar partes enteras exactas y fracción cuando sea necesario para mantener precisión y la forma `BOB 1.234,56`.

**Convenciones confirmadas:**

| Dato | Convención propuesta | Ejemplo |
|---|---|---|
| Fecha civil | Día, mes y año con dos dígitos para día y mes; `dd/MM/yyyy`. | `08/11/2026` |
| Fecha y hora de un evento | Fecha anterior más hora y minutos en formato de 24 horas; zona `America/La_Paz`. | `08/11/2026 18:53` |
| Importe | Código antes del valor, punto de miles, coma decimal y dos decimales; no depender de opciones predeterminadas del navegador. | `BOB 1.234,56` |

No convertir fechas civiles en instantes que puedan cambiar de día por una zona horaria. Para eventos, el contrato debe identificar el instante y su zona u offset; el formato de transporte corresponde a la spec 002.

El importe sigue siendo un dato monetario del servicio propietario: esta spec solo define su presentación, no cálculos, redondeos de negocio ni conversión de moneda. Coordinar con la spec 002 su representación para evitar pérdida de precisión.

Un valor ausente se muestra como «Sin dato» cuando el contrato admite su ausencia; un valor inválido se trata como error de datos. Nunca sustituir importes inválidos por cero ni fechas inválidas por la fecha actual.

## Flujo de datos

1. La spec 003 entrega el contexto de sesión validado al Shell; este muestra y monta la interfaz del rol correspondiente.
2. La pantalla obtiene sus datos mediante el Gateway GraphQL. Sus contratos funcionales aportan estados del expediente, disponibilidad de agentes y resultados de operaciones.
3. El adaptador de presentación traduce las categorías de la spec 002 al patrón correspondiente y formatea fechas e importes, sin modificar los datos de dominio.
4. El contexto de conectividad de la spec 013 alimenta el indicador y las restricciones offline. Un fallo de un servicio no se interpreta automáticamente como pérdida de conexión.
5. La interacción actualiza estado local de presentación: carga, campos, confirmación y mensaje. Una acción confirmada se envía al Gateway; el resultado determina el mensaje final.

No hay un almacén global de datos de negocio compartido entre React y Angular. Mantener el estado de presentación en la pantalla o componente que lo necesita; pasar únicamente el contexto transversal necesario mediante las interfaces de integración.

## Interfaces y contratos

Esta spec no añade operaciones GraphQL, endpoints REST ni eventos de negocio. Antes de integrar, acordar estos límites con las specs propietarias:

| Dependencia | Información necesaria | Límite de esta spec |
|---|---|---|
| 000 — Plataforma base | Ciclo de montaje y desmontaje de single-spa; rutas base y carga de recursos. | Adaptar la presentación sin cambiar el stack ni el despliegue de los servicios. |
| 002 — Gateway y contratos base | Categoría segura de error, mensaje, errores de campo cuando existan y resultado completo o parcial; formatos de transporte de fechas e importes. | Traducir a presentación, sin inventar códigos, campos GraphQL ni reglas del gateway. |
| 003 — Autenticación y acceso | Sesión pendiente, autenticada o ausente; rol validado; notificación de cierre o expiración. | Navegación y limpieza de presentación privada; no emitir, almacenar ni validar credenciales. |
| 013 — Expedientes offline | Estado de conectividad y contexto de consulta local conforme a su contrato. | Indicador y motivos de no disponibilidad; no implementar la PWA. |
| Specs funcionales | Estado del recurso, acciones permitidas y consecuencias de operaciones destructivas. | Aplicar los patrones sin crear operaciones ni autorizar acciones. |

El mapeo de errores deberá cubrir validación, no autenticado, no autorizado, recurso inexistente, conflicto de negocio, servicio no disponible/timeout y fallo parcial. Un error no reconocido se muestra como error explícito seguro, nunca como éxito o resultado vacío.

Los nombres y tipos definitivos de los contratos se documentan en sus planes antes de integrar. Para desarrollar presentación aislada pueden utilizarse datos de demostración en el entorno de desarrollo; no deben convertirse en una sesión ficticia ni un fallback de producción.

## Persistencia y migraciones

No aplica: no se crean entidades, tablas, índices, migraciones ni almacenamiento de preferencias. El estado de formularios, diálogos y mensajes vive en memoria.

No almacenar contenido privado, sesión o datos de expedientes en `localStorage` para resolver la UI compartida. La persistencia offline es responsabilidad de la spec 013.

## Seguridad y privacidad

- El Shell y la navegación no constituyen una barrera de seguridad. Gateway y servicios autorizan cada operación y mantienen el aislamiento entre cuentas, conforme a las specs 002 y 003.
- Al cerrar sesión o cambiar el contexto de cuenta, desmontar o limpiar la presentación privada conforme al contrato de sesión. No mantener información de la sesión anterior en formularios o mensajes.
- Mostrar únicamente mensajes seguros; no renderizar respuestas internas, trazas, consultas, tokens o contenido de otra cuenta. Usar interpolación escapada del framework, no HTML recibido del backend.
- No incluir datos jurídicos, nombres de personas, documentos, conversaciones ni credenciales en registros de errores de UI.
- La indisponibilidad por permisos o recurso inexistente no debe permitir inferir contenido protegido.

## Observabilidad y manejo de errores

- Tratar explícitamente los errores de transporte y los errores GraphQL aunque la respuesta HTTP sea exitosa. No convertir excepciones en valores vacíos o éxitos aparentes.
- Registrar fallos técnicos con el mecanismo existente del componente, limitados a categoría, componente y referencia de correlación si la spec 002 la proporciona. No registrar cuerpos completos de solicitudes o respuestas.
- Si falla el montaje de un microfrontend, el Shell muestra un estado seguro de servicio no disponible, sin exponer detalles técnicos ni conservar contenido privado anterior.
- Las consultas pueden ofrecer reintento manual; las escrituras solo cuando su spec define que es seguro. No añadir reintentos automáticos genéricos.
- No crear una plataforma de telemetría, métricas o alertas nueva para esta spec. El resultado observable principal es un estado y mensaje fieles a la operación.

## Verificación

La verificación corresponde al desarrollador, sin crear archivos de testing ni documentos adicionales. Al implementar, ejecutar los comandos existentes `npm run typecheck` y `npm run build` en Shell, Abogado y Admin si fueron afectados; estos comandos no sustituyen las comprobaciones de comportamiento.

| Criterio de aceptación de la spec | Comprobación y resultado esperado |
|---|---|
| 1. Navegación del Abogado | Con una sesión válida de Abogado, comprobar sus secciones y ausencia de opciones administrativas; abrir directamente `/admin` y comprobar que no muestra la interfaz privada del otro rol. |
| 2. Navegación del Administrador | Con una sesión válida de Administrador, comprobar cuentas, parámetros, eventos y agentes; ausencia de secciones del Abogado y de su contenido al abrir `/abogado`. |
| 3. Expediente Cerrado o Archivado | Comprobar ambos estados: contenido jurídico consultable y acciones de escritura deshabilitadas con motivo visible. Comprobar que una operación rechazada tras cambiar el estado muestra el rechazo, no éxito. |
| 4. Modo sin conexión | Activar el contexto offline de la spec 013: indicador persistente al navegar y escrituras, chat e informes no disponibles con motivo. Comprobar que una caída de un servicio no activa por sí sola el modo offline. |
| 5. Agente deshabilitado | Comprobar que sigue visible, explica su indisponibilidad y no puede seleccionarse con ratón ni teclado. |
| 6. Estados comunes | En React y Angular, comprobar carga, vacío, error recuperable, falta de permisos, recurso inexistente y servicio no disponible; mismas convenciones y ausencia de detalles internos. Reintentar una consulta recuperable y comprobar su resultado. |
| 7. Confirmación irreversible | Iniciar archivado y eliminación de descarga: comprobar consecuencias específicas. Cancelar y cerrar sin solicitud ni eliminación; confirmar y comprobar un único inicio de operación. |
| 8. Fallo o resultado parcial | Provocar fallo, resultado parcial y pérdida de respuesta tras una escritura: no aparece éxito; se comunica el resultado confirmado o la incertidumbre, sin repetir la escritura automáticamente. |
| 9. Validación de formulario | Provocar errores locales y del backend: mensajes junto a los campos cuando están identificados y valores conservados. Un error general permanece visible en el formulario. |
| 10. Fechas e importes | Presentar los mismos datos en React y Angular y comparar con las convenciones exactas confirmadas. Incluir fecha civil, instante cercano al cambio de día, importe cero, negativo si el dominio lo admite, miles y decimales; ausencia permitida e inválidos no se convierten en valores ficticios. |
| 11. Referencia reutilizable | Comprobar que un plan funcional puede enlazar a las secciones de patrones, restricciones, formularios y formatos, describiendo solo sus particularidades y sin redefinir convenciones. |
| 12. Identidad | Ambas interfaces en español, logotipo negro/dorado y tipografía del sistema; contenido sobre fondo claro. |
| 13. Dispositivos | Comprobar Abogado desde 360 px y Administrador desde 1024 px, sin controles inaccesibles por el diseño. |
| 14. Accesibilidad básica | Revisar teclado, foco, etiquetas y errores comprensibles, sin declarar certificación WCAG. |

La presentación aislada no demuestra las integraciones: los criterios por rol requieren la spec 003; las categorías reales de error, la spec 002; el modo offline y la eliminación local, la spec 013; el archivado y los agentes, sus specs funcionales. Registrar las verificaciones pendientes en `tasks.md` al desglosar el trabajo y no marcar la funcionalidad como completa antes de comprobarlas.

## Decisiones

- Mantener el stack establecido por el [ADR 0001](../../docs/decisions/0001-stack-y-versiones.md) y la organización de componentes del [ADR 0002](../../docs/decisions/0002-monorepo-y-entorno-local.md).
- Compartir CSS y funciones puras como recursos fuente, conservando componentes nativos React/Angular. Evita componentes universales y paquetes publicados; no crear biblioteca más amplia ni ADR por un detalle ordinario de reutilización.
- Idioma, dispositivos, accesibilidad básica, identidad y formatos quedan confirmados en la spec tras la entrevista; no requieren un ADR por mensaje o componente.
- La pantalla de acceso y el login se implementan en 003; esta spec define sus convenciones.

## Riesgos y preguntas abiertas

| Riesgo o pregunta | Resolución o mitigación |
|---|---|
| Alcance confirmado | Español; marca negro/dorado existente; tipografía del sistema; fondos de lectura claros; soporte por rol y formatos descritos arriba. |
| Dependencias 001 ↔ 003 y 002 ↔ 003 | Integrar el login tradicional y la sesión de servidor de 003; SSO está diferido, no requiere un flujo provisional. |
| Compatibilidad visual y de formato | El desarrollador verifica los anchos, teclado y salidas exactas; documentar no demuestra cumplimiento. |
| Navegación completa antes de disponer de las funcionalidades | Integrar cada entrada con su spec; no simular funcionalidades listas. Mantener pendiente la aceptación de navegación completa hasta disponer de sus destinos. |
| Deriva visual entre frameworks o colisiones CSS | Usar la misma base de estilos y formatos, revisar los mismos escenarios en ambas interfaces y mantener estilos de pantalla locales. |
| Restricciones mostradas con información desactualizada | El servicio propietario vuelve a validar; mostrar su rechazo y refrescar el contexto según la funcionalidad, sin ampliar reglas en el frontend. |
| Confundir un fallo de servicio con offline o una escritura incierta con fracaso definitivo | Separar conectividad de disponibilidad, no informar éxito sin confirmación y delegar la recuperación de escrituras a la spec funcional. |