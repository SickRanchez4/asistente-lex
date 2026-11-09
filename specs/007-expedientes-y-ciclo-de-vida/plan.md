# Plan: Expedientes y ciclo de vida

## Estado

Lista. Plan aprobado por el responsable el 2026-11-08; implementación y verificación pendientes.

## Resumen técnico

MS-01 mantiene expedientes y transiciones en PostgreSQL; consulta MS-04 para validar el agente inicial y coordina la eliminación de chats antes de archivar. React muestra listado, ficha, edición y transiciones con las [convenciones de 001](../001-experiencia-y-ui-compartida/plan.md).

Aplicar principios II, IV, X y XI de la [constitución](../../docs/constitution.md). No añadir etapas procesales, eliminación de expedientes, nuevos estados de negocio ni recuperación de conversaciones borradas.

## Diseño y componentes

- Agregado Expediente: cuenta, código único por cuenta, título, descripción opcional, área Civil/Penal, agente inicial y estado.
- Casos de uso crear, consultar/filtrar, actualizar datos generales y ejecutar transiciones.
- MS-01 valida pertenencia y estado; transiciones permitidas exclusivamente Abierto→Cerrado, Cerrado→Abierto, Cerrado→Archivado y Archivado→Cerrado.
- Repositorio e historial de transiciones propios; puerto de catálogo y eliminación de conversaciones hacia MS-04.
- React: listado por estado/área/código/título, ficha consultable en cualquier estado, edición solo Abierto e historial. Archivar exige confirmación de borrado irreversible de conversaciones.
- En Abierto se editan código/título/descripción/área/agente inicial. Un nuevo agente debe estar habilitado y solo afecta chats nuevos; los existentes conservan agente/historial. El chat no cambia el agente inicial.

## Flujo de datos

Crear valida datos obligatorios y agente habilitado en MS-04 antes de persistir Abierto. Si MS-04 no responde, no se presume que el agente está disponible. Las transiciones locales guardan nuevo estado e historial en una transacción de MS-01.

### Archivo: robustez y secuencia

Frontera: React/GraphQL. Control: caso de uso de archivo en MS-01. Entidades: Expediente e historial; conversaciones/estado de chat propiedad de MS-04.

```mermaid
sequenceDiagram
    actor A as Abogado
    participant UI as React
    participant G as Gateway
    participant J as MS-01
    participant IA as MS-04
    A->>UI: Confirma archivo y eliminación irreversible
    UI->>G: Solicitar archivo
    G->>J: Archivar con identidad verificada
    J->>J: Validar cuenta y estado Cerrado
    J->>IA: Eliminar conversaciones y estados de chat
    alt Eliminación no confirmada
        IA-->>J: Error o timeout
        J-->>G: Error; expediente sigue Cerrado
    else Eliminación confirmada
        IA-->>J: Eliminación completa
        J->>J: Guardar Archivado e historial en transacción local
        alt Persistencia confirmada
            J-->>G: Archivo completado
        else Persistencia falla
            J-->>G: Error; conversaciones eliminadas, archivo no confirmado
        end
    end
    G-->>UI: Resultado real
```

El orden es obligatorio: no marcar Archivado antes de confirmar eliminación. Si se pierde la respuesta de MS-04, el estado sigue Cerrado aunque la eliminación pueda haberse ejecutado; informar que no se confirmó el archivo y permitir reintento seguro con eliminación idempotente.

Si falla el cambio de estado tras eliminar chats, comunicarlo; repetir el archivo vuelve a solicitar eliminación sin error por ausencia y aplica la transición. Si se pierde la respuesta final de MS-01, consultar el estado antes de afirmar fracaso o repetir.

Desarchivar cambia a Cerrado y registra historial, sin recuperar chats ni modificar documentos o contenido jurídico.

**Concurrencia mínima local:** serializar transiciones con control de versión y una marca técnica de archivo en curso en MS-01, sin nuevo estado de negocio. La consulta de elegibilidad rechaza nuevas preguntas mientras está activa. MS-04 serializa admisión/persistencia/borrado por expediente en su instancia local y cambia una generación técnica al eliminar: respuestas de generación anterior se descartan con aviso. No mantener transacción SQL abierta durante REST.

Identificar el intento de archivo para reanudarlo tras error/timeout sin ejecutar transiciones duplicadas. Ante resultado de eliminación incierto, conservar marca técnica hasta reintentar/confirmar; no permitir que nuevos chats se borren por una eliminación tardía. Confirmar estado/historial y retirar marca en transacción local al completar. El proceso de 011 no vuelve a consultar MS-01 dentro del borrado autorizado para evitar una dependencia circular.

Esto cubre una instancia local por servicio, no coordinación de réplicas de producción. Reiniciar MS-04 descarta tareas IA de ese proceso; no se recuperan como trabajos autónomos.

