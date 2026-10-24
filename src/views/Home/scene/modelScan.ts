import * as THREE from 'three'

/** 所有表面共用模型空间的扫描分界，包括实时转头和低头后的顶点。 */
export function createModelScan(color: THREE.Color) {
  const progress = { value: 0 }
  const bounds = { value: new THREE.Vector2(0, 1) }
  const uniforms = { islandScanProgress: progress, islandScanBounds: bounds }

  const install = (
    material: THREE.Material,
    layer: 'chrome' | 'converted' | 'glow'
  ) => {
    const previousCompile = material.onBeforeCompile
    const previousKey = material.customProgramCacheKey()
    material.onBeforeCompile = (shader, renderer) => {
      previousCompile.call(material, shader, renderer)
      Object.assign(shader.uniforms, uniforms, {
        islandScanColor: { value: color },
      })
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          varying vec3 islandScanPosition;
          uniform vec2 islandScanBounds;`
        )
        .replace(
          '#include <project_vertex>',
          `
          islandScanPosition = vec3(transformed.x, transformed.y - islandScanBounds.x, transformed.z) / islandScanBounds.y;
          ${
            layer === 'glow'
              ? 'transformed += rotateHead(rotateHead(normal, getNodRotation()), getHeadRotation()) * islandScanBounds.y * 0.006;'
              : ''
          }
          #include <project_vertex>`
        )
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          varying vec3 islandScanPosition;
          uniform float islandScanProgress;
          uniform vec3 islandScanColor;
          float islandScanHash(vec2 p) {
            return fract(sin(dot(p, vec2(53.37, 117.13))) * 15837.31);
          }
          float islandScanNoise(vec2 p) {
            vec2 cell = floor(p), f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(mix(islandScanHash(cell), islandScanHash(cell + vec2(1., 0.)), f.x),
              mix(islandScanHash(cell + vec2(0., 1.)), islandScanHash(cell + vec2(1.)), f.x), f.y);
          }`
        )
        .replace(
          '#include <clipping_planes_fragment>',
          `#include <clipping_planes_fragment>
          float scanActive = step(0.00001, islandScanProgress) * (1.0 - step(0.99999, islandScanProgress));
          float scanFront = mix(-0.12, 1.12, islandScanProgress);
          float scanNoise = 0.5;
          if (scanActive > 0.5) scanNoise = islandScanNoise(islandScanPosition.xz * 24.0 + vec2(islandScanProgress * 9.0, 0.0));
          float scanDistance = islandScanPosition.y - scanFront + (scanNoise - 0.5) * 0.025 * scanActive;
          ${
            layer === 'chrome'
              ? 'if (islandScanProgress >= 0.99999 || (scanActive > 0.5 && scanDistance < 0.0)) discard;'
              : layer === 'converted'
              ? 'if (islandScanProgress <= 0.00001 || (scanActive > 0.5 && scanDistance >= 0.0)) discard;'
              : `
          if (scanActive < 0.5 || abs(scanDistance) > 0.13) discard;`
          }`
        )
      if (layer === 'glow') {
        // 白色亮芯、主题色衰减与扰动亮点贴合模型；略微外扩的加色表面提供轮廓光晕。
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <opaque_fragment>',
          `
          float scanCore = exp(-abs(scanDistance) * 300.0);
          float scanHalo = exp(-abs(scanDistance) * 48.0);
          float scanSpark = pow(scanNoise, 9.0) * exp(-abs(scanDistance) * 90.0);
          outgoingLight = islandScanColor * (scanHalo * 1.7 + scanSpark * 5.0) + vec3(1.0, 0.9, 0.94) * scanCore * 2.0;
          diffuseColor.a = clamp(scanHalo * 0.75 + scanCore + scanSpark, 0.0, 1.0);
          #include <opaque_fragment>`
        )
      }
    }
    material.customProgramCacheKey = () => `${previousKey}:island-scan-${layer}`
  }

  return { progress, bounds, install }
}
