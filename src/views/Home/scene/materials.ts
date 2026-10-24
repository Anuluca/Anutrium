import * as THREE from 'three'

import { LUCARIO_HEADACHE_RED } from './lucarioHeadache'

interface HeadRigUniforms {
  headRotation: { value: THREE.Vector4 }
  headPivot: { value: THREE.Vector3 }
  headNodPivot: { value: THREE.Vector3 }
  headNodAngle: { value: number }
}

// 实体、线框和深度材质共用同一头部变形，保持三者的轮廓与裁切一致。
export function installHeadRig(
  surface: THREE.Material,
  { headRotation, headPivot, headNodPivot, headNodAngle }: HeadRigUniforms
) {
  surface.onBeforeCompile = (shader) => {
    shader.uniforms.headRotation = headRotation
    shader.uniforms.headPivot = headPivot
    shader.uniforms.headNodPivot = headNodPivot
    shader.uniforms.headNodAngle = headNodAngle
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
      attribute float headInfluence; attribute float headNodInfluence;
      uniform vec4 headRotation; uniform vec3 headPivot;
      uniform vec3 headNodPivot; uniform float headNodAngle;
      vec3 rotateHead(vec3 v,vec4 q){return v+2.*cross(q.xyz,cross(q.xyz,v)+q.w*v);}
      vec4 getNodRotation(){float a=headNodAngle*headNodInfluence*0.5;return vec4(sin(a),0.,0.,cos(a));}
      vec4 getHeadRotation(){
        if(headInfluence>=0.999)return headRotation;
        if(headInfluence<=0.)return vec4(0.,0.,0.,1.);
        float angle=acos(clamp(headRotation.w,-1.,1.));
        return vec4(headRotation.xyz*sin(angle*headInfluence)/max(sin(angle),0.00001),cos(angle*headInfluence));
      }`
      )
      .replace(
        '#include <morphnormal_vertex>',
        '#include <morphnormal_vertex>\nobjectNormal=rotateHead(rotateHead(objectNormal,getNodRotation()),getHeadRotation());'
      )
      .replace(
        '#include <morphtarget_vertex>',
        // 额外低头只用 Head 子树权重、围绕头颈关节旋转；Neck 根部不参与此动作。
        '#include <morphtarget_vertex>\ntransformed=rotateHead(transformed-headNodPivot,getNodRotation())+headNodPivot;\ntransformed=rotateHead(transformed-headPivot,getHeadRotation())+headPivot;'
      )
  }
}

/** 按模型原始高度染红，避免歪头或倒影翻转改变渐变方向。 */
export function installHeadacheTint(
  surface: THREE.MeshPhysicalMaterial,
  strength: { value: number },
  heightRange: { value: THREE.Vector2 }
) {
  const originalCompile = surface.onBeforeCompile
  surface.onBeforeCompile = (shader, renderer) => {
    originalCompile.call(surface, shader, renderer)
    shader.uniforms.headacheRedness = strength
    shader.uniforms.headacheHeightRange = heightRange
    shader.uniforms.headacheRed = {
      value: new THREE.Color(LUCARIO_HEADACHE_RED),
    }
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying float headacheHeight;'
      )
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nheadacheHeight = position.y;'
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying float headacheHeight;
        uniform float headacheRedness;
        uniform vec2 headacheHeightRange;
        uniform vec3 headacheRed;`
      )
      .replace(
        '#include <opaque_fragment>',
        // 光照计算后去色，使主题灯光和环境反射也不会把底部重新染色。
        `
        float redness = smoothstep(headacheHeightRange.x, headacheHeightRange.y, headacheHeight);
        vec3 luminanceWeights = vec3(0.2126, 0.7152, 0.0722);
        float brightness = dot(outgoingLight, luminanceWeights);
        vec3 redTint = headacheRed / max(dot(headacheRed, luminanceWeights), 0.001);
        vec3 headacheBody = brightness * mix(vec3(1.0), redTint, redness * 0.9);
        outgoingLight = mix(outgoingLight, headacheBody, headacheRedness);
        #include <opaque_fragment>`
      )
  }
}

// 只在加载阶段改写着色器；动画帧只更新 uniform，不触发材质重编译。
export function installEnvironmentFade(
  materials: Iterable<THREE.Material>,
  excluded: ReadonlySet<THREE.Material>,
  unexpanded: ReadonlySet<THREE.Material>,
  templeReveal: { value: number },
  templeExpansion: { value: number }
) {
  const expandScreen = (source: string) =>
    'uniform float templeExpansion;\n' +
    source.replace(/}\s*$/, 'gl_Position.xy *= templeExpansion;\n}')
  const opaque = new Set<THREE.Material>()
  for (const value of materials) {
    if (excluded.has(value)) continue
    if (!value.transparent) opaque.add(value)
    const expands = !unexpanded.has(value)
    // 加载阶段同时预热稳定不透明与渐隐透明变体。
    // 双面角色在半透明渐隐时保留原前后遍；只为单面环境固定单遍。
    if (!value.transparent && value.side !== THREE.DoubleSide)
      value.forceSinglePass = true
    value.transparent = true
    if (value instanceof THREE.ShaderMaterial) {
      value.uniforms.templeReveal = templeReveal
      if (expands) {
        value.uniforms.templeExpansion = templeExpansion
        value.vertexShader = expandScreen(value.vertexShader)
      }
      value.fragmentShader =
        'uniform float templeReveal;\n' +
        value.fragmentShader.replace(
          /#include <(?:tonemapping|colorspace)_fragment>/,
          'gl_FragColor.a *= templeReveal;\n$&'
        )
    } else {
      const originalCompile = value.onBeforeCompile
      const originalKey = value.customProgramCacheKey()
      value.onBeforeCompile = (shader, renderer) => {
        originalCompile.call(value, shader, renderer)
        shader.uniforms.templeReveal = templeReveal
        if (expands) {
          shader.uniforms.templeExpansion = templeExpansion
          shader.vertexShader = expandScreen(shader.vertexShader)
        }
        shader.fragmentShader =
          'uniform float templeReveal;\n' +
          shader.fragmentShader.replace(
            '#include <opaque_fragment>',
            'diffuseColor.a *= templeReveal;\n#include <opaque_fragment>'
          )
      }
      value.customProgramCacheKey = () =>
        originalKey + (expands ? ':temple-expand-fade' : ':temple-fade')
    }
  }
  return () => {
    for (const value of opaque) {
      const transparent = templeReveal.value < 1 || value.opacity < 1
      if (value.transparent === transparent) continue
      value.transparent = transparent
      value.needsUpdate = true
    }
  }
}
