<?php

namespace AsistenteLex\Erp\Infrastructure\Security;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use JsonException;
use Symfony\Component\HttpFoundation\Response;

/**
 * Toda ruta salvo GET /health exige autenticación interna (spec 002): credencial
 * del servicio y, si se envía, contexto de usuario firmado y vigente.
 * Los controladores leen la identidad con $request->attributes->get(self::IDENTITY_ATTRIBUTE).
 */
final class AuthenticateInternalRequest
{
    public const IDENTITY_ATTRIBUTE = 'verifiedIdentity';

    private const USER_CONTEXT_HEADER = 'X-Lex-User-Context';

    private const MIN_SIGNING_KEY_LENGTH = 32;

    public function handle(Request $request, Closure $next): Response
    {
        $request->attributes->remove(self::IDENTITY_ATTRIBUTE);
        if ($request->isMethod('GET') && $request->path() === 'health') {
            return $next($request);
        }

        $apiToken = (string) config('internal.api_token');
        $token = $request->bearerToken();
        if ($apiToken === '' || $token === null || ! hash_equals($apiToken, $token)) {
            return $this->reject();
        }

        $context = $request->header(self::USER_CONTEXT_HEADER);
        if ($context !== null) {
            $identity = $this->verifyUserContext($context, (string) config('internal.user_context_signing_key'));
            if ($identity === null) {
                return $this->reject();
            }
            $request->attributes->set(self::IDENTITY_ATTRIBUTE, $identity);
        }

        return $next($request);
    }

    private function verifyUserContext(string $value, string $signingKey): ?VerifiedIdentity
    {
        if (strlen($signingKey) < self::MIN_SIGNING_KEY_LENGTH) {
            return null;
        }
        $parts = explode('.', $value);
        if (count($parts) !== 2 || $parts[0] === '' || $parts[1] === '') {
            return null;
        }
        [$payload, $signature] = $parts;
        $expected = rtrim(strtr(base64_encode(hash_hmac('sha256', $payload, $signingKey, true)), '+/', '-_'), '=');
        if (! hash_equals($expected, $signature)) {
            return null;
        }

        $json = base64_decode(strtr($payload, '-_', '+/'), true);
        if ($json === false) {
            return null;
        }
        try {
            $claims = json_decode($json, true, 4, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            return null;
        }

        $valid = is_array($claims)
            && is_string($claims['userId'] ?? null) && $claims['userId'] !== ''
            && is_string($claims['accountId'] ?? null) && $claims['accountId'] !== ''
            && in_array($claims['role'] ?? null, ['ABOGADO', 'ADMINISTRADOR'], true)
            && is_int($claims['exp'] ?? null) && $claims['exp'] > time();

        return $valid ? new VerifiedIdentity($claims['userId'], $claims['role'], $claims['accountId']) : null;
    }

    private function reject(): JsonResponse
    {
        return new JsonResponse([
            'category' => 'UNAUTHENTICATED',
            'message' => 'Solicitud interna no autenticada.',
        ], 401);
    }
}
