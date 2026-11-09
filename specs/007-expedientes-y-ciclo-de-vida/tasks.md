# Tareas: Expedientes y ciclo de vida

## Estado

Pendiente de ejecución y verificación. Spec y plan aprobados el 2026-11-08.

## Lista de trabajo

Basadas en la [spec](./spec.md) y el [plan](./plan.md). C01–C15 siguen el orden de criterios. Los cortes de entrega separan operaciones útiles, no capas; archivo se integra después del contrato de eliminación de MS-04, sin exigir chat completo para empezar los expedientes.

- [ ] **007-T01. Abrir expedientes propios con agente válido y código único.**
  - **Valor/entrega:** registro React, caso de uso MS-01, migraciones e índices, GraphQL/REST y consulta de disponibilidad de MS-04; descripción opcional, Abierto inicial y código único por cuenta.
  - **Depende de:** [003-T02](../003-autenticacion-y-acceso/tasks.md), [002-T02](../002-gateway-y-contratos-base/tasks.md), [001-T02](../001-experiencia-y-ui-compartida/tasks.md) y catálogo de [005-T01](../005-configuracion-de-agentes/tasks.md).
  - **Evidencia/validación:** expediente válido creado; datos faltantes, agente no habilitado/indisponible y código duplicado rechazados por backend. Concurrencia no duplica código y otra cuenta puede repetirlo.
  - **Cobertura:** C01, C02, C03, C12, C13.

- [ ] **007-T02. Encontrar, consultar y corregir la ficha del expediente.**
  - **Valor/entrega:** listado/filtros estado/área/código/título, ficha en todos los estados y edición solo Abierto de los cinco campos permitidos. REST de pertenencia/estado para consumidores, sin relaciones entre almacenes.
  - **Depende de:** 007-T01.
  - **Evidencia/validación:** editar datos y agente inicial habilitado respeta unicidad; Cerrado/Archivado son solo lectura. Cambio de agente inicial no toca chats existentes y chats nuevos usan el vigente al integrarse 011; no filtra datos de otra cuenta.
  - **Cobertura:** C04, C05, C12, C13, C14.

- [ ] **007-T03. Cerrar y reabrir expedientes con historial de transiciones.**
  - **Valor/entrega:** acciones y contratos de Abierto→Cerrado y Cerrado→Abierto, registro anterior/nuevo/fecha/autor en la misma transacción y protección concurrente.
  - **Depende de:** 007-T02.
  - **Evidencia/validación:** cambios legales efectivos e historial consultable; transiciones ilegales y cambios de ficha no abiertos rechazados también directamente. Dos solicitudes simultáneas no crean una transición duplicada.
  - **Cobertura:** C05, C06, C11, C12.

- [ ] **007-T04. Archivar sin ocultar pérdida de conversaciones ni fallos parciales.**
  - **Valor/entrega:** confirmación irreversible, marca técnica de intento, exclusión de nuevas preguntas, eliminación MS-04 antes de guardar Archivado/historial y reanudación segura ante incertidumbre. Sin nuevo estado de negocio, transacción distribuida o cola.
  - **Depende de:** 007-T03 y eliminación real de [011-T04](../011-asistencia-juridica-ia/tasks.md).
  - **Evidencia/validación:** cancelar no llama backend; confirmar elimina todos los chats y archiva. Falla de eliminación conserva Cerrado; falla posterior informa pérdida y reintentar completa sin duplicar historial. Respuesta IA pendiente no restaura chats, tampoco tras timeout/reinicio.
  - **Cobertura:** C06, C07, C08, C09, C11, C12, C15.

- [ ] **007-T05. Recuperar acceso de consulta al desarchivar, sin restaurar chats.**
  - **Valor/entrega:** Archivado→Cerrado y su historial; contenido jurídico/documentos intactos y conversaciones nuevas vacías. Aplicar la matriz completa de transiciones sin reabrir automáticamente.
  - **Depende de:** 007-T04 y datos reales consultables de 008, 009 y [010-T02](../010-documentos-y-fotografias/tasks.md) para verificar conservación.
  - **Evidencia/validación:** desarchivo deja Cerrado, datos previos intactos y ningún historial de IA anterior; transición directa a Abierto se rechaza.
  - **Cobertura:** C05, C06, C10, C11, C12.

## Verificación de aceptación

- [ ] El desarrollador revisa los 15 criterios de la [spec](./spec.md) con la matriz completa de estados y conversaciones/documentos reales.
- [ ] Ejecutar verificaciones del [plan](./plan.md), incluyendo fallos entre servicios, respuesta tardía y reintento, sin archivos nuevos de testing.
- [ ] Actualizar spec, plan e [índice](../index.md); implementación de cerrar/reabrir no acredita archivo o desarchivo completos.