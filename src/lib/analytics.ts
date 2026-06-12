export function track(event: string, payload?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.debug("[track]", event, payload);
  }
}
