# Autenticación y acceso

## Estado

Lista. Aprobada por el responsable el 2026-11-08; implementación y verificación pendientes.

## Fuente y trazabilidad

- Especificación integral: [Asistente Lex](../../docs/Asistente_Lex_Especificacion_Integral.md), sección 3.2 (DynamoDB para eventos de acceso); requisito RF-001; caso de uso CU-01; regla RN-01; requisitos RNF-09 y RNF-11.
- Constitución: [principios IV y X](../../docs/constitution.md).

## Contexto y problema

Asistente Lex tiene dos actores con responsabilidades y datos muy distintos. El Abogado gestiona información jurídica y económica privada; el Administrador gestiona cuentas, parámetros y agentes, sin acceso ordinario al contenido privado de los abogados.

Separar las interfaces React y Angular no basta para proteger esa información. Se necesita autenticar a cada usuario, aplicar la autorización por rol en el backend, aislar los datos de cada cuenta y registrar los eventos de acceso.

## Objetivos

- Permitir el inicio de sesión del Abogado y del Administrador mediante correo y contraseña.
- Permitir el cierre de sesión.
- Presentar la interfaz que corresponde a cada rol.
- Rechazar con un mensaje informativo las credenciales inválidas, las cuentas suspendidas y los accesos no autorizados.
- Aplicar la autorización por rol y el aislamiento entre cuentas en el backend.
- Registrar los eventos de acceso e intentos de autenticación.

## No objetivos

- Crear, activar o suspender cuentas (spec 004).
- Consultar los eventos de acceso registrados (spec 004).
- Permitir que los abogados se registren por su cuenta.
- Definir el acceso a copias offline sin conexión (spec 013).
- Implementar SSO en esta fase; se difiere expresamente.
- Implementar recuperación autónoma por correo o bloqueo temporal por intentos fallidos en esta fase exclusivamente local.

## Usuarios y escenarios

- Como abogado, quiero iniciar sesión, para acceder a mis expedientes y datos.
- Como administrador, quiero iniciar sesión, para acceder al panel de administración.
- Como usuario, quiero cerrar sesión, para que nadie pueda seguir usando mi sesión.
- Como responsable del proyecto, quiero que un abogado nunca acceda a los datos de otro, para proteger la confidencialidad.

## Requisitos

### Funcionales

- El sistema ofrece login tradicional con correo electrónico único y contraseña. SSO queda diferido.
- Al iniciar sesión, MS-01 valida la identidad, el rol y que la cuenta esté habilitada.
- Cada cuenta tiene un único rol fijo, Abogado o Administrador, sin selector de roles.
- MS-01 guarda solo hashes seguros de contraseñas y mantiene sesiones de servidor; el navegador recibe una cookie HttpOnly, sin JWT de sesión en localStorage.
- La sesión online vence como máximo a las 8 horas y tras 30 minutos de inactividad. Sondeos automáticos no mantienen artificialmente activa la sesión.
- Suspender una cuenta invalida sus sesiones online existentes y bloquea nuevos inicios. La limitación sin red se define en la spec 013.
- El Abogado puede cambiar voluntariamente su propia contraseña. El Administrador puede restablecer la de un Abogado mediante la spec 004, sin correo automático ni cambio obligatorio en el siguiente acceso.
- Tras autenticarse:
  - El Abogado accede a la interfaz React.
  - El Administrador accede a la interfaz Angular.
- El cierre de sesión invalida la sesión. Las solicitudes posteriores con esa sesión se rechazan como no autenticadas.
- Los rechazos se informan al usuario con su motivo: credenciales inválidas, cuenta suspendida o acceso no autorizado.
- La autorización por rol se aplica en el gateway y en los servicios responsables:
  - Las operaciones del abogado exigen el rol Abogado.
  - Las operaciones administrativas exigen el rol Administrador.
- Toda operación de un abogado se limita a los datos de su propia cuenta. La cuenta se obtiene de la identidad autenticada, nunca de parámetros proporcionados por el cliente.
- El rol Administrador no dispone de operaciones de lectura ni de escritura sobre expedientes, chats, informes ni datos ERP de los abogados.
- MS-01 registra en DynamoDB estos eventos, con tipo, fecha, usuario y resultado:
  - Inicios de sesión exitosos.
  - Intentos de autenticación fallidos.
  - Cierres de sesión.
  - Denegaciones de acceso.
