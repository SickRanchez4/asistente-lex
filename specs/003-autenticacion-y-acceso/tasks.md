# Tareas: Autenticación y acceso

## Estado

En progreso. Spec y plan aprobados el 2026-11-08. Verificación parcial realizada el 2026-11-10 (UTC). Las casillas interiores distinguen las partes realizadas; cada entrega principal sigue abierta hasta completar su evidencia integrada y dependencias.

## Lista de trabajo

Basadas en la [spec](./spec.md) y el [plan](./plan.md). C01–C13 siguen el orden de criterios. Cada entrega integra contratos, capas, persistencia y UI pertinentes; no se crean tareas aisladas de migración o archivo. SSO permanece diferido.

- [ ] **003-T01. Entrar a la aplicación con una cuenta local válida.**
  - **Valor/entrega:** cuentas, hashes seguros y sesiones de servidor en MS-01, migraciones versionadas, contratos de login/contexto/verificación y pantalla correo/contraseña con cookie HttpOnly. Incorporar opción explícita de Administrador demo solo local después de migraciones, sin sobreescribir cuentas. Preparar repositorio de invalidación de sesiones para las entregas siguientes.
  - **Depende de:** transporte de [002-T01](../002-gateway-y-contratos-base/tasks.md) y base visual de [001-T01](../001-experiencia-y-ui-compartida/tasks.md).
  - **Evidencia/validación:** demo explícita permite login y devuelve rol auténtico; contraseña incorrecta/suspensión rechazada, hashes no expuestos. Repetir preparación no cambia cuentas y fuera de local no activa demo. Probar Abogado cuando [004-T01](../004-administracion-y-auditoria/tasks.md) permita crearlo; no añadir un registro público para resolver esa dependencia.
  - **Cobertura:** C01, C02, C03, C04, C09, C13.
  - [x] Implementados contratos GraphQL/REST, login, BCrypt, digest de sesión persistido, cookie HttpOnly y formulario de acceso.
  - [x] Compilado MS-01 con JDK 25; aplicadas V1/V2 y aprovisionamiento DynamoDB sin demo. Repetir preparación no requiere migraciones y la demo es rechazada fuera de local.
  - [x] Credenciales inválidas rechazadas vía Shell/Gateway/MS-01; intento fallido confirmado en DynamoDB real.
  - [ ] Completar login autenticado de ambos roles en navegador y comprobar creación/repetición de demo sin sobreescribir contraseñas. No se creó ninguna cuenta en la base externa durante esta verificación.

- [ ] **003-T02. Aislar roles y cuentas en solicitudes y contexto de interfaz.**
  - **Valor/entrega:** autorización común en Gateway y propietarios, rol único y cuenta obtenida de identidad; contexto de sesión para Shell sin datos privados ni montaje del otro rol. Las funcionalidades usan esa autorización y verifican pertenencia en sus casos de uso; no duplicar navegación global de 001.
  - **Depende de:** 003-T01, [002-T02](../002-gateway-y-contratos-base/tasks.md), [001-T02](../001-experiencia-y-ui-compartida/tasks.md) y cuentas reales de ambos roles de [004-T01](../004-administracion-y-auditoria/tasks.md).
  - **Evidencia/validación:** Abogado no ejecuta administración, contexto no acepta rol/cuenta manipulados y llamadas directas no evitan autorización. Comprobar denegación administrativa ahora y privacidad de cada recurso cuando sus specs lo entreguen; no simular operaciones inexistentes.
  - **Cobertura:** C01, C02, C05, C06, C07.
  - [x] Implementadas guardias de rol/cuenta y montaje del Shell según sesión verificada; retirado el selector de identidad simulada.
  - [x] Comprobaciones del núcleo rechazan rol incorrecto y cuenta ajena; HTTP ignora cabeceras de identidad arbitrarias y rechaza cookie falsificada y REST sin credencial.
  - [x] En navegador, `/admin` y `/abogado` sin sesión muestran login y no montan aplicaciones privadas.
  - [ ] Verificar autorización de operaciones reales con cuentas de ambos roles de 004 y recursos de sus respectivas specs; las guardias aisladas no acreditan esta integración.

- [ ] **003-T03. Terminar y caducar sesiones sin conservar acceso indebido.**
  - **Valor/entrega:** logout efectivo, límite absoluto de 8 horas, inactividad de 30 minutos sin renovación por sondeos y revocación por suspensión; retirar presentación privada y emitir el cambio de contexto para limpieza local de 013.
  - **Depende de:** 003-T01, 003-T02 y suspensión real de [004-T02](../004-administracion-y-auditoria/tasks.md).
  - **Evidencia/validación:** reutilizar sesión cerrada, vencida o suspendida es rechazado; cerrar con fallo de invalidación no muestra éxito. Verificar limpieza de copias al integrarse 013, sin afirmar revocación offline inmediata.
  - **Cobertura:** C04, C08, C10, C12.
  - [x] Implementados logout, expiración absoluta/inactiva, invalidación por cuenta y eventos de cambio de sesión en Shell.
  - [x] Núcleo con reloj controlado: sesión cerrada, 30 minutos, 8 horas, suspensión y fallo de invalidación. El sondeo no renueva actividad y el fallo de borrado no devuelve éxito.
  - [ ] Repetir con sesiones persistidas, suspensión real de 004 y limpieza local de 013 cuando estén disponibles.

