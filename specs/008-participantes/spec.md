# Participantes

## Estado

Lista. Aprobada por el responsable el 2026-11-08; implementación y verificación pendientes.

## Fuente y trazabilidad

- Especificación integral: [Asistente Lex](../../docs/Asistente_Lex_Especificacion_Integral.md), secciones 1.1 (conceptos fundamentales) y 3.1 (modelo de dominio: Participación); requisito RF-008; caso de uso CU-04; reglas RN-01, RN-04 y RN-07.
- Constitución: [principios IV y X](../../docs/constitution.md).

## Contexto y problema

Una persona registrada puede intervenir en varios expedientes con roles distintos; por ejemplo, ser la persona defendida en uno y contraparte en otro. Además, quien contrata los servicios puede ser distinto de quien es defendido.

Se necesita vincular personas a expedientes con un rol contextual, sin confundir la ficha de la persona con su participación en cada expediente.

## Objetivos

- Vincular personas registradas a un expediente con un rol.
- Consultar los participantes de un expediente.
- Actualizar el rol de un participante o desvincularlo mientras el expediente está Abierto.

## No objetivos

- Registrar o editar los datos de las personas (spec 006).
- Asociar contratantes a servicios jurídicos (spec 014).
- Vincular personas de otras cuentas.

## Usuarios y escenarios

- Como abogado, quiero vincular a una persona a un expediente con su rol, para saber quién interviene y cómo.
- Como abogado, quiero que una misma persona participe en varios expedientes con roles diferentes, para no duplicar fichas.
- Como abogado, quiero corregir el rol o desvincular a un participante, para mantener el expediente actualizado.

## Requisitos

### Funcionales

- El abogado vincula una persona registrada de su cuenta a un expediente Abierto, asignándole un rol.
- Los roles son Persona defendida o representada, Contraparte, Testigo, Representante y Otro. Otro requiere descripción obligatoria en texto libre.
- Solo existe una participación por persona y expediente, con un rol modificable. No se permiten vínculos duplicados ni se añaden incompatibilidades adicionales entre roles.
- El rol es contextual al expediente: la misma persona puede tener roles distintos en expedientes diferentes.
- El abogado consulta los participantes de un expediente en cualquier estado.
- El abogado actualiza el rol o desvincula a un participante solo mientras el expediente está Abierto.
- Desvincular a un participante no elimina ni modifica la ficha de la persona.
- Ser contratante de un servicio no obliga a participar en el expediente ni impide desvincular una participación existente; la persona y los servicios permanecen intactos.
- MS-01 rechaza:
  - Vincular personas inexistentes o de otra cuenta.
  - Relaciones incompatibles.
  - Cambios sobre expedientes Cerrados o Archivados.
- Los participantes pertenecen al expediente del abogado. Ningún otro abogado ni el Administrador acceden a ellos.

### No funcionales

- Autoridad de reglas: MS-01 valida el estado del expediente y la pertenencia de la persona, aunque la interfaz lo anticipe.
- Trazabilidad: los cambios de participación se reflejan en el historial pertinente de cambios jurídicos (RNF-14).
- El historial se conserva internamente, sin pantalla ni operación de consulta por el Abogado en esta fase.

## Criterios de aceptación

- [ ] Dado un expediente Abierto y una persona registrada, cuando el abogado la vincula con un rol, entonces aparece como participante con ese rol.
- [ ] Dada una persona que participa en un expediente, cuando se vincula a otro con un rol distinto, entonces cada expediente muestra su rol correspondiente.
- [ ] Dado un expediente Abierto, cuando el abogado cambia el rol de un participante, entonces el expediente refleja el nuevo rol.
- [ ] Dado un expediente Abierto, cuando el abogado desvincula a un participante, entonces deja de aparecer en el expediente y la ficha de la persona permanece intacta.
- [ ] Dado un expediente Cerrado o Archivado, cuando se intenta vincular, cambiar el rol o desvincular, entonces MS-01 lo rechaza aunque la solicitud no pase por la interfaz.
- [ ] Dado un expediente en cualquier estado, cuando el abogado consulta sus participantes, entonces ve la lista con sus roles.
- [ ] Dada una persona de otra cuenta o inexistente, cuando se intenta vincular, entonces se rechaza sin revelar datos de otras cuentas.
- [ ] Dada una persona ya vinculada, cuando se intenta vincular de nuevo al mismo expediente, entonces se rechaza sin duplicar la participación.
- [ ] Dado el rol Otro sin descripción, cuando se registra o modifica, entonces se rechaza; con descripción se acepta.
- [ ] Dado un participante contratante de un servicio, cuando se desvincula en Abierto, entonces su ficha y servicio permanecen intactos.

## Dependencias

- Specs 000, 001, 002 y 003.
- Spec 006: personas registradas.
- Spec 007: expedientes y su estado.

## Preguntas abiertas

Ninguna de alcance para esta fase.
