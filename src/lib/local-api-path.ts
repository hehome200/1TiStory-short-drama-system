export function buildLocalApiPath(...segments: string[]) {
  return ["", "api", ...segments].join("/");
}

export function isLocalApiPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  return segments[0] === "api";
}
