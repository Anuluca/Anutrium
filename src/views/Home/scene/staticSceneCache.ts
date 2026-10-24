import * as THREE from 'three'

/**
 * 缓存环境颜色和深度。颜色从默认帧缓冲复制，保留 ACES、sRGB 和预乘透明度，
 * 避免把已混合的颜色再次色调映射。地面、角色和动态倒影仍按原排序实时绘制。
 * 仅稳定态启用；运镜和渐变直接走原场景，避免每帧重建缓存。
 */
export function createStaticSceneCache(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  requestFrame: () => void
) {
  const target = new THREE.WebGLRenderTarget(1, 1, {
    depthTexture: new THREE.DepthTexture(1, 1),
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
  })
  // 深度通道只提交真正写深度的建筑表面，不再编译一套完整光照/碑文材质。
  const depthMaterials = new Map<THREE.Material, THREE.MeshDepthMaterial>()
  const renderDepth = () => {
    const changed: {
      object: THREE.Mesh
      value: THREE.Material
      visible: boolean
    }[] = []
    scene.traverse((object) => {
      if (
        !(
          object instanceof THREE.Mesh ||
          object instanceof THREE.Line ||
          object instanceof THREE.Sprite
        ) ||
        !object.visible
      )
        return
      const value = object.material as THREE.Material
      if (!value.visible) return
      changed.push({
        object: object as THREE.Mesh,
        value,
        visible: object.visible,
      })
      if (
        !value.depthWrite ||
        (value.alphaTest > 0 && value.opacity < value.alphaTest)
      ) {
        object.visible = false
        return
      }
      let depth = depthMaterials.get(value)
      if (!depth) {
        depth = new THREE.MeshDepthMaterial({
          side: value.side,
          clippingPlanes: value.clippingPlanes,
          clipIntersection: value.clipIntersection,
          colorWrite: false,
        })
        if (object instanceof THREE.InstancedMesh) {
          depth.onBeforeCompile = value.onBeforeCompile
          depth.customProgramCacheKey = () =>
            value.customProgramCacheKey() + ':static-depth'
        }
        depthMaterials.set(value, depth)
      }
      object.material = depth
    })
    try {
      renderer.render(scene, camera)
    } finally {
      for (const { object, value, visible } of changed) {
        object.material = value
        object.visible = visible
      }
    }
  }
  let color = new THREE.FramebufferTexture(1, 1)
  const uniforms = {
    cachedColor: { value: color },
    cachedDepth: { value: target.depthTexture },
  }
  const copyMaterial = new THREE.ShaderMaterial({
    uniforms,
    depthTest: true,
    depthWrite: true,
    depthFunc: THREE.AlwaysDepth,
    blending: THREE.NoBlending,
    toneMapped: false,
    vertexShader: `varying vec2 vUv;void main(){
      vUv=position.xy*0.5+0.5;gl_Position=vec4(position.xy,0.,1.);
    }`,
    fragmentShader: `varying vec2 vUv;
      uniform sampler2D cachedColor;uniform sampler2D cachedDepth;
      void main(){gl_FragColor=texture2D(cachedColor,vUv);
        gl_FragDepth=texture2D(cachedDepth,vUv).x;
      }`,
  })
  const triangle = new THREE.BufferGeometry()
  triangle.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3)
  )
  const copyScene = new THREE.Scene()
  const quad = new THREE.Mesh(triangle, copyMaterial)
  quad.frustumCulled = false
  copyScene.add(quad)
  const size = new THREE.Vector2()
  const staticLeaves = new Set<THREE.Object3D>()
  const leaves: THREE.Object3D[] = []
  let enabled = false
  let dirty = true
  let builds = 0
  let hits = 0
  let width = 0
  let height = 0
  const contextRestored = () => {
    dirty = true
    requestFrame()
  }
  renderer.domElement.addEventListener('webglcontextrestored', contextRestored)
  const resize = () => {
    renderer.getDrawingBufferSize(size)
    if (width === size.x && height === size.y) return
    width = size.x
    height = size.y
    target.setSize(width, height)
    color.dispose()
    color = new THREE.FramebufferTexture(width, height)
    uniforms.cachedColor.value = color
    dirty = true
  }
  // 不切换父组或灯光，避免改变光源槽位；保留所有对象进入本次绘制前的可见性。
  const withLeaves = (staticPass: boolean, draw: () => void) => {
    leaves.length = 0
    scene.traverse((object) => {
      if (
        (object instanceof THREE.Mesh ||
          object instanceof THREE.Line ||
          object instanceof THREE.Sprite) &&
        object.visible &&
        staticLeaves.has(object) !== staticPass
      ) {
        leaves.push(object)
        object.visible = false
      }
    })
    try {
      draw()
    } finally {
      for (const object of leaves) object.visible = true
    }
  }
  const build = () => {
    resize()
    withLeaves(true, () => {
      // 深度单独生成，不读取 GPU 回 CPU；静态颜色沿用默认帧缓冲的完整显示管线。
      try {
        renderer.setRenderTarget(target)
        renderDepth()
        renderer.setRenderTarget(null)
        renderer.render(scene, camera)
        renderer.copyFramebufferToTexture(color)
      } finally {
        renderer.setRenderTarget(null)
      }
    })
    dirty = false
    builds++
  }
  return {
    get builds() {
      return builds
    },
    get hits() {
      return hits
    },
    setObjects(roots: THREE.Object3D[]) {
      staticLeaves.clear()
      for (const root of roots)
        root.traverse((object) => staticLeaves.add(object))
    },
    setEnabled(value: boolean) {
      if (enabled !== value) dirty = true
      enabled = value
    },
    invalidate() {
      dirty = true
    },
    prepare() {
      build()
      renderer.render(copyScene, camera)
      dirty = true
    },
    render() {
      resize()
      if (!enabled) {
        renderer.render(scene, camera)
        return
      }
      const autoClear = renderer.autoClear
      const autoReset = renderer.info.autoReset
      renderer.info.autoReset = false
      renderer.info.reset()
      try {
        if (dirty) build()
        else hits++
        renderer.autoClear = false
        renderer.clear()
        renderer.render(copyScene, camera)
        withLeaves(false, () => renderer.render(scene, camera))
      } finally {
        renderer.autoClear = autoClear
        renderer.info.autoReset = autoReset
        renderer.setRenderTarget(null)
      }
    },
    dispose() {
      renderer.domElement.removeEventListener(
        'webglcontextrestored',
        contextRestored
      )
      color.dispose()
      target.dispose()
      depthMaterials.forEach((value) => value.dispose())
      triangle.dispose()
      copyMaterial.dispose()
    },
  }
}
