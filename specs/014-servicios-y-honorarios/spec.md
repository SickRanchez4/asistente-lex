# Servicios y honorarios

## Estado

Lista. Aprobada por el responsable el 2026-11-08; implementación y verificación pendientes.

## Fuente y trazabilidad

- Especificación integral: [Asistente Lex](../../docs/Asistente_Lex_Especificacion_Integral.md), secciones 3.3 (operaciones por estado) y 6.3 (coordinación entre servicios); requisitos RF-023, RF-024 y RF-027; caso de uso CU-12; reglas RN-01, RN-04, RN-17 y RN-18; requisitos RNF-14 y RNF-15.
- Constitución: [principios IV, X y XI](../../docs/constitution.md).

## Contexto y problema

El abogado necesita registrar los servicios jurídicos que presta en cada expediente y sus honorarios. Un expediente puede tener varios servicios, y quien los contrata puede ser distinto de la persona defendida.

Estos datos los gestiona MS-03 (ERP), pero el estado del expediente lo decide MS-01. Los acuerdos económicos deben poder modificarse sin perder su historial y sin contradecir los cobros ya registrados.

## Objetivos

- Registrar varios servicios por expediente, cada uno con su contratante y sus condiciones económicas.
- Definir honorarios en BOB y la modalidad de pago.
- Modificar los acuerdos conservando su historial.
- Restringir los registros y modificaciones a expedientes Abiertos o Cerrados.

## No objetivos

- Registrar cobros o gastos (spec 015).
- Consultar el panel económico consolidado (spec 016).
- Emitir facturas o documentos fiscales.
- Gestionar monedas distintas de BOB (RN-17).

## Usuarios y escenarios

- Como abogado, quiero registrar el servicio que presto en un expediente y sus honorarios, para controlar lo acordado.
- Como abogado, quiero registrar varios servicios en un mismo expediente, para reflejar distintos encargos.
- Como abogado, quiero indicar quién contrata el servicio aunque no sea la persona defendida, para saber a quién cobrar.
- Como abogado, quiero modificar un acuerdo sin perder lo pactado antes, para mantener la trazabilidad.

## Requisitos

### Funcionales

- El abogado registra un servicio para un expediente indicando:
  - Contratante: una persona registrada de su cuenta, que puede ser distinta de la persona defendida.
  - Descripción del servicio.
  - Monto de honorarios en BOB.
  - Modalidad de pago.
- Un expediente admite varios servicios, cada uno con sus propias condiciones.
- Las modalidades son Pago único y Pagos parciales, sin calendario de cuotas, vencimientos ni recordatorios.
- Los honorarios pueden ser cero para servicios gratuitos; no pueden ser negativos y admiten como máximo dos decimales. Se rechaza mayor precisión sin redondeo silencioso.
- Al registrar o modificar un servicio, MS-03 consulta a MS-01 el estado y la pertenencia del expediente:
  - Se aceptan expedientes Abiertos o Cerrados.
  - Se rechazan expedientes Archivados.
  - Si MS-01 no responde, la operación se rechaza y no se informa éxito.
- MS-03 verifica mediante contrato con MS-01 que el contratante es una persona de la cuenta.
- El contratante no necesita ser participante. Desvincular una participación no altera los servicios.
- El abogado modifica las condiciones de un servicio. Cada modificación conserva valor anterior, valor nuevo, fecha y autor.
- MS-03 rechaza las modificaciones económicas incompatibles con los cobros ya registrados.
- Se pueden modificar descripción, honorarios y modalidad, no contratante ni expediente. Es incompatible reducir honorarios por debajo del total efectivo cobrado; no se añaden otras incompatibilidades no definidas.
- No se anulan ni eliminan servicios en esta fase.
- El abogado consulta los servicios de un expediente y su historial en cualquier estado del expediente.
- Los servicios pertenecen a la cuenta del abogado. Ningún otro abogado ni el Administrador acceden a ellos.

### No funcionales

- Trazabilidad: los cambios económicos conservan su historial (RNF-14).
- Coordinación: MS-03 no infiere el estado del expediente; lo consulta a MS-01 en cada registro o modificación.
- Autoridad de reglas: MS-03 valida montos, estados y compatibilidad con los cobros.

## Criterios de aceptación

- [ ] Dado un expediente Abierto o Cerrado y una persona registrada, cuando el abogado registra un servicio con honorarios en BOB y modalidad de pago, entonces el servicio queda registrado con ese contratante.
- [ ] Dado un expediente, cuando el abogado registra un segundo servicio, entonces ambos coexisten con condiciones independientes.
- [ ] Dado un contratante distinto de la persona defendida, cuando se registra el servicio, entonces se acepta.
- [ ] Dado un expediente Archivado, cuando se intenta registrar o modificar un servicio, entonces MS-03 lo rechaza aunque la solicitud no pase por la interfaz.
- [ ] Dado MS-01 no disponible, cuando se intenta registrar un servicio, entonces se rechaza y no se informa éxito.
- [ ] Dado un servicio, cuando el abogado modifica sus honorarios, entonces queda vigente el nuevo valor y el historial conserva el anterior con fecha y autor.
- [ ] Dado un servicio con cobros registrados, cuando se intenta una modificación incompatible con ellos, entonces se rechaza indicando el motivo.
- [ ] Dado un expediente en cualquier estado, cuando el abogado consulta sus servicios, entonces ve los servicios y su historial.
- [ ] Dados dos abogados A y B, cuando A intenta consultar o modificar servicios de B, entonces se rechaza.
- [ ] Dado un administrador, cuando intenta consultar servicios, entonces recibe "no autorizado".
- [ ] Dado un servicio gratuito, cuando se registra con cero BOB, entonces se acepta; un importe negativo o de más de dos decimales se rechaza.
- [ ] Dado un servicio con cobros, cuando se reduce por debajo del total efectivo cobrado, entonces se rechaza aun con solicitudes concurrentes.
- [ ] Dado el contrato, cuando se revisa, entonces no permite cambiar contratante/expediente ni anular/eliminar servicios.

## Dependencias

- Specs 000, 001, 002 y 003.
- Spec 006: personas que actúan como contratantes.
- Spec 007: estado y pertenencia del expediente.
- Spec 015: cobros que condicionan las modificaciones. Ese criterio se verifica cuando 015 está disponible.

## Preguntas abiertas

Ninguna de alcance para esta fase. La aritmética BOB es exacta y compartida con cobros, gastos y panel.
