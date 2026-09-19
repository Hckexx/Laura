import { resolveDevToolsProtection } from './security-values'

export const devToolsProtectionEnabled = resolveDevToolsProtection(
  import.meta.env.VITE_DEVTOOLS_PROTECTION,
  import.meta.env.DEV,
)
