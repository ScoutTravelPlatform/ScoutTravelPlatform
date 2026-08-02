export const sandboxCheckoutTarget = {
  supplier: "VGS Sandbox",
  url: "https://echo.sandbox.verygoodvault.com/post",
} as const;

export function isApprovedSecureCheckoutUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "echo.sandbox.verygoodvault.com" && url.pathname === "/post";
  } catch {
    return false;
  }
}
