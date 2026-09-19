/**
 * LauraTV: Design System Color Tokens (Mobile)
 * Theme: "Private Cinematic Streaming Lounge"
 */

export const colors = {
  bg: {
    base: '#0d0f12',
    surface: '#13171c',
    raised: '#1a1f26',
    elevated: '#222832',
    overlay: 'rgba(13, 15, 18, 0.85)',
    input: '#0c0f13',
    card: '#111419',
    skeleton: '#13171d',
  },
  accent: {
    primary: '#e5b869', // warm champagne/amber
    hover: '#f0c77e',
    light: '#fbd38d',
    muted: 'rgba(229, 184, 105, 0.15)',
    border: 'rgba(229, 184, 105, 0.3)',
    glow: 'rgba(229, 184, 105, 0.12)',
  },
  brand: {
    red: '#ef4444',
  },
  text: {
    primary: '#f3f4f6', // warm near-white
    secondary: '#9ca3af', // muted grey
    faint: '#6b7280',
    amber: '#fde68a',
  },
  status: {
    danger: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  border: {
    subtle: 'rgba(255, 255, 255, 0.08)',
    medium: 'rgba(255, 255, 255, 0.14)',
    accent: 'rgba(229, 184, 105, 0.3)',
  },
} as const;

export type Colors = typeof colors;
