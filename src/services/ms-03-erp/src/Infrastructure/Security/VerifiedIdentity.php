<?php

namespace AsistenteLex\Erp\Infrastructure\Security;

/**
 * Identidad del solicitante firmada por el Gateway; la cuenta efectiva sale de aquí, nunca de parámetros.
 */
final readonly class VerifiedIdentity
{
    public function __construct(
        public string $userId,
        public string $role,
        public string $accountId,
    ) {}
}
