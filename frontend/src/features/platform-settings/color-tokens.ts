type Rgb = { r: number; g: number; b: number };

export const FIXED_PRIMARY_COLOR = "#4F46E5";
export const FIXED_ACCENT_COLOR = "#818CF8";

export function parseHexColor(value: string): Rgb | null {
  if (!/^#[0-9A-Fa-f]{6}$/.test(value)) return null;
  return {
    r: Number.parseInt(value.slice(1, 3), 16),
    g: Number.parseInt(value.slice(3, 5), 16),
    b: Number.parseInt(value.slice(5, 7), 16)
  };
}

function mix(color: Rgb, target: Rgb, amount: number): Rgb {
  return {
    r: Math.round(color.r + (target.r - color.r) * amount),
    g: Math.round(color.g + (target.g - color.g) * amount),
    b: Math.round(color.b + (target.b - color.b) * amount)
  };
}

function rgbValue(color: Rgb): string {
  return `${color.r} ${color.g} ${color.b}`;
}

function relativeLuminance(color: Rgb): number {
  const channel = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b)
  );
}

export function buildBrandColorTokens(
  _primaryHex: string,
  _accentHex: string,
  dark: boolean
) {
  const primary = parseHexColor(FIXED_PRIMARY_COLOR)!;
  const accent = parseHexColor(FIXED_ACCENT_COLOR)!;
  const hover = mix(
    primary,
    dark ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 },
    0.14
  );
  const soft = mix(
    primary,
    dark ? { r: 15, g: 31, b: 61 } : { r: 255, g: 255, b: 255 },
    dark ? 0.72 : 0.88
  );
  const foreground =
    relativeLuminance(primary) > 0.48
      ? { r: 15, g: 23, b: 42 }
      : { r: 255, g: 255, b: 255 };

  return {
    primary: rgbValue(primary),
    primaryHover: rgbValue(hover),
    primarySoft: rgbValue(soft),
    primaryForeground: rgbValue(foreground),
    accent: rgbValue(accent)
  };
}
