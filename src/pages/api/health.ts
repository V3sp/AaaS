import type { APIRoute } from 'astro';

const STARTED_AT = Date.now();

/** GET /api/health — liveness/readiness probe for Docker and load balancers. */
export const GET: APIRoute = () => {
  return new Response(
    JSON.stringify({
      status: 'ok',
      service: 'architect-as-a-service',
      version: '1.0.0',
      uptimeSeconds: Math.round((Date.now() - STARTED_AT) / 1000),
      timestamp: new Date().toISOString(),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
  );
};
