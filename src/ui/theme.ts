/**
 * Visual theme for the built-in UI. Every value has a sensible default; pass a
 * partial `theme` to `<ChatWidget>` / `<ChatScreen>` to override. The shared
 * accent (`primaryColor`) is set on `<TeletypeProvider>` and colors both the
 * launcher button and the chat header.
 */
export interface TeletypeTheme {
  primaryColor: string;
  onPrimaryColor: string;
  backgroundColor: string;
  headerTextColor: string;
  headerSubTextColor: string;
  ownBubbleColor: string;
  ownTextColor: string;
  operatorBubbleColor: string;
  operatorTextColor: string;
  mutedColor: string;
  borderColor: string;
  inputBackground: string;
  inputTextColor: string;
  badgeColor: string;
  badgeTextColor: string;
  fontFamily?: string;
  bubbleRadius: number;
  buttonSize: number;
}

export const defaultTheme: TeletypeTheme = {
  primaryColor: '#0084ff',
  onPrimaryColor: '#ffffff',
  backgroundColor: '#f4f6f8',
  headerTextColor: '#ffffff',
  headerSubTextColor: 'rgba(255,255,255,0.9)',
  ownBubbleColor: '#0084ff',
  ownTextColor: '#ffffff',
  operatorBubbleColor: '#eceef1',
  operatorTextColor: '#1a1a1a',
  mutedColor: '#8a949e',
  borderColor: '#e3e8ee',
  inputBackground: '#ffffff',
  inputTextColor: '#1a1a1a',
  badgeColor: '#ff3b30',
  badgeTextColor: '#ffffff',
  bubbleRadius: 20,
  buttonSize: 60,
};

export function mergeTheme(
  overrides?: Partial<TeletypeTheme>,
  primaryFromConfig?: string | null,
): TeletypeTheme {
  const base = { ...defaultTheme };
  if (primaryFromConfig) {
    base.primaryColor = primaryFromConfig;
    base.ownBubbleColor = primaryFromConfig;
  }
  return { ...base, ...(overrides || {}) };
}
