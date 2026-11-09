# Plan: Panel económico

## Estado

Lista. Plan aprobado por el responsable el 2026-11-08; implementación y verificación pendientes.

## Resumen técnico

MS-03 consolida servicios/cobros/gastos propios. React presenta honorarios, cobros y gastos por separado y distingue saldo pendiente real por expediente de balance temporal por período. Gastos no reducen ninguno; todas las cifras BOB exactas.

Aplicar principios IV y X de la [constitución](../../docs/constitution.md). Solo consulta: no modificar movimientos, añadir proyecciones, IA, contabilidad fiscal, almacén analítico ni materializaciones por anticipación.

## Diseño y componentes

- Dos modos excluyentes: expediente completo sin período o período de toda cuenta; detalle de cada total y CSV. Sin combinación ni agrupaciones adicionales.
- Repositorio de consulta MS-03 sobre datos propios de [014](../014-servicios-y-honorarios/plan.md) y [015](../015-cobros-y-gastos/plan.md); no duplicar reglas de dinero.
- React: filtros, cuatro conceptos separados, detalle y exportación, con [estados/formato de 001](../001-experiencia-y-ui-compartida/plan.md).
- Incluir expedientes Abiertos, Cerrados y Archivados; no aplicar restricciones de escritura a consultas económicas.
- Consultas limitadas/paginadas y agregaciones SQL según volumen real; no dashboards externos ni nueva base de datos.

## Flujo de datos

La identidad determina la cuenta. MS-03 valida filtros/período y calcula totales a partir de valores efectivos e historial de correcciones según el modelo de 015, sin contar revisiones anteriores como movimientos adicionales.

Agregar honorarios, cobros y gastos por separado antes de combinarlos: un join directo de varias relaciones uno-a-muchos puede multiplicar filas y falsear los totales.

Totales y detalles deben usar mismos filtros, fechas y valores monetarios exactos. **Propuesta:** obtener una lectura coherente local para cada resultado; al abrir un detalle después de cambios concurrentes, devolver/recalcular conjuntamente su total y detalle y actualizar el panel como un resultado nuevo. No mostrar un total antiguo junto a movimientos nuevos ni prometer una instantánea global permanente.

Modo expediente: saldo pendiente = honorarios vigentes menos todos los cobros efectivos. Modo período: honorarios vigentes de servicios registrados en el rango, cobros/gastos por fecha propia, límites civiles inclusivos. Balance del período = honorarios filtrados menos cobros filtrados, puede ser negativo y no se etiqueta como deuda actual. No reconstrucción histórica de acuerdos.

Abrir por defecto mes calendario actual de Bolivia. Una edición posterior de honorarios puede cambiar el resultado de un período anterior; explicitar que son valores vigentes, no un cierre contable histórico.

Exportar el mismo conjunto tabular que se presenta, no solo la página visible sin advertirlo. Si se vuelve a consultar por cambios concurrentes, actualizar/informar el conjunto antes de exportar; acordar alcance exacto con la definición de columnas.

## Interfaces y contratos

- GraphQL/REST para panel, detalle y CSV conforme a [002](../002-gateway-y-contratos-base/plan.md).
- Tipos separados para honorarios, cobros, gastos y saldo, con BOB y representación exacta. No presentar gasto como cobro negativo.
- Períodos por fechas civiles inclusivas según Bolivia; honorarios por registro del servicio y cobros/gastos por sus fechas. Sin saldos de apertura, acumulados históricos o combinaciones de modos.
- Consulta de datos descriptivos de expediente, si se necesita, mediante MS-01, sin SQL entre esquemas. Fallo remoto no debe inventar títulos o convertirlo en un panel vacío.
- CSV: seis columnas Código de expediente, Servicio, Concepto, Fecha, Descripción e Importe BOB; sin PII ni fila artificial de saldo. Toda la tabla de detalle, no solo página visible.
- Compartir con [012](../012-informes-juridicos/plan.md) UTF-8, punto y coma, cabeceras, fechas dd/MM/yyyy, coma decimal sin miles y escapes documentados de texto potencialmente ejecutable; no servicio común de exportación.

## Persistencia y migraciones

No nuevas entidades ni movimientos. Leer tablas `erp` de 014/015, con índices solo si las consultas lo justifican; esos cambios usan migraciones de MS-03.

No mantener totales duplicados o tablas analíticas por defecto. La consulta/exportación no modifica datos ni historial.

La precisión monetaria y los valores efectivos se reutilizan del dominio de MS-03; no calcular totales con coma flotante en el navegador.

## Seguridad y privacidad

Solo Abogado propietario. Aislar tanto agregaciones como detalles y exportaciones por la misma cuenta, no solo filtrar al final.

Rechazar Administrador. No exponer datos ajenos mediante CSV, filtros manipulados o identificadores de expediente; no generar archivos públicos permanentes de exportación.

No registrar filas privadas ni importes consolidados en logs. Manejo de celdas CSV potencialmente ejecutables requiere convención aprobada sin alteración silenciosa de valores.

## Observabilidad y manejo de errores

Sin registros es un resultado vacío explícito. Período inválido es error de validación; fallo de consulta/exportación es error, nunca vacío o CSV exitoso incompleto.

Comunicar resultados reales mediante 002/001. Registros técnicos limitados a categoría/operación, sin tabla exportada.

## Verificación

El desarrollador verifica sin crear archivos de testing ni documentos adicionales. Comparar cifras exactas y conjunto exportado con su detalle.

| Criterio de la spec | Comprobación |
|---|---|
| 1. Conceptos | Expediente con varios servicios/cobros/gastos: cuatro conceptos separados en BOB, sin multiplicación por joins. |
| 2. Período | Honorarios por registro del servicio y cobros/gastos por fecha, límites inclusivos; balance temporal no deuda actual. |
| 3. Gastos | Añadir gasto: total gastos cambia, saldo pendiente no. |
| 4. Total/detalle | Suma exacta de valores efectivos del detalle igual al total; probar correcciones, varias páginas y cambios concurrentes. |
| 5. Archivados | Expediente Archivado con movimientos incluido y detalle consultable. |
| 6. CSV | Leer CSV exportado y comparar filas/columnas/valores con el conjunto presentado, incluidos comillas, saltos, fechas y decimales. |
| 7. Vacío | Período sin datos: resultado vacío, no error ni datos de otra cuenta. |
| 8. Período inválido | Inicio posterior a fin o entrada inválida: rechazo explícito por backend. |
| 9. Aislamiento | A consulta detalle/exporta con identificadores de B: ningún dato ajeno. |
| 10. Administrador | Consulta directa: no autorizado. |
| 11. Balance negativo | Cobros de servicios anteriores: balance negativo permitido, sin alterar saldo real. |
| 12. Inicio/modos | Mes calendario de Bolivia por defecto, sin expediente+período combinados. |
| 13. CSV concreto | Seis columnas acordadas, todas las páginas y ninguna PII añadida. |

El desarrollador comprobará que consultas/exportaciones no alteran movimientos y que cifras/CSV coinciden; no quedan bloqueos funcionales por período/columnas.

## Decisiones

- Consolidación en MS-03, sin nueva plataforma de reportes ni IA.
- Reutilizar modelos, migraciones y aritmética de 014/015; reglas CSV coordinadas con 012 y transporte con 002.
- No crear ADR por consultas simples. Registrar decisiones significativas si la consistencia/exportación requiere infraestructura adicional justificada.

## Riesgos y preguntas abiertas

- No confundir balance temporal con saldo pendiente real; valores del período no son un cierre contable inmutable.
- Sin preguntas funcionales abiertas. Mes actual, modos separados y seis columnas CSV confirmados.
- Concurrencia puede cambiar valores entre consultas: mantener coherencia total/detalle/exportación sin añadir almacenamiento analítico innecesario.