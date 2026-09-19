export const parseOptionalBoolean = (
  value: string | undefined,
) => {
  if (
    value === undefined ||
    value.trim() === ''
  ) {
    return undefined
  }

  const normalized =
    value.trim()

  if (
    /^(1|true|yes|on)$/i.test(
      normalized,
    )
  ) {
    return true
  }

  if (
    /^(0|false|no|off)$/i.test(
      normalized,
    )
  ) {
    return false
  }

  return undefined
}

export const resolveDevToolsProtection = (
  override: string | undefined,
  development: boolean,
) =>
  parseOptionalBoolean(
    override,
  ) ?? !development