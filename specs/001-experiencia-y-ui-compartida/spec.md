# Experiencia y UI compartida

## Estado

Lista. Aprobada por el responsable el 2026-11-08; implementación y verificación pendientes.

## Fuente y trazabilidad

- Especificación integral: [Asistente Lex](../../docs/Asistente_Lex_Especificacion_Integral.md), secciones 1.1 (actores y alcance), 3 (React/PWA, Angular y Application Shell) y 3.3 (operaciones permitidas por estado del expediente); requisitos RNF-03 y RNF-11; reglas RN-01, RN-07, RN-09 y RN-13.
- Constitución: [principios VI, X y XI](../../docs/constitution.md).

## Contexto y problema

Asistente Lex tiene dos actores con interfaces en frameworks distintos: el Abogado usa React y el Administrador usa Angular. Las pantallas se construirán a lo largo de varias specs funcionales.

Muchas situaciones se repiten en todas ellas: operaciones en curso, resultados vacíos, errores, acciones no disponibles por el estado del expediente, por falta de conexión o por un agente deshabilitado, y confirmaciones de acciones irreversibles. Si cada spec resuelve estas situaciones por su cuenta, la experiencia será inconsistente y algunas restricciones podrían comunicarse de forma engañosa.

Esta spec define la navegación por rol y los patrones de experiencia compartidos. Las pantallas concretas se especifican en cada funcionalidad.

## Objetivos

- Definir la estructura de navegación del Abogado y del Administrador.
- Establecer una identidad visual y convenciones compartidas por React y Angular.
- Definir patrones comunes para estados de carga, vacío, error y no disponibilidad.
- Definir cómo se comunican las restricciones por permiso, estado del expediente, conectividad y disponibilidad de agentes.
- Definir patrones para formularios, confirmaciones y mensajes de resultado.
- Definir un formato uniforme para fechas e importes en BOB.

## No objetivos

- Diseñar las pantallas específicas de cada funcionalidad.
- Implementar validaciones autoritativas de dominio en la interfaz.
- Implementar el funcionamiento offline (spec 013); aquí solo se define cómo se indica.
- Implementar el inicio de sesión (spec 003).
- Crear aplicaciones móviles nativas.

## Usuarios y escenarios

- Como abogado, quiero una navegación clara entre mis secciones de trabajo, para encontrar cada función sin esfuerzo.
- Como abogado, quiero saber por qué una acción no está disponible, para no intentar operaciones prohibidas ni creer que la aplicación falla.
- Como abogado, quiero confirmar antes de ejecutar una acción irreversible, para no perder información por error.
- Como administrador, quiero un panel con estructura coherente, para gestionar cuentas, parámetros, eventos y agentes.
- Como desarrollador, quiero patrones definidos y reutilizables, para no rediseñar las mismas situaciones en cada spec.

## Requisitos

### Funcionales

- La navegación del Abogado ofrece acceso a las secciones de su ámbito, derivadas de los disparadores de los casos de uso:
  - Personas.
  - Expedientes, con acceso contextual a participantes, actuaciones, notas personales, documentos e informes.
  - Chat.
  - Servicios, cobros, gastos y panel económico.
  - Gestión de descargas offline.
- La navegación del Administrador ofrece acceso a cuentas, parámetros generales, eventos de auditoría y agentes.
- Cada rol solo ve la navegación que le corresponde. Esta separación es de experiencia; la seguridad se aplica en el backend (spec 003).
- Existen patrones comunes para:
  - Operación en curso.
  - Resultado vacío.
  - Error recuperable, con opción de reintentar cuando aplique.
  - Falta de permisos.
  - Recurso inexistente.
  - Servicio no disponible.
