export function parseCookies(cookieHeader: string | null | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = decodeURIComponent(part.slice(idx + 1).trim());
    if (key) cookies[key] = value;
  }
  return cookies;
}

export function serializeCookie(name: string, value: string, options?: {
  httpOnly?: boolean;
  path?: string;
  maxAge?: number;
  sameSite?: "lax" | "strict" | "none";
  secure?: boolean;
  expires?: Date;
  domain?: string;
}): string {
  const segments: string[] = [];
  segments.push(`${encodeURIComponent(name)}=${encodeURIComponent(value)}`);
  const opts = options ?? {};
  segments.push(`Path=${opts.path ?? "/"}`);
  if (typeof opts.maxAge === "number") segments.push(`Max-Age=${Math.floor(opts.maxAge)}`);
  if (opts.expires) segments.push(`Expires=${opts.expires.toUTCString()}`);
  if (opts.domain) segments.push(`Domain=${opts.domain}`);
  if (opts.httpOnly) segments.push("HttpOnly");
  const sameSite = opts.sameSite ?? "lax";
  segments.push(`SameSite=${sameSite}`);
  if (opts.secure ?? (sameSite === "none")) segments.push("Secure");
  return segments.join("; ");
}

export function setCookieOnResponse(res: Response, cookieString: string): Response {
  const existing = res.headers.get("Set-Cookie");
  if (existing) {
    res.headers.set("Set-Cookie", `${existing}, ${cookieString}`);
  } else {
    res.headers.set("Set-Cookie", cookieString);
  }
  return res;
}


