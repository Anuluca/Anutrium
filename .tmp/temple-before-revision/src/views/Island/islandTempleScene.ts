import { gsap } from 'gsap'
import * as THREE from 'three'

import { loadIslandLucarioModel } from '@/utils/islandLucarioModel'
import { subscribePointerSamples } from '@/utils/pointerSamples'

import { templeCategories, type TempleCategoryId } from './templeCategories'

interface TempleCallbacks {
  ready: () => void
  select: (id: TempleCategoryId | null) => void
  settled: () => void
  error: (error: unknown) => void
}

export function createIslandTemple(
  stage: HTMLElement,
  buttons: Map<string, HTMLElement>,
  callbacks: TempleCallbacks
) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.domElement.setAttribute('role', 'img')
  renderer.domElement.setAttribute(
    'aria-label',
    '头部跟随指针的路卡利欧三维模型'
  )
  stage.appendChild(renderer.domElement)
  stage.dataset.maxFps = '60'
  stage.dataset.pointerSampleMs = String(1000 / 30)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
  const lookAt = new THREE.Vector3(0, 4, -2)
  const homePosition = new THREE.Vector3(0, 1.3, 20)
  const homeTarget = lookAt.clone()
  camera.position.copy(homePosition)
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()
  const geometry = <T extends THREE.BufferGeometry>(value: T): T => {
    geometries.add(value)
    return value
  }
  const material = <T extends THREE.Material>(value: T): T => {
    materials.add(value)
    return value
  }
  const texture = <T extends THREE.Texture>(value: T): T => {
    textures.add(value)
    return value
  }
  let disposed = false
  let ready = false
  let frame: number | undefined
  let lastDraw = 0
  let selected: TempleCategoryId | null = null
  let transition: gsap.core.Timeline | undefined
  let transitionActive = false
  let motionStart = 0
  let hiddenAt = 0
  let hovered: TempleCategoryId | null = null
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

  const reflection = new THREE.Group()
  reflection.scale.y = -1
  scene.add(reflection)
  const monuments = new THREE.Group()
  scene.add(monuments)
  scene.add(new THREE.AmbientLight(0xb45d71, 0.65))
  const key = new THREE.DirectionalLight(0xffb7c9, 1.6)
  key.position.set(-5, 10, 8)
  scene.add(key)
  const rim = new THREE.DirectionalLight(0xf21148, 2.8)
  rim.position.set(6, 6, -9)
  scene.add(rim)

  // 所有方尖碑共用几何体；顶部独立使用完整的四面锥体。
  const bodyGeometry = geometry(new THREE.BoxGeometry(1, 4.55, 1))
  const positions = bodyGeometry.attributes.position
  for (let index = 0; index < positions.count; index++) {
    const taper = positions.getY(index) > 0 ? 0.72 : 1
    positions.setX(index, positions.getX(index) * taper)
    positions.setZ(index, positions.getZ(index) * taper)
  }
  bodyGeometry.computeVertexNormals()
  const capGeometry = geometry(new THREE.ConeGeometry(0.51, 1.05, 4))
  capGeometry.rotateY(Math.PI / 4)
  const footGeometry = geometry(new THREE.BoxGeometry(1.45, 0.21, 1.45))
  const stepGeometry = geometry(new THREE.BoxGeometry(1.95, 0.13, 1.95))
  const edgeGeometry = geometry(new THREE.EdgesGeometry(bodyGeometry, 25))
  const capEdges = geometry(new THREE.EdgesGeometry(capGeometry, 25))
  const labelGeometry = geometry(new THREE.PlaneGeometry(0.68, 4.22))
  const plinthMaterial = material(
    new THREE.MeshStandardMaterial({
      color: 0x090205,
      metalness: 0.8,
      roughness: 0.42,
      envMapIntensity: 0.3,
    })
  )

  const glowCanvas = document.createElement('canvas')
  glowCanvas.width = glowCanvas.height = 128
  const glowContext = glowCanvas.getContext('2d')!
  const gradient = glowContext.createRadialGradient(64, 64, 0, 64, 64, 64)
  gradient.addColorStop(0, 'rgba(255,35,81,0.7)')
  gradient.addColorStop(0.22, 'rgba(199,9,49,0.3)')
  gradient.addColorStop(1, 'rgba(120,0,22,0)')
  glowContext.fillStyle = gradient
  glowContext.fillRect(0, 0, 128, 128)
  const glowMap = texture(new THREE.CanvasTexture(glowCanvas))
  glowMap.colorSpace = THREE.SRGBColorSpace
  const glowGeometry = geometry(new THREE.PlaneGeometry(5, 5))

  const labelTexture = (roman: string, title: string) => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 1536
    const context = canvas.getContext('2d')!
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    const paint = () => {
      context.clearRect(0, 0, 256, 1536)
      context.fillStyle = '#f52e5b'
      context.font = '700 72px UnboundedSans, sans-serif'
      context.fillText(roman, 128, 130)
      context.save()
      context.translate(128, 810)
      context.rotate(Math.PI / 2)
      context.fillStyle = '#fff3f5'
      context.font = '800 90px UnboundedSans, sans-serif'
      const spacing = 13
      const widths = [...title].map(
        (letter) => context.measureText(letter).width
      )
      let x =
        -(
          widths.reduce((sum, width) => sum + width, 0) +
          spacing * (title.length - 1)
        ) / 2
      context.textAlign = 'left'
      for (let index = 0; index < title.length; index++) {
        context.fillText(title[index], x, 0)
        x += widths[index] + spacing
      }
      context.restore()
      context.strokeStyle = '#f52856'
      context.lineWidth = 5
      context.beginPath()
      context.moveTo(128, 1360)
      context.lineTo(158, 1394)
      context.lineTo(128, 1428)
      context.lineTo(98, 1394)
      context.closePath()
      context.stroke()
    }
    paint()
    const map = texture(new THREE.CanvasTexture(canvas))
    map.colorSpace = THREE.SRGBColorSpace
    map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
    document.fonts.ready.then(() => {
      if (disposed) return
      paint()
      map.needsUpdate = true
      invalidate()
    })
    return map
  }

  const beamGeometry = geometry(
    new THREE.CylinderGeometry(0.18, 1.7, 16, 32, 1, true)
  )
  const poolGeometry = geometry(new THREE.PlaneGeometry(5, 5))
  const obelisks = templeCategories.map((category) => {
    const group = new THREE.Group()
    group.position.set(category.x, 0, category.z)
    monuments.add(group)
    const surface = material(
      new THREE.MeshPhysicalMaterial({
        color: 0x21070e,
        metalness: 0.85,
        roughness: 0.27,
        clearcoat: 0.5,
        envMapIntensity: 0.4,
        emissive: 0x410612,
        emissiveIntensity: 0.13,
      })
    )
    const body = new THREE.Mesh(bodyGeometry, surface)
    body.position.y = 2.66
    body.userData.category = category.id
    group.add(body)
    const crystal = material(
      new THREE.MeshPhysicalMaterial({
        color: 0x660d25,
        emissive: 0x9d0c2f,
        emissiveIntensity: 0.2,
        metalness: 0.72,
        roughness: 0.13,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
        depthWrite: false,
        flatShading: true,
        clearcoat: 1,
        envMapIntensity: 0.65,
      })
    )
    const cap = new THREE.Mesh(capGeometry, crystal)
    cap.position.y = 5.46
    cap.userData.category = category.id
    group.add(cap)
    const core = new THREE.Mesh(
      capGeometry,
      material(
        new THREE.MeshBasicMaterial({
          color: 0xf02656,
          transparent: true,
          opacity: 0.24,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      )
    )
    core.position.copy(cap.position)
    core.scale.set(0.6, 0.82, 0.6)
    group.add(core)
    const edge = material(
      new THREE.LineBasicMaterial({
        color: 0xee335a,
        transparent: true,
        opacity: 0.58,
        toneMapped: false,
      })
    )
    const lines = new THREE.LineSegments(edgeGeometry, edge)
    lines.position.copy(body.position)
    group.add(lines)
    const capLines = new THREE.LineSegments(capEdges, edge)
    capLines.position.copy(cap.position)
    group.add(capLines)
    for (const [shape, y] of [
      [stepGeometry, 0.065],
      [footGeometry, 0.235],
    ] as const) {
      const foot = new THREE.Mesh(shape, plinthMaterial)
      foot.position.y = y
      group.add(foot)
    }
    const labelMaterial = material(
      new THREE.MeshBasicMaterial({
        map: labelTexture(category.roman, category.title),
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      })
    )
    const label = new THREE.Mesh(labelGeometry, labelMaterial)
    // 正面随碑身收分倾斜，文字与石材保持同一个透视平面。
    label.position.set(0, 2.66, 0.434)
    label.rotation.x = -Math.atan(0.14 / 4.55)
    group.add(label)
    const glowMaterial = material(
      new THREE.MeshBasicMaterial({
        map: glowMap,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    )
    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    glow.rotation.x = -Math.PI / 2
    glow.position.y = 0.018
    glow.renderOrder = 2
    group.add(glow)
    const beamMaterial = material(
      new THREE.ShaderMaterial({
        uniforms: { intensity: { value: 0 } },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        vertexShader:
          'varying vec2 vUv;varying vec3 world;varying vec3 normalWorld;void main(){vUv=uv;world=(modelMatrix*vec4(position,1.)).xyz;normalWorld=mat3(modelMatrix)*normal;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}',
        fragmentShader: `varying vec2 vUv;varying vec3 world;varying vec3 normalWorld;uniform float intensity;
        void main(){
          float edge=pow(abs(dot(normalize(normalWorld),normalize(cameraPosition-world))),1.3);
          float falloff=pow(1.-vUv.y,0.7)*smoothstep(0.,0.05,vUv.y);
          gl_FragColor=vec4(0.78,0.015,0.10,edge*falloff*intensity*0.5);
        }`,
      })
    )
    const beam = new THREE.Mesh(beamGeometry, beamMaterial)
    beam.position.y = 8.1
    group.add(beam)
    const poolMaterial = material(
      new THREE.MeshBasicMaterial({
        map: glowMap,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    )
    const pool = new THREE.Mesh(poolGeometry, poolMaterial)
    pool.position.y = 0.025
    pool.rotation.x = -Math.PI / 2
    pool.renderOrder = 3
    group.add(pool)
    const spot = new THREE.SpotLight(0xff1749, 0, 15, Math.PI / 32, 0.85, 1.5)
    spot.position.set(category.x, 12, category.z + 0.6)
    spot.target.position.set(category.x, 1, category.z)
    scene.add(spot, spot.target)
    return {
      category,
      group,
      body,
      cap,
      surface,
      crystal,
      edge,
      labelMaterial,
      glowMaterial,
      beamMaterial,
      poolMaterial,
      spot,
      strength: 0,
      reflected: new THREE.Group(),
    }
  })

  const floor = new THREE.Mesh(
    geometry(new THREE.PlaneGeometry(180, 180)),
    material(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        vertexShader: `varying vec3 world;void main(){world=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}`,
        fragmentShader: `varying vec3 world;void main(){
        float fade=1.-smoothstep(24.,65.,distance(world,cameraPosition));
        float sheen=0.5+0.5*sin(world.z*4.+sin(world.x*1.5)*0.25);
        gl_FragColor=vec4(vec3(0.008+sheen*0.003,0.001,0.003),fade*0.78);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
      })
    )
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -0.012
  floor.renderOrder = 1
  scene.add(floor)
  const pedestal = new THREE.Group()
  pedestal.position.z = -6
  for (const [width, height, y] of [
    [4.9, 0.14, 0.07],
    [4.35, 0.18, 0.23],
    [3.8, 0.2, 0.42],
  ]) {
    const step = new THREE.Mesh(
      geometry(new THREE.BoxGeometry(width, height, 3.2)),
      plinthMaterial
    )
    step.position.y = y
    pedestal.add(step)
  }
  scene.add(pedestal)
  const statueGlow = new THREE.Mesh(
    geometry(new THREE.PlaneGeometry(10, 8)),
    material(
      new THREE.MeshBasicMaterial({
        map: glowMap,
        transparent: true,
        opacity: 0.62,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    )
  )
  statueGlow.rotation.x = -Math.PI / 2
  statueGlow.position.set(0, 0.02, -5)
  statueGlow.renderOrder = 2
  scene.add(statueGlow)
  const statueLight = new THREE.PointLight(0xff164d, 42, 13, 2)
  statueLight.position.set(0, 2.7, -3)
  scene.add(statueLight)

  // 使用镜像几何体产生真实透视的低亮度倒影，无需每帧额外渲染反射相机。
  const mirror = (
    source: THREE.Object3D,
    target: THREE.Group,
    opacity: number
  ) => {
    const copy = source.clone(true)
    copy.traverse((object) => {
      if (
        !(object instanceof THREE.Mesh || object instanceof THREE.LineSegments)
      )
        return
      const original = object.material as THREE.Material
      if (original instanceof THREE.ShaderMaterial) {
        object.visible = false
        return
      }
      const faded = material(original.clone())
      faded.transparent = true
      faded.opacity = opacity
      faded.depthWrite = false
      object.material = faded
    })
    target.add(copy)
  }
  for (const item of obelisks) {
    mirror(item.group, item.reflected, 0.2)
    reflection.add(item.reflected)
  }
  mirror(pedestal, reflection, 0.14)

  // 激活时才启用九采样景深；默认状态直接绘制，空闲、后台均停止渲染。
  const target = new THREE.WebGLRenderTarget(1, 1, {
    depthTexture: new THREE.DepthTexture(1, 1),
  })
  const focus = { value: 20 }
  const blur = { value: 0 }
  const post = material(
    new THREE.ShaderMaterial({
      uniforms: {
        image: { value: target.texture },
        depth: { value: target.depthTexture },
        texel: { value: new THREE.Vector2() },
        focus,
        blur,
      },
      vertexShader:
        'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader: `varying vec2 vUv;uniform sampler2D image;uniform sampler2D depth;uniform vec2 texel;uniform float focus;uniform float blur;
      void main(){
        float d=texture2D(depth,vUv).x;
        float distance=10./(100.-d*99.9);
        float amount=smoothstep(1.5,9.,abs(distance-focus))*blur;
        vec2 stepSize=texel*amount*1.7;
        vec4 color=texture2D(image,vUv)*0.24;
        color+=texture2D(image,vUv+vec2(stepSize.x,0.))*0.12;
        color+=texture2D(image,vUv-vec2(stepSize.x,0.))*0.12;
        color+=texture2D(image,vUv+vec2(0.,stepSize.y))*0.12;
        color+=texture2D(image,vUv-vec2(0.,stepSize.y))*0.12;
        color+=texture2D(image,vUv+stepSize)*0.07;
        color+=texture2D(image,vUv-stepSize)*0.07;
        color+=texture2D(image,vUv+vec2(stepSize.x,-stepSize.y))*0.07;
        color+=texture2D(image,vUv+vec2(-stepSize.x,stepSize.y))*0.07;
        gl_FragColor=color;
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })
  )
  const postScene = new THREE.Scene()
  postScene.add(new THREE.Mesh(geometry(new THREE.PlaneGeometry(2, 2)), post))
  const postCamera = new THREE.Camera()
  const headRotation = { value: new THREE.Vector4(0, 0, 0, 1) }
  const headPivot = { value: new THREE.Vector3() }
  const headCurrent = new THREE.Vector2()
  const headTarget = new THREE.Vector2()
  const headQuaternion = new THREE.Quaternion()
  const headAngles = new THREE.Euler(0, 0, 0, 'YXZ')
  const statue = new THREE.Group()
  statue.position.set(0, 3.87, -6)
  scene.add(statue)
  const chromeMaterial = material(
    new THREE.MeshPhysicalMaterial({
      color: 0xe84d6b,
      side: THREE.DoubleSide,
      metalness: 1,
      roughness: 0.09,
      clearcoat: 0.45,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.8,
    })
  )
  chromeMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.headRotation = headRotation
    shader.uniforms.headPivot = headPivot
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
      attribute float headInfluence; uniform vec4 headRotation; uniform vec3 headPivot;
      vec3 rotateHead(vec3 v,vec4 q){return v+2.*cross(q.xyz,cross(q.xyz,v)+q.w*v);}
      vec4 getHeadRotation(){
        if(headInfluence>=0.999)return headRotation;
        if(headInfluence<=0.)return vec4(0.,0.,0.,1.);
        float angle=acos(clamp(headRotation.w,-1.,1.));
        return vec4(headRotation.xyz*sin(angle*headInfluence)/max(sin(angle),0.00001),cos(angle*headInfluence));
      }`
      )
      .replace(
        '#include <beginnormal_vertex>',
        '#include <beginnormal_vertex>\nobjectNormal=rotateHead(objectNormal,getHeadRotation());'
      )
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\ntransformed=rotateHead(transformed-headPivot,getHeadRotation())+headPivot;'
      )
  }

  const screenPoint = new THREE.Vector3()
  const hitPoints = [
    [-0.5, 0.1, 0.5],
    [-0.5, 0.1, -0.5],
    [0.5, 0.1, 0.5],
    [0.5, 0.1, -0.5],
    [-0.36, 4.94, 0.36],
    [-0.36, 4.94, -0.36],
    [0.36, 4.94, 0.36],
    [0.36, 4.94, -0.36],
    [0, 5.99, 0],
  ]
  // DOM 仅提供与投影轮廓吻合的无障碍点击区域，不参与建筑的绘制或缩放。
  const projectButtons = () => {
    const width = stage.clientWidth
    const height = stage.clientHeight
    for (const item of obelisks) {
      const button = buttons.get(item.category.id)
      if (!button) continue
      const points = hitPoints.map(([x, y, z]) => {
        screenPoint
          .set(x + item.group.position.x, y, z + item.group.position.z)
          .project(camera)
        return {
          x: (screenPoint.x * 0.5 + 0.5) * width,
          y: (-screenPoint.y * 0.5 + 0.5) * height,
        }
      })
      const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y)
      const cross = (
        o: (typeof points)[0],
        a: (typeof points)[0],
        b: (typeof points)[0]
      ) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
      const hull: typeof points = []
      for (const point of sorted) {
        while (
          hull.length >= 2 &&
          cross(hull[hull.length - 2], hull[hull.length - 1], point) <= 0
        )
          hull.pop()
        hull.push(point)
      }
      const lower = hull.length
      for (const point of sorted.reverse().slice(1)) {
        while (
          hull.length > lower &&
          cross(hull[hull.length - 2], hull[hull.length - 1], point) <= 0
        )
          hull.pop()
        hull.push(point)
      }
      const minX = Math.min(...points.map((point) => point.x))
      const minY = Math.min(...points.map((point) => point.y))
      const w = Math.max(...points.map((point) => point.x)) - minX
      const h = Math.max(...points.map((point) => point.y)) - minY
      Object.assign(button.style, {
        left: `${minX}px`,
        top: `${minY}px`,
        width: `${w}px`,
        height: `${h}px`,
        clipPath: `polygon(${hull
          .map(
            (point) =>
              `${((point.x - minX) / w) * 100}% ${
                ((point.y - minY) / h) * 100
              }%`
          )
          .join(',')})`,
        visibility: 'visible',
        zIndex: String(
          Math.round(100 - camera.position.distanceTo(item.group.position))
        ),
      })
    }
  }

  const canRender = () => !disposed && !document.hidden && stage.isConnected
  const render = (now: number) => {
    frame = undefined
    if (!canRender()) return
    if (now - lastDraw < 1000 / 60 - 0.1) {
      invalidate()
      return
    }
    const elapsed = Math.min((now - lastDraw) / 1000, 0.1)
    lastDraw = now
    if (transitionActive && transition) {
      transition.totalTime(
        Math.min((now - motionStart) / 1000, transition.duration())
      )
    }
    headCurrent.lerp(headTarget, 1 - Math.exp(-elapsed * 18))
    const moving = headCurrent.distanceToSquared(headTarget) > 0.000001
    if (!moving) headCurrent.copy(headTarget)
    headAngles.set(
      THREE.MathUtils.degToRad(7 + headCurrent.y * 14),
      THREE.MathUtils.degToRad(headCurrent.x * 28),
      0
    )
    headQuaternion.setFromEuler(headAngles)
    headRotation.value.set(
      headQuaternion.x,
      headQuaternion.y,
      headQuaternion.z,
      headQuaternion.w
    )
    camera.lookAt(lookAt)
    camera.updateMatrixWorld()
    for (const item of obelisks) {
      const dim = 1 - 0.84 * blur.value * (1 - item.strength)
      item.surface.envMapIntensity = 0.4 * dim
      item.crystal.envMapIntensity = 0.65 * dim
      item.surface.emissiveIntensity = 0.1 + item.strength * 0.38
      item.surface.color.setHex(0x21070e).multiplyScalar(dim)
      item.reflected.position.set(
        item.group.position.x - item.category.x,
        0,
        item.group.position.z - item.category.z
      )
      item.crystal.emissiveIntensity = (0.38 + item.strength * 0.7) * dim
      item.edge.opacity =
        (0.48 +
          item.strength * 0.5 +
          (hovered === item.category.id ? 0.16 : 0)) *
        dim
      item.labelMaterial.color.setScalar(dim)
      item.glowMaterial.opacity = 0.3 * dim
      item.beamMaterial.uniforms.intensity.value = item.strength
      item.poolMaterial.opacity = item.strength * 0.8
      item.spot.intensity = item.strength * 55
    }
    const active = obelisks.find((item) => item.category.id === selected)
    if (active) {
      screenPoint
        .set(active.category.x, 2.7, active.category.z)
        .applyMatrix4(camera.matrixWorldInverse)
      focus.value = -screenPoint.z
    }
    renderer.setRenderTarget(blur.value > 0.001 ? target : null)
    renderer.render(scene, camera)
    if (blur.value > 0.001) {
      renderer.setRenderTarget(null)
      renderer.render(postScene, postCamera)
    }
    projectButtons()
    stage.dataset.cameraPosition = camera.position
      .toArray()
      .map((value) => value.toFixed(4))
      .join(',')
    stage.dataset.cameraTarget = lookAt
      .toArray()
      .map((value) => value.toFixed(4))
      .join(',')
    if (moving || transitionActive) invalidate()
  }
  function invalidate() {
    if (frame === undefined && canRender())
      frame = requestAnimationFrame(render)
  }
  const resize = () => {
    if (!stage.clientWidth || !stage.clientHeight) return
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5))
    renderer.setSize(stage.clientWidth, stage.clientHeight, false)
    camera.aspect = stage.clientWidth / stage.clientHeight
    homePosition.z = Math.max(17.5, 31 / camera.aspect)
    if (!selected && !transitionActive) camera.position.copy(homePosition)
    camera.updateProjectionMatrix()
    const size = renderer.getDrawingBufferSize(new THREE.Vector2())
    target.setSize(size.x, size.y)
    post.uniforms.texel.value.set(1 / size.x, 1 / size.y)
    invalidate()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(stage)
  resize()

  const select = (id: TempleCategoryId) => {
    if (!ready || disposed) return
    selected = selected === id ? null : id
    callbacks.select(selected)
    transition?.kill()
    const item = obelisks.find((obelisk) => obelisk.category.id === selected)
    const duration = reducedMotion ? 0.01 : 1.65
    transitionActive = true
    motionStart = performance.now()
    transition = gsap.timeline({
      paused: true,
      onUpdate: invalidate,
      onComplete: () => {
        transitionActive = false
        callbacks.settled()
        invalidate()
      },
    })
    let destination = homePosition.clone()
    let aim = homeTarget.clone()
    if (item) {
      const side = Math.sign(item.category.x)
      // 朝选中碑外侧移轨并向内偏航，碑保留在前景一侧，中央雕塑退入远景。
      destination = new THREE.Vector3(
        item.category.x + side * 1.3,
        0.9,
        item.category.z + 4.8
      )
      aim = new THREE.Vector3(
        item.category.x - side * 7.5,
        6.4,
        item.category.z - 8
      )
    }
    transition.to(
      camera,
      {
        fov: item ? 78 : 38,
        duration,
        ease: 'power3.inOut',
        onUpdate: () => camera.updateProjectionMatrix(),
      },
      0
    )
    transition
      .to(
        camera.position,
        {
          x: destination.x,
          y: destination.y,
          z: destination.z,
          duration,
          ease: 'power3.inOut',
        },
        0
      )
      .to(
        lookAt,
        { x: aim.x, y: aim.y, z: aim.z, duration, ease: 'power3.inOut' },
        0
      )
      .to(
        blur,
        { value: item ? 1 : 0, duration: duration * 0.8, ease: 'power2.inOut' },
        0
      )
    for (const obelisk of obelisks) {
      transition.to(
        obelisk,
        {
          strength: obelisk === item ? 1 : 0,
          duration: duration * 0.65,
          ease: 'power2.out',
        },
        0
      )
      // 非焦点建筑沿大道退后，保持真实透视，并为侧边菜单留出空间。
      const outer = Math.abs(obelisk.category.x) > 5
      const opposite =
        item && Math.sign(obelisk.category.x) !== Math.sign(item.category.x)
      transition.to(
        obelisk.group.position,
        {
          x:
            item && outer && opposite
              ? Math.sign(obelisk.category.x) * 7.8
              : obelisk.category.x,
          z:
            item && obelisk !== item
              ? outer && !opposite
                ? -9
                : -5.6
              : obelisk.category.z,
          duration,
          ease: 'power3.inOut',
        },
        0
      )
    }
    invalidate()
  }
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const raycast = (event: MouseEvent | PointerEvent) => {
    const bounds = renderer.domElement.getBoundingClientRect()
    pointer.set(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      (-(event.clientY - bounds.top) / bounds.height) * 2 + 1
    )
    raycaster.setFromCamera(pointer, camera)
    return raycaster.intersectObjects(
      obelisks.flatMap((item) => [item.body, item.cap])
    )[0]?.object.userData.category as TempleCategoryId | undefined
  }
  const click = (event: MouseEvent) => {
    const id = raycast(event)
    if (id) select(id)
  }
  renderer.domElement.addEventListener('click', click)
  const follow = (event: PointerEvent) => {
    if (!canRender()) return
    headTarget
      .set(
        (event.clientX / innerWidth - 0.5) * 2,
        (event.clientY / innerHeight - 0.5) * 2
      )
      .clampScalar(-1, 1)
    hovered = raycast(event) || null
    invalidate()
  }
  let unsubscribe: (() => void) | undefined
  const syncActivity = () => {
    if (document.hidden) {
      unsubscribe?.()
      unsubscribe = undefined
      if (frame !== undefined) cancelAnimationFrame(frame)
      frame = undefined
      hiddenAt = performance.now()
    } else {
      if (ready && !unsubscribe)
        unsubscribe = subscribePointerSamples(follow, 1000 / 30)
      if (hiddenAt && transitionActive)
        motionStart += performance.now() - hiddenAt
      hiddenAt = 0
      invalidate()
    }
  }
  document.addEventListener('visibilitychange', syncActivity)
  const resetPointer = () => {
    headTarget.set(0, 0)
    hovered = null
    invalidate()
  }
  document.documentElement.addEventListener('pointerleave', resetPointer)

  loadIslandLucarioModel()
    .then(({ metadata, buffer, environment, radiance }) => {
      if (disposed) return
      const environmentTexture = texture(
        new THREE.DataTexture(
          new Uint16Array(radiance),
          environment.width,
          environment.height,
          THREE.RGBAFormat,
          THREE.HalfFloatType
        )
      )
      environmentTexture.mapping = THREE.CubeUVReflectionMapping
      environmentTexture.minFilter = THREE.LinearFilter
      environmentTexture.magFilter = THREE.LinearFilter
      environmentTexture.needsUpdate = true
      scene.environment = environmentTexture
      const surface = geometry(new THREE.BufferGeometry())
      for (const [name, source, itemSize] of [
        ['position', 'positions', 3],
        ['normal', 'normals', 3],
        ['headInfluence', 'weights', 1],
      ] as const) {
        const attribute = metadata.attributes[source]
        surface.setAttribute(
          name,
          new THREE.BufferAttribute(
            new Float32Array(buffer, attribute.offset, attribute.count),
            itemSize
          )
        )
      }
      const indices = metadata.attributes.indices
      surface.setIndex(
        new THREE.BufferAttribute(
          new Uint16Array(buffer, indices.offset, indices.count),
          1
        )
      )
      headPivot.value.fromArray(metadata.headPivot)
      const mesh = new THREE.Mesh(surface, chromeMaterial)
      mesh.position.fromArray(metadata.center).multiplyScalar(-1)
      statue.scale.setScalar(6.7 / metadata.size[1])
      statue.add(mesh)
      mirror(statue, reflection, 0.18)
      for (const [name, value] of Object.entries(metadata.stats))
        stage.dataset[name] = String(value)
      stage.dataset.materialPhase = 'chrome'
      ready = true
      stage.dataset.entranceFinished = 'true'
      callbacks.ready()
      syncActivity()
    })
    .catch((error) => {
      if (!disposed) callbacks.error(error)
    })

  return {
    select,
    dispose: () => {
      disposed = true
      transition?.kill()
      unsubscribe?.()
      observer.disconnect()
      document.removeEventListener('visibilitychange', syncActivity)
      document.documentElement.removeEventListener('pointerleave', resetPointer)
      renderer.domElement.removeEventListener('click', click)
      if (frame !== undefined) cancelAnimationFrame(frame)
      geometries.forEach((value) => value.dispose())
      materials.forEach((value) => value.dispose())
      textures.forEach((value) => value.dispose())
      target.depthTexture?.dispose()
      target.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    },
  }
}
