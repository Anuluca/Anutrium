import * as THREE from 'three'

/** 物理表面与合成表面共享变形后的模型空间分界，动画只改变 uniform。 */
export function createModelScan(color: THREE.Color) {
  const progress = { value: 0 }
  const bounds = { value: new THREE.Vector2(0, 1) }
  const uniforms = { islandScanProgress: progress, islandScanBounds: bounds }
  const install = (material: THREE.Material, layer: 'chrome' | 'composite') => {
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
          varying vec3 islandScanPosition; uniform vec2 islandScanBounds;
          ${
            layer === 'composite'
              ? 'attribute vec3 barycentric; varying vec3 islandBarycentric;'
              : ''
          }`
        )
        .replace(
          '#include <project_vertex>',
          `
          ${layer === 'composite' ? 'islandBarycentric = barycentric;' : ''}
          islandScanPosition = vec3(transformed.x, transformed.y - islandScanBounds.x, transformed.z) / islandScanBounds.y;
          #include <project_vertex>`
        )
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          varying vec3 islandScanPosition;
          uniform float islandScanProgress; uniform vec3 islandScanColor;
          ${layer === 'composite' ? 'varying vec3 islandBarycentric;' : ''}
          float islandScanHash(vec2 p) { return fract(sin(dot(p, vec2(53.37, 117.13))) * 15837.31); }
          float islandScanNoise(vec2 p) {
            vec2 cell = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
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
              : 'if (islandScanProgress <= 0.00001 || (scanDistance >= 0.13 && islandScanProgress < 0.99999)) discard;'
          }
        `
        )
      if (layer === 'composite') {
        shader.fragmentShader = shader.fragmentShader
          .replace(
            '#include <opaque_fragment>',
            `
            vec3 pixelDistance = islandBarycentric / max(fwidth(islandBarycentric), vec3(0.00001));
            float wireDistance = min(min(pixelDistance.x, pixelDistance.y), pixelDistance.z);
            float wireCoverage = 1.0 - smoothstep(0.25, 0.85, wireDistance);
            float converted = (islandScanProgress >= 0.99999 || scanDistance < 0.0) ? 1.0 : 0.0;
            diffuseColor.a = converted * (0.55 + 0.45 * wireCoverage);
            outgoingLight = vec3(0.0);
            vec3 scanRadiance = vec3(0.0);
            float scanAlpha = 0.0;
            // 稳定线框跳过噪声和发光计算，保留原端点低成本路径。
            if (scanActive > 0.5) {
              float scanCore = exp(-abs(scanDistance) * 300.0);
              float scanHalo = exp(-abs(scanDistance) * 48.0);
              float scanSpark = pow(scanNoise, 9.0) * exp(-abs(scanDistance) * 90.0);
              scanRadiance = islandScanColor * (scanHalo * 1.7 + scanSpark * 5.0) + vec3(1.0, 0.9, 0.94) * scanCore * 2.0;
              scanAlpha = clamp(scanHalo * 0.75 + scanCore + scanSpark, 0.0, 1.0);
            }
            #include <opaque_fragment>`
          )
          .replace(
            '#include <premultiplied_alpha_fragment>',
            `#include <premultiplied_alpha_fragment>
            // 显示色彩空间中按覆盖率合成，保持黑色 0.55 填充与原线框的叠加语义。
            gl_FragColor.rgb += linearToOutputTexel(vec4(islandScanColor, 1.0)).rgb * wireCoverage * converted;
            if (scanActive > 0.5) gl_FragColor.rgb += linearToOutputTexel(vec4(scanRadiance, 1.0)).rgb * scanAlpha;`
          )
      }
    }
    material.customProgramCacheKey = () => `${previousKey}:island-scan-${layer}`
  }
  return { progress, bounds, install }
}
