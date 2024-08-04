import { SQLiteSelectQueryBuilder } from "drizzle-orm/sqlite-core";

interface CaptchaResponse {
  success: boolean;
  challenge_ts: string;
  hostname: string;
  "error-codes": string[];
  action: string;
  cdata: string;
}

export function formatUserAgent(userAgent: string = ""): string {
  const browserPattern = /(Firefox|Chrome|Safari|Edge|Opera|Trident)\/\d+/;
  const osPattern = /\(([^)]+)\)/;

  const browserMatch = userAgent.match(browserPattern);
  const osMatch = userAgent.match(osPattern);

  let browser = "";
  if (browserMatch) {
    if (browserMatch[1] === "Trident") {
      browser = "Internet Explorer";
    } else {
      browser = browserMatch[1];
    }
  }

  let os = "";
  if (osMatch && osMatch[1]) {
    const osParts = osMatch[1].split(";");
    if (osParts[0].includes("Windows")) {
      os = "Windows";
    } else if (osParts[0].includes("Mac")) {
      os = "Mac OS";
    } else if (osParts[0].includes("X11") || osParts[0].includes("Linux")) {
      os = "Linux";
    } else {
      os = osParts[0].trim();
    }
  }

  return `${browser}, ${os}`;
}

export async function validateCaptcha(
  token: string,
  secretKey: string,
  ip: string = ""
): Promise<boolean> {
  let formData = new FormData();
  formData.append("secret", secretKey);
  formData.append("response", token);
  formData.append("remoteip", ip);

  const url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
  const result = await fetch(url, {
    body: formData,
    method: "POST",
  });

  const outcome = (await result.json()) as CaptchaResponse;
  return outcome.success;
}

export function withPagination<T extends SQLiteSelectQueryBuilder>(
  qb: T,
  maxlimit: number = 25,
  page: string = "1",
  limit: string = "10"
) {
  let sanitizedPage = parseInt(page, 10);
  let sanitizedLimit = Math.min(parseInt(limit, 10), maxlimit);

  if (isNaN(sanitizedPage) || sanitizedPage < 1) {
    sanitizedPage = 1;
  }
  if (
    isNaN(sanitizedLimit) ||
    sanitizedLimit < 1 ||
    sanitizedLimit > maxlimit
  ) {
    sanitizedLimit = maxlimit;
  }
  return qb.limit(sanitizedLimit).offset((sanitizedPage - 1) * sanitizedLimit);
}

export function toUrlSafeString(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");
}
