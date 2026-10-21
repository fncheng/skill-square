/**
 * 规范化管理员维护的 Markdown 图片 Host。
 * 配置仅接受精确的公网 DNS Host，不接受协议、端口、路径、通配符或本地网络名称。
 */
export function normalizeMarkdownImageHost(rawHost: string): string | null {
  const candidate = rawHost.trim();
  if (!candidate || /[\\/:?#@*\[\]]/.test(candidate)) {
    return null;
  }

  try {
    const url = new URL(`https://${candidate}`);
    const hostname = url.hostname.toLowerCase();
    if (
      url.port ||
      !isPublicDnsHostname(hostname) ||
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      isIpv4Address(hostname)
    ) {
      return null;
    }
    return hostname;
  } catch {
    return null;
  }
}

/** 判断已解析图片 URL 是否满足 HTTPS 与精确 Host 白名单。 */
export function getAllowedMarkdownImageUrl(rawUrl: string, allowedHosts: ReadonlySet<string>): string | null {
  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.toLowerCase();
    return url.protocol === 'https:' &&
      !url.port &&
      !url.username &&
      !url.password &&
      normalizeMarkdownImageHost(hostname) === hostname &&
      allowedHosts.has(hostname)
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function isPublicDnsHostname(hostname: string): boolean {
  return /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(
    hostname
  );
}

function isIpv4Address(hostname: string): boolean {
  const segments = hostname.split('.');
  return segments.length === 4 && segments.every((segment) => /^\d+$/.test(segment) && Number(segment) <= 255);
}
