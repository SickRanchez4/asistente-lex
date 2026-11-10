# Tareas: Experiencia y UI compartida

## Estado

En progreso. Revision ejecutiva 2026-11-10 implementada y desplegada localmente. 001-T01 verificada; 001-T02 y 001-T03 mantienen aceptacion integrada pendiente. Se han verificado 6/14 criterios; no se cierran los restantes por compilar ni por demostraciones aisladas.

## Lista de trabajo

Basadas en la [spec](./spec.md) y el [plan](./plan.md). C01, C02, etc. identifican los criterios por su orden en la spec. Cada entrega incluye sus superficies relacionadas; no hay una tarea por archivo o componente. La verificación corresponde al desarrollador, sin crear archivos de testing.

- [x] **001-T01. Ofrecer una identidad visual legible y adaptable en ambas interfaces.**
  - **Valor/entrega:** aplicar logotipo existente, negro/dorado, contenido claro, español y tipografía del sistema en Shell, React y Angular; navegación por teclado, foco y etiquetas básicos. Compartir solo estilos y funciones independientes del framework.
  - **Depende de:** [000](../000-plataforma-base/tasks.md), con Shell y microfrontends operativos.
  - **Evidencia/validación:** Abogado usable desde 360 px y Administrador desde 1024 px; marca coherente, sin fuentes externas, selector de temas ni afirmación de certificación WCAG.
  - **Cobertura:** C12, C13, C14.
  - **Implementación/evidencia 2026-11-10:** base compartida ejecutiva, negro/dorado, logotipo existente y sistema sin fuentes externas. Navegacion lateral en escritorio y compacta en movil, tablas contenidas y etiquetas de estado. Abogado medido a 360/768/1440 px sin desbordamiento de pagina; Administrador revisado a 1024 px. Etiquetas, errores asociados, foco visible, teclado y cancelacion React comprobados; navegacion administrativa con teclado. Sin certificacion WCAG. Capturas y limitaciones abajo.

- [ ] **001-T02. Comunicar operaciones, restricciones y resultados con patrones comunes.**
  - **Valor/entrega:** patrones React/Angular de carga, vacío, errores, permisos, recurso ausente, indisponibilidad y resultado parcial; formularios que conservan datos, confirmaciones cancelables y explicación accesible de acciones bloqueadas. Formatos exactos de fechas/BOB sin pérdida de precisión. Recibir rol, estado, disponibilidad y conectividad como contexto, sin reglas autoritativas ni almacenamiento offline.
  - **Depende de:** 001-T01 y categorías/convenciones de [002-T01](../002-gateway-y-contratos-base/tasks.md).
  - **Evidencia/validación:** ejercitar los escenarios de presentación en desarrollo para ambos frameworks; cancelar no invoca acción, errores no limpian campos, parcial no muestra éxito y ambos producen `08/11/2026`, hora de Bolivia y `BOB 1.234,56`. Verificar su consumo real dentro de las entregas funcionales correspondientes, sin añadir pantallas ficticias a producción.
  - **Cobertura:** C03, C04, C05, C06, C07, C08, C09, C10, C11.
  - **Implementación/evidencia 2026-11-10:** componentes nativos consumidos por las funcionalidades reales 004-012 y categorias del Gateway. Aviso persistente de desconexion y bloqueos en Personas/Expedientes/Participantes; consumidores de chat/documentos/informes mantienen sus restricciones existentes. Errores reales de consulta administrativa ya no se presentan como resultado vacio. Ocho comprobaciones de formatos exactos compartidos correctas. Siguen pendientes la matriz completa de estados/formularios Angular y la integracion offline/eliminacion local de 013; no se implementa PWA aqui.

- [ ] **001-T03. Permitir recorrer la aplicación exclusivamente dentro del rol autenticado.**
  - **Valor/entrega:** reemplazar enlaces provisionales entre roles por navegación propia, sección activa y enlaces contextuales; conectar cada entrada cuando exista su pantalla, sin destinos ficticios. No montar contenido del otro rol durante resolución de sesión o acceso directo.
  - **Depende de:** 001-T01, 001-T02, [003-T02](../003-autenticacion-y-acceso/tasks.md) y los destinos de las specs 004–016 que correspondan a cada rol. No exige completar esas specs enteras: exige sus pantallas navegables.
  - **Evidencia/validación:** Abogado recorre personas, expedientes y secciones contextuales, chat, ERP y descargas; Administrador recorre cuentas, parámetros, eventos y agentes. URL del otro rol no muestra su contenido. La tarea no se cierra mientras falten destinos comprometidos.
  - **Cobertura:** C01, C02, C11.
  - **Implementación/evidencia 2026-11-10:** sesion real integrada. Mi espacio enlaza funciones existentes y muestra agentes reales sin selector sin efecto. Ficha en siete secciones accesibles; borradores de informe y nota privada conservados al alternar paneles, sin guardar ni enviar. Navegacion React interna sin recarga; no carga otra instancia de single-spa. Acceso directo al otro rol no monta su microfrontend en ambos sentidos. Cuentas/Parametros/Auditoria/Agentes navegables con teclado.
  - **Pendiente:** destinos offline/economicos de 013-016. Chat e informes se acceden contextualmente desde el expediente. No hay pantallas ficticias, contadores simulados ni cambios de contratos de negocio.