## Interfaces y contratos

- GraphQL y REST para crear, consultar/filtrar, actualizar, transiciones e historial, conforme a [002](../002-gateway-y-contratos-base/plan.md).
- REST MS-01 para comprobar pertenencia y estado del expediente por identidad verificada. Lo usan MS-02, MS-03 y MS-04, sin acceso a tablas.
- REST MS-04 para catálogo/disponibilidad de 005 y eliminación idempotente de conversaciones de [011](../011-asistencia-juridica-ia/plan.md).
- La eliminación confirma que no queda ninguna conversación ni estado de chat del expediente/cuenta; no basta aceptar la solicitud.
- Contratos distinguen conflicto de transición, no autorizado, inexistente, indisponibilidad y fallo parcial. Los nombres y tipos se documentan antes de integrar.

## Persistencia y migraciones

Tablas de expediente e historial en `juridico`, con cuenta y claves propias. Estado e historial se actualizan atómicamente en PostgreSQL; evitar transiciones duplicadas mediante control de concurrencia del repositorio.

Usar migraciones de MS-01 acordadas en [003](../003-autenticacion-y-acceso/plan.md). Referencia contractual al agente, no relación con MongoDB. Restricción única de código normalizado por cuenta y control de transición para solicitudes concurrentes.

La eliminación MongoDB y la escritura PostgreSQL no son atómicas entre servicios; no intentar restaurar automáticamente chats eliminados.

## Seguridad y privacidad

Solo Abogado propietario consulta/modifica. El Administrador no accede. MS-01 verifica estado/cuenta y MS-04 autentica la petición de borrado y limita su alcance.

No registrar título, descripción o conversaciones. La confirmación muestra consecuencias sin exponer contenido del chat.

## Observabilidad y manejo de errores

Registrar categoría y fase técnica del archivo con referencia de correlación segura: validación, eliminación o persistencia. No informar éxito si falta uno de los resultados requeridos.

La UI conserva datos ante error y muestra solo lectura de Cerrado/Archivado. Error o timeout del catálogo no se transforma en agente habilitado.

## Verificación

El desarrollador verifica sin crear archivos de testing. Compilar componentes afectados y comprobar transiciones y fallos en entorno controlado.

| Criterio de la spec | Comprobación |
|---|---|
| 1. Creación | Datos completos y agente habilitado: Abierto y agente inicial correcto. |
| 2. Agente deshabilitado | API directa: rechazo por MS-01, sin nuevo expediente. |
| 3. Obligatorios | Omitir cada campo obligatorio aprobado: validación identificable. |
| 4. Editar Abierto | Actualizar datos generales permitidos: persistencia confirmada. |
| 5. Editar otros estados | Cerrado/Archivado: rechazo por backend. |
| 6. Transiciones | Probar todas las combinaciones: solo las cuatro autorizadas; incluir solicitudes concurrentes. |
| 7. Archivo | Confirmar con chats reales: sin conversaciones y Archivado con historial. Cancelar no ejecuta. |
| 8. Falla eliminación | Interrumpir MS-04: Cerrado, error explícito y ningún éxito. |
| 9. Falla posterior | Eliminar chats y fallar persistencia local; reintentar: borrado repetible y archivo completado. |
| 10. Desarchivo | Cerrado, sin chats previos, documentos y contenido jurídico intactos. |
| 11. Historial | Cada transición efectiva tiene anterior/nuevo, fecha y autor, sin duplicados de un mismo cambio. |
| 12. Aislamiento | A consulta/modifica expediente de B: rechazo sin contenido. |
| 13. Código | Duplicado en cuenta rechazado también al actualizar/concurrentemente; otra cuenta puede repetirlo. |
| 14. Datos editables | Área/agente inicial editables en Abierto; solo chats nuevos usan el cambio. |
| 15. Archivo prioritario | Respuesta pendiente se descarta, no se recrea historial y se informa al usuario. |

Comprobar además consulta IA concurrente al archivo conforme al mecanismo acordado. Archivo con datos reales requiere 011; mantener verificaciones pendientes en las tareas.

## Decisiones

- Reutilizar MS-01 y las transacciones locales; la secuencia de archivo procede de la spec, no es opcional.
- Concurrencia mínima local y limitaciones constan en el [ADR 0004](../../docs/decisions/0004-integraciones-minimas-del-mvp.md). No introducir saga, cola genérica ni réplicas.

## Riesgos y preguntas abiertas

- Filtros limitados a estado/área/código/título, sin fecha de creación. No quedan preguntas funcionales abiertas.
- Archivo puede eliminar conversaciones antes de fallar persistencia local: mostrar la pérdida irreversible y permitir reintento, no restaurar datos ficticios.
- La validación de estado entre servicios es remota, no una instantánea atómica global; acordar garantías sin prometer consistencia superior a la spec.