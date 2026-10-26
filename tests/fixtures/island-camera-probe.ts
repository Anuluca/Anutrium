import * as THREE from 'three'

export function installCameraProbe() {
  let pending = 0
  let restored = false
  const updates: number[] = []
  const projection = THREE.PerspectiveCamera.prototype.updateProjectionMatrix
  const schedule = window.requestAnimationFrame
  THREE.PerspectiveCamera.prototype.updateProjectionMatrix = function () {
    if (this.far === 100) pending++
    return projection.call(this)
  }
  window.requestAnimationFrame = function (callback) {
    if (
      callback.name !== 'render' ||
      !callback.toString().includes('statueScan')
    )
      return schedule.call(window, callback)
    return schedule.call(window, (now) => {
      pending = 0
      callback(now)
      if (!restored) updates.push(pending)
    })
  }
  return {
    reset() {
      updates.length = 0
      pending = 0
    },
    summary() {
      return {
        frames: updates.length,
        total: updates.reduce((a, b) => a + b, 0),
        max: Math.max(0, ...updates),
        updatedFrames: updates.filter((count) => count > 0).length,
      }
    },
    restore() {
      restored = true
      THREE.PerspectiveCamera.prototype.updateProjectionMatrix = projection
      window.requestAnimationFrame = schedule
    },
  }
}
