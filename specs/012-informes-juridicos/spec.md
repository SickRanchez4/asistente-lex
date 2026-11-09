# Informes jurídicos

## Estado

Lista. Aprobada por el responsable el 2026-11-08; implementación y verificación pendientes.

## Fuente y trazabilidad

- Especificación integral: [Asistente Lex](../../docs/Asistente_Lex_Especificacion_Integral.md), secciones 3.1 (modelo de dominio: InformeGuardado), 5.3 (robustez y secuencia de informes) y 6.2 (generación y conservación de informes); requisitos RF-019, RF-020, RF-021 y RF-022; caso de uso CU-11; reglas RN-01, RN-15 y RN-16; requisitos RNF-07, RNF-11, RNF-13 y RNF-15.
- Constitución: [principios II, IV, X y XI](../../docs/constitution.md).

## Contexto y problema

El abogado necesita producir informes a partir de la información de sus expedientes: resúmenes ejecutivos, informes en lenguaje claro para sus clientes y reportes a partir de consultas en lenguaje natural.

Los informes se generan coordinando tres servicios: MS-02 reúne las fuentes y conserva el resultado, MS-01 aporta la información jurídica y MS-04 propone el contenido. Además, los informes para clientes no pueden incluir información interna, y los informes guardados no deben volver a usarse como fuente.

## Objetivos

- Generar resumen ejecutivo, informe para cliente y reportes por consulta en lenguaje natural.
- Excluir notas personales, estrategia interna y datos no destinados a terceros de los informes para cliente.
- Guardar cada informe con su fecha y permitir consultarlo y descargarlo.
- Exportar a CSV los resultados tabulares.
- Impedir que los informes guardados sirvan como fuentes de IA o de nuevos informes.

## No objetivos

- Exportar el panel económico a CSV (spec 016).
- Generar informes sin conexión (RN-13).
- Incorporar informes como documentos del expediente (RN-15).
- Incluir informes en las descargas offline (spec 013); aquí solo se exponen.

## Usuarios y escenarios

- Como abogado, quiero un resumen ejecutivo de una página de un expediente, para tener una visión rápida.
- Como abogado, quiero un informe en lenguaje claro para mi cliente, sin mis notas ni estrategia, para informarle de su caso.
- Como abogado, quiero obtener un reporte con una consulta en lenguaje natural, para responder preguntas concretas sobre mi información.
- Como abogado, quiero consultar y descargar informes anteriores con su fecha, para conservar un histórico.

## Requisitos

### Funcionales

- El abogado selecciona un expediente y un tipo de informe:
  - Resumen ejecutivo de una página.
  - Informe para cliente en lenguaje claro.
  - Reporte por consulta en lenguaje natural, a partir de fuentes y filtros autorizados.
- La generación requiere conexión.
- Solo se generan informes de expedientes Abiertos o Cerrados. Archivado permite consultar y descargar los ya guardados.
- Cada reporte por consulta natural se limita a un expediente propio seleccionado, sin alcance multiexpediente.
- Se usa el agente inicial vigente si está habilitado; si no, se pide elegir explícitamente otro habilitado. Sin agente habilitado no se genera.
- Flujo de generación:
  1. MS-02 obtiene de MS-01 las fuentes jurídicas autorizadas.
  2. MS-04 propone el contenido.
  3. MS-02 estructura el resultado y lo guarda con su fecha y tipo.
  4. El informe se presenta al abogado.
- Los informes guardados no se usan como fuentes de nuevos informes ni de respuestas de IA.
- El informe para cliente:
  - Excluye notas personales, estrategia interna y datos no destinados a terceros.
  - Requiere revisión del abogado.
