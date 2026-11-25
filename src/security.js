import { bodyLimit } from 'hono/body-limit';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const hex = bytes => Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
export const token = () => hex(crypto.getRandomValues(new Uint8Array(32)));
export const hash = async text => hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))));
const keys = new Map();

export const payloadLimit = bodyLimit({
  maxSize: 2048,
  onError: c => c.json({ erro: 'corpo_grande' }, 413),
});

export async function sameOrigin(c, next) {
  const origin = c.req.header('Origin');
  if (origin && origin !== new URL(c.req.url).origin) return c.json({ erro: 'origem_invalida' }, 403);
  await next();
}

export async function admin(c, next) {
  const { ACCESS_TEAM, ACCESS_AUD, ADMIN_KEY } = c.env;
  if (ACCESS_TEAM || ACCESS_AUD) {
    if (!ACCESS_AUD || !/^[a-z0-9-]+$/.test(ACCESS_TEAM || '')) return c.json({ erro: 'painel_indisponivel' }, 503);
    const issuer = 'https://' + ACCESS_TEAM + '.cloudflareaccess.com';
    if (!keys.has(issuer)) keys.set(issuer, createRemoteJWKSet(new URL('/cdn-cgi/access/certs', issuer)));
    try {
      await jwtVerify(c.req.header('Cf-Access-Jwt-Assertion') || '', keys.get(issuer), { issuer, audience: ACCESS_AUD });
    } catch {
      return c.json({ erro: 'nao_autorizado' }, 401);
    }
  } else {
    const match = /^Bearer ([a-f0-9]{64})$/.exec(c.req.header('Authorization') || '');
    if (!/^[a-f0-9]{64}$/.test(ADMIN_KEY || '') || !match) return c.json({ erro: 'nao_autorizado' }, 401);
    const bytes = new TextEncoder();
    if (!crypto.subtle.timingSafeEqual(bytes.encode(match[1]), bytes.encode(ADMIN_KEY))) {
      return c.json({ erro: 'nao_autorizado' }, 401);
    }
  }
  await next();
}

export async function proof(c, response) {
  const { TURNSTILE_SECRET, TURNSTILE_SITE_KEY } = c.env;
  if (!TURNSTILE_SECRET && !TURNSTILE_SITE_KEY) return true;
  if (!TURNSTILE_SECRET || !TURNSTILE_SITE_KEY || typeof response !== 'string' || response.length > 2048) return false;
  const body = new URLSearchParams({ secret: TURNSTILE_SECRET, response });
  const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST', body, signal: AbortSignal.timeout(5000),
  });
  const data = await result.json();
  return data.success === true && data.hostname === new URL(c.req.url).hostname && data.action === 'reserva_demo';
}

export async function throttle(c) {
  const ip = c.req.header('CF-Connecting-IP') || 'local';
  const now = new Date();
  const bucket = now.toISOString().slice(0, 13);
  const subject = await hash(bucket + '|' + (c.env.ADMIN_KEY || '') + '|' + ip);
  const row = await c.env.DB.prepare(`INSERT INTO demo_limits(bucket, subject, hits) VALUES (?, ?, 1)
    ON CONFLICT(bucket, subject) DO UPDATE SET hits = hits + 1 WHERE hits < 30 RETURNING hits`)
    .bind(bucket, subject).first();
  return Boolean(row);
}
