# Personas

## Estado

En progreso. Aprobada por el responsable el 2026-11-08. Capacidades propias implementadas; C01–C11 verificados. C12 pendiente de expedientes y participantes reales de 007/008.

## Fuente y trazabilidad

- Especificación integral: [Asistente Lex](../../docs/Asistente_Lex_Especificacion_Integral.md), sección 1.1 (conceptos fundamentales) y 3.1 (modelo de dominio); requisitos RF-002 y RF-003; caso de uso CU-02; reglas RN-01, RN-02, RN-03 y RN-04.
- Constitución: [principios IV y X](../../docs/constitution.md).

## Contexto y problema

Una misma persona natural o jurídica puede participar en varios expedientes del abogado con roles diferentes, y puede ser también cliente contratante de servicios jurídicos. A menudo el abogado no conoce su documento de identidad al registrarla.

Se necesita un registro de personas por cuenta, reutilizable entre expedientes y servicios, que admita identificación opcional y evite registrar dos veces el mismo documento.

## Objetivos

- Registrar personas naturales y jurídicas.
- Consultar, buscar, filtrar y actualizar personas.
- Admitir la identificación como dato opcional, que puede completarse después.
- Impedir duplicar un documento de identidad dentro de la misma cuenta.

## No objetivos

- Vincular personas a expedientes o asignarles roles (spec 008).
- Asociar personas a servicios como contratantes (spec 014).
- Eliminar personas.
- Compartir personas entre cuentas.
- Validar documentos contra registros oficiales.

## Usuarios y escenarios

- Como abogado, quiero registrar una persona aunque no conozca su documento, para no bloquear mi trabajo.
- Como abogado, quiero completar su identificación más tarde, para mantener la ficha actualizada.
- Como abogado, quiero buscar una persona registrada, para reutilizarla en otros expedientes.
- Como abogado, quiero que el sistema me avise si un documento ya está registrado, para no duplicar fichas.

## Requisitos

### Funcionales

- Una persona es de tipo natural o jurídica.
- Datos obligatorios según el tipo:
  - Natural: nombres y apellidos.
  - Jurídica: razón social.
- La identificación es opcional. Cuando se informa, se compone de tipo de documento, número y país emisor.
- La identificación se admite completamente vacía o con los tres campos completos; no se permite identificación parcial.
- El tipo de documento es texto libre, sin catálogo cerrado. La comparación aplica normalización coherente de espacios exteriores y mayúsculas/minúsculas, sin convertir el número en entero ni eliminar ceros iniciales.
- Se admiten teléfono, correo electrónico y domicilio opcionales, sin validación contra registros externos.
- MS-01 rechaza registrar o actualizar una persona si otra ficha de la misma cuenta ya tiene el mismo tipo de documento, número y país emisor.
- El mismo número con otro tipo de documento o país emisor es válido.
- La misma identificación puede existir en cuentas distintas.
- El abogado consulta, busca y filtra personas al menos por nombre o razón social, tipo de persona y documento.
- El abogado actualiza los datos de una persona y puede completar su identificación posteriormente. La actualización respeta la regla de unicidad.
- La ficha Persona se puede editar independientemente del estado de los expedientes en que participa. Sus consultas muestran la ficha vigente; editarla no modifica participaciones ni contenido jurídico de esos expedientes.
- Las personas pertenecen a la cuenta del abogado. Ningún otro abogado ni el Administrador acceden a ellas.

### No funcionales

- Autoridad de reglas: la validación de datos obligatorios y de unicidad la realiza MS-01, aunque la interfaz también la anticipe.
- Privacidad: los mensajes de duplicado no revelan datos de otras cuentas.

## Criterios de aceptación

- [x] Dada una persona natural sin nombres o sin apellidos, cuando se intenta registrar, entonces se rechaza indicando los campos faltantes.
- [x] Dada una persona jurídica sin razón social, cuando se intenta registrar, entonces se rechaza indicando el campo faltante.
- [x] Dada una persona sin identificación, cuando se registra con los datos obligatorios, entonces queda disponible.
- [x] Dada una persona con un tipo, número y país emisor ya registrados en la misma cuenta, cuando se intenta registrar o actualizar, entonces MS-01 la rechaza indicando el duplicado, también si la solicitud no pasa por la interfaz.
- [x] Dado un número ya registrado con otro país emisor o tipo de documento, cuando se registra, entonces se acepta.
- [x] Dada una identificación registrada en la cuenta de otro abogado, cuando se registra en la propia cuenta, entonces se acepta.
- [x] Dada una persona registrada sin identificación, cuando el abogado la completa posteriormente, entonces la ficha se actualiza.
- [x] Dadas varias personas registradas, cuando el abogado busca por nombre, razón social o documento, entonces obtiene las coincidencias de su cuenta.
- [x] Dados dos abogados A y B, cuando A consulta o busca personas, entonces no obtiene personas de B.
- [x] Dado un administrador, cuando intenta consultar personas de un abogado, entonces recibe "no autorizado".
- [x] Dada identificación parcial, cuando se registra o actualiza, entonces se rechaza; teléfono, correo y domicilio pueden omitirse.
- [ ] Dada una persona que solo participa en expedientes Cerrados o Archivados, cuando el propietario edita su ficha, entonces se acepta sin alterar sus participaciones.

## Dependencias

- Specs 000, 001, 002 y 003.

## Preguntas abiertas

Ninguna de alcance para esta fase.
