import game from './Game/Game'
import studyNotes from './Notes/studyNotes'
import merch from './Photography/merch'

const islandDynamic = {
  merch,
  notes: {
    studyNotes,
  },
  game,
} as const

export default islandDynamic
