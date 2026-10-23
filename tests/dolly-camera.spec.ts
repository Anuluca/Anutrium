import { expect, test } from '@playwright/test'
import * as THREE from 'three'

import { createDollyCameraMotion } from '../src/views/Home/scene/dollyCamera'

const homeFov = 38
const islandFov = THREE.MathUtils.radToDeg(
  2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(homeFov / 2)) / 3)
)
const home = {
  position: new THREE.Vector3(0, 1, 20),
  target: new THREE.Vector3(0, 4.25, -2),
}
const island = {
  position: new THREE.Vector3(0, 3, 42),
  target: new THREE.Vector3(0, 6, -1.8),
}
const projectedDistance = (
  camera: THREE.PerspectiveCamera,
  target: THREE.Vector3
) =>
  camera.position.distanceTo(target) *
  Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))

test('dolly camera reverses the same path without projection scale overshoot', () => {
  const camera = new THREE.PerspectiveCamera(homeFov, 16 / 9)
  camera.position.copy(home.position)
  const lookAt = home.target.clone()
  const startDistance = projectedDistance(camera, lookAt)
  const forward = createDollyCameraMotion(camera, lookAt, island, islandFov)
  const samples: Array<{
    position: THREE.Vector3
    target: THREE.Vector3
    fov: number
  }> = []
  for (let index = 0; index <= 100; index++) {
    forward(index / 100)
    samples.push({
      position: camera.position.clone(),
      target: lookAt.clone(),
      fov: camera.fov,
    })
  }
  expect(camera.position.distanceTo(island.position)).toBeLessThan(1e-10)
  expect(lookAt.distanceTo(island.target)).toBeLessThan(1e-10)
  const endDistance = projectedDistance(camera, lookAt)
  const backward = createDollyCameraMotion(camera, lookAt, home, homeFov)
  for (let index = 0; index <= 100; index++) {
    backward(index / 100)
    const sample = samples[100 - index]
    expect(camera.position.distanceTo(sample.position)).toBeLessThan(1e-10)
    expect(lookAt.distanceTo(sample.target)).toBeLessThan(1e-10)
    expect(camera.fov).toBeCloseTo(sample.fov, 10)
    expect(projectedDistance(camera, lookAt)).toBeCloseTo(
      THREE.MathUtils.lerp(endDistance, startDistance, index / 100),
      10
    )
  }
})

test('interrupting a dolly starts from its current camera and leaves its pose inputs unchanged', () => {
  const camera = new THREE.PerspectiveCamera(homeFov, 9 / 16)
  camera.position.copy(home.position)
  const lookAt = home.target.clone()
  createDollyCameraMotion(camera, lookAt, island, islandFov)(0.43)
  const interrupted = {
    position: camera.position.clone(),
    target: lookAt.clone(),
    fov: camera.fov,
  }
  const backward = createDollyCameraMotion(camera, lookAt, home, homeFov)
  backward(0)
  expect(camera.position.distanceTo(interrupted.position)).toBeLessThan(1e-10)
  expect(lookAt.distanceTo(interrupted.target)).toBeLessThan(1e-10)
  expect(camera.fov).toBe(interrupted.fov)
  backward(1)
  expect(camera.position.distanceTo(home.position)).toBeLessThan(1e-10)
  expect(camera.fov).toBe(homeFov)
  expect(home.position.toArray()).toEqual([0, 1, 20])
  expect(island.position.toArray()).toEqual([0, 3, 42])
})
