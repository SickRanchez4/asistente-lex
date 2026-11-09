<?php

// MS-03 usa el esquema erp de la base compartida.
return [

    'default' => 'pgsql',

    'connections' => [

        'pgsql' => [
            'driver' => 'pgsql',
            'host' => env('DB_HOST', '127.0.0.1'),
            'port' => env('DB_PORT', '5432'),
            'database' => env('DB_NAME', 'asistente_lex'),
            'username' => env('DB_USER', ''),
            'password' => env('DB_PASSWORD', ''),
            'charset' => 'utf8',
            'prefix' => '',
            'prefix_indexes' => true,
            'search_path' => env('DB_SCHEMA', 'erp'),
            'sslmode' => env('DB_SSLMODE', 'verify-full'),
            'sslrootcert' => env('DB_SSLROOTCERT', '/certs/postgresql-ca.crt'),
        ],

    ],

    'migrations' => [
        'table' => 'migrations',
        'update_date_on_publish' => true,
    ],

];
