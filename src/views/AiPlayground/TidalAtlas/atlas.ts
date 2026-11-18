export const terrain = '/images/tidal-atlas/terrain.webp'
export const world = { width: 2048, height: 1024 }
export const layerZoom = 1.37

type Copy = readonly [zh: string, en: string]
type Location = {
  id: string
  region: Copy
  name: Copy
  latitude: number
  longitude: number | null
}

const locations: Location[] = [
  {
    id: 'moscow',
    region: ['俄罗斯', 'Russia'],
    name: ['莫斯科', 'Moscow'],
    latitude: 55.7558,
    longitude: 37.6173,
  },
  {
    id: 'beijing',
    region: ['中国', 'China'],
    name: ['北京', 'Beijing'],
    latitude: 39.9042,
    longitude: 116.4074,
  },
  {
    id: 'singapore',
    region: ['新加坡', 'Singapore'],
    name: ['新加坡', 'Singapore'],
    latitude: 1.2903,
    longitude: 103.8519,
  },
  {
    id: 'jakarta',
    region: ['印度尼西亚', 'Indonesia'],
    name: ['雅加达', 'Jakarta'],
    latitude: -6.2088,
    longitude: 106.8456,
  },
  {
    id: 'canberra',
    region: ['澳大利亚', 'Australia'],
    name: ['堪培拉', 'Canberra'],
    latitude: -35.2809,
    longitude: 149.13,
  },
  {
    id: 'wellington',
    region: ['新西兰', 'New Zealand'],
    name: ['惠灵顿', 'Wellington'],
    latitude: -41.2866,
    longitude: 174.7756,
  },
  {
    id: 'south-pole',
    region: ['南极洲', 'Antarctica'],
    name: ['阿蒙森–斯科特南极站', 'Amundsen–Scott South Pole Station'],
    latitude: -90,
    longitude: null,
  },
]

export const sites = locations.map((site) => ({
  ...site,
  // Longitude at the South Pole is undefined. Use the middle of the flat map.
  x: ((180 + (site.longitude ?? 0)) / 360) * world.width,
  y: ((90 - site.latitude) / 180) * world.height,
}))

export type Site = (typeof sites)[number]

export function cylinderX(site: Site) {
  // Place the polar pin on the same meridian as the previous waypoint.
  return site.longitude === null ? sites[sites.length - 2].x : site.x
}

export const routes = sites.slice(1).map((end, index) => ({
  start: sites[index],
  end,
}))
