# Plan: Administración y auditoría

## Estado

Lista. Plan aprobado por el responsable el 2026-11-08; implementación y verificación pendientes.

## Resumen técnico

MS-01 gestiona cuentas y parámetros en PostgreSQL y consulta eventos en DynamoDB. Angular ofrece el panel administrativo aplicando [001](../001-experiencia-y-ui-compartida/plan.md), mediante GraphQL de [002](../002-gateway-y-contratos-base/plan.md).

Cumplir los principios IV, X y XI de la [constitución](../../docs/constitution.md): no exponer contenido de abogados y comunicar parcialmente un cambio aplicado cuya auditoría falló. No añadir eliminación/edición de cuentas, exportación de eventos ni una plataforma de analítica.

## Diseño y componentes

- Casos de uso de listar/consultar/crear cuentas con nombre completo/correo/contraseña, suspender/reactivar, restablecer contraseña, consultar/modificar parámetros y consultar eventos. No editar nombre/correo/rol.
- Repositorios propios de MS-01 para cuentas, parámetros y eventos; DTO administrativos limitados a datos de cuenta y estado.
- Parámetros cerrados: mensaje informativo global opcional en texto plano y correo de contacto/soporte opcional para ayuda. Validación de texto/correo y proyección pública solo de esos valores; no SMTP, secretos, HTML ni editor arbitrario.
- Panel Angular: listado/detalle de cuentas, formulario de creación, acciones de suspensión/reactivación, parámetros y listado de eventos con filtros. No incluir enlaces a expedientes o ERP.
- El registro de auditoría de MS-01 recibe acciones de MS-04 por REST autenticado; MS-04 no escribe directamente en DynamoDB.

## Flujo de datos

El Administrador envía la acción por GraphQL; MS-01 valida rol y recurso, aplica el cambio y registra autor, fecha y operación. Crear cuenta deja estado activo; suspender solo cambia su habilitación, sin tocar datos jurídicos; reactivar conserva sus datos.

Para parámetros, capturar valor anterior y nuevo de la misma modificación, no de una consulta previa del navegador. El listado de eventos lee DynamoDB con filtros y paginación acordados; nunca se reconstruye leyendo chats o expedientes.

PostgreSQL y DynamoDB no comparten transacción. Política aprobada: guardar cambio, intentar auditoría síncrona y, si falla, conservar el cambio con resultado parcial explícito. No éxito global, rollback ficticio, outbox, colas ni recuperación garantizada. No repetir el cambio original para «reintentar auditoría».

Restablecer contraseña es operación separada, sin consultar hash anterior, correo automático o cambio posterior obligatorio. El evento registra operación/autor/cuenta, nunca contraseña/hash.

## Interfaces y contratos

- GraphQL para cuentas, parámetros y eventos; tipos/operaciones definitivos documentados conforme a 002 antes de integrar.
- Contrato REST MS-04 → MS-01 para auditoría de agentes: identidad de servicio y autor verificados, operación, agente, fecha y referencia estable de evento para reconocer un reenvío sin duplicarlo.
- Definir filtros combinables por tipo, período y usuario y paginación; acordar límites temporales inclusivos/exclusivos y zona con 002.
- Categorías de acceso, inexistente, validación, conflicto e indisponibilidad según 002. No ofrecer operaciones de modificar/eliminar eventos.
- La información de valores anteriores/nuevos de parámetros debe excluir secretos. Acordar qué parámetros son auditables antes de aceptar configuraciones sensibles.

## Persistencia y migraciones

Usar cuentas de 003 y tablas propias de parámetros en `juridico`; no duplicar identidades. Usar las migraciones de MS-01 acordadas en [003](../003-autenticacion-y-acceso/plan.md).

Eventos en DynamoDB, propiedad exclusiva de MS-01; esquema común con accesos y agentes. Diseñar claves/índices para tipo/período/usuario, sin escaneos ilimitados. Aprovisionar explícitamente; conservar mientras exista el entorno, sin TTL.

Respetar el [ADR 0003](../../docs/decisions/0003-persistencia-por-servicio.md). No borrar datos al suspender ni migrar datos ajenos.

## Seguridad y privacidad

Autorizar Administrador en Gateway y MS-01; rechazar Abogado y registrar denegación. La auditoría entrante verifica MS-04 y no acepta autores inventados por un navegador.

No incluir contenido jurídico, conversaciones, documentos, ERP, credenciales ni tokens en DTO, eventos o registros. Mantener eventos inmutables desde la aplicación; no confundirlo con garantías de almacenamiento inviolable que no se han especificado.

## Observabilidad y manejo de errores

Cuenta inexistente produce recurso inexistente. Parámetro no permitido produce validación/conflicto según contrato, no se guarda silenciosamente.

Fallas de almacenamiento o auditoría se comunican sin éxito global; registrar referencia técnica/fase, no información privada. MS-04 notifica por REST síncrono con la misma política de resultado parcial; no asumir entrega garantizada ni cola. Reconocer un evento ya registrado no exige reejecutar su cambio.

## Verificación

El desarrollador valida sin crear archivos de testing ni documentos adicionales; compila MS-01, Gateway y Angular con comandos existentes y comprueba integración.

| Criterio de la spec | Comprobación |
|---|---|
| 1. Creación | Crear cuenta: activa, consultable y con evento de creación. |
| 2. Suspensión | Suspender activa: nuevo inicio de sesión rechazado en 003 y evento presente. |
| 3. Reactivación | Reactivar: inicio permitido y datos previos intactos. |
| 4. Parámetro | Cambiar permitido: valor vigente y evento con anterior/nuevo exactos. |
| 5. Filtros | Datos de varios tipos/usuarios/fechas: probar filtros individuales y combinados, incluidos límites de período y páginas. |
| 6. Agentes | Realizar acción en 005 y comprobar su aparición sin duplicados tras reenvío reconocido. |
| 7. Acceso indebido | Abogado invoca operación directamente: no autorizado y denegación auditada. |
| 8. Cuenta inexistente | Suspender/reactivar identificador inexistente: error de recurso inexistente. |
| 9. Privacidad | Consultar cuenta: ningún expediente, chat, informe o dato ERP en respuesta/UI. |
| 10. Inmutabilidad | Revisar esquema y API: no existen mutaciones ni endpoints para editar/borrar eventos. |
| 11. Restablecer contraseña | Nueva contraseña utilizable, hash seguro y evento sin secreto. |
| 12. Auditoría caída | Cambio aplicado permanece y se informa resultado parcial, sin éxito global ni reversión inventada. |
| 13. Parámetros cerrados | Solo mensaje/correo permitidos, valores anteriores/nuevos auditados cuando hay disponibilidad. |

El desarrollador comprobará interrupción de auditoría y resultado parcial acordado. Ninguna comprobación de comportamiento se ejecuta en este ajuste documental.

## Decisiones

- Reutilizar stack, UI, identidad y migraciones de las specs base; no una consola administrativa separada.
- La excepción de auditoría y el alcance mínimo constan en el [ADR 0004](../../docs/decisions/0004-integraciones-minimas-del-mvp.md): cambio aplicado sin evento se comunica como parcial.

## Riesgos y preguntas abiertas

- Se acepta pérdida de registro auditable si falla DynamoDB después del cambio, con fallo visible; no vender garantía de entrega.
- La cuenta demo local se aprovisiona en 003; crear cuentas normales no exige SSO.
- No quedan preguntas funcionales abiertas; el desarrollador verifica comportamiento y privacidad.