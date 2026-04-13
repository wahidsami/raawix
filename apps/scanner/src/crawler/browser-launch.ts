import { chromium, type Browser, type LaunchOptions } from 'playwright';

const DEFAULT_CONTAINER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-extensions',
  '--disable-background-networking',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-sync',
  '--no-zygote',
];

function uniqueArgs(args: string[]): string[] {
  return Array.from(new Set(args));
}

export function chromiumLaunchOptions(extraArgs: string[] = []): LaunchOptions {
  const channel = process.env.PLAYWRIGHT_BROWSER_CHANNEL || 'chromium';
  const launchTimeoutMs = parseInt(process.env.PLAYWRIGHT_LAUNCH_TIMEOUT_MS || '30000', 10);
  const singleProcess = process.env.PLAYWRIGHT_SINGLE_PROCESS === 'true';

  return {
    headless: true,
    timeout: launchTimeoutMs,
    ...(channel && channel !== 'default' ? { channel } : {}),
    args: uniqueArgs([
      ...DEFAULT_CONTAINER_ARGS,
      ...(singleProcess ? ['--single-process'] : []),
      ...extraArgs,
    ]),
  };
}

export async function launchChromium(extraArgs: string[] = []): Promise<Browser> {
  const primaryOptions = chromiumLaunchOptions(extraArgs);

  try {
    return await chromium.launch(primaryOptions);
  } catch (primaryError) {
    const primaryMessage = primaryError instanceof Error ? primaryError.message : String(primaryError);
    const usedChannel = (primaryOptions as { channel?: string }).channel;

    if (!usedChannel) {
      throw primaryError;
    }

    console.warn(
      `[BROWSER] Chromium launch with channel "${usedChannel}" failed, retrying default bundled browser: ${primaryMessage}`
    );

    const fallbackOptions = { ...primaryOptions };
    delete (fallbackOptions as { channel?: string }).channel;
    return chromium.launch(fallbackOptions);
  }
}
