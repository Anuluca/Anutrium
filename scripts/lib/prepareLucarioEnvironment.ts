import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

export function prepareLucarioEnvironment() {
  const renderer = new THREE.WebGLRenderer()
  const studio = new RoomEnvironment()
  studio.traverse((object) => {
    if (
      object instanceof THREE.Mesh &&
      object.material instanceof THREE.MeshStandardMaterial
    )
      object.material.color.set(0x787078)
    if (
      object instanceof THREE.Mesh &&
      object.material instanceof THREE.MeshLambertMaterial
    )
      object.material.emissiveIntensity *= 0.35
  })
  const generator = new THREE.PMREMGenerator(renderer)
  const environment = generator.fromScene(studio, 0.02, 0.1, 100, { size: 256 })
  const pixels = new Uint16Array(environment.width * environment.height * 4)
  renderer.readRenderTargetPixels(
    environment,
    0,
    0,
    environment.width,
    environment.height,
    pixels
  )
  const result = {
    width: environment.width,
    height: environment.height,
    pixels: Array.from(pixels),
  }
  studio.dispose()
  generator.dispose()
  environment.dispose()
  renderer.dispose()
  return result
}
