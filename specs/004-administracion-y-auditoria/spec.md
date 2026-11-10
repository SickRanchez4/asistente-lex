# Administración y auditoría

## Estado

En progreso. Aprobada el 2026-11-08; implementadas las capacidades propias de 004 y verificación por capas registrada en las [tareas](./tasks.md). La aceptación final queda pendiente de una acción real de agentes de 005 y del recorrido autenticado completo contra el despliegue; no se declara completa.

## Fuente y trazabilidad

- Especificación integral: [Asistente Lex](../../docs/Asistente_Lex_Especificacion_Integral.md), sección 3.2 (DynamoDB para auditoría administrativa); requisitos RF-029 y RF-030; caso de uso CU-16; regla RN-01; requisitos RNF-11 y RNF-14.
- Constitución: [principios IV, X y XI](../../docs/constitution.md).

## Contexto y problema

El Administrador necesita gestionar las cuentas de los abogados y los parámetros generales de la aplicación, y poder revisar qué ocurrió: accesos, fallos, denegaciones, cambios administrativos y acciones sobre agentes.

Esa gestión debe hacerse sin dar al Administrador acceso ordinario al contenido privado de los abogados, y cada cambio administrativo debe quedar registrado de forma auditable.

## Objetivos

- Permitir al Administrador consultar, crear, activar y suspender cuentas de abogados.
- Permitir consultar y ajustar los parámetros generales permitidos.
- Registrar un evento de auditoría por cada cambio administrativo.
- Permitir consultar los eventos de acceso, de administración y de acciones sobre agentes.

## No objetivos

- Configurar los agentes de IA (spec 005); aquí solo se consultan sus eventos.
- Acceder al contenido privado de los abogados: expedientes, chats, informes o datos ERP.
- Eliminar cuentas de abogados.
- Implementar el inicio de sesión (spec 003).

## Usuarios y escenarios

- Como administrador, quiero crear la cuenta de un abogado, para que pueda empezar a usar la aplicación.
- Como administrador, quiero suspender y reactivar cuentas, para controlar quién puede acceder.
- Como administrador, quiero ajustar los parámetros generales permitidos, para configurar la aplicación.
- Como administrador, quiero consultar los eventos de acceso y administración, para detectar problemas y revisar cambios.

## Requisitos

### Funcionales

- El Administrador lista y consulta las cuentas de abogados con su estado: activa o suspendida.
- El Administrador crea cuentas de abogado. La cuenta creada queda activa.
- Crear cuenta requiere nombre completo, correo electrónico único y contraseña; el rol es Abogado. No se editan nombre, correo ni rol después de crearla en este MVP.
- El Administrador restablece la contraseña de un Abogado sin consultar la anterior ni su hash, sin enviar correo ni imponer un cambio posterior. La operación se audita sin incluir contraseñas.
- El Administrador suspende una cuenta activa. El abogado suspendido no puede iniciar sesión.
- El Administrador reactiva una cuenta suspendida.
- Suspender una cuenta no elimina ni altera los datos del abogado.
- El Administrador consulta y ajusta los parámetros generales permitidos.
- Los únicos parámetros generales son un mensaje informativo global opcional en texto plano y un correo de contacto/soporte opcional mostrado en ayuda. No se configura SMTP, secretos, conexiones, IA ni claves arbitrarias desde este panel.
- MS-01 registra en DynamoDB un evento de auditoría por cada creación, suspensión, reactivación y cambio de parámetro, con autor, fecha, operación y, en los cambios de parámetros, valor anterior y nuevo.
- El Administrador consulta los eventos y puede filtrarlos por tipo, período y usuario. Los tipos incluyen:
  - Accesos.
  - Intentos de autenticación fallidos.
  - Cierres de sesión.
  - Denegaciones de acceso.
  - Cambios administrativos.
  - Acciones sobre agentes, informadas por MS-04.
- Los eventos de auditoría no pueden modificarse ni eliminarse desde la aplicación.
- Las operaciones sobre una cuenta inexistente devuelven un error de recurso inexistente.
- Las operaciones administrativas solicitadas sin rol Administrador se rechazan y se registran como denegación.
- MS-04 informa acciones sobre agentes a MS-01 por REST síncrono autenticado.
- Si un cambio ya fue confirmado por su propietario y falla la auditoría en DynamoDB, se conserva y se comunica como resultado parcial: cambio aplicado y auditoría no registrada. No se simula rollback, no se reenvía automáticamente el cambio ni se añade cola de recuperación. Esta política también se aplica a agentes.
- Los eventos se conservan mientras exista el entorno local, sin TTL ni eliminación automática.

### No funcionales

- Privacidad: la información de cuentas mostrada al Administrador se limita a datos de cuenta y estado; no incluye contenido privado del abogado.
- Trazabilidad: intentar auditar cada cambio; si falla después de aplicarlo, informar el resultado parcial conforme a la excepción explícita acordada, sin éxito global.
- Seguridad: los eventos no contienen contraseñas, tokens ni contenido privado.

## Criterios de aceptación

Los escenarios que esperan un evento presuponen auditoría disponible; si el cambio ya se aplicó y el registro falla, rige el criterio explícito de resultado parcial.

- [ ] Dado un administrador, cuando crea una cuenta de abogado, entonces la cuenta aparece como activa y se registra el evento de auditoría.
- [ ] Dada una cuenta activa, cuando el administrador la suspende, entonces el abogado no puede iniciar sesión y se registra el evento.
- [ ] Dada una cuenta suspendida, cuando el administrador la reactiva, entonces el abogado puede volver a iniciar sesión y sus datos permanecen intactos.
- [ ] Dado un parámetro general permitido, cuando el administrador lo modifica, entonces el nuevo valor queda vigente y el evento registra el valor anterior y el nuevo.
- [ ] Dados eventos de distintos tipos, cuando el administrador filtra por tipo, período o usuario, entonces solo obtiene los eventos que cumplen el filtro.
- [ ] Dada una acción sobre un agente realizada en la spec 005, cuando el administrador consulta los eventos, entonces la acción aparece registrada.
- [ ] Dado un abogado autenticado, cuando invoca una operación administrativa, entonces recibe "no autorizado" y se registra una denegación.
- [ ] Dada una cuenta inexistente, cuando el administrador intenta operar sobre ella, entonces recibe un error de recurso inexistente.
- [ ] Dada la consulta de una cuenta, cuando el administrador la revisa, entonces no ve expedientes, chats, informes ni datos ERP del abogado.
- [ ] Dado un evento de auditoría, cuando se intenta modificarlo o eliminarlo desde la aplicación, entonces no existe operación que lo permita.
- [ ] Dado un restablecimiento autorizado, cuando se completa, entonces el Abogado puede usar la nueva contraseña y el evento no contiene su valor ni hash.
- [ ] Dado un cambio confirmado y DynamoDB no disponible, cuando termina la solicitud, entonces el cambio permanece aplicado y se informa fallo parcial de auditoría sin afirmar que se revirtió.
- [ ] Dado un parámetro fuera del mensaje global o correo de soporte, cuando se intenta modificarlo, entonces se rechaza; ambos parámetros permitidos registran anterior y nuevo cuando la auditoría está disponible.

## Dependencias

- Spec 000: MS-01, DynamoDB y microfrontend Angular.
- Spec 001: navegación y patrones del panel de administración.
- Spec 002: contratos y modelo de errores.
- Spec 003: autenticación, roles y registro de eventos de acceso.
- Spec 005: origen de los eventos sobre agentes.

## Preguntas abiertas

Ninguna de alcance para esta fase. SSO está diferido por la spec 003; las cuentas usan correo y contraseña propios.
