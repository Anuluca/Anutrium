import i18n from './index'

export const translate = (
  i18n as unknown as { global: { t: (key: string) => string } }
).global.t
