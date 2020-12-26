export interface GenerateOptions {
  maxWidth?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  lineHeight?: number;
  textAlign?: 'left' | 'right' | 'center' | 'justify' | 'initial' | 'inherit';
  margin?: number;
  bgColor?: string | null;
  textColor?: string;
  highlightColor?: string;
  customHeight?: number;
  debug?: boolean;
  debugFilename?: string;
  localFontName?: string;
  localFontPath?: string;
  offsetX?: number;
  offsetY?: number;
  strokeColor?: string;
  lineWidth?: number;
  maxHeight?: number;
  lineHeightRatio?: number;
}

export function generate(
  text: string,
  options?: GenerateOptions,
): Promise<string>;

export function generateSync(text: string, options?: GenerateOptions): string;