- Sus únicas fuentes son ficha básica jurídica del expediente, nombres/roles de participantes y actuaciones. Se excluyen documentos, fotografías, identificaciones y datos de contacto desde la proyección de origen, no mediante filtrado posterior del modelo.
- La revisión se comunica como aviso visible de responsabilidad profesional, sin aprobación en la aplicación ni bloqueo de descarga; no hay envío automático al cliente.
- Las notas personales quedan excluidas de todas las variantes de IA/informe. Las demás variantes pueden usar datos jurídicos permitidos y texto PDF autorizado, sin fotografías ni OCR.
- MS-02 rechaza la generación cuando las fuentes son insuficientes o falla la generación. En esos casos no se guarda ningún informe como completado y se informa el error.
- El abogado consulta los informes guardados de un expediente con su fecha y tipo, y los descarga.
- Los informes guardados no se añaden automáticamente a los documentos del expediente.
- El abogado exporta a CSV los resultados tabulares de los informes.
- PDF es el único formato narrativo; el resumen ejecutivo debe ocupar exactamente una página del PDF generado. No se trunca contenido silenciosamente para lograrlo.
- El CSV usa UTF-8, punto y coma, cabeceras, fechas `dd/MM/yyyy` e importes sin agrupación y con coma decimal. Exporta las columnas/valores del resultado tabular presentado; las protecciones de celdas se documentan sin cambios silenciosos.
- Los informes guardados son inmutables: no se editan ni eliminan desde la aplicación; se genera otro cuando haga falta.
- MS-02 expone mediante contrato los informes guardados de un expediente para las descargas offline.
- Los informes pertenecen a la cuenta del abogado. Ningún otro abogado ni el Administrador acceden a ellos.

### No funcionales

- Privacidad: los informes para cliente nunca contienen notas personales ni estrategia interna.
- Coordinación: si falla cualquier servicio del flujo, no se informa éxito ni queda un informe parcial como completado.
- Jurisdicción: el contenido generado se orienta a Bolivia y requiere revisión profesional.

## Criterios de aceptación

- [ ] Dado un expediente con información suficiente, cuando el abogado solicita un resumen ejecutivo, entonces se genera, se guarda con su fecha y tipo y se le presenta.
- [ ] Dado un expediente con notas personales, cuando el abogado genera un informe para cliente, entonces el informe no contiene el contenido de esas notas.
- [ ] Dado un informe para cliente generado, cuando se presenta, entonces se indica que requiere revisión del abogado.
- [ ] Dada una consulta en lenguaje natural, cuando el abogado genera un reporte, entonces se basa solo en fuentes y filtros autorizados de su cuenta.
- [ ] Dadas fuentes insuficientes o un fallo de MS-01 o MS-04, cuando se solicita un informe, entonces se informa el error y no se guarda ningún informe como completado.
- [ ] Dados informes guardados, cuando el abogado los consulta, entonces ve su fecha y tipo y puede descargarlos.
- [ ] Dado un informe guardado, cuando se genera un nuevo informe o una respuesta de IA, entonces el informe guardado no se usa como fuente.
- [ ] Dado un informe guardado, cuando el abogado consulta los documentos del expediente, entonces el informe no aparece entre ellos.
- [ ] Dado un resultado tabular, cuando el abogado lo exporta, entonces obtiene un CSV con los mismos datos.
- [ ] Dados dos abogados A y B, cuando A intenta consultar o descargar un informe de B, entonces se rechaza.
- [ ] Dado un administrador, cuando intenta consultar informes, entonces recibe "no autorizado".
- [ ] Dado un expediente Archivado, cuando se intenta generar, entonces se rechaza; los informes previos siguen descargables como PDF.
- [ ] Dado un resumen ejecutivo generado, cuando se renderiza su PDF, entonces ocupa exactamente una página sin contenido cortado.
- [ ] Dada una solicitud de editar o eliminar un informe guardado, cuando se revisa el contrato, entonces no existe una operación que lo permita.

## Dependencias

- Specs 000, 001, 002 y 003.
- Spec 007: expedientes y su estado.
- Specs 006, 008 y 009: información jurídica usada como fuente; las notas se identifican como privadas.
- Spec 010: documentos usados como fuente.
- Spec 005 y MS-04: agentes y generación de contenido.

## Preguntas abiertas

Ninguna de alcance para esta fase. El plazo total de generación es configurable, inicialmente 60 segundos, según la spec 002.
