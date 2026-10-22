/**
 * 将管理员输入转换为可审计的精确 DNS Host。
 * 白名单不接受协议、端口、路径、通配符或仅本地网络语义的名称。
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
      hostname === 'home.arpa' ||
      hostname.endsWith('.home.arpa') ||
      isIpv4Address(hostname)
    ) {
      return null;
    }
    return hostname;
  } catch {
    return null;
  }
}

/** 精确 Host 必须是至少两级的 DNS 名称，避免放行单标签内网名称。 */
function isPublicDnsHostname(hostname: string): boolean {
  return /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(
    hostname
  );
}

function isIpv4Address(hostname: string): boolean {
  const segments = hostname.split('.');
  return segments.length === 4 && segments.every((segment) => /^\d+$/.test(segment) && Number(segment) <= 255);
}

/** 对整份策略规范化、去重并稳定排序，确保版本差异可预测。 */
export function normalizeMarkdownImageHosts(hosts: string[]): string[] {
  const normalizedHosts: string[] = [];
  for (const host of hosts) {
    const normalizedHost = normalizeMarkdownImageHost(host);
    if (!normalizedHost) {
      throw new Error('白名单域名必须是合法的精确公网 Host。');
    }
    normalizedHosts.push(normalizedHost);
  }
  return [...new Set(normalizedHosts)].sort((left, right) => left.localeCompare(right));
}
