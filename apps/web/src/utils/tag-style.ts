import type { CSSProperties } from 'react';

/** 将 HEX 颜色转换为带透明度的 rgba 字符串。 */
function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const fullHex =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalized;

  const value = Number.parseInt(fullHex, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

/** 生成标签芯片样式：文字用原色，背景用低透明度同色。 */
export function getTagStyle(color: string): CSSProperties {
  return {
    color,
    backgroundColor: hexToRgba(color, 0.12)
  };
}
