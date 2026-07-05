// Neutral error reporter. Extend to wire an external service later.
export function reportError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  // eslint-disable-next-line no-console
  console.error("[SwiftCartNG]", error, context);
}
