export interface NexiAuthConfig {
  prototypeOtp: boolean
  devOtp: string
  otpDeliveryEmail?: string
}

function normalizedEnv(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value || undefined
}

function requiredEnv(name: string): string {
  const value = normalizedEnv(name)
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

function optionalEnv(names: string[]): string | undefined {
  for (const name of names) {
    const value = normalizedEnv(name)
    if (value) return value
  }

  return undefined
}

function requiredBooleanEnv(name: string): boolean {
  const value = requiredEnv(name).toLowerCase()

  if (value === 'true') return true
  if (value === 'false') return false

  throw new Error(`${name} must be true or false`)
}

function optionalBooleanEnv(name: string): boolean {
  return normalizedEnv(name)?.toLowerCase() === 'true'
}

export function getNexiAuthConfig(): NexiAuthConfig {
  const realOtpEnabled = requiredBooleanEnv('NEXI_OTP')
  const prototypeOtp = !realOtpEnabled
  const devOtp = optionalEnv(['NEXI_DEV_OTP', 'NEXI_OTP_DEFAULT'])

  if (prototypeOtp && !devOtp) {
    throw new Error('NEXI_DEV_OTP or NEXI_OTP_DEFAULT is not configured')
  }

  return {
    prototypeOtp,
    devOtp: devOtp ?? '',
    otpDeliveryEmail: normalizedEnv('NEXI_OTP_EMAIL'),
  }
}

export function assertNexiRuntimeConfig(): void {
  const config = getNexiAuthConfig()
  const allowPrototypeOtp = optionalBooleanEnv('NEXI_ALLOW_PROTOTYPE_OTP')

  if (process.env.NODE_ENV === 'production' && config.prototypeOtp && !allowPrototypeOtp) {
    throw new Error('Prototype OTP mode must not be enabled in production without NEXI_ALLOW_PROTOTYPE_OTP=true')
  }
}
