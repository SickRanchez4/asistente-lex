# Tareas: Experiencia y UI compartida

## Estado

En progreso. Base de 001-T01 y 001-T02 implementada; 001-T03 preparada y bloqueada por dependencias reales. La aceptación final corresponde al desarrollador: las casillas no se marcan como verificadas por compilar o demostrar escenarios locales.

## Lista de trabajo

Basadas en la [spec](./spec.md) y el [plan](./plan.md). C01, C02, etc. identifican los criterios por su orden en la spec. Cada entrega incluye sus superficies relacionadas; no hay una tarea por archivo o componente. La verificación corresponde al desarrollador, sin crear archivos de testing.

- [ ] **001-T01. Ofrecer una identidad visual legible y adaptable en ambas interfaces.**
  - **Valor/entrega:** aplicar logotipo existente, negro/dorado, contenido claro, español y tipografía del sistema en Shell, React y Angular; navegación por teclado, foco y etiquetas básicos. Compartir solo estilos y funciones independientes del framework.
  - **Depende de:** [000](../000-plataforma-base/tasks.md), con Shell y microfrontends operativos.
  - **Evidencia/validación:** Abogado usable desde 360 px y Administrador desde 1024 px; marca coherente, sin fuentes externas, selector de temas ni afirmación de certificación WCAG.
  - **Cobertura:** C12, C13, C14.
  - **Implementación:** CSS/logotipo compartidos y Shell/raíces React/Angular actualizados. Comprobación técnica local de 360 px y 1024 px sin desbordamiento; revisión completa de dispositivos/accesibilidad pendiente del desarrollador.

- [ ] **001-T02. Comunicar operaciones, restricciones y resultados con patrones comunes.**
  - **Valor/entrega:** patrones React/Angular de carga, vacío, errores, permisos, recurso ausente, indisponibilidad y resultado parcial; formularios que conservan datos, confirmaciones cancelables y explicación accesible de acciones bloqueadas. Formatos exactos de fechas/BOB sin pérdida de precisión. Recibir rol, estado, disponibilidad y conectividad como contexto, sin reglas autoritativas ni almacenamiento offline.
  - **Depende de:** 001-T01 y categorías/convenciones de [002-T01](../002-gateway-y-contratos-base/tasks.md).
  - **Evidencia/validación:** ejercitar los escenarios de presentación en desarrollo para ambos frameworks; cancelar no invoca acción, errores no limpian campos, parcial no muestra éxito y ambos producen `08/11/2026`, hora de Bolivia y `BOB 1.234,56`. Verificar su consumo real dentro de las entregas funcionales correspondientes, sin añadir pantallas ficticias a producción.
  - **Cobertura:** C03, C04, C05, C06, C07, C08, C09, C10, C11.
  - **Implementación:** componentes nativos, formatos exactos y galería exclusivamente de desarrollo disponibles. Falta consumir contratos definitivos de 002 y contextos funcionales reales; no se han añadido códigos GraphQL supuestos, funcionamiento offline o mutaciones de negocio.

- [ ] **001-T03. Permitir recorrer la aplicación exclusivamente dentro del rol autenticado.**
  - **Valor/entrega:** reemplazar enlaces provisionales entre roles por navegación propia, sección activa y enlaces contextuales; conectar cada entrada cuando exista su pantalla, sin destinos ficticios. No montar contenido del otro rol durante resolución de sesión o acceso directo.
  - **Depende de:** 001-T01, 001-T02, [003-T02](../003-autenticacion-y-acceso/tasks.md) y los destinos de las specs 004–016 que correspondan a cada rol. No exige completar esas specs enteras: exige sus pantallas navegables.
  - **Evidencia/validación:** Abogado recorre personas, expedientes y secciones contextuales, chat, ERP y descargas; Administrador recorre cuentas, parámetros, eventos y agentes. URL del otro rol no muestra su contenido. La tarea no se cierra mientras falten destinos comprometidos.
  - **Cobertura:** C01, C02, C11.
  - **Bloqueo:** 003-T02 y destinos funcionales aún no implementados. El responsable autorizó implementar la base y preparar esta integración sin crear autenticación ni pantallas ficticias. El contrato UI filtra por rol solo con sesión presentada como autenticada y valida destinos dentro de su prefijo; no verifica credenciales.

### Comprobaciones técnicas de esta implementación

- `npm run typecheck` y builds de producción correctos en Shell, React y Angular. Angular se compiló con Node 26 temporal porque el Node global disponible es 22.17.0; no se cambió la instalación global.
- Formatos comprobados sin archivos de testing: fecha civil, zona de Bolivia, cambio de día, cero, negativos, importe superior a precisión segura de `Number` y rechazo de formatos inválidos.
- React conserva el campo al mostrar error, presenta reintento recuperable y Escape cierra la confirmación devolviendo foco sin ejecutar una acción. Angular tiene etiquetas asociadas, identificadores únicos y las mismas salidas de formato; su matriz de interacción debe revisarla el desarrollador, pues la vista integrada quedó oculta durante parte de la comprobación.
- Builds servidos localmente confirmaron ambos microfrontends montados con una sola hoja común y ninguna galería en producción.
- `docker compose config --quiet` correcto con variables ficticias limitadas al proceso para validar sintaxis; no se iniciaron bases/servicios ni se reconstruyeron imágenes Docker. Las comprobaciones del entorno real siguen pendientes.

## Verificación de aceptación

- [ ] El desarrollador revisa los 14 criterios de la [spec](./spec.md), incluida integración real de restricciones con 005, 007 y 013.
- [ ] El desarrollador ejecuta las validaciones del [plan](./plan.md) en componentes afectados y registra resultados junto a cada tarea; no se crean archivos de testing.
- [ ] Actualizar spec, plan e [índice](../index.md) si cambia la solución; marcar completa solo después de verificación, no por generar estas tareas.