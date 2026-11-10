# Tareas: Personas

## Estado

En progreso. Spec y plan aprobados el 2026-11-08. T01/T02 verificadas; implementación propia de T03 verificada, pendiente su cierre por C12 con vínculos reales de 007/008. No se avanzó sobre esas specs.

## Lista de trabajo

Basadas en la [spec](./spec.md) y el [plan](./plan.md). C01–C12 siguen el orden de criterios. Contratos, migraciones MS-01, validaciones, Gateway y React forman parte de cada entrega, no tareas separadas.

- [x] **006-T01. Registrar personas propias aun sin conocer su identificación.**
  - **Valor/entrega:** formulario natural/jurídica y caso de uso con campos obligatorios por tipo, identificación vacía o completa, tipo de documento libre y contacto/domicilio opcionales. Normalización coherente e índice único por cuenta/terna contra duplicados concurrentes.
  - **Depende de:** [003-T02](../003-autenticacion-y-acceso/tasks.md), [002-T02](../002-gateway-y-contratos-base/tasks.md) y [001-T02](../001-experiencia-y-ui-compartida/tasks.md).
  - **Evidencia/validación:** registros válidos quedan consultables; faltantes/parciales/duplicados propios rechazados con campos y datos conservados. Misma identificación en otra cuenta o distinta terna permitida, sin revelar datos ajenos.
  - **Cobertura:** C01, C02, C03, C04, C05, C06, C11.

- [x] **006-T02. Encontrar y consultar fichas reutilizables de la propia cuenta.**
  - **Valor/entrega:** listado paginado, búsqueda por nombre/razón social/documento y filtro por tipo, ficha y proyección de selección para participantes/contratantes, sin duplicar Persona en otro servicio.
  - **Depende de:** 006-T01.
  - **Evidencia/validación:** coincidencias propias y estados vacío/error distintos; A no ve B y Administrador no consulta fichas mediante API directa. La ficha sirve para selección real en 008/014 al integrarse.
  - **Cobertura:** C08, C09, C10.
  - **Límite:** verificados listado, ficha y contratos mínimos por página/ID. El consumo en selectores reales de participantes/contratantes se verificará al implementar 008/014; no se acredita esa integración anticipadamente.

- [ ] **006-T03. Corregir fichas y completar identificación sin depender del estado del expediente.**
  - **Valor/entrega:** actualización de datos propios y unicidad excluyendo la ficha editada; conservar identificador para vínculos existentes y mostrar ficha vigente sin modificar participaciones.
  - **Depende de:** 006-T01, 006-T02; la comprobación de edición en expedientes no abiertos requiere [008-T01](../008-participantes/tasks.md), [007-T03](../007-expedientes-y-ciclo-de-vida/tasks.md) y [007-T04](../007-expedientes-y-ciclo-de-vida/tasks.md), que solo necesitan las capacidades anteriores de personas.
  - **Evidencia/validación:** completar documento en ficha existente, rechazar colisión y editar persona que solo participa en Cerrado/Archivado conservando sus relaciones. API de otra cuenta no actualiza la ficha.
  - **Cobertura:** C04, C07, C09, C11, C12.
  - [x] Actualizar ficha propia y completar o retirar la identificación completa, conservando el identificador; excluir la propia ficha y rechazar colisiones, también concurrentes.
  - [x] React conserva valores rechazados, indica campos y permite consultar la ficha vigente. REST y GraphQL rechazan la actualización ajena sin revelar existencia privada.
  - [ ] Verificar edición con personas vinculadas exclusivamente a expedientes Cerrados/Archivados y comprobar que las participaciones reales permanecen intactas (C12; requiere 007/008).

## Verificación de aceptación

- [ ] El desarrollador revisa los 12 criterios de la [spec](./spec.md), incluida unicidad concurrente y edición con vínculos reales.
- [x] Ejecutar validaciones disponibles del [plan](./plan.md) y anotar evidencia/bloqueos, sin archivos de testing en el repositorio.
- [x] Sincronizar spec, plan e [índice](../index.md); no marcar completas las comprobaciones de integración antes de disponer de participantes.

## Registro de verificación

- **Compilación:** MS-01 construido con JDK 25; Gateway, React y Shell construidos con Node 26. Typecheck satisfactorio de Gateway, React, Angular y Shell, incluyendo el cliente GraphQL compartido que ahora conserva errores por campo. SDL final válido; OpenAPI 3.1 y respuesta REST real validados contra esquema cerrado.
- **Dominio y persistencia:** 7 comprobaciones iniciales del dominio y 42 sobre casos de uso/repositorio/PostgreSQL real: obligatorios, identificación parcial/vacía/completa, ceros iniciales, comparación normalizada, terna diferente y cuenta diferente, edición, búsquedas, cursores y restricciones SQL. Dos carreras con barrera después de la prevalidación (alta y edición) terminaron cada una con un éxito y un `CONFLICT`. Las comprobaciones reversibles usaron transacción y savepoints.
- **REST/GraphQL/Shell reales:** 33 comprobaciones autenticadas con dos cuentas sintéticas y Administrador demo existente; incluyen entrada sin UI, campos seguros, intento de inyectar cuenta, ficha ajena indistinguible de inexistente, rol Administrador denegado, sesión anónima, paginación, búsqueda combinada y proyección mínima. Sesiones cerradas tras comprobar.
- **Versión final:** comprobación enfocada del cursor que distingue ausencia de filtro del texto literal `null`; 11 comprobaciones adicionales tras desplegar la versión final: salud MS-01 `200/UP`, proyección mínima por ID y `no-store`, privacidad, rechazo de contacto en SDL y consulta real por Shell. Se reinició nginx del Shell tras recrear Gateway para refrescar su dirección interna.
- **Navegador real:** alta natural sin documento y alta jurídica, obligatorios por tipo, identificación parcial, duplicado en alta y edición con valores conservados, completar identificación con ID estable, búsqueda combinada, vacío y paginación anterior/siguiente con más de 25 fichas. Capturas a 1366×900 y 390×844, imagen de marca cargada y sin desbordamiento de página; la tabla móvil desplaza sus columnas dentro de su contenedor.
- **Fallos de UI controlados:** interrupción de una escritura y fallo de lectura simulados solo en el navegador; resultado incierto bloqueó el guardado y conservó valores, fallo de lectura no mostró éxito ni vacío, reintento de lectura recuperó los datos. Interceptores retirados. Esta evidencia no sustituye las comprobaciones reales anteriores ni acredita participantes.
- **Migración y limpieza:** V4 aplicada expresamente contra PostgreSQL configurado, sin PostgreSQL local ni cambios de contraseña/cuentas existentes. Fichas, sesiones y dos cuentas sintéticas eliminadas al finalizar; cuenta demo conservada. No se crearon archivos de testing en el repositorio ni se imprimieron secretos, conexiones o documentos privados.
- **Pendiente:** C12 y la selección integrada en 008/014. Editar solo `people` sin inspeccionar estados implementa la independencia requerida, pero no prueba relaciones aún inexistentes. La spec no se declara completa ni preparada para producción.