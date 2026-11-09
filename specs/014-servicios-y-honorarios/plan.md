# Plan: Servicios y honorarios

## Estado

Lista. Plan aprobado por el responsable el 2026-11-08; implementación y verificación pendientes.

## Resumen técnico

MS-03 mantiene servicios jurídicos y honorarios en PostgreSQL `erp`. Consulta MS-01 en cada registro/modificación para comprobar expediente Abierto/Cerrado, pertenencia y persona contratante. React accede mediante GraphQL.

Aplicar principios IV, X y XI de la [constitución](../../docs/constitution.md). Solo BOB; no facturación, monedas adicionales, anulación/eliminación no aprobada ni registro de pagos aquí.

## Diseño y componentes

- Servicio jurídico: cuenta, expediente, contratante fijo, descripción, honorarios BOB no negativos y modalidad Pago único/Pagos parciales. Sin calendario, cuotas programadas ni vencimientos.
- Casos de uso registrar, listar/consultar, modificar condiciones y consultar historial; repositorio propio y puertos REST hacia MS-01.
- Varios servicios independientes por expediente; contratante solo requiere Persona propia, no participación. Permitir honorarios cero, sin cobros positivos mientras saldo sea cero.
- Validación de montos y compatibilidad con cobros en dominio/aplicación MS-03; Laravel actúa como adaptador e infraestructura.
- React: listado/ficha de servicio, selección de persona propia, formulario y condiciones/historial; usar [001](../001-experiencia-y-ui-compartida/plan.md).

## Flujo de datos

1. La identidad validada determina cuenta. MS-03 consulta expediente y persona a MS-01.
2. Si el expediente es Archivado, ajeno, inexistente o no puede validarse, rechazar; no usar un estado visual/cacheado.
3. Validar modalidad, monto de máximo dos decimales y compatibilidad: no reducir honorarios por debajo del total efectivo cobrado de 015.
4. Guardar servicio o modificación e historial en una transacción local de MS-03.
5. La UI muestra éxito solo después de confirmar persistencia; consultas e historial se permiten en cualquier estado.

Modificar honorarios y registrar/corregir cobros deben usar el mismo control local de concurrencia por servicio. No validar saldo contra una lectura anterior a la transacción.

No se promete atomicidad entre la lectura de estado en MS-01 y la escritura de MS-03. No mantener una transacción distribuida ni alterar el estado del expediente.

## Interfaces y contratos

- GraphQL/REST para registro, consulta, modificación e historial conforme a [002](../002-gateway-y-contratos-base/plan.md).
- REST MS-01 para estado/pertenencia de [007](../007-expedientes-y-ciclo-de-vida/plan.md) y validación/proyección mínima de Persona de [006](../006-personas/plan.md).
- Representación monetaria exacta en contratos, con moneda BOB explícita; acordar precisión y rango sin usar números binarios de coma flotante.
- Contrato local de MS-03 con [015](../015-cobros-y-gastos/plan.md) para cobros efectivos y compatibilidad; no llamada REST del servicio hacia sí mismo ni duplicación de repositorios.
- Editables descripción/honorarios/modalidad; expediente/contratante fijos. Sin anulación/eliminación. No añadir incompatibilidades distintas a reducir bajo lo cobrado.

## Persistencia y migraciones

Tablas de servicios e historial de condiciones en `erp`; cuenta/expediente/persona son referencias contractuales, no claves foráneas a otro esquema.

**Migraciones aprobadas con el plan:** usar migraciones Laravel existentes como herramienta de MS-03; versionar tablas, índices y restricciones propias. No ejecutar migraciones contra `juridico` o `documental`. Reutilizar esta elección en 015.

Importes en decimal exacto de PostgreSQL y cadenas decimales en contratos. Usar BCMath con escala dos para aritmética/comparación PHP y agregaciones NUMERIC en PostgreSQL, nunca `float` ni redondeo de entradas. Incorporar el requisito `ext-bcmath` al manifest/imagen de MS-03 al implementar si aún no está disponible; no otra biblioteca monetaria o motor ERP.

Servicio e historial se guardan juntos. Usar bloqueo o control de versión por servicio compartido con cobros; no añadir un saldo duplicado sin necesidad.

## Seguridad y privacidad

Solo Abogado propietario; Administrador y otras cuentas rechazados en consultas y escrituras. MS-01 valida contratante, no se confía en el selector.

No registrar contratante, condiciones económicas ni datos de cobros en logs. Reutilizar identidad segura entre servicios de 002/003.

## Observabilidad y manejo de errores

Errores de monto/modalidad, recurso, autorización, estado e incompatibilidad según 002. Si MS-01 falla, comunicar rechazo/indisponibilidad sin guardar ni informar éxito.

Fallo de guardar historial revierte la modificación local. La UI conserva datos y explica incompatibilidad sin exponer contenido ajeno.

## Verificación

Responsabilidad del desarrollador, sin crear archivos de testing. Comprobar integración y cálculos con valores exactos, no solo compilación.

| Criterio de la spec | Comprobación |
|---|---|
| 1. Registro | En Abierto y Cerrado, servicio válido con persona propia, BOB y modalidad aprobada. |
| 2. Varios servicios | Dos servicios en un expediente conservan condiciones/cobros independientes. |
| 3. Contratante distinto | Persona distinta de defendida aceptada según reglas aprobadas de participación. |
| 4. Archivado | Registrar/modificar por API directa: rechazo por MS-03. |
| 5. MS-01 caído | Registro rechazado sin persistencia ni éxito; probar también modificación. |
| 6. Historial | Cambiar honorarios: vigente nuevo y anterior/nuevo, fecha/autor conservados. |
| 7. Incompatibilidad | Con cobros de 015, modificación incompatible rechazada; probar concurrencia cobro/modificación. |
| 8. Consulta | Servicios e historial visibles en los tres estados. |
| 9. Aislamiento | A consulta/modifica servicios de B: rechazo. |
| 10. Administrador | Consulta directa: no autorizado. |
| 11. Gratuito/precisión | Cero permitido en honorarios; negativos o más de dos decimales rechazados sin redondeo. |
| 12. Compatibilidad concreta | Reducir bajo total cobrado rechazado, también concurrentemente con cobros. |
| 13. Operaciones limitadas | Sin cambiar contratante/expediente ni anular/eliminar por contrato. |

Probar persona ajena/inexistente y decimales exactos/límites aprobados. Criterio de cobros permanece pendiente hasta disponer de 015; registrar resultados en tareas.

## Decisiones

- Reutilizar Laravel, migraciones y aritmética decimal exacta; el alcance monetario mínimo consta en la spec y el [ADR 0004](../../docs/decisions/0004-integraciones-minimas-del-mvp.md).
- No convertir Personas, Participaciones y Contratantes en una única entidad.

## Riesgos y preguntas abiertas

- Modalidad no genera agenda ni cuotas automáticamente. Sin preguntas funcionales abiertas.
- Mantener cadenas decimales de extremo a extremo; pasar por `Number`/`float` puede perder precisión aunque la base sea exacta.
- Dependencia 014↔015: acordar primero modelo/reglas comunes y verificar compatibilidad con movimientos reales después.