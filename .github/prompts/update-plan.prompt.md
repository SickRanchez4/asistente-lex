---
name: Actualizar plan SDD
description: "Alinea el plan y las tareas con cambios acordados en una especificación SDD."
argument-hint: "ID o ruta de la especificación y cambios acordados"
agent: agent
---

Actualiza el plan de: ${input:spec:ID o ruta de la especificación}.

1. Lee `spec.md`, `plan.md`, `tasks.md`, las decisiones relacionadas y las instrucciones del proyecto.
2. Aplica únicamente los cambios acordados: ${input:changes:Cambios que deben reflejarse}.
3. Comprueba que cada cambio de requisitos tenga un reflejo coherente en el diseño, las tareas y las verificaciones.
4. Mantén las decisiones pendientes como preguntas; no inventes tecnología, requisitos ni aprobaciones.
5. Actualiza `index.md` solo si cambia el estado de la especificación.
6. Resume qué documentos se actualizaron y qué preguntas siguen abiertas.
