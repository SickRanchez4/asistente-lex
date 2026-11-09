# Cobros y gastos

## Estado

Lista. Aprobada por el responsable el 2026-11-08; implementación y verificación pendientes.

## Fuente y trazabilidad

- Especificación integral: [Asistente Lex](../../docs/Asistente_Lex_Especificacion_Integral.md), secciones 5.4 (robustez y secuencia del registro de cobro) y 6.3 (coordinación entre servicios); requisitos RF-025, RF-026 y RF-027; casos de uso CU-13 y CU-14; reglas RN-01, RN-17, RN-18, RN-19 y RN-20; requisitos RNF-14 y RNF-15.
- Constitución: [principios II, IV, X y XI](../../docs/constitution.md).

## Contexto y problema

El abogado necesita registrar lo que cobra por sus servicios y los gastos en que incurre en cada expediente. Ambos son movimientos económicos con reglas parecidas de autorización y trazabilidad, pero con efectos distintos:

- Los cobros reducen el saldo pendiente de un servicio.
- Los gastos no modifican los honorarios ni el saldo por cobrar.

MS-03 registra los movimientos consultando a MS-01 el estado del expediente en el momento de la solicitud. Ese estado se conserva con cada movimiento, sin garantizar coincidencia atómica con cambios concurrentes.

## Objetivos

- Registrar cobros parciales o completos por servicio y recalcular el saldo pendiente.
- Registrar gastos por expediente.
- Conservar con cada movimiento el estado del expediente observado al solicitarlo.
- Consultar el historial de cobros y gastos, y corregirlos con trazabilidad.

## No objetivos

- Registrar o modificar servicios y honorarios (spec 014).
- Consultar el panel económico consolidado (spec 016).
- Emitir facturas, recibos o documentos fiscales.
- Procesar pagos electrónicos.
- Garantizar consistencia atómica entre MS-01 y MS-03 (RN-19).

## Usuarios y escenarios

- Como abogado, quiero registrar un pago parcial o total de un servicio, para conocer el saldo pendiente.
- Como abogado, quiero registrar los gastos de un expediente, para controlar lo que invierto en él.
- Como abogado, quiero corregir un cobro o gasto sin perder el registro original, para mantener la trazabilidad.
- Como abogado, quiero que el sistema me avise de importes inválidos o superiores al saldo, para evitar errores sin controles de duplicidad.

## Requisitos

### Funcionales

**Cobros**

- El abogado registra un cobro para un servicio indicando importe en BOB, fecha y medio de pago.
- Los medios son Efectivo, Transferencia, Tarjeta y Otro; se registra el medio, sin procesar pagos ni guardar datos de tarjeta.
- Un servicio admite cobros parciales o un cobro total.
- MS-03 rechaza un cobro ordinario que supere el saldo pendiente del servicio (RN-20).
- MS-03 rechaza importes inválidos. Todos los cobros son ordinarios, sin anticipos, sobrepagos o excepciones al saldo.
- No se detectan ni rechazan cobros duplicados ni se añaden claves de idempotencia. Cada envío válido registra un cobro, sujeto al saldo disponible; no se reintentan escrituras automáticamente.
- Tras registrar un cobro, MS-03 recalcula el saldo pendiente del servicio.
- El abogado consulta el historial de cobros y el saldo pendiente de cada servicio.

**Gastos**

- El abogado registra un gasto para un expediente indicando concepto, categoría, fecha e importe en BOB.
- Las categorías son Tasas y aranceles, Trámites y documentación, Transporte y Otro.
- MS-03 rechaza importes inválidos, sin detectar, advertir ni bloquear gastos posiblemente duplicados.
- Los gastos no modifican los honorarios ni el saldo por cobrar.
- El abogado consulta y filtra los gastos de un expediente.
- Los filtros de gastos son categoría y rango de fechas, sin búsqueda por concepto.

**Común**

- Al solicitar un cobro o un gasto, MS-03 consulta a MS-01 el estado y la pertenencia del expediente:
  - Se aceptan expedientes Abiertos o Cerrados.
  - Se rechazan expedientes Archivados.
  - Si MS-01 no responde, la operación se rechaza y no se informa éxito.
- Cada cobro y gasto conserva el estado del expediente observado al solicitarlo.
- El abogado corrige cobros y gastos solo en expedientes Abiertos o Cerrados. La corrección conserva el valor anterior, la fecha y el autor.
- El historial de cobros y gastos puede consultarse en cualquier estado del expediente.
- Cobros y gastos deben ser estrictamente positivos y de máximo dos decimales; no se redondean silenciosamente entradas de mayor precisión.
- No se anulan ni eliminan movimientos; solo se corrigen con trazabilidad. Corregir un cobro vuelve a validar el saldo, sin contabilizar simultáneamente valor anterior y vigente.
- Los movimientos pertenecen a la cuenta del abogado. Ningún otro abogado ni el Administrador acceden a ellos.

### No funcionales

- Trazabilidad: ningún movimiento se sobrescribe sin conservar su valor anterior (RNF-14).
- Coordinación: el estado conservado es el observado al solicitar la operación; no se promete coincidencia atómica.
- Exactitud: los saldos se calculan con precisión monetaria, sin errores de redondeo.

## Criterios de aceptación

- [ ] Dado un servicio con saldo pendiente en un expediente Abierto o Cerrado, cuando el abogado registra un cobro parcial válido, entonces el cobro queda registrado con el estado observado y el saldo se reduce en ese importe.
- [ ] Dado un servicio, cuando se registra un cobro igual al saldo pendiente, entonces el saldo queda en cero.
- [ ] Dado un cobro ordinario mayor que el saldo pendiente, cuando se intenta registrar, entonces MS-03 lo rechaza aunque la solicitud no pase por la interfaz.
- [ ] Dado un importe inválido, cero, negativo o de más de dos decimales, cuando se intenta registrar, entonces se rechaza indicando el motivo.
- [ ] Dado un expediente Abierto o Cerrado, cuando el abogado registra un gasto válido, entonces queda registrado con el estado observado y el saldo por cobrar no cambia.
- [ ] Dado un expediente Archivado, cuando se intenta registrar o corregir un cobro o un gasto, entonces MS-03 lo rechaza.
- [ ] Dado MS-01 no disponible, cuando se intenta registrar un cobro o un gasto, entonces se rechaza y no se informa éxito.
- [ ] Dado un movimiento registrado, cuando el abogado lo corrige, entonces se muestra el valor corregido y se conserva el anterior con fecha y autor.
- [ ] Dado un expediente en cualquier estado, cuando el abogado consulta cobros y gastos, entonces ve su historial y el saldo pendiente de cada servicio.
- [ ] Dados dos abogados A y B, cuando A intenta consultar o registrar movimientos sobre datos de B, entonces se rechaza.
- [ ] Dado un administrador, cuando intenta consultar cobros o gastos, entonces recibe "no autorizado".
- [ ] Dados dos cobros con iguales datos, cuando ambos son válidos y caben en el saldo, entonces pueden registrarse; no se rechazan por duplicidad. Gastos iguales también se permiten.
- [ ] Dados varios gastos, cuando se filtran por categoría y período, entonces solo aparecen coincidencias.
- [ ] Dado el contrato, cuando se revisa, entonces no ofrece anulación ni eliminación de movimientos.

## Dependencias

- Specs 000, 001, 002 y 003.
- Spec 007: estado y pertenencia del expediente.
- Spec 014: servicios y honorarios sobre los que se registran los cobros.

## Preguntas abiertas

Ninguna de alcance para esta fase. La ausencia de deduplicación es una simplificación explícita, no una garantía de ejecución única.
