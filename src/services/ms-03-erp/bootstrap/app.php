<?php

use AsistenteLex\Erp\Infrastructure\Security\AuthenticateInternalRequest;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

// MS-03 es un servicio REST: solo expone rutas de API, sin prefijo ni sesiones.
return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        apiPrefix: '',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Global: también cubre rutas inexistentes, para no revelar el contrato sin autenticación.
        $middleware->prepend(AuthenticateInternalRequest::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(fn () => true);
    })->create();
