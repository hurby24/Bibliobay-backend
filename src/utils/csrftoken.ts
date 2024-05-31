import { generateRandomString, alphabet, HMAC } from "oslo/crypto";

export const createCsrfToken = async (sid: string, secret: string) => {
  const hs256 = new HMAC("SHA-256");
  const random = generateRandomString(4, alphabet("a-z", "0-9"));
  const message = sid + "!" + random;
  const data = new TextEncoder().encode(message);
  const secretData = new TextEncoder().encode(secret);
  const crsftoken = await hs256.sign(secretData, data);
  const hexString = Array.prototype.map
    .call(new Uint8Array(crsftoken), (x) => x.toString(16).padStart(2, "0"))
    .join("");
  return `${hexString}.${random}`;
};

export const validateCsrfToken = async (
  sid: string,
  token: string,
  secret: string
): Promise<boolean> => {
  const hs256 = new HMAC("SHA-256");
  const [signature, random] = token.split(".");
  const message = sid + "!" + random;
  const data = new TextEncoder().encode(message);
  const secretData = new TextEncoder().encode(secret);
  const crsftoken = await hs256.sign(secretData, data);
  const hexString = Array.prototype.map
    .call(new Uint8Array(crsftoken), (x) => x.toString(16).padStart(2, "0"))
    .join("");
  return signature === hexString;
};
