# Plan: Informes jurídicos

## Estado

Lista. Plan aprobado por el responsable el 2026-11-08; implementación y verificación pendientes.

## Resumen técnico

MS-02 coordina fuentes jurídicas autorizadas de MS-01 y contenido propuesto por MS-04; estructura, guarda y presenta el informe únicamente cuando el resultado está completo. Metadatos en `documental` y contenido en el almacenamiento propio de MS-02.

Aplicar principios II, IV, X y XI de la [constitución](../../docs/constitution.md). Informes guardados son una entidad separada, nunca documentos o fuentes de nuevos informes/IA. No añadir edición, eliminación, aprobación obligatoria o formatos múltiples sin confirmación.

## Diseño y componentes

- Informe guardado inmutable: cuenta, un expediente, tipo, fecha y PDF completado; sin edición ni eliminación.
- Casos de uso generar, listar/consultar, descargar y exportar resultado tabular; puertos de fuentes, generación IA, almacenamiento y metadatos.
- Tipos: resumen ejecutivo de una página, informe para cliente en lenguaje claro y reporte por consulta natural con filtros autorizados.
- React: tipo/expediente Abierto o Cerrado, consulta cuando corresponda, resultado, aviso de revisión e histórico. No flujo de aprobación ni envío al cliente. Archivado solo consulta/descarga; aplicar [001](../001-experiencia-y-ui-compartida/plan.md).
- Para cliente, proyección cerrada desde MS-01: ficha básica jurídica, nombres/roles de participantes y actuaciones; sin documentos, notas/estrategia, identificaciones o contacto. No pedir al modelo eliminar información privada ya recibida.

## Flujo de datos

### Robustez y secuencia de generación

Frontera: React/GraphQL. Control: caso de uso MS-02. Entidades: fuentes jurídicas autorizadas e Informe guardado; MS-04 propone contenido, no persiste el informe.

```mermaid
sequenceDiagram
    actor A as Abogado
    participant G as Gateway
    participant D as MS-02
    participant J as MS-01
    participant IA as MS-04
    A->>G: Generar tipo y alcance autorizado
    G->>D: Solicitud con identidad verificada
    D->>J: Obtener fuentes permitidas y elegibilidad
    J-->>D: Fuentes autorizadas o error
    D->>D: Validar suficiencia y exclusiones
    D->>IA: Proponer contenido con fuentes permitidas
    IA-->>D: Contenido completo o error
    D->>D: Validar, estructurar y guardar resultado completo
    D-->>G: Informe confirmado o error
    G-->>A: Resultado y advertencia de revisión
```

Cada paso posterior se ejecuta solo si el anterior fue válido. Fuentes insuficientes, fallo de MS-01/MS-04 o contenido inválido no producen un informe completado.

MS-02 guarda binario/contenido y metadatos con la consistencia local definida en [010](../010-documentos-y-fotografias/plan.md): restos de escritura no se publican y se limpian de forma acotada. No hay transacción entre MS-01, MS-04 y MS-02.

La descarga/exportación lee el resultado guardado; no regenera contenido ni usa informes anteriores como fuentes.

Usar agente inicial vigente si habilitado; si no, pedir alternativa explícita habilitada. Presupuesto IA total de 60 segundos de 002. Todas las variantes excluyen notas e imágenes; resumen/reporte natural pueden usar texto PDF autorizado, sin OCR.

## Interfaces y contratos

- GraphQL para generación, histórico, descarga PDF y CSV como Base64 conforme a [002](../002-gateway-y-contratos-base/plan.md).
- REST MS-01 para proyecciones de fuentes permitidas y estado/pertenencia; separar expresamente la proyección para cliente.
- REST MS-04 con agente según política acordada, OpenAI y herramientas internas permitidas, fuentes explícitas y resultado completo; sin MCP ni lectura libre de informes.
- REST MS-02 para informes guardados completos que consume [013](../013-expedientes-offline/plan.md); incluir fecha y contenido descargable autorizado.
- Resultado tabular debe tener columnas y valores tipados para CSV; no convertir texto narrativo arbitrario en tabla silenciosamente.

CSV compartido con 016: UTF-8, punto y coma, cabeceras, comillas/saltos escapados, fechas dd/MM/yyyy e importes sin miles y con coma decimal. Neutralizar textos interpretables como fórmulas al exportar a hojas de cálculo mediante escape documentado, nunca ejecutar contenido ni cambiarlo silenciosamente; comprobar la representación con el desarrollador.

