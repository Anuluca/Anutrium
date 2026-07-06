import events, { group as activityGroup } from './events'
import residentCities, { group as residentGroup } from './resident-cities'
import travelDestinations, {
  group as visitedGroup,
} from './travel-destinations'

const flanerieDynamic = {
  groups: [visitedGroup, residentGroup, activityGroup],
  vlogs: [...travelDestinations, ...residentCities, ...events],
} as const

export default flanerieDynamic
