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

  console.log(token, secretKey, ip);
  const url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
  const result = await fetch(url, {
    body: formData,
    method: "POST",
  });

  const outcome = (await result.json()) as CaptchaResponse;
  return outcome.success;
}
