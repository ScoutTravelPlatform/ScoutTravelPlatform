import "server-only";

import type { SecureCheckoutProvider } from "@/lib/secure-checkout";

type BrowserbaseEnvironment = {
  apiKey: string;
  projectId?: string;
  certificateId: string;
  proxyHost: string;
  proxyUsername: string;
  proxyPassword: string;
};

function browserbaseEnvironment(): BrowserbaseEnvironment | null {
  const apiKey = process.env.BROWSERBASE_API_KEY;
  const certificateId = process.env.BROWSERBASE_VGS_CA_CERTIFICATE_ID;
  const vaultId = process.env.NEXT_PUBLIC_VGS_VAULT_ID;
  const proxyUsername = process.env.VGS_PROXY_USERNAME;
  const proxyPassword = process.env.VGS_PROXY_PASSWORD;
  if (!apiKey || !certificateId || !vaultId || !proxyUsername || !proxyPassword) return null;
  return {
    apiKey,
    projectId: process.env.BROWSERBASE_PROJECT_ID || undefined,
    certificateId,
    proxyHost: `${vaultId}.sandbox.verygoodproxy.com`,
    proxyUsername,
    proxyPassword,
  };
}

export function isBrowserbaseConfigured() {
  return browserbaseEnvironment() !== null;
}

export function createBrowserbaseProvider(): SecureCheckoutProvider | null {
  const environment = browserbaseEnvironment();
  if (!environment) return null;
  const configuredEnvironment = environment;
  async function browserbaseClient() {
    const { default: Browserbase } = await import("@browserbasehq/sdk");
    return new Browserbase({ apiKey: configuredEnvironment.apiKey });
  }

  return {
    name: "hosted_browser",
    async createSession({ checkoutSessionId, targetUrl }) {
      const client = await browserbaseClient();
      const target = new URL(targetUrl);
      const session = await client.sessions.create({
        projectId: environment.projectId,
        keepAlive: true,
        timeout: 1800,
        region: "us-east-1",
        browserSettings: { viewport: { width: 1440, height: 900 } },
        proxies: [{
          type: "external",
          server: `https://${environment.proxyHost}:8443`,
          username: environment.proxyUsername,
          password: environment.proxyPassword,
          domainPattern: `^${target.hostname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        }],
        proxySettings: { caCertificates: [environment.certificateId] },
        userMetadata: { scoutCheckoutSessionId: checkoutSessionId, environment: "sandbox" },
      });

      const { default: puppeteer } = await import("puppeteer-core");
      const browser = await puppeteer.connect({ browserWSEndpoint: session.connectUrl });
      try {
        const pages = await browser.pages();
        const page = pages[0] ?? await browser.newPage();
        await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
      } finally {
        browser.disconnect();
      }

      const live = await client.sessions.debug(session.id);
      return {
        providerReference: session.id,
        operatorUrl: live.debuggerFullscreenUrl,
        expiresAt: session.expiresAt,
      };
    },
    async getOperatorUrl(providerReference) {
      const client = await browserbaseClient();
      const live = await client.sessions.debug(providerReference);
      return live.debuggerFullscreenUrl;
    },
    async releaseSession(providerReference) {
      const client = await browserbaseClient();
      await client.sessions.update(providerReference, {
        status: "REQUEST_RELEASE",
        projectId: environment.projectId,
      });
    },
  };
}
