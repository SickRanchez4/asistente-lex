# Actuaciones y notas

## Estado

Lista. Aprobada por el responsable el 2026-11-08; implementación y verificación pendientes.

## Fuente y trazabilidad

- Especificación integral: [Asistente Lex](../../docs/Asistente_Lex_Especificacion_Integral.md), sección 3.1 (modelo de dominio: ActuacionJuridica y NotaPersonal); requisitos RF-009 y RF-010; casos de uso CU-05 y CU-06; reglas RN-01, RN-07, RN-12 y RN-16; requisitos RNF-11 y RNF-14.
- Constitución: [principios IV y X](../../docs/constitution.md).

## Contexto y problema

En un expediente conviven dos tipos de registros muy distintos:

- **Actuaciones jurídicas:** hechos del caso que forman su cronología.
- **Notas personales:** apuntes privados del abogado, que incluyen estrategia y nunca deben llegar al cliente.

Si se mezclan, la cronología pierde claridad y existe el riesgo de exponer información interna. Se necesita gestionarlos por separado, con sus propias reglas de escritura, trazabilidad y privacidad.

## Objetivos

- Registrar, consultar, filtrar y corregir actuaciones jurídicas, y mostrar su cronología.
- Registrar, buscar, consultar y corregir notas personales, separadas de las actuaciones.
- Restringir la escritura a expedientes Abiertos.
- Identificar las notas como contenido privado, para que las capacidades consumidoras puedan excluirlas.

## No objetivos

- Generar informes (spec 012); aquí solo se garantiza que las notas son identificables como privadas.
- Consultar notas o actuaciones sin conexión (spec 013).
- Eliminar actuaciones o notas.

## Usuarios y escenarios

- Como abogado, quiero registrar actuaciones con tipo, fecha y descripción, para mantener la cronología del caso.
- Como abogado, quiero corregir una actuación sin perder lo registrado antes, para conservar la trazabilidad.
- Como abogado, quiero escribir notas privadas separadas de la cronología, para registrar ideas y estrategia.
- Como abogado, quiero que mis notas nunca aparezcan en documentos para el cliente, para proteger la información interna.

## Requisitos

### Funcionales

**Actuaciones jurídicas**

- El abogado registra una actuación indicando tipo, fecha y descripción, solo en expedientes Abiertos.
- Los tipos son Audiencia, Presentación de escrito, Resolución, Notificación y Otra. La descripción obligatoria explica el hecho, incluida Otra.
- La fecha es civil y no puede ser futura respecto de la fecha de Bolivia; no se implementa una agenda.
- Las actuaciones se presentan en una cronología ordenada por fecha, separada de las notas.
- El abogado consulta y filtra actuaciones en cualquier estado del expediente, al menos por tipo y por rango de fechas.
- El abogado corrige una actuación solo en expedientes Abiertos. La corrección conserva los valores anteriores, la fecha y el autor.
- MS-01 rechaza actuaciones con datos incompletos.

**Notas personales**

- El abogado registra una nota con conexión y solo en expedientes Abiertos. Cada nota tiene fecha.
- El abogado busca, consulta y corrige notas con conexión. Las correcciones solo se permiten en expedientes Abiertos.
- Las notas son independientes de las actuaciones y no aparecen en la cronología jurídica.
- Las notas se identifican como contenido privado del abogado en los contratos que las exponen, para que puedan excluirse de los informes para cliente.
- Las correcciones de notas conservan solo el texto vigente, sin historial de versiones. El historial de actuaciones sigue siendo obligatorio.
- Las notas se excluyen de todo contexto de IA, incluidos chat e informes; solo el propietario las consulta y se incluyen en su copia offline.
- La estrategia interna —análisis tácticos, valoraciones reservadas y planes del Abogado— se registra exclusivamente en notas, no en actuaciones jurídicas.

**Común**

- MS-01 rechaza las escrituras en expedientes Cerrados o Archivados.
- Actuaciones y notas pertenecen a la cuenta del abogado. Ningún otro abogado ni el Administrador acceden a ellas.

### No funcionales

- Privacidad: las notas personales no aparecen en registros, mensajes de error ni contenidos destinados a terceros.
- Trazabilidad: las correcciones de actuaciones conservan el historial (RNF-14).
- Autoridad de reglas: MS-01 valida el estado del expediente y los datos obligatorios.

## Criterios de aceptación

- [ ] Dado un expediente Abierto, cuando el abogado registra una actuación con tipo, fecha y descripción, entonces aparece en la cronología en el orden de su fecha.
- [ ] Dada una actuación con datos incompletos, cuando se intenta registrar, entonces se rechaza indicando los datos faltantes.
- [ ] Dada una actuación registrada, cuando el abogado la corrige en un expediente Abierto, entonces se muestra el valor corregido y se conservan los valores anteriores con fecha y autor.
- [ ] Dadas varias actuaciones, cuando el abogado filtra por tipo o rango de fechas, entonces obtiene solo las que cumplen el filtro.
- [ ] Dado un expediente Abierto, cuando el abogado registra una nota, entonces aparece con su fecha en las notas y no en la cronología jurídica.
- [ ] Dado un expediente Cerrado o Archivado, cuando se intenta registrar o corregir una actuación o nota, entonces MS-01 lo rechaza aunque la solicitud no pase por la interfaz.
- [ ] Dado un expediente en cualquier estado, cuando el abogado consulta actuaciones y notas, entonces puede verlas.
- [ ] Dado el contrato que expone notas, cuando lo consume otra capacidad, entonces las notas están identificadas como contenido privado.
- [ ] Dados dos abogados A y B, cuando A intenta consultar actuaciones o notas de B, entonces la solicitud se rechaza sin revelar su contenido.
- [ ] Dado un administrador, cuando intenta consultar actuaciones o notas, entonces recibe "no autorizado".
- [ ] Dada una actuación futura, cuando se intenta registrar o corregir, entonces MS-01 la rechaza según la fecha de Bolivia.
- [ ] Dado un consumo de fuentes para IA o informes, cuando se prepara el contexto, entonces no contiene notas; corregir una nota no crea historial de versiones.

## Dependencias

- Specs 000, 001, 002 y 003.
- Spec 007: expedientes y su estado.

## Preguntas abiertas

Ninguna de alcance para esta fase.
