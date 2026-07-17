export const UI_PROTOTYPE_MAX_BYTES = 2 * 1024 * 1024;

const isolatedContentSecurityPolicy = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' data:; script-src 'unsafe-inline' 'unsafe-eval'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; frame-src 'none';">`;

/** 为关闭外部资源的 UI 原型注入 CSP，同时保留内联样式与脚本的演示能力。 */
export function buildUiPrototypeDocument(html: string, allowExternal: boolean) {
  if (allowExternal) {
    return html;
  }

  if (/<head[\s>]/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${isolatedContentSecurityPolicy}`);
  }

  if (/<html[\s>]/i.test(html)) {
    return html.replace(
      /<html([^>]*)>/i,
      `<html$1><head>${isolatedContentSecurityPolicy}</head>`
    );
  }

  return `<!doctype html><html><head>${isolatedContentSecurityPolicy}</head><body>${html}</body></html>`;
}

export function getUtf8ByteLength(value: string) {
  return new TextEncoder().encode(value).length;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }
  return `${(bytes / 1024).toFixed(bytes > 100 * 1024 ? 0 : 1)} KB`;
}

/** 使用无 opener 的 Blob 页面打开原型，避免预览脚本反向访问管理页面。 */
export function openUiPrototypeWindow(html: string, allowExternal: boolean) {
  const blob = new Blob([buildUiPrototypeDocument(html, allowExternal)], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
