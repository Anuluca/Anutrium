import * as THREE from 'three'

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
        '#include <beginnormal_vertex>',
        '#include <beginnormal_vertex>\nobjectNormal=rotateHead(rotateHead(objectNormal,getNodRotation()),getHeadRotation());'
      )
      .replace(
        '#include <begin_vertex>',
        // 额外低头只用 Head 子树权重、围绕头颈关节旋转；Neck 根部不参与此动作。
        '#include <begin_vertex>\ntransformed=rotateHead(transformed-headNodPivot,getNodRotation())+headNodPivot;\ntransformed=rotateHead(transformed-headPivot,getHeadRotation())+headPivot;'
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
  for (const value of materials) {
    if (excluded.has(value)) continue
    const expands = !unexpanded.has(value)
    // 在加载阶段预编译透明材质；切换时仅更新 uniform，避免重新编译着色器。
    if (!value.transparent) value.forceSinglePass = true
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
}
