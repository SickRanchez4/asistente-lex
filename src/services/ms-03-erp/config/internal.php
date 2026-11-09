<?php

return [

    // Credencial propia de MS-03 para llamadas REST internas; vacía rechaza toda llamada.
    'api_token' => (string) env('INTERNAL_API_TOKEN', ''),

    // Clave compartida para verificar el contexto de usuario firmado por el Gateway.
    'user_context_signing_key' => (string) env('USER_CONTEXT_SIGNING_KEY', ''),

];
