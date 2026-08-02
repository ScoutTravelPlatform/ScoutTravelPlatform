import "server-only";

export type SecureCheckoutProvider = {
  name: "sandbox" | "hosted_browser";
  createSession(input: { checkoutSessionId: string; targetUrl: string }): Promise<{
    providerReference: string;
    operatorUrl: string;
    expiresAt: string;
  }>;
  getOperatorUrl(providerReference: string): Promise<string>;
  releaseSession(providerReference: string): Promise<void>;
};

export async function getSecureCheckoutProvider(): Promise<SecureCheckoutProvider | null> {
  const { createBrowserbaseProvider } = await import("@/lib/browserbase");
  return createBrowserbaseProvider();
}
