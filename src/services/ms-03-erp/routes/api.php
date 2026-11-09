<?php

use AsistenteLex\Erp\Infrastructure\Health\HealthController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);
