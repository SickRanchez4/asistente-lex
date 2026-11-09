
# Asistente Lex — Constitución del Proyecto

**Versión:** 1.0.0
**Estado:** Propuesta pendiente de aprobación

## Función de los documentos

- Esta constitución establece las reglas transversales de trabajo,
  arquitectura y gobernanza.
- La [especificación integral aprobada](./Asistente_Lex_Especificacion_Integral.md)
  define el alcance, los requisitos y los casos de uso del producto.
- Las specs desarrollan capacidades concretas mediante `spec.md`,
  `plan.md` y `tasks.md`.
- Los Architecture Decision Records (ADR) documentan decisiones
  arquitectónicas significativas, sus alternativas y consecuencias.
- Una contradicción entre documentos DEBE aclararse y resolverse
  mediante aprobación del responsable del proyecto; ningún documento
  autoriza a ignorar silenciosamente otro.

## Principios fundamentales

### I. Desarrollo dirigido por especificaciones (SDD)

- Toda funcionalidad DEBE estar respaldada por una especificación aprobada.
- No se DEBE implementar código que contradiga la especificación vigente.
- Cada especificación funcional DEBE identificar sus requisitos,
  casos de uso y reglas de negocio relacionados.
- Las ambigüedades funcionales DEBEN resolverse antes de implementar.
- Los cambios de alcance DEBEN documentarse y aprobarse.

El desarrollo seguirá este flujo:

**Spec → Plan → Tasks → Implementación → Verificación**.

- Spec corresponde a `spec.md`: alcance, requisitos y criterios de aceptación.
- Plan corresponde a `plan.md`: diseño técnico, diseño UI y contratos
  cuando apliquen, además de la forma de verificar el resultado.
- Tasks corresponde a `tasks.md`: pasos concretos con resultados verificables.
- Implementación corresponde al código; NO requiere un archivo Markdown propio.
- Verificación corresponde a la comprobación del resultado por el desarrollador;
  NO requiere un archivo Markdown adicional.

### II. Metodología ICONIX

- El análisis funcional DEBE basarse en casos de uso.
- El modelo de dominio DEBE reflejar los conceptos del negocio.
- Los casos de uso complejos DEBEN contar con análisis de robustez
  y diagramas de secuencia.
- Los diagramas DEBEN mantener consistencia con los flujos descritos.
- Se utilizará Mermaid para documentar los diagramas.
- No se generarán diagramas innecesarios para operaciones genéricas.

### III. Principios de arquitectura

Todos los microservicios DEBEN aplicar:

- Domain-Driven Design (DDD).
- Arquitectura Hexagonal.
- Clean Architecture.
- Principios SOLID.

Se DEBE mantener la separación entre:

- Dominio.
- Casos de uso de aplicación.
- Puertos e interfaces.
- Adaptadores e infraestructura.

La lógica de negocio NO DEBE depender directamente
de frameworks, controladores o bases de datos.

### IV. Límites de los microservicios

El sistema tendrá cuatro microservicios de negocio.

**MS-01 — Spring Boot / Java**
- Identidad y usuarios.
- Expedientes jurídicos.
- Personas y participantes.
- Actuaciones y notas.
- Preparación de datos jurídicos para consulta offline.

**MS-02 — Next.js / TypeScript**
- Gestión documental.
- Documentos y fotografías.
- Informes jurídicos.
- Exportación y consulta de informes guardados.

**MS-03 — PHP**
- Servicios jurídicos y honorarios.
- Cobros.
- Gastos.
- Panel económico.

**MS-04 — Python**
- Agentes de inteligencia artificial.
- Conversaciones jurídicas.
- Análisis mediante IA.
- Herramientas MCP.

Cada servicio DEBE ser propietario de su lógica de negocio.

El servicio propietario DEBE realizar la validación autoritativa
de sus reglas de dominio.

Los consumidores pueden repetir validaciones para mejorar la experiencia
o detectar entradas inválidas, pero NO DEBEN sustituir la validación
del propietario ni definir reglas contradictorias.

### V. Comunicación entre componentes

- React y Angular DEBEN consumir el backend mediante GraphQL.
- Apollo Server será la fachada GraphQL unificada.
- Los microservicios se comunicarán mediante REST/HTTP.
- El Gateway NO DEBE contener reglas de negocio.
- Los contratos GraphQL y REST DEBEN definirse antes
  de implementar las integraciones.
- No se DEBE acceder directamente a la base de datos
  de otro microservicio.

### VI. Arquitectura frontend

- El Application Shell utilizará single-spa y TypeScript.
- React implementará las funcionalidades del abogado.
- Angular implementará el panel de administración.
- Ambos compartirán convenciones de UI/UX.
- Cada pantalla DEBE estar respaldada por una spec funcional
  y seguir las convenciones UI/UX compartidas.
- No se exige una spec UI independiente por pantalla; el diseño específico
  se describe en el plan de la funcionalidad cuando corresponda.
