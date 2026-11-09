<?php

return [

    // Tiempo máximo de cada comprobación de almacén en GET /health.
    'timeout_ms' => (int) env('HEALTH_CHECK_TIMEOUT_MS', 2000),

];