- Cuando el contenido jurídico de un expediente no admite escritura por su estado, la interfaz lo presenta como solo lectura e indica el motivo.
- En modo sin conexión se muestra un indicador permanente. Las acciones de escritura, chat y generación de informes aparecen como no disponibles, con su motivo.
- Los elementos visibles pero no seleccionables, como los agentes deshabilitados, se presentan claramente como no disponibles e indican el motivo.
- Las acciones irreversibles o destructivas solicitan confirmación explícita y describen sus consecuencias antes de ejecutarse. Por ejemplo: archivar un expediente elimina sus conversaciones; eliminar una descarga borra la copia local.
- Los mensajes de éxito solo se muestran cuando el backend confirma el resultado. Los fallos y resultados parciales se comunican de forma explícita.
- Los formularios muestran los errores de validación junto a los campos afectados y conservan los datos ingresados tras un error.
- Fechas e importes en BOB se presentan con un formato uniforme en ambos microfrontends.
- La interfaz del MVP está únicamente en español.
- La identidad visual usa negro y dorado en marca y navegación, con contenido y formularios sobre fondo claro. Se usa el [logotipo existente](../../src/frontend/shell/src/static/lex-ai-logo.png) y tipografía del sistema, sin fuentes externas ni selector de temas.
- Las fechas civiles se muestran como `dd/MM/yyyy`; los eventos, como `dd/MM/yyyy HH:mm`, en formato de 24 horas y zona `America/La_Paz`. Las fechas civiles no se desplazan por zona horaria.
- Los importes se muestran como `BOB 1.234,56`: código antes del importe, punto de miles, coma decimal y dos decimales. Este formato no define reglas de cálculo o redondeo de dominio.
- Los patrones y convenciones quedan documentados en el plan de esta spec, para que los planes funcionales puedan referenciarlos.

### No funcionales

- Consistencia: React y Angular comparten identidad visual, terminología y patrones.
- Privacidad: los mensajes de error y los estados no revelan contenido privado ni detalles internos del sistema.
- Autoridad de reglas: las validaciones de la interfaz mejoran la experiencia, pero no sustituyen las del servicio propietario.
- Dispositivos: soporte completo del Abogado en escritorio, tableta y móvil desde 360 px de ancho de ventana CSS; Administrador solo en escritorio desde 1024 px.
- Accesibilidad: buenas prácticas básicas de semántica, teclado, foco visible, etiquetas, contraste legible y errores comprensibles, sin exigir ni declarar conformidad con un nivel WCAG.

## Criterios de aceptación

- [ ] Dado un abogado autenticado, cuando abre la aplicación, entonces ve la navegación del abogado con sus secciones y no ve opciones administrativas.
- [ ] Dado un administrador autenticado, cuando abre la aplicación, entonces ve la navegación administrativa y no ve las secciones del abogado.
- [ ] Dado un expediente Cerrado o Archivado, cuando el abogado consulta su contenido jurídico, entonces las acciones de escritura no están disponibles y se indica el motivo.
- [ ] Dado el modo sin conexión, cuando el abogado navega, entonces ve el indicador de modo sin conexión y las acciones de escritura, chat y generación de informes aparecen no disponibles con su motivo.
- [ ] Dado un agente deshabilitado, cuando aparece en un selector, entonces es visible, no puede seleccionarse y se indica el motivo.
- [ ] Dada una consulta en curso, sin resultados o fallida, cuando se presenta, entonces se usa el patrón común correspondiente en React y en Angular.
- [ ] Dada una acción irreversible, cuando el usuario la inicia, entonces se solicita confirmación con sus consecuencias; y si cancela, la acción no se ejecuta.
- [ ] Dada una operación fallida o completada parcialmente, cuando finaliza, entonces no se muestra un mensaje de éxito y se informa el resultado real.
- [ ] Dado un formulario con errores de validación, cuando se envía, entonces los errores se muestran junto a los campos afectados y los datos ingresados se conservan.
- [ ] Dados importes en BOB y fechas, cuando se presentan en cualquier microfrontend, entonces usan el mismo formato.
- [ ] Dado el plan de esta spec, cuando un plan funcional necesita un patrón compartido, entonces puede referenciarlo sin redefinirlo.
- [ ] Dadas ambas interfaces, cuando se navega, entonces están en español y usan logotipo, negro/dorado y tipografía del sistema acordados, con áreas de lectura claras.
- [ ] Dada la interfaz del Abogado desde 360 px y la administrativa desde 1024 px, cuando se usan las pantallas, entonces sus controles y contenidos se adaptan al ámbito de soporte acordado.
- [ ] Dados formularios y acciones, cuando se usan con teclado, entonces se identifican etiquetas, foco y errores sin depender solo del color.

## Dependencias

- Spec 000: Application Shell y microfrontends montados.
- Spec 002: categorías de error que la interfaz traduce a estados comunes.
- Spec 003: rol del usuario autenticado para mostrar la navegación correspondiente.

## Preguntas abiertas

Ninguna de alcance para esta fase. La spec 003 diseña e implementa la pantalla de acceso y el login; esta spec aporta sus convenciones visuales y de navegación.
