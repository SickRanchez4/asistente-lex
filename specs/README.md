# Desarrollo guiado por especificaciones (SDD)

Esta carpeta contiene las especificaciones del producto y el trabajo derivado de ellas. Antes de implementar una funcionalidad, completa y revisa sus documentos en este orden:

1. `spec.md`: define el problema, el alcance y los criterios de aceptación.
2. `plan.md`: registra el enfoque técnico y las decisiones de arquitectura.
3. `tasks.md`: desglosa el plan en pasos pequeños y verificables.
4. Implementa y valida las tareas; actualiza los documentos si cambia el alcance o la solución.

## Al crear o modificar una spec

Consulta las secciones aplicables de la [Especificación Integral de Asistente Lex](../docs/Asistente_Lex_Especificacion_Integral.md) para definir los requisitos y el alcance. Registra sus identificadores en la sección de trazabilidad de `spec.md` y expresa allí los criterios necesarios para implementar la funcionalidad.

Durante la planificación y la implementación, trabaja desde `spec.md`, `plan.md` y `tasks.md`; no es necesario releer el documento integral por defecto. Vuelve a las fuentes al revisar la trazabilidad, cambiar requisitos o resolver una discrepancia, y aclara las diferencias antes de implementar.

## Convenciones

- Usa una carpeta por funcionalidad con identificador numérico consecutivo y nombre breve en kebab-case: `NNN-nombre/`.
- No reutilices identificadores. Registra cada funcionalidad en [`index.md`](./index.md).
- Mantén `spec.md`, `plan.md` y `tasks.md` en la carpeta de su funcionalidad.
- Usa `decisions/` para decisiones arquitectónicas que solo afecten a esa funcionalidad. Para decisiones que afecten al proyecto, consulta `docs/decisions/`.
- Copia las plantillas de [`_templates/`](./_templates/) y reemplaza todas las instrucciones entre corchetes.
- Distingue los requisitos confirmados de las preguntas pendientes. No conviertas una suposición en requisito sin confirmación.
- Cada tarea debe tener un resultado observable y un criterio de verificación. Marca las tareas completadas solo después de comprobarlas.
- Mantén `index.md` sincronizado con el estado real de cada especificación.

## Estados

- **Borrador**: definición en curso; hay preguntas abiertas.
- **Lista**: alcance y criterios acordados; se puede planificar o implementar.
- **En progreso**: implementación activa.
- **Completa**: criterios de aceptación verificados.
- **En pausa**: trabajo detenido; documenta el motivo.

## Flujo recomendado

1. Acordar la necesidad y los criterios con las personas interesadas.
2. Revisar dependencias y decisiones existentes.
3. Aprobar la especificación antes de cerrar el plan técnico.
4. Ejecutar las tareas en orden, manteniendo las verificaciones actualizadas.
5. Revisar los criterios de aceptación y actualizar el índice.
