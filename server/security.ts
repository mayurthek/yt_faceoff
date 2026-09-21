import type { FastifyInstance } from "fastify";

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' https: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self' https://accounts.google.com",
].join("; ");

export function applySecurityHeaders(app: FastifyInstance): void {
  app.addHook("onSend", async (_req, reply) => {
    void reply.header("content-security-policy", CONTENT_SECURITY_POLICY);
    void reply.header(
      "strict-transport-security",
      "max-age=31536000; includeSubDomains",
    );
    void reply.header("x-content-type-options", "nosniff");
    void reply.header("x-frame-options", "DENY");
    void reply.header("referrer-policy", "no-referrer");
    void reply.header(
      "permissions-policy",
      "camera=(), microphone=(), geolocation=()",
    );
  });
}