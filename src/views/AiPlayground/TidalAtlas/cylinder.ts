import {
  DoubleSide,
  Fog,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  RepeatWrapping,
  Scene,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  WebGLRenderer,
} from 'three'

import { layerZoom, terrain, world } from './atlas'

export type Point = { x: number; y: number }
export type Camera = Point & { zoom: number }
type Size = { width: number; height: number }

const radius = 460
const axialScale = 2.5
const sky = 0x082133
const northCap = (26 / 180) * world.height
const southernApron = 330

function angle(x: number, y: number) {
  const arctic = 1 - Math.min(y / northCap, 1)
  return (x / world.width - 0.5) * Math.PI * 2 + 2.6 * arctic ** 2
}

function positionAt(x: number, y: number, inset = 0) {
  const theta = angle(x, y)
  const t = Math.min(y / northCap, 1)
  // This profile meets the cylinder tangentially and closes at a single point.
  const distance = Math.max(0, radius * Math.sqrt(t * (2 - t)) - inset)
  return new Vector3(
    Math.sin(theta) * distance,
    -Math.cos(theta) * distance,
    y * axialScale
  )
}

function shadePolarIce(material: MeshBasicMaterial) {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `#include <map_fragment>
        float pole = clamp((vMapUv.y - 0.91) / 0.09, 0.0, 1.0);
        float longitude = vMapUv.x * 6.28318530718;
        float r = sqrt(1.0 - pole);
        float spiral = longitude + 0.92 * log(0.16 + r);
        float bands = 0.5 + 0.5 * sin(5.0 * spiral + 0.6 * sin(3.0 * longitude + 9.0 * r));
        float strands = 0.5 + 0.5 * sin(23.0 * spiral + 1.7 * sin(7.0 * longitude + 12.0 * r));
        float grain = 0.5 + 0.5 * sin(41.0 * longitude + 62.0 * r);
        float strength = smoothstep(0.0, 0.34, pole) * (1.0 - smoothstep(0.94, 1.0, pole));
        float veins = bands * (0.68 + 0.32 * strands) + 0.1 * grain;
        vec3 ice = mix(vec3(0.022, 0.09, 0.16), vec3(0.24, 0.52, 0.65), veins);
        diffuseColor.rgb = mix(diffuseColor.rgb, ice, 0.72 * strength);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.038, 0.12, 0.18), smoothstep(0.95, 1.0, pole));
        float beyondSouth = max(0.0, -vMapUv.y);
        if (beyondSouth > 0.0) {
          vec3 southernIce = texture2D(map, vec2(vMapUv.x, beyondSouth * 0.18)).rgb;
          diffuseColor.rgb = mix(diffuseColor.rgb, southernIce, smoothstep(0.0, 0.045, beyondSouth));
        }
      `
    )
  }
}

export function createCylinder(
  canvas: HTMLCanvasElement,
  requestDraw: () => void
) {
  const renderer = new WebGLRenderer({ canvas, antialias: true })
  renderer.setClearColor(sky)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))

  const scene = new Scene()
  scene.fog = new Fog(sky, 1750, 4000)
  const view = new PerspectiveCamera(61, 1, 12, 4100)
  const geometry = new PlaneGeometry(1, 1, 176, 192)
  const vertices = geometry.getAttribute('position')
  const uv = geometry.getAttribute('uv')
  for (let index = 0; index < vertices.count; index++) {
    // Leave terrain behind the southernmost camera framing.
    const y = (1 - uv.getY(index)) * (world.height + southernApron)
    const point = positionAt(uv.getX(index) * world.width, y)
    vertices.setXYZ(index, point.x, point.y, point.z)
    uv.setY(index, 1 - y / world.height)
  }
  geometry.computeBoundingSphere()

  let disposed = false
  const texture = new TextureLoader().load(terrain, () => {
    if (disposed) return
    requestDraw()
  })
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8)
  const material = new MeshBasicMaterial({ map: texture, side: DoubleSide })
  shadePolarIce(material)
  scene.add(new Mesh(geometry, material))
  let width = 0
  let height = 0

  function update(camera: Camera, size: Size) {
    if (size.width !== width || size.height !== height) {
      width = size.width
      height = size.height
      renderer.setSize(width, height, false)
      view.aspect = width / height
    }
    const theta = angle(camera.x, camera.y)
    const target = positionAt(camera.x, camera.y)
    const cameraRadius = radius * 0.17
    const eyeDepth = 540
    view.position.set(
      Math.sin(theta) * cameraRadius,
      -Math.cos(theta) * cameraRadius,
      target.z + eyeDepth
    )
    view.up.set(-Math.sin(theta), Math.cos(theta), 0)
    view.lookAt(target.lerp(new Vector3(0, 0, target.z - 420), 0.35))
    view.zoom = camera.zoom / layerZoom
    view.updateProjectionMatrix()
    view.updateMatrixWorld()
  }

  function project(point: Point) {
    const vertex = positionAt(point.x, point.y, 1)
    if (vertex.clone().applyMatrix4(view.matrixWorldInverse).z >= -view.near)
      return null
    vertex.project(view)
    return { x: ((vertex.x + 1) * width) / 2, y: ((1 - vertex.y) * height) / 2 }
  }

  function dispose() {
    disposed = true
    geometry.dispose()
    texture.dispose()
    material.dispose()
    renderer.dispose()
  }

  return { update, project, draw: () => renderer.render(scene, view), dispose }
}
