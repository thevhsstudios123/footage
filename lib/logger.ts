/**
 * Structured logging helper. In production, wire to Sentry / Datadog / Axiom.
 * For now it just writes JSON lines to stdout.
 *
 * Rule: NEVER log the user's original image. Only log the image hash.
 */

type LogLevel = "info" | "warn" | "error";

interface LogFields {
  event: string;
  userId?: string;
  imageHash?: string;
  [key: string]: unknown;
}

function emit(level: LogLevel, fields: LogFields): void {
  const line = JSON.stringify({
    level,
    timestamp: new Date().toISOString(),
    ...fields,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  info: (fields: LogFields) => emit("info", fields),
  warn: (fields: LogFields) => emit("warn", fields),
  error: (fields: LogFields) => emit("error", fields),
};