### Revision ejecutiva con Impeccable, 2026-11-10

- Contexto Impeccable cargado una vez; sistema existente refinado en modo Operate siguiendo craft-floor/polish. El responsable priorizo trabajo diario y permitio reorganizar presentacion conservando funciones. Decision registrada en el plan existente, sin crear documentos de diseño adicionales.
- Produccion: builds correctos de Shell, Abogado y Admin. Typecheck React local; Shell/Admin dentro de sus etapas de construccion Node 26 porque Windows no tiene sus dependencias instaladas. Editor sin errores nuevos en los componentes revisados.
- Once comprobaciones de interaccion reales: dialogo visible, Escape, retorno de foco, cancelar sin transicion, Cerrado sin escritura de participantes, transiciones offline bloqueadas, navegacion interna sin recarga, crear persona offline bloqueado, aviso persistente al navegar, validacion junto a campo y datos conservados. Otras cuatro: borrador ante error del servidor, asociacion semantica del error, sin exito falso y Abogado sin montaje administrativo.
- Pestañas: borradores de informe/nota conservados; Inicio/Fin activan el extremo correcto y solo un panel es accesible. Se verifico el retorno de foco al cancelar el archivo real, sin ejecutar archivado. No se invoco IA ni se guardaron notas, personas o informes.
- Navegacion administrativa de la primera revisión: cuatro rutas con teclado y rechazo del rol contrario. Entonces la consulta real de cuentas fallaba con VALIDATION «El correo no es valido»; el ajuste posterior de 004 corrigió la serialización del cursor null y verificó listado real, sin modificar datos para ocultar el fallo. La matriz administrativa completa sigue pendiente. Persiste la advertencia preexistente de segunda carga de single-spa en Angular; React no la añade.
- Verificacion responsive final: Abogado 1440/768/360 px sin overflow de pagina, panel unico, franja de secciones movil desplazable y navegacion compacta; Administrador 1024 px. El navegador integrado reajusta el viewport al capturar: se midieron dimensiones antes de cada captura; estas sirven para revision visual, no como regresiones pixel-perfect. Captura administrativa en carga, sin acreditar listado cargado.
- Detector Impeccable ejecutado una vez sobre los targets modificados: `[]`. Revision independiente de solo lectura: ship para los cambios revisados, sin acreditar los consumidores/matrices pendientes. No se añaden archivos de testing ni informes Markdown extra.
- Datos sinteticos: expediente UX-001-20261110 y su transicion eliminados mediante transaccion SQL y UUID/codigo exactos; sin contenido juridico real afectado. Dependencias previas intactas; solo lucide-react 1.71.0 añadido. Sin commit ni push en esta revision.

### Aceptacion restante

Ajustes solicitados tras la revisión: menú «Mi cuenta» reemplaza los controles superiores separados; retirada la acción duplicada de Mi espacio; corregido cambio de usuario entre roles y listado real de cuentas. Chat conversacional con borradores/Enter/Mayús+Enter y fuentes comprobados; envío real de IA devolvió SERVICE_UNAVAILABLE sin persistir intercambio. La presentación de respuesta confirmada se comprueba separadamente con respuesta sintética no persistida. No se acredita nueva disponibilidad del proveedor por esa simulación. Se mantienen 6/14 criterios globales y los límites siguientes.

- C01: navegacion del Abogado disponible verificada; faltan destinos de 013-016.
- C03-C09: hay evidencia real parcial en esta revision y en specs 005-012, pero falta completar la matriz por ambos frameworks/consumidores, incluyendo offline y eliminacion de descarga 013. No se marcan globalmente por extrapolacion.
- C02 y C10-C14 confirmados en el alcance de esta entrega visual. Estado global: En progreso.

### Comprobaciones tecnicas de la base anterior (2026-11-08)

- `npm run typecheck` y builds de producción correctos en Shell, React y Angular. Angular se compiló con Node 26 temporal porque el Node global disponible es 22.17.0; no se cambió la instalación global.
- Formatos comprobados sin archivos de testing: fecha civil, zona de Bolivia, cambio de día, cero, negativos, importe superior a precisión segura de `Number` y rechazo de formatos inválidos.
- React conserva el campo al mostrar error, presenta reintento recuperable y Escape cierra la confirmación devolviendo foco sin ejecutar una acción. Angular tiene etiquetas asociadas, identificadores únicos y las mismas salidas de formato; su matriz de interacción debe revisarla el desarrollador, pues la vista integrada quedó oculta durante parte de la comprobación.
- Builds servidos localmente confirmaron ambos microfrontends montados con una sola hoja común y ninguna galería en producción.
- `docker compose config --quiet` correcto con variables ficticias limitadas al proceso para validar sintaxis; no se iniciaron bases/servicios ni se reconstruyeron imágenes Docker. Las comprobaciones del entorno real siguen pendientes.

## Verificación de aceptación

- [ ] El desarrollador revisa los 14 criterios de la [spec](./spec.md), incluida integración real de restricciones con 005, 007 y 013.
- [ ] El desarrollador ejecuta las validaciones del [plan](./plan.md) en componentes afectados y registra resultados junto a cada tarea; no se crean archivos de testing.
- [ ] Actualizar spec, plan e [índice](../index.md) si cambia la solución; marcar completa solo después de verificación, no por generar estas tareas.