Renderizar resumen a PDF y comprobar una página real; ajustar generación dentro del presupuesto o rechazar con error explícito si no puede cumplir, sin truncar contenido ni guardar como completado un PDF inválido.

## Persistencia y migraciones

Entidad y metadatos propios de informes en `documental`; almacenamiento de contenido de MS-02 según [ADR 0003](../../docs/decisions/0003-persistencia-por-servicio.md). Reutilizar herramienta de migraciones y puerto de archivos acordados en 010.

Separar tablas/listados de documentos y fuentes. Registrar fecha/tipo y solo publicar completados. No crear copias del expediente ni almacenamiento de informes en MS-04.

Solo un expediente por informe; no mutaciones de edición/eliminación ni fuentes multiexpediente. Guardar PDF y tabla estructurada cuando exista, evitando regenerarla para CSV.

## Seguridad y privacidad

Solo Abogado propietario genera, consulta y descarga. Administrador y otras cuentas rechazados, incluso por enlace directo.

Excluir notas de toda IA y estrategia de actuaciones según 009. La lista permitida para cliente excluye también PDF, identificaciones y contacto; no basar privacidad en una instrucción probabilística al modelo.

Aprobar privacidad del proveedor conforme a 011; sin logs de fuentes o informes. Aviso de revisión no autoriza divulgar datos internos.

## Observabilidad y manejo de errores

Registrar fase técnica y categoría segura, no contenido generado. Errores de fuentes, proveedor, estructuración o persistencia llegan al usuario sin éxito ni informe parcial disponible.

Pérdida de respuesta final puede dejar un informe guardado: no afirmar que no se creó. La spec/contrato debe permitir consultar el resultado o acordar repetición segura sin regenerar automáticamente.

## Verificación

El desarrollador comprueba resultados y flujos, sin crear archivos de testing ni documentos adicionales.

| Criterio de la spec | Comprobación |
|---|---|
| 1. Resumen | Con fuentes suficientes: guardado con fecha/tipo y presentado; renderizar en formato aprobado y comprobar exactamente una página. |
| 2. Sin notas | Incluir notas privadas identificables en el expediente: ausentes de fuentes para cliente y resultado final. |
| 3. Revisión | Informe para cliente muestra aviso/flujo aprobado de revisión profesional. |
| 4. Reporte autorizado | Consulta natural usa solo fuentes/filtros aprobados de su cuenta; no identificadores ajenos. |
| 5. Fuentes/fallos | Fuentes insuficientes y MS-01/MS-04 caídos: error y ningún informe completado; incluir falla de persistencia MS-02. |
| 6. Histórico/descarga | Fecha/tipo correctos y descarga íntegra del formato aprobado. |
| 7. Sin realimentación | Informe previo no aparece en fuentes, herramientas o contexto de otro informe/chat. |
| 8. Entidad separada | Informe guardado no figura en documentos del expediente. |
| 9. CSV | Exportar tabla y volver a leerla: mismos campos/valores/filas, incluidos comillas, saltos, BOB y caracteres españoles. |
| 10. Otra cuenta | A consulta/descarga informe de B: rechazo sin contenido. |
| 11. Administrador | Consulta directa: no autorizado. |
| 12. Estado/formato | Archivado rechaza generación, pero descarga PDF previo. |
| 13. Una página | Renderizar resumen y contar exactamente una página, sin cortes ocultos. |
| 14. Inmutabilidad | Ninguna operación permite editar o eliminar informes guardados. |

La exclusión se concreta con las fuentes permitidas de la spec. Todas las verificaciones reales quedan a cargo del desarrollador, sin archivos de testing en este trabajo.

## Decisiones

- MS-02 coordina y conserva; MS-04 solo propone contenido. Reutilizar proveedor y almacenamiento existentes.
- PDF narrativo, fuentes de cliente y Base64 quedan acordados; usar renderizador mantenido compatible con MS-02 durante implementación, sin añadir formatos alternativos. Alcance mínimo en el [ADR 0004](../../docs/decisions/0004-integraciones-minimas-del-mvp.md).
- Convenciones CSV compartidas con 016, sin un servicio de exportación adicional.

## Riesgos y preguntas abiertas

- Un aviso de revisión no garantiza calidad jurídica; se mantiene responsabilidad profesional y nunca se envía al cliente automáticamente.
- Fuente insuficiente, contexto excesivo o PDF que no cabe en una página produce error, no truncado ni informe completado falso.
- Sin preguntas funcionales abiertas; no se reintenta generación automáticamente tras resultado incierto.