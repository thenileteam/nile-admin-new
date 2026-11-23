const BROWSERS: Array<[RegExp, string]> = [
  [/Edg\//i, "Edge"],
  [/OPR\/|Opera/i, "Opera"],
  [/Chrome\/|CriOS/i, "Chrome"],
  [/Firefox\/|FxiOS/i, "Firefox"],
  [/Safari\//i, "Safari"],
];

const PLATFORMS: Array<[RegExp, string]> = [
  [/iPhone/i, "iPhone"],
  [/iPad/i, "iPad"],
  [/Android/i, "Android"],
  [/Macintosh|Mac OS X/i, "macOS"],
  [/Windows/i, "Windows"],
  [/Linux/i, "Linux"],
];

/**
 * Mirrors auth-service's `describeDevice` so a session row without a
 * server-computed label still renders something an admin can recognise.
 */
export const describeDevice = (userAgent?: string | null): string => {
  if (!userAgent) return "Unknown device";

  const browser = BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1];
  const platform = PLATFORMS.find(([pattern]) => pattern.test(userAgent))?.[1];

  if (browser && platform) return `${browser} on ${platform}`;
  if (browser) return browser;
  if (platform) return platform;
  return "Unknown device";
};
