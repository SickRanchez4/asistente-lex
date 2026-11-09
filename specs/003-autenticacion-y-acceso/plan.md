# Plan: Autenticación y acceso

## Estado

Lista. Plan aprobado por el responsable el 2026-11-08; implementación y verificación pendientes.

## Resumen técnico

Implementar login tradicional con correo y contraseña en MS-01, responsable de identidad, rol y estado de cuenta. Usar hash seguro de contraseña, sesión de servidor y cookie HttpOnly; sin proveedor SSO, registro público, multirrol, JWT en localStorage ni recuperación por correo. El Gateway y propietarios comprueban acceso por solicitud; el Shell presenta la interfaz correspondiente.

Aplicar los principios IV, V y X de la [constitución](../../docs/constitution.md) y los contratos de [002](../002-gateway-y-contratos-base/plan.md). La separación React/Angular es experiencia, no seguridad.

## Diseño y componentes

- **MS-01:** casos de uso de inicio/cierre de sesión, verificación de acceso y cambio voluntario de contraseña; puertos para cuentas, sesiones, hash y auditoría. Usar soporte de seguridad de Spring compatible con el proyecto, no criptografía propia.
- **Gateway:** verificar sesión/credencial conforme al contrato de MS-01 y no reenviar operaciones protegidas sin identidad válida.
- **Servicios propietarios:** comprobar identidad, rol y cuenta antes de cada operación. El Administrador no puede leer ni escribir expedientes, chats, informes o ERP.
- **Shell:** recibir estado de sesión y rol verificado, montar React o Angular y retirar contenido privado al cerrar o expirar la sesión.
- **Pantalla de acceso:** correo y contraseña, errores seguros, estado pendiente y cierre; reutilizar [001](../001-experiencia-y-ui-compartida/plan.md). No añadir selector de roles ni pantalla SSO.

Cuenta con nombre completo, correo único, hash y un rol fijo. Validar correo/contraseña contra la cuenta, nunca confiar en el correo o rol aportado como identidad ya autenticada. El Administrador crea/restablece cuentas Abogado en 004.

## Flujo de datos

1. El usuario envía correo y contraseña por GraphQL; Gateway delega validación en MS-01 sin registrar el secreto.
2. MS-01 comprueba hash, cuenta habilitada y rol; no devuelve hash ni contraseña.
3. MS-01 crea sesión con identificador opaco seguro y plazos, y la integración del Gateway establece cookie HttpOnly del origen de la aplicación.
4. El Shell obtiene contexto de sesión, muestra navegación del rol y consume GraphQL.
5. Gateway y propietarios autorizan las solicitudes con esa identidad verificada.
6. Cerrar sesión invalida la sesión de aplicación; solicitudes posteriores se rechazan y se registra el cierre.

Máximo de sesión online 8 horas e inactividad 30 minutos, aplicados por servidor; no renovar por sondeos automáticos. Suspender invalida sesiones existentes. La consulta offline de 013 tiene política propia sin vencimiento temporal; no prolonga una sesión online.

## Interfaces y contratos

Documentar SDL/OpenAPI de inicio/contexto/cierre/cambio de contraseña y verificación interna antes de integrar, conforme a 002. Gateway reenvía cookie/identificador de sesión solo a MS-01 para verificarla, y transmite identidad interna verificable a los propietarios. El navegador no llama directamente a APIs REST.

El contexto de UI distingue sesión pendiente, autenticada y ausente/expirada, con rol validado. No incluir secretos. Los errores diferencian identidad inválida, cuenta suspendida y no autorizado, usando mensajes seguros.

La identidad propagada incluye usuario, rol y cuenta verificados. Un solo rol por cuenta y ningún parámetro cambia la cuenta efectiva. Cambio de contraseña propio autenticado; restablecimiento administrativo separado en 004, sin revelar contraseña anterior y sin cambio obligatorio al próximo login.

## Persistencia y migraciones

- PostgreSQL `juridico`: cuentas con nombre, correo único, hash, estado y rol; sesiones con identificador opaco protegido, vencimiento absoluto y última actividad pertinente.
- DynamoDB, propiedad de MS-01: eventos con tipo, fecha, usuario cuando sea identificable y resultado; identificador técnico para distinguir eventos.
- Sesión de servidor persistida en MS-01. Cookie HttpOnly, SameSite apropiado y Secure cuando haya HTTPS; no exponer credencial de sesión a JavaScript.
- **Migraciones aprobadas con el plan:** SQL versionado mediante Flyway para las tablas de MS-01, reutilizando JDBC actual; aprovisionamiento explícito de tablas/índices DynamoDB desde MS-01. Añadir dependencias y crear tablas solo durante implementación, no durante elaboración de tareas.
- Aplicar el [ADR 0003](../../docs/decisions/0003-persistencia-por-servicio.md): solo objetos propios, sin relaciones entre esquemas. Acordar con 004 consultas por tipo/período/usuario antes de definir claves e índices de eventos.