- Si falla registrar auditoría, se comunica el fallo sin impedir un login válido ni deshacer un logout efectivo. Los rechazos de identidad, suspensión y permisos se mantienen aunque falle registrar su evento; no hay cola de recuperación garantizada.
- El Administrador inicial de demostración se crea solo en local, mediante una opción explícita del proceso de preparación de base y después de crear las tablas de identidad. Las variables del modo demo contienen `admi@demo.com` y la contraseña pública de demostración `password`; se persiste solo su hash. Repetir el proceso no sobrescribe cuentas existentes.

### No funcionales

- Seguridad: credenciales y tokens no aparecen en registros, mensajes de error ni URL.
- Privacidad: los eventos registrados no contienen contraseñas, tokens ni contenido privado.
- Defensa en profundidad: la autorización no depende de ocultar opciones en la interfaz.
- Alcance local: la cuenta demo y la ausencia de bloqueo temporal no son condiciones de producción. No habilitar la cuenta demo automáticamente fuera de local ni registrar contraseñas en eventos.

## Criterios de aceptación

Los escenarios que esperan un evento presuponen auditoría disponible; el criterio específico de falla de registro aplica la excepción de mejor esfuerzo acordada.

- [ ] Dado un abogado con cuenta habilitada, cuando inicia sesión con correo y contraseña, entonces accede a la interfaz React y no a la de administración.
- [ ] Dado un administrador con cuenta habilitada, cuando inicia sesión, entonces accede a la interfaz Angular.
- [ ] Dadas credenciales inválidas, cuando se intenta iniciar sesión, entonces el acceso se rechaza con un mensaje informativo y se registra un intento fallido.
- [ ] Dada una cuenta suspendida, cuando se intenta iniciar sesión, entonces el acceso se rechaza indicando la suspensión y se registra el evento.
- [ ] Dado un abogado autenticado, cuando invoca directamente contra el gateway una operación administrativa, entonces recibe "no autorizado" y se registra una denegación.
- [ ] Dado un administrador autenticado, cuando invoca una operación de lectura sobre contenido de un abogado, entonces recibe "no autorizado".
- [ ] Dados dos abogados A y B, cuando A solicita un recurso de B indicando su identificador, entonces la solicitud se rechaza sin revelar el contenido.
- [ ] Dada una sesión cerrada, cuando se usa para una nueva solicitud, entonces se rechaza como no autenticada.
- [ ] Dados los eventos de acceso registrados, cuando se revisan, entonces incluyen tipo, fecha, usuario y resultado, y no contienen contraseñas ni tokens.
- [ ] Dada una sesión online, cuando alcanza 8 horas o 30 minutos de inactividad, o se suspende la cuenta, entonces las solicitudes posteriores se rechazan.
- [ ] Dado un cambio o restablecimiento de contraseña, cuando se completa, entonces solo queda almacenado su hash seguro y no se exige un cambio adicional en el próximo acceso.
- [ ] Dada una falla de auditoría durante un login válido o logout efectivo, cuando se informa, entonces se conserva el resultado real y se muestra el fallo de registro, sin éxito global engañoso.
- [ ] Dado el aprovisionamiento local explícito de demo, cuando se ejecuta tras las migraciones, entonces crea el Administrador de demostración con hash; repetirlo no altera una cuenta existente y fuera de local no crea esa cuenta.

## Dependencias

- Spec 000: MS-01 y DynamoDB disponibles.
- Spec 001: convenciones de acceso y navegación por rol. Esta spec diseña e implementa la pantalla y el login.
- Spec 002: transmisión de la identidad entre gateway y servicios.
- Spec 004: creación de las cuentas de abogado.
- No se requiere proveedor externo de identidad en esta fase.

## Preguntas abiertas

Ninguna de alcance para esta fase. SSO y protección contra intentos repetidos quedan fuera de esta implementación local, no pendientes de una elección implícita.