- [ ] **003-T04. Permitir cambiar la propia contraseña sin flujos adicionales.**
  - **Valor/entrega:** operación autenticada y formulario de cambio propio, hash seguro y errores explícitos; ningún acceso a contraseña/hash anterior, recuperación por correo o cambio obligatorio posterior.
  - **Depende de:** 003-T01, 003-T02 y [001-T02](../001-experiencia-y-ui-compartida/tasks.md).
  - **Evidencia/validación:** nueva contraseña permite login y la anterior no; no se cambia otra cuenta ni se expone el secreto. El cambio no finge recuperar copias offline cifradas con una contraseña anterior.
  - **Cobertura:** C03, C07, C09, C11.
  - [x] Implementados cambio propio autenticado, comparación de hash anterior, actualización y formulario de contraseña.
  - [x] Núcleo con BCrypt real: nueva contraseña aceptada, anterior rechazada y otra cuenta sin cambios; HTTP rechaza la mutación sin sesión.
  - [ ] Completar el recorrido autenticado del formulario y GraphQL contra PostgreSQL con una cuenta habilitada; el restablecimiento administrativo pertenece a 004.

- [ ] **003-T05. Conocer accesos y rechazos sin alterar su resultado por un fallo de auditoría.**
  - **Valor/entrega:** eventos MS-01/DynamoDB y aprovisionamiento versionado para login, intento fallido, logout y denegación, con tipo/fecha/usuario/resultado. Reutilizar registro para cambios administrativos y recepción REST autenticada de acciones de MS-04, con índices para los filtros de 004; sin colas.
  - **Depende de:** 003-T01, [002-T02](../002-gateway-y-contratos-base/tasks.md) y DynamoDB operativo de [000](../000-plataforma-base/tasks.md).
  - **Evidencia/validación:** eventos reales consultables en almacenamiento, sin secretos; fallo de registro mantiene login válido/logout efectivo y rechazos, comunicando el fallo. No registrar como exitoso un evento no persistido ni añadir bloqueo temporal de intentos a esta fase.
  - **Cobertura:** C03, C04, C05, C08, C09, C12.
  - [x] Implementados escritura de eventos, recepción REST autenticada, provisión e índices por fecha/tipo/usuario sin TTL ni colas.
  - [x] Consultado el evento LOGIN_FAILED persistido y comprobados campos restringidos sin secretos y tres índices en DynamoDB.
  - [x] Núcleo con fallo simulado del puerto de auditoría conserva login/logout/rechazo y comunica registro fallido.
  - [ ] Verificar eventos persistidos de login válido/logout/denegación, recepción real desde MS-04 y caída real de DynamoDB durante esos recorridos. No se equipara el puerto simulado con una caída de infraestructura.

## Verificación de aceptación

- [ ] El desarrollador revisa los 13 criterios de la [spec](./spec.md), incluyendo recursos jurídicos, IA, informes y ERP cuando existan, no solo contexto de sesión.
- [ ] Ejecutar validaciones del [plan](./plan.md) y registrar evidencia; sin archivos de testing ni afirmación de preparación para producción.
- [x] Sincronizar spec, plan e [índice](../index.md). La aprobación documental no equivale a autenticación implementada o verificada.

## Registro de verificación

- **Compilación:** imágenes MS-01, Gateway, Shell, Angular y React construidas; typecheck de los cuatro proyectos TypeScript en Node 26. No se usó el Node 22 del host para acreditar el runtime aprobado.
- **Núcleo:** 35 comprobaciones temporales sobre AuthService/AuthConfig compilados y BCrypt real, con almacenes en memoria y reloj controlado. Cubren credenciales, digest, vigencia, actividad, roles, cuenta, contraseña, logout, suspensión y fallos de auditoría/borrado. No acreditan recursos o cuentas reales de 004.
- **HTTP:** 8 comprobaciones contra servicios levantados: sesión anónima, cabeceras de identidad ignoradas, cookie falsificada rechazada, credenciales inválidas auditadas, contraseña sin sesión, CSRF, origen no permitido y REST sin autenticación. Repetidas satisfactoriamente después de V2.
- **Persistencia:** Flyway V1/V2 y provisión ejecutados expresamente contra las conexiones configuradas, sin demo. Se detectó el rechazo de `search_path` como parámetro JDBC y la ubicación incorrecta de tablas detrás del pooler; se corrigieron consultas, sonda y migración sin eliminar datos ni alterar V1. La repetición de preparación terminó sin migraciones pendientes.
- **Auditoría real:** consulta del índice `by-type` confirmó LOGIN_FAILED; revisados los campos permitidos y la presencia de tres índices, sin imprimir identidades ni secretos.
- **Navegador:** rutas privadas bloqueadas sin sesión; a 390 x 844 no existe desbordamiento horizontal en la pantalla de acceso. No se verificó un navegador autenticado en esta ejecución.
- **Estado tras la corrección:** MS-01, MS-02, MS-03 y MS-04 responden HTTP 200 y `UP`, con sus dependencias disponibles. PostgreSQL y MongoDB son externos; no se añadieron contenedores para esas bases.
- **Límite:** C03 verificado de extremo a extremo; el resto permanece pendiente de la evidencia indicada. No se declara la spec completa ni preparación para producción. No se añadieron archivos de testing al repositorio.