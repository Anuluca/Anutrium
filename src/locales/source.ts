import bottomLine from './dynamic/bottomLine'
import common from './modules/common'
import contactLinks from './modules/contactLinks'

const source = {
  ...common,
  bottomLine,
  contactLinks,
} as const

export default source
