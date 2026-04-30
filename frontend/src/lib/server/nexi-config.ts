export interface NexiAuthConfig {
  prototypeOtp: boolean
  devOtp: string
  otpDeliveryEmail?: string
}

function normalizedEnv(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value || undefined
}

export function getNexiAuthConfig(): NexiAuthConfig {
  const otpFlag = normalizedEnv('NEXI_OTP')

  return {
    prototypeOtp: otpFlag !== 'true',
    devOtp: normalizedEnv('NEXI_DEV_OTP') ?? '45454545',
    otpDeliveryEmail: normalizedEnv('NEXI_OTP_EMAIL'),
  }
}

export function assertNexiRuntimeConfig(): void {
  const config = getNexiAuthConfig()

  if (process.env.NODE_ENV === 'production' && config.prototypeOtp) {
    throw new Error('Prototype OTP mode must not be enabled in production')
  }
}

