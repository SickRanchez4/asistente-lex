# Panel económico

## Estado

Lista. Aprobada por el responsable el 2026-11-08; implementación y verificación pendientes.

## Fuente y trazabilidad

- Especificación integral: [Asistente Lex](../../docs/Asistente_Lex_Especificacion_Integral.md), sección 3.3 (consulta económica en todos los estados); requisitos RF-022 y RF-028; caso de uso CU-15; reglas RN-01, RN-17, RN-18 y RN-20.
- Constitución: [principios IV y X](../../docs/constitution.md).

## Contexto y problema

Con servicios, cobros y gastos registrados, el abogado necesita conocer su situación económica profesional: cuánto acordó cobrar, cuánto cobró, cuánto gastó y cuánto le deben, tanto por expediente como en un período.

Esta capacidad es exclusivamente de consulta y consolidación. Debe presentar los conceptos por separado, de modo que los gastos no se confundan con los cobros ni alteren el saldo pendiente.

## Objetivos

- Consultar la situación económica por expediente o por período.
- Presentar por separado honorarios, cobros, gastos y saldos pendientes.
- Consultar el detalle de los movimientos.
- Exportar a CSV los resultados tabulares.

## No objetivos

- Registrar o modificar servicios, cobros o gastos (specs 014 y 015).
- Elaborar proyecciones, presupuestos o análisis con IA.
- Generar informes fiscales o contables.

## Usuarios y escenarios

- Como abogado, quiero ver el resumen económico de un expediente, para saber cuánto me deben y cuánto gasté en él.
- Como abogado, quiero ver mi situación económica de un período, para conocer mis ingresos y gastos.
- Como abogado, quiero exportar los datos a CSV, para analizarlos con otras herramientas.

## Requisitos

### Funcionales

- El abogado consulta el panel por expediente o por período.
- Son dos modos separados: expediente completo sin período o período para toda la cuenta. No se combinan ni se añaden agrupaciones por contratante/área.
- El panel presenta por separado:
  - Honorarios acordados.
  - Cobros realizados.
  - Gastos.
  - Saldos pendientes.
- El saldo pendiente se calcula como honorarios acordados menos cobros. Los gastos no lo modifican (RN-20).
- Saldo pendiente se reserva al modo expediente, con honorarios vigentes y todos sus cobros efectivos.
- En modo período se incluyen honorarios vigentes de servicios registrados en ese período, cobros por su fecha y gastos por su fecha. No se reconstruyen acuerdos históricos.
- La diferencia honorarios del período menos cobros del período se llama Balance del período, puede ser negativa y no representa deuda actual. Los gastos se muestran aparte y no reducen ese balance.
- Al abrir, se selecciona el mes calendario actual según `America/La_Paz`. Los límites de fecha civil son inclusivos y visibles; un período con inicio posterior a fin es inválido.
- Todos los importes se presentan en BOB.
- El abogado abre el detalle de los movimientos que componen cada total.
- La consulta incluye expedientes en cualquier estado, incluidos los Archivados.
- El abogado exporta a CSV los resultados tabulares del panel.
- El CSV económico contiene Código de expediente, Servicio cuando aplique, Concepto (honorario/cobro/gasto), Fecha, Descripción e Importe BOB. Exporta el detalle de todas las páginas que sustenta totales, sin fila artificial de saldo ni datos personales adicionales.
- La convención compartida con 012 es UTF-8, punto y coma, cabeceras, fecha `dd/MM/yyyy` y decimales sin miles y con coma, por ejemplo `1234,56`. Escape y protección de celdas se documentan sin cambios silenciosos.
- Si no hay registros, se presenta un resultado vacío. Si el período es inválido, se informa el error.
- La consulta no modifica ningún movimiento.
- El panel solo incluye datos de la cuenta del abogado. Ningún otro abogado ni el Administrador acceden a ellos.

### No funcionales

- Exactitud: los totales coinciden con la suma de los movimientos de su detalle.
- Privacidad: la exportación solo incluye datos de la cuenta del abogado.

## Criterios de aceptación

- [ ] Dado un expediente con servicios, cobros y gastos, cuando el abogado consulta su panel, entonces ve por separado honorarios, cobros, gastos y saldo pendiente, en BOB.
- [ ] Dados movimientos en distintas fechas, cuando se consulta un período, entonces honorarios se incluyen por registro del servicio y cobros/gastos por su fecha, solo dentro de sus límites; se muestra Balance del período, no deuda actual.
- [ ] Dados gastos registrados, cuando se calcula el saldo pendiente, entonces los gastos no lo modifican.
- [ ] Dado un total del panel, cuando el abogado abre su detalle, entonces la suma de los movimientos mostrados coincide con el total.
- [ ] Dado un expediente Archivado con movimientos, cuando el abogado consulta el panel, entonces sus datos aparecen.
- [ ] Dado un resultado tabular, cuando el abogado lo exporta, entonces obtiene un CSV con los mismos datos.
- [ ] Dado un período sin registros, cuando se consulta, entonces se muestra un resultado vacío.
- [ ] Dado un período inválido, cuando se consulta, entonces se informa el error.
- [ ] Dados dos abogados A y B, cuando A consulta el panel, entonces no ve datos de B.
- [ ] Dado un administrador, cuando intenta consultar el panel de un abogado, entonces recibe "no autorizado".
- [ ] Dado un mes con cobros de servicios anteriores, cuando su balance temporal es negativo, entonces se muestra como Balance del período sin alterar ni confundirlo con el saldo pendiente real.
- [ ] Dado el panel al abrir, cuando se consulta por defecto, entonces usa el mes de Bolivia y no combina modo expediente con período.
- [ ] Dado un CSV exportado, cuando se revisa, entonces tiene las seis columnas y la convención acordadas, sin limitarse silenciosamente a la página visible.

## Dependencias

- Specs 000, 001, 002 y 003.
- Spec 007: expedientes.
- Spec 014: servicios y honorarios.
- Spec 015: cobros y gastos.

## Preguntas abiertas

Ninguna de alcance para esta fase.
