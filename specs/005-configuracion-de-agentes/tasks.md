# Tareas: Configuración de agentes

## Estado

Pendiente de ejecución y verificación. Spec y plan aprobados el 2026-11-08.

## Lista de trabajo

Basadas en la [spec](./spec.md) y el [plan](./plan.md). C01–C11 siguen el orden de criterios. MCP está diferido; no convertir estas tareas en una plataforma de conectores.

- [ ] **005-T01. Disponer de Penalista y Civilista con configuración y catálogo seguro.**
  - **Valor/entrega:** aprovisionamiento idempotente MongoDB de ambos agentes, instrucciones iniciales de la spec, modelo inicial del entorno y tres herramientas internas. Angular consulta configuración; Abogado obtiene solo nombre/especialidad/disponibilidad. REST permite validar disponibilidad a MS-01/MS-04.
  - **Depende de:** [002-T02](../002-gateway-y-contratos-base/tasks.md), [001-T02](../001-experiencia-y-ui-compartida/tasks.md) y MongoDB de [000](../000-plataforma-base/tasks.md).
  - **Evidencia/validación:** exactamente dos agentes, sin creación/eliminación; reiniciar no sobrescribe configuración. Abogado no obtiene instrucciones/modelo/herramientas y Administrador no recibe conversaciones.
  - **Cobertura:** C01, C06, C08.

- [ ] **005-T02. Ajustar el comportamiento de los agentes conservando cada cambio aplicado.**
  - **Valor/entrega:** edición Angular de instrucciones, modelo OpenAI como texto y selección de herramientas del catálogo; revisiones inmutables y compare-and-set del vigente, historial consultable y auditoría síncrona a MS-01. No URLs, comandos o claves arbitrarias.
  - **Depende de:** 005-T01 y receptor de eventos de [003-T05](../003-autenticacion-y-acceso/tasks.md).
  - **Evidencia/validación:** siguiente consulta usa revisión nueva, anterior/nuevo/autor/fecha conservados y edición concurrente no se sobrescribe. Auditoría caída da parcial con cambio aplicado. Modelo inválido no se sustituye: comprobar su error real cuando exista [011-T02](../011-asistencia-juridica-ia/tasks.md).
  - **Cobertura:** C02, C06, C07, C08, C09.

- [ ] **005-T03. Controlar disponibilidad sin ocultar agentes ni destruir historial.**
  - **Valor/entrega:** habilitar/deshabilitar desde administración, mostrar motivos y auditar; ambos pueden quedar deshabilitados. Pregunta iniciada puede terminar salvo archivo; nuevas consultas/expedientes exigen agente habilitado y alternativa explícita cuando el inicial no esté disponible.
  - **Depende de:** 005-T01, 005-T02 y flujos reales de [007-T01](../007-expedientes-y-ciclo-de-vida/tasks.md) y [011-T02](../011-asistencia-juridica-ia/tasks.md). Esos flujos usan lectura/validación de 005-T01 y no necesitan esperar esta tarea completa.
  - **Evidencia/validación:** toggle se refleja en selectores, backend rechaza agente deshabilitado, reactivar permite nuevas solicitudes y ambos deshabilitados no borran historial. Verificar pregunta ya iniciada y archivo prioritario de 007.
  - **Cobertura:** C03, C04, C05, C06, C07, C10, C11.

## Verificación de aceptación

- [ ] El desarrollador revisa los 11 criterios de la [spec](./spec.md), con creación de expedientes, chat y eventos reales.
- [ ] Ejecutar validaciones del [plan](./plan.md), incluidas concurrencia e indisponibilidad, sin crear archivos de testing.
- [ ] Actualizar spec, plan e [índice](../index.md); implementación de catálogo no equivale a integración completa de agentes.