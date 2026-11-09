# Expedientes offline

## Estado

Lista. Aprobada por el responsable el 2026-11-08; implementación y verificación pendientes.

## Fuente y trazabilidad

- Especificación integral: [Asistente Lex](../../docs/Asistente_Lex_Especificacion_Integral.md), secciones 3.1 (modelo de dominio: CopiaOffline), 5.2 (robustez y secuencia de la descarga) y 6.1 (descarga y consulta offline de solo lectura); requisitos RF-013, RF-014 y RF-015; casos de uso CU-08 y CU-09; reglas RN-01, RN-12, RN-13 y RN-14; requisitos RNF-08, RNF-10 y RNF-11.
- Constitución: [principios II, IV, VI, X y XI](../../docs/constitution.md).

## Contexto y problema

El abogado necesita consultar sus expedientes donde no tiene conexión, por ejemplo en audiencias o reuniones. Para ello debe preparar previamente copias locales completas, que reúnen información de MS-01 (datos jurídicos) y de MS-02 (documentos, fotografías e informes guardados).

El modo offline es exclusivamente de consulta. Una copia incompleta presentada como completa podría inducir a error, y una copia local de información confidencial requiere cuidado especial.

## Objetivos

- Descargar íntegramente expedientes seleccionados para consulta sin conexión.
- Distinguir las copias completas de las incompletas.
- Actualizar y eliminar copias locales a petición del abogado.
- Consultar sin conexión, en solo lectura, las copias completas.

## No objetivos

- Modificar información sin conexión o sincronizar cambios hacia el servidor (RN-13).
- Usar IA o generar informes sin conexión.
- Incluir datos ERP o conversaciones de IA en las copias (RN-12).
- Actualizar copias automáticamente sin solicitud del abogado.
- Usar DynamoDB para copias locales o colas de sincronización.

## Usuarios y escenarios

- Como abogado, quiero marcar un expediente como disponible sin conexión, para consultarlo donde no tengo internet.
- Como abogado, quiero saber si una copia está completa y cuándo se descargó, para confiar en lo que consulto.
- Como abogado, quiero actualizar una copia cuando vuelvo a tener conexión, para ver los cambios recientes.
- Como abogado, quiero eliminar una copia de mi dispositivo, para liberar espacio o proteger la información.

## Requisitos

### Funcionales

**Descarga y gestión**

- El abogado marca con conexión un expediente propio como "Disponible sin conexión". Se admiten expedientes Abiertos, Cerrados y Archivados.
- La copia comprende:
  - Ficha del expediente.
  - Personas y participantes.
  - Actuaciones.
  - Notas personales.
  - Documentos y fotografías.
  - Informes guardados con su fecha.
- La copia excluye datos ERP y conversaciones de IA.
- Un expediente sin informes guardados se puede descargar completo.
- La aplicación comprueba la integridad de la copia:
  - Solo una copia completa se marca como disponible sin conexión.
  - Si falta algún elemento, no hay conexión o el almacenamiento es insuficiente, se informa la descarga como incompleta y no se habilita.
- Cada expediente descargado muestra su estado de descarga y la fecha de la última descarga completa.
- El abogado puede descargar varios expedientes.
- Se admiten como máximo 10 expedientes con copia local por dispositivo/perfil de navegador, además de la cuota real disponible. Actualizar uno existente no ocupa otro cupo; una generación fallida no cuenta como copia disponible.
- El abogado actualiza una copia a petición, con conexión, descargándola de nuevo.
- Si una actualización falla, se conserva la última generación completa con su fecha original y se informa el fallo por separado; nunca se publica la incompleta.
- El abogado elimina una copia local completa, incluidos documentos, fotografías e informes. La eliminación no afecta los datos del servidor.

**Consulta sin conexión**

- Sin conexión, el abogado abre una copia completa y consulta todas sus secciones, incluidos los informes guardados con su fecha.
- La consulta es exclusivamente de lectura. No se permite registrar, modificar, eliminar contenido, adjuntar archivos, chatear ni generar informes.
- No se acumulan cambios pendientes ni se inicia ninguna sincronización.
- La copia refleja el estado del expediente en la fecha de descarga. Los cambios posteriores en el servidor requieren una nueva descarga.
- Una copia inexistente, incompleta o con un archivo inaccesible se informa claramente y no se presenta como válida.
- Las copias se cifran y se desbloquean con la misma contraseña del login, sin una contraseña local adicional ni guardar contraseña o clave descifrada persistentemente junto a los datos.
- No vence el permiso de consulta local por tiempo transcurrido desde el último login online; desbloquear no crea una sesión online ni elimina sus límites de la spec 003.
- Si cambia o se restablece la contraseña y una copia antigua no se puede descifrar, se informa y se permite eliminarla y descargarla de nuevo online, sin recuperación/migración automática de claves. Un intento de contraseña incorrecta no elimina datos automáticamente.
- Cerrar sesión o iniciar otra cuenta en el mismo perfil elimina las copias anteriores y limpia claves en memoria. Solo se borra almacenamiento propio de la cuenta/aplicación.
- Sin red no se puede detectar una suspensión: se acepta que la copia siga accesible localmente. Al conocer la suspensión online, se bloquea el acceso y se eliminan las copias de esa cuenta.

### No funcionales

- Integridad: una copia incompleta nunca aparece como disponible sin conexión (RNF-10).
- Privacidad: solo se descargan expedientes de la cuenta del abogado autenticado.
- Transparencia: la fecha de descarga es visible, para que el abogado conozca la antigüedad de la información.
- Compatibilidad de referencia: Chrome/Edge de escritorio, Chrome en Android y Safari en iPhone/iPad estables con las APIs necesarias. La comprobación de compatibilidad e integridad queda a cargo del desarrollador, sin declarar resultados no verificados.
- Seguridad: no se promete revocación ni borrado remoto instantáneo en un dispositivo sin red, ni protección de nivel producción.

## Criterios de aceptación

- [ ] Dado un expediente propio en cualquier estado y conexión disponible, cuando el abogado lo marca como disponible sin conexión, entonces se descarga completo y se muestra como disponible con su fecha.
- [ ] Dada una copia descargada, cuando se revisa su contenido, entonces incluye ficha, personas, participantes, actuaciones, notas, documentos, fotografías e informes guardados, y no incluye datos ERP ni conversaciones.
- [ ] Dado un expediente sin informes guardados, cuando se descarga, entonces la copia se completa.
- [ ] Dado un fallo al recuperar un documento o un informe, cuando termina la descarga, entonces se informa como incompleta y la copia no se habilita.
- [ ] Dado almacenamiento local insuficiente, cuando se intenta descargar, entonces se informa y la copia no se habilita.
- [ ] Dada una copia completa y sin conexión, cuando el abogado la abre, entonces consulta todas sus secciones y puede abrir los informes guardados.
- [ ] Dada una copia sin conexión, cuando el abogado intenta escribir, adjuntar, chatear o generar informes, entonces esas acciones no están disponibles.
- [ ] Dada una copia de un expediente Cerrado o Archivado, cuando se consulta sin conexión, entonces se muestra en solo lectura.
- [ ] Dados cambios en el servidor posteriores a la descarga, cuando el abogado actualiza la copia con conexión, entonces la copia refleja los cambios y su nueva fecha.
- [ ] Dada una copia local, cuando el abogado la elimina, entonces desaparece del dispositivo y el expediente sigue disponible en el servidor.
- [ ] Dada la consulta sin conexión, cuando el abogado vuelve a tener conexión, entonces no se envía ningún cambio al servidor.
- [ ] Dadas 10 copias completas, cuando se intenta descargar otro expediente, entonces se informa el límite; actualizar una existente no consume otro cupo.
- [ ] Dada una actualización fallida, cuando se abre la copia anterior, entonces sigue completa con su fecha original y el fallo se muestra aparte.
- [ ] Dadas copias cifradas, cuando se desbloquean con la contraseña del login correspondiente, entonces son legibles sin una contraseña adicional; no se almacena el secreto junto a ellas.
- [ ] Dado cierre de sesión, cambio de cuenta o suspensión detectada online, cuando se procesa, entonces se borran las copias de esa cuenta y las claves en memoria.
- [ ] Dada una copia antigua inaccesible tras cambiar contraseña, cuando se informa, entonces puede eliminarse y descargarse de nuevo sin alterar el servidor.

## Dependencias

- Specs 000, 001, 002 y 003.
- Specs 006, 007, 008 y 009: datos jurídicos suministrados por MS-01.
- Spec 010: documentos y fotografías suministrados por MS-02.
- Spec 012: informes guardados suministrados por MS-02.

## Preguntas abiertas

Ninguna de alcance para esta fase. La verificación de comportamiento la realizará el desarrollador; no se crean archivos de testing ni se marca esta spec como verificada por documentar la solución.
