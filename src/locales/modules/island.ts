import dynamic from '../dynamic/island'

const island = {
  ariaLabel: {
    zhCn: '个人海湾',
    en: 'Personal Harbor',
  },
  headerMeta: {
    zhCn: '把无法归类的心情停泊在这里。',
    en: 'A quiet harbor for feelings that cannot be named.',
  },
  latestTitle: {
    zhCn: '最新更新',
    en: 'LATEST',
  },
  playerAria: {
    zhCn: '音乐播放器',
    en: 'Music player',
  },
  nowPlaying: 'NOW PLAYING',
  prevTrack: {
    zhCn: '上一首',
    en: 'Previous track',
  },
  nextTrack: {
    zhCn: '下一首',
    en: 'Next track',
  },
  pauseTrack: {
    zhCn: '暂停',
    en: 'Pause',
  },
  playTrack: {
    zhCn: '播放',
    en: 'Play',
  },
  dynamic,
} as const

export default island
