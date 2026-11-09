---
name: Implementar especificación
description: "Implementa una funcionalidad siguiendo su especificación, plan y tareas SDD."
argument-hint: "ID o ruta de la especificación (por ejemplo, 001-autenticacion)"
agent: agent
---

Implementa la funcionalidad indicada por: ${input:spec:ID o ruta de la especificación}.

1. Lee `spec.md`, `plan.md`, `tasks.md`, las decisiones relacionadas y las instrucciones del proyecto.
2. Comprueba que los criterios de aceptación y el plan sean suficientemente claros. Si hay una decisión bloqueante sin resolver, pregunta antes de asumirla o modificar el alcance.
3. Implementa de forma incremental, siguiendo los patrones existentes y manteniendo las tareas actualizadas.
4. Ejecuta las pruebas y validaciones relevantes del repositorio.
5. Actualiza la documentación SDD cuando la implementación revele cambios necesarios.
6. Resume los cambios, las validaciones ejecutadas y cualquier tarea o decisión pendiente.
