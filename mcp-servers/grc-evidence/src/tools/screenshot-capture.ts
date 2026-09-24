import { useExplicitDemoFallback } from '../demo-mode.js';

interface ScreenshotParams {
  url: string;
  selector?: string;
  waitForSelector?: string;
  fullPage?: boolean;
  authentication?: {
    type: 'basic' | 'bearer' | 'cookie';
    credentials: Record<string, string>;
  };
}

/**
 * SSRF Protection: Validates that a URL is safe to navigate to.
 * Blocks private IPs, localhost, and non-HTTP(S) protocols.
 */
function isValidPublicUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block localhost variants
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return false;
    }

    // Block 0.0.0.0
    if (hostname === '0.0.0.0') {
      return false;
    }

    // Block private IP ranges:
    // - 10.0.0.0/8 (10.x.x.x)
    // - 172.16.0.0/12 (172.16.x.x - 172.31.x.x)
    // - 192.168.0.0/16 (192.168.x.x)
    // - 127.0.0.0/8 (127.x.x.x)
    // - 169.254.0.0/16 (link-local)
    if (/^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|127\.|169\.254\.)/.test(hostname)) {
      return false;
    }

    // Block IPv6 private/local addresses
    // Covers ::1, fe80::, fc00::, fd00::, etc.
    if (
      /^(::1|fe80:|fc00:|fd00:|::ffff:(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|127\.|169\.254\.))/.test(
        hostname
      )
    ) {
      return false;
    }

    // Block metadata service endpoints (cloud provider SSRF targets)
    if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

interface ScreenshotResult {
  type: string;
  url: string;
  collectedAt: string;
  screenshot: string; // Base64 encoded image
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
    captureTime: number;
  };
  pageInfo: {
    title: string;
    statusCode: number;
    loadTime: number;
  };
}

export async function captureScreenshot(params: ScreenshotParams): Promise<ScreenshotResult> {
  const { url, selector, waitForSelector, fullPage = false, authentication } = params;

  const startTime = Date.now();

  try {
    // Dynamically import puppeteer to avoid loading it if not needed
    const puppeteer = await import('puppeteer');

    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    try {
      const page = await browser.newPage();

      // Set viewport
      await page.setViewport({
        width: 1920,
        height: 1080,
      });

      // Handle authentication
      if (authentication) {
        switch (authentication.type) {
          case 'basic':
            await page.authenticate({
              username: authentication.credentials.username,
              password: authentication.credentials.password,
            });
            break;
          case 'bearer':
            await page.setExtraHTTPHeaders({
              Authorization: `Bearer ${authentication.credentials.token}`,
            });
            break;
          case 'cookie': {
            const cookies = Object.entries(authentication.credentials).map(([name, value]) => ({
              name,
              value,
              url,
            }));
            await page.setCookie(...cookies);
            break;
          }
        }
      }

      // SSRF Protection: Validate URL before navigation
      if (!isValidPublicUrl(url)) {
        throw new Error(
          'Invalid URL: Only public HTTP/HTTPS URLs are allowed. ' +
            'Private IPs, localhost, and internal endpoints are blocked for security.'
        );
      }

      // Navigate to URL
      const response = await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });

      const loadTime = Date.now() - startTime;

      // Wait for specific selector if provided
      if (waitForSelector) {
        await page.waitForSelector(waitForSelector, { timeout: 30000 });
      }

      // Get page title
      const title = await page.title();
      const statusCode = response?.status() || 0;

      // Capture screenshot
      let screenshotBuffer: Buffer;

      if (selector) {
        const element = await page.$(selector);
        if (!element) {
          throw new Error(`Element not found: ${selector}`);
        }
        screenshotBuffer = (await element.screenshot({
          type: 'png',
        })) as Buffer;
      } else {
        screenshotBuffer = (await page.screenshot({
          type: 'png',
          fullPage,
        })) as Buffer;
      }

      const captureTime = Date.now() - startTime;

      // Get viewport dimensions
      const viewport = page.viewport();

      await browser.close();

      return {
        type: 'screenshot',
        url,
        collectedAt: new Date().toISOString(),
        screenshot: screenshotBuffer.toString('base64'),
        metadata: {
          width: viewport?.width || 1920,
          height: viewport?.height || 1080,
          format: 'png',
          size: screenshotBuffer.length,
          captureTime,
        },
        pageInfo: {
          title,
          statusCode,
          loadTime,
        },
      };
    } finally {
      await browser.close();
    }
  } catch (error) {
    const reason = `Screenshot capture failed: ${
      error instanceof Error ? error.message : String(error)
    }`;
    return useExplicitDemoFallback(reason, () => ({
      type: 'screenshot',
      url,
      collectedAt: new Date().toISOString(),
      screenshot: '',
      isMockMode: true,
      mockModeReason: reason,
      metadata: {
        width: 0,
        height: 0,
        format: 'png',
        size: 0,
        captureTime: Date.now() - startTime,
      },
      pageInfo: {
        title: 'Error',
        statusCode: 0,
        loadTime: 0,
      },
    }));
  }
}