- Los microfrontends NO DEBEN asumir la autoridad sobre reglas de dominio;
  sus validaciones de experiencia no sustituyen las del backend.

### VII. Persistencia y propiedad de datos

- El proyecto utilizará PostgreSQL, MongoDB y DynamoDB.
- Cada almacenamiento DEBE tener una responsabilidad documentada.
- Cada entidad tendrá un servicio propietario.
- Los demás servicios accederán a los datos mediante contratos API.
- Los cambios en el modelo de datos DEBEN reflejarse
  en las especificaciones correspondientes.

### VIII. Alcance del MVP

La fuente de verdad funcional será la especificación ICONIX
aprobada de Asistente Lex.

Se DEBE respetar el alcance definido para:

- Gestión jurídica.
- Gestión documental.
- Consulta offline de solo lectura.
- Informes jurídicos.
- ERP jurídico.
- Agentes Penalista y Civilista.
- Administración de la aplicación.

Las siguientes capacidades quedan fuera del MVP:

- Entrenamiento y desarrollo de modelos propios de ML/DL.
- Procesamiento visual avanzado mediante TensorFlow.
- Modelos de IA locales.
- Automatización de procesos de negocio end-to-end.

Las capacidades diferidas NO DEBEN implementarse
sin una modificación aprobada del alcance.

### IX. Gobernanza de especificaciones

La constitución tiene carácter obligatorio para
todas las especificaciones y componentes del proyecto.

Para implementar una funcionalidad se requiere:

1. Especificación funcional validada.
2. Casos de uso y reglas de negocio definidos.
3. Diseño UI cuando corresponda.
4. Contratos de comunicación definidos.
5. Diseño técnico coherente con la arquitectura.
6. Tareas de implementación identificadas.

Las decisiones arquitectónicas significativas DEBEN documentarse
mediante un ADR. No se exige un ADR por cada detalle de implementación.

Un ADR documenta una decisión, pero NO autoriza por sí mismo
una desviación de la constitución ni del alcance aprobado.

Las versiones de herramientas, las elecciones técnicas aún pendientes
y los comandos de ejecución se definirán en los planes y ADR pertinentes,
sin convertir esta constitución en un inventario de implementación.

Toda modificación funcional DEBE actualizar las
especificaciones afectadas y su trazabilidad.

El incumplimiento de un principio constitucional
requiere una modificación explícita y aprobada
de esta constitución.

### X. Seguridad y privacidad

- La autenticación y la autorización DEBEN comprobarse en el backend
  y en los servicios responsables de las operaciones.
- La separación de interfaces React y Angular NO constituye
  una barrera de seguridad por sí sola.
- Se DEBE mantener el aislamiento entre cuentas en consultas,
  modificaciones y acceso a recursos.
- Los secretos y las credenciales NO DEBEN incorporarse al código
  ni exponerse en registros, errores o respuestas.
- Los registros, errores y respuestas NO DEBEN revelar contenido privado
  a destinatarios no autorizados.
- Las reglas de privacidad de cada funcionalidad DEBEN reflejarse
  en sus criterios de aceptación.

### XI. Coordinación y manejo de fallos

- Los flujos entre servicios DEBEN contemplar los fallos parciales
  y comunicar explícitamente los errores.
- No se DEBE informar éxito cuando el resultado requerido no se completó.
- No se DEBEN asumir transacciones atómicas entre servicios
  ni garantías de consistencia superiores a las del alcance aprobado.
- El plan de cada flujo multiservicio DEBE definir el resultado esperado
  ante fallos y cómo evitar estados o respuestas engañosos.
- La coordinación técnica NO DEBE introducir automatizaciones
  empresariales autónomas fuera del MVP.

### XII. Calidad y verificación

- Cada spec DEBE contener criterios de aceptación observables y verificables.
- El testing y la ejecución de pruebas son responsabilidad del desarrollador.
- NO se DEBEN crear archivos de testing como parte del trabajo de la IA.
- El desarrollador DEBE comprobar los criterios de aceptación y,
  cuando corresponda, los contratos y los flujos de integración entre servicios.
- El plan DEBE indicar qué resultados se verificarán, sin exigir
  archivos de pruebas ni documentos separados de testing o verificación.
- Las tareas solo se marcarán como verificadas cuando el desarrollador
  confirme su resultado en `tasks.md`.
- El código implementado NO es evidencia suficiente de que una
  funcionalidad funciona o cumple sus criterios.
- Las verificaciones pendientes o fallidas DEBEN quedar explícitas
  en las tareas; no se DEBEN presentar como completadas.

## Gobernanza

- La aprobación de cambios corresponde al responsable del proyecto.
- La constitución se versionará mediante SemVer.
- MAJOR: cambios incompatibles en principios obligatorios.
- MINOR: incorporación de nuevos principios.
- PATCH: correcciones que no alteren las decisiones.
- La implementación no podrá utilizarse para justificar
  retrospectivamente una desviación no aprobada.