import bottomLine from './dynamic/bottomLine'
import about from './modules/about'
import archive from './modules/archive'
import common from './modules/common'
import contactLinks from './modules/contactLinks'
import craft from './modules/craft'
import flanerie from './modules/flanerie'
import home from './modules/home'
import island from './modules/island'

const source = {
  ...common,
  bottomLine,
  contactLinks,
  home,
  archive,
  island,
  flanerie,
  craft,
  about,
} as const

export default source