Sin TTL de eventos en esta fase: conservar mientras exista el entorno. Sesiones expiradas no autorizan aunque su limpieza física se ejecute después.

El proceso de preparación de base ofrece una opción demo solo local tras migraciones: variables públicas de demostración `admi@demo.com` / `password`, hash generado por el mismo mecanismo de aplicación y creación idempotente sin sobrescribir cuentas. No colocar esta semilla antes de las tablas ni habilitarla automáticamente en otros entornos; ajustar el límite de 000 sin crear scripts durante esta fase documental.

## Seguridad y privacidad

- Hash de contraseñas con función segura mantenida por la biblioteca de seguridad; no texto plano ni hash rápido casero.
- Cookie y validación de origen/protección CSRF coherentes con GraphQL y el origen del Shell; CORS no sustituye esa protección.
- No exponer tokens en URL ni registros. No registrar contraseñas o contenido jurídico.
- Para una identidad inválida sin usuario conocido, registrar el resultado sin inventar una cuenta ni incluir el secreto recibido.
- Rechazar el acceso entre cuentas y todo acceso administrativo a datos privados, incluso con identificadores válidos.

## Observabilidad y manejo de errores

Registrar inicios exitosos, intentos fallidos, cierres y denegaciones en DynamoDB. Usar mensajes y categorías de 002, sin cuerpos de autenticación.

Un fallo de MS-01 o su almacenamiento se comunica como indisponibilidad, no como credenciales inválidas. Un fallo al invalidar la sesión no se presenta como cierre exitoso.

Auditoría de mejor esfuerzo conforme a 004: si falla, conservar login válido/logout efectivo e informar fallo explícito. Rechazos por identidad, suspensión o permiso nunca se deshacen; tampoco se presenta como registrada una denegación que no llegó a DynamoDB. Sin colas ni recuperación garantizada.

No hay bloqueo temporal por intentos fallidos en esta fase exclusivamente local. Es una limitación explícita, no una solución de autenticación de nivel producción.

## Verificación

Responsabilidad del desarrollador, sin crear archivos de testing. Este trabajo solo ajusta documentos; las verificaciones de código e integración se realizarán durante implementación.

| Criterio de la spec | Comprobación |
|---|---|
| 1. Abogado habilitado | Correo/contraseña válidos: acceso solo a React con navegación de Abogado. |
| 2. Administrador | Login válido: acceso Angular y ausencia de contenido jurídico. |
| 3. Credenciales inválidas | Rechazo informativo, sin sesión válida y evento de intento fallido. |
| 4. Cuenta suspendida | Rechazo indicando suspensión y evento; coordinar con suspensión de 004. |
| 5. Abogado solicita administración | Invocar GraphQL directamente: no autorizado y evento de denegación. |
| 6. Administrador solicita datos privados | Probar lecturas jurídicas, chat, informes y ERP: todas rechazadas. |
| 7. A solicita recursos de B | Probar consultas y escrituras con identificadores/cuenta manipulados: rechazo sin contenido ajeno. |
| 8. Sesión cerrada | Reutilizar la sesión después del cierre: rechazo no autenticado en Gateway y propietarios. |
| 9. Eventos seguros | Revisar tipo, fecha, usuario y resultado, sin contraseñas, tokens o contenido privado. |
| 10. Vigencia | 8 horas, inactividad 30 minutos o suspensión: sesión online rechazada. |
| 11. Contraseña | Cambio/restablecimiento almacena hash, permite nuevo acceso y no exige cambio posterior. |
| 12. Auditoría fallida | Login válido/logout efectivo se mantienen y el fallo de registro es explícito. |
| 13. Demo local | Opción explícita tras migraciones crea hash de demo; repetición no sobreescribe y fuera de local no crea esa cuenta. |

Registrar verificaciones pendientes en las tareas. Los contratos de identidad dependen de 002 y la creación de cuentas de 004; no validar mediante una sesión ficticia de producción.

## Decisiones

- Mantener el [stack aprobado](../../docs/decisions/0001-stack-y-versiones.md) y la propiedad de persistencia del ADR 0003.
- Login, sesión y diferimiento SSO constan en el [ADR 0004](../../docs/decisions/0004-integraciones-minimas-del-mvp.md).
- Flyway queda aprobado junto con este plan; las specs posteriores de MS-01 reutilizan la elección, sin otra herramienta por tabla.

## Riesgos y preguntas abiertas

- La cuenta demo es pública/insegura y solo local; nunca confundirla con credenciales reales ni preparación de producción.
- Sin bloqueo temporal no hay protección contra intentos repetidos; limitación aceptada para esta fase local.
- La suspensión no revoca copias en un dispositivo offline; aplicar política de 013 al reconectar.
- No quedan preguntas funcionales abiertas. La verificación corresponde al desarrollador.