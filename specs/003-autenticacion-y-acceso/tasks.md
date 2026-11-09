# Tareas: Autenticación y acceso

## Estado

Pendiente de ejecución y verificación. Spec y plan aprobados el 2026-11-08.

## Lista de trabajo

Basadas en la [spec](./spec.md) y el [plan](./plan.md). C01–C13 siguen el orden de criterios. Cada entrega integra contratos, capas, persistencia y UI pertinentes; no se crean tareas aisladas de migración o archivo. SSO permanece diferido.

- [ ] **003-T01. Entrar a la aplicación con una cuenta local válida.**
  - **Valor/entrega:** cuentas, hashes seguros y sesiones de servidor en MS-01, migraciones versionadas, contratos de login/contexto/verificación y pantalla correo/contraseña con cookie HttpOnly. Incorporar opción explícita de Administrador demo solo local después de migraciones, sin sobreescribir cuentas. Preparar repositorio de invalidación de sesiones para las entregas siguientes.
  - **Depende de:** transporte de [002-T01](../002-gateway-y-contratos-base/tasks.md) y base visual de [001-T01](../001-experiencia-y-ui-compartida/tasks.md).
  - **Evidencia/validación:** demo explícita permite login y devuelve rol auténtico; contraseña incorrecta/suspensión rechazada, hashes no expuestos. Repetir preparación no cambia cuentas y fuera de local no activa demo. Probar Abogado cuando [004-T01](../004-administracion-y-auditoria/tasks.md) permita crearlo; no añadir un registro público para resolver esa dependencia.
  - **Cobertura:** C01, C02, C03, C04, C09, C13.

- [ ] **003-T02. Aislar roles y cuentas en solicitudes y contexto de interfaz.**
  - **Valor/entrega:** autorización común en Gateway y propietarios, rol único y cuenta obtenida de identidad; contexto de sesión para Shell sin datos privados ni montaje del otro rol. Las funcionalidades usan esa autorización y verifican pertenencia en sus casos de uso; no duplicar navegación global de 001.
  - **Depende de:** 003-T01, [002-T02](../002-gateway-y-contratos-base/tasks.md), [001-T02](../001-experiencia-y-ui-compartida/tasks.md) y cuentas reales de ambos roles de [004-T01](../004-administracion-y-auditoria/tasks.md).
  - **Evidencia/validación:** Abogado no ejecuta administración, contexto no acepta rol/cuenta manipulados y llamadas directas no evitan autorización. Comprobar denegación administrativa ahora y privacidad de cada recurso cuando sus specs lo entreguen; no simular operaciones inexistentes.
  - **Cobertura:** C01, C02, C05, C06, C07.

- [ ] **003-T03. Terminar y caducar sesiones sin conservar acceso indebido.**
  - **Valor/entrega:** logout efectivo, límite absoluto de 8 horas, inactividad de 30 minutos sin renovación por sondeos y revocación por suspensión; retirar presentación privada y emitir el cambio de contexto para limpieza local de 013.
  - **Depende de:** 003-T01, 003-T02 y suspensión real de [004-T02](../004-administracion-y-auditoria/tasks.md).
  - **Evidencia/validación:** reutilizar sesión cerrada, vencida o suspendida es rechazado; cerrar con fallo de invalidación no muestra éxito. Verificar limpieza de copias al integrarse 013, sin afirmar revocación offline inmediata.
  - **Cobertura:** C04, C08, C10, C12.

- [ ] **003-T04. Permitir cambiar la propia contraseña sin flujos adicionales.**
  - **Valor/entrega:** operación autenticada y formulario de cambio propio, hash seguro y errores explícitos; ningún acceso a contraseña/hash anterior, recuperación por correo o cambio obligatorio posterior.
  - **Depende de:** 003-T01, 003-T02 y [001-T02](../001-experiencia-y-ui-compartida/tasks.md).
  - **Evidencia/validación:** nueva contraseña permite login y la anterior no; no se cambia otra cuenta ni se expone el secreto. El cambio no finge recuperar copias offline cifradas con una contraseña anterior.
  - **Cobertura:** C03, C07, C09, C11.

- [ ] **003-T05. Conocer accesos y rechazos sin alterar su resultado por un fallo de auditoría.**
  - **Valor/entrega:** eventos MS-01/DynamoDB y aprovisionamiento versionado para login, intento fallido, logout y denegación, con tipo/fecha/usuario/resultado. Reutilizar registro para cambios administrativos y recepción REST autenticada de acciones de MS-04, con índices para los filtros de 004; sin colas.
  - **Depende de:** 003-T01, [002-T02](../002-gateway-y-contratos-base/tasks.md) y DynamoDB operativo de [000](../000-plataforma-base/tasks.md).
  - **Evidencia/validación:** eventos reales consultables en almacenamiento, sin secretos; fallo de registro mantiene login válido/logout efectivo y rechazos, comunicando el fallo. No registrar como exitoso un evento no persistido ni añadir bloqueo temporal de intentos a esta fase.
  - **Cobertura:** C03, C04, C05, C08, C09, C12.

## Verificación de aceptación

- [ ] El desarrollador revisa los 13 criterios de la [spec](./spec.md), incluyendo recursos jurídicos, IA, informes y ERP cuando existan, no solo contexto de sesión.
- [ ] Ejecutar validaciones del [plan](./plan.md) y registrar evidencia; sin archivos de testing ni afirmación de preparación para producción.
- [ ] Sincronizar spec, plan e [índice](../index.md). La aprobación documental no equivale a autenticación implementada o verificada.