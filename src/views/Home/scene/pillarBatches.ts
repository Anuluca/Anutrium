import * as THREE from 'three'

type Surface = THREE.MeshBasicMaterial | THREE.MeshStandardMaterial

/** 四柱共享渲染材质，原网格保留命中身份和材质状态；动态数据只上传 uniform。 */
export function createPillarBatches(
  parent: THREE.Group,
  roots: THREE.Object3D[],
  environment: THREE.Scene,
  sharedMaps: ReadonlySet<THREE.Texture> = new Set()
) {
  const groups = new Map<string, THREE.Mesh[]>()
  for (const root of roots)
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || !object.visible) return
      const value = object.material
      if (
        !(
          value instanceof THREE.MeshBasicMaterial ||
          value instanceof THREE.MeshStandardMaterial
        ) ||
        value.wireframe ||
        !value.colorWrite ||
        // 碑文有独立画布和染色钩子，保留独立批次；共同光晕/光池纹理可合批。
        (value.map && !sharedMaps.has(value.map))
      )
        return
      const planes =
        value.clippingPlanes
          ?.map((p) => [...p.normal.toArray(), p.constant].join(','))
          .join(';') || ''
      const key = [
        object.geometry.uuid,
        value.type,
        value.map?.uuid || '',
        value.side,
        value.blending,
        value.depthWrite,
        value.depthTest,
        value.vertexColors,
        value instanceof THREE.MeshStandardMaterial ? value.flatShading : '',
        object.renderOrder,
        planes,
        // 晶体/内芯与角色倒影需要前后交错排序；永久透明表面按前后排合批。
        // 光晕、光池有独立 renderOrder 且采用加法混合，仍可四柱共享一个批次。
        value.opacity < 1 && object.renderOrder === 0
          ? Math.sign(root.position.z)
          : '',
      ].join(':')
      const group = groups.get(key) || []
      group.push(object)
      groups.set(key, group)
    })
  const inverse = new THREE.Matrix4()
  const center = new THREE.Vector3()
  const batches: {
    mesh: THREE.InstancedMesh
    sources: THREE.Mesh[]
    transforms: THREE.Matrix4[]
    surfaces: THREE.Vector4[]
    emissives: THREE.Color[]
    originals: boolean[]
  }[] = []
  for (const sources of groups.values()) {
    if (sources.length < 2) continue
    const sourceMaterial = sources[0].material as Surface
    const value = sourceMaterial.clone()
    value.visible = true
    const transforms = sources.map(() => new THREE.Matrix4())
    const surfaces = sources.map(() => new THREE.Vector4())
    const colors = sources.map((source) => (source.material as Surface).color)
    const emissives = sources.map(() => new THREE.Color())
    const previousCompile = sourceMaterial.onBeforeCompile
    const previousKey = sourceMaterial.customProgramCacheKey()
    value.onBeforeCompile = (shader, renderer) => {
      previousCompile.call(sourceMaterial, shader, renderer)
      Object.assign(shader.uniforms, {
        pillarMatrices: { value: transforms },
        pillarColors: { value: colors },
        pillarSurfaces: { value: surfaces },
        pillarEmissives: { value: emissives },
      })
      shader.vertexShader =
        `uniform mat4 pillarMatrices[${sources.length}];
        uniform vec4 pillarSurfaces[${sources.length}];
        flat varying int pillarIndex;\n` + shader.vertexShader
      for (const chunk of [
        'project_vertex',
        'worldpos_vertex',
        'defaultnormal_vertex',
      ])
        shader.vertexShader = shader.vertexShader.replace(
          `#include <${chunk}>`,
          THREE.ShaderChunk[chunk].replace(
            /instanceMatrix/g,
            'pillarMatrices[gl_InstanceID]'
          ) +
            (chunk === 'project_vertex'
              ? '\nif (pillarSurfaces[gl_InstanceID].w <= 0.0) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);'
              : '')
        )
      shader.vertexShader = shader.vertexShader.replace(
        'void main() {',
        'void main() { pillarIndex = gl_InstanceID;'
      )
      shader.fragmentShader =
        `flat varying int pillarIndex;
        uniform vec3 pillarColors[${sources.length}];
        uniform vec3 pillarEmissives[${sources.length}];
        uniform vec4 pillarSurfaces[${sources.length}];\n` +
        shader.fragmentShader
      shader.fragmentShader = shader.fragmentShader
        .replace(
          'vec4 diffuseColor = vec4( diffuse, opacity );',
          `if (pillarSurfaces[pillarIndex].w <= 0.0) discard;
          vec4 diffuseColor = vec4(pillarColors[pillarIndex], pillarSurfaces[pillarIndex].w);`
        )
        .replace(
          'vec3 totalEmissiveRadiance = emissive;',
          'vec3 totalEmissiveRadiance = pillarEmissives[pillarIndex];'
        )
        .replace(
          '#include <roughnessmap_fragment>',
          THREE.ShaderChunk.roughnessmap_fragment.replace(
            '= roughness;',
            '= pillarSurfaces[pillarIndex].x;'
          )
        )
        .replace(
          '#include <metalnessmap_fragment>',
          THREE.ShaderChunk.metalnessmap_fragment.replace(
            '= metalness;',
            '= pillarSurfaces[pillarIndex].y;'
          )
        )
        .replace(
          '#include <envmap_common_pars_fragment>',
          THREE.ShaderChunk.envmap_common_pars_fragment.replace(
            'uniform float envMapIntensity;',
            '#define envMapIntensity pillarSurfaces[pillarIndex].z'
          )
        )
    }
    value.customProgramCacheKey = () =>
      `${previousKey}:pillar-uniforms:${sources.length}`
    const mesh = new THREE.InstancedMesh(
      sources[0].geometry,
      value,
      sources.length
    )
    mesh.name = 'pillar-batch'
    mesh.frustumCulled = false
    // uniform 矩阵不在 instanceMatrix 中，默认包围球会错误地停在原点，影响透明排序。
    mesh.boundingSphere = new THREE.Sphere()
    mesh.geometry.computeBoundingSphere()
    mesh.renderOrder = sources[0].renderOrder
    // instanceMatrix 保持恒等，避免动画期间 bufferSubData；实际矩阵由 uniform 提供。
    for (let i = 0; i < sources.length; i++)
      mesh.setMatrixAt(i, new THREE.Matrix4())
    parent.add(mesh)
    batches.push({
      mesh,
      sources,
      transforms,
      surfaces,
      emissives,
      originals: sources.map((source) => (source.material as Surface).visible),
    })
  }
  let enabled = false
  const update = () => {
    inverse.copy(parent.matrixWorld).invert()
    for (const { mesh, sources, transforms, surfaces, emissives } of batches) {
      let visible = false
      let activeCount = 0
      mesh.boundingSphere!.center.set(0, 0, 0)
      for (const [index, source] of sources.entries()) {
        let active = true
        for (
          let object: THREE.Object3D | null = source;
          object && object !== parent;
          object = object.parent
        )
          active &&= object.visible
        const value = source.material as Surface
        const opacity = active ? value.opacity : 0
        visible ||= opacity > 0
        transforms[index].multiplyMatrices(inverse, source.matrixWorld)
        if (opacity > 0) {
          center
            .copy(mesh.geometry.boundingSphere!.center)
            .applyMatrix4(transforms[index])
          mesh.boundingSphere!.center.add(center)
          activeCount++
        }
        surfaces[index].set(
          value instanceof THREE.MeshStandardMaterial ? value.roughness : 0,
          value instanceof THREE.MeshStandardMaterial ? value.metalness : 0,
          value instanceof THREE.MeshStandardMaterial
            ? value.envMap
              ? value.envMapIntensity
              : environment.environmentIntensity
            : 0,
          opacity
        )
        if (value instanceof THREE.MeshStandardMaterial)
          emissives[index]
            .copy(value.emissive)
            .multiplyScalar(value.emissiveIntensity)
      }
      if (activeCount) mesh.boundingSphere!.center.divideScalar(activeCount)
      mesh.visible = enabled && visible
      // 原本不透明的石材仅在渐隐时进入透明队列，真正半透明的晶体/倒影继续透明。
      const value = mesh.material as Surface
      const transparent = sources.some(
        (source) => (source.material as Surface).transparent
      )
      if (value.transparent !== transparent) {
        value.transparent = transparent
        value.needsUpdate = true
      }
    }
  }
  return {
    objects: batches.map(({ mesh }) => mesh),
    update,
    setEnabled(value: boolean) {
      enabled = value
      for (const { mesh, sources, originals } of batches) {
        mesh.visible = value
        sources.forEach((source, index) => {
          ;(source.material as Surface).visible = value
            ? false
            : originals[index]
        })
      }
      update()
    },
    dispose() {
      for (const { mesh, sources, originals } of batches) {
        sources.forEach((source, index) => {
          ;(source.material as Surface).visible = originals[index]
        })
        mesh.dispose()
        ;(mesh.material as THREE.Material).dispose()
        parent.remove(mesh)
      }
    },
  }
}
