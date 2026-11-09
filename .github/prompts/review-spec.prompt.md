---
name: Revisar especificación
description: "Revisa una especificación SDD para detectar ambigüedades, vacíos y criterios no verificables."
argument-hint: "ID o ruta de la especificación"
agent: ask
---

Revisa la especificación indicada por: ${input:spec:ID o ruta de la especificación}.

Lee `spec.md`, `plan.md`, `tasks.md` y las decisiones enlazadas. Evalúa coherencia, alcance, requisitos, criterios de aceptación, riesgos y verificabilidad. Para revisar la trazabilidad, consulta únicamente las secciones de las fuentes enlazadas en `spec.md` que correspondan a esta funcionalidad. Señala las discrepancias sin resolverlas mediante suposiciones. No implementes cambios.

Presenta los hallazgos primero, ordenados por impacto, indicando el archivo y la sección, por qué importa y una pregunta o propuesta concreta para resolverlo. Distingue los bloqueos de las mejoras recomendadas. Si no encuentras problemas, indícalo y resume qué comprobaste.
