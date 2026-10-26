import * as THREE from 'three'

/** 用星宿笔画约束光雾密度，沿投射方向展开图标轮廓。 */
export function createZodiacProjectionMaterial(
  target: THREE.Vector3,
  color: THREE.ColorRepresentation,
  glyphMap: THREE.Texture
) {
  return new THREE.ShaderMaterial({
    uniforms: {
      target: { value: target.clone() },
      glowColor: { value: new THREE.Color(color) },
      intensity: { value: 0 },
      glyphMap: { value: glyphMap },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform vec3 target;
      varying vec3 vWorld;
      varying vec3 vOrigin;
      varying vec3 vAxis;
      varying vec3 vRight;
      varying vec3 vUp;
      varying float vLength;
      void main() {
        vOrigin = modelMatrix[3].xyz;
        vLength = length(target - vOrigin);
        vAxis = normalize(target - vOrigin);
        vec3 glyphRight = normalize(modelMatrix[0].xyz);
        vRight = normalize(glyphRight - vAxis * dot(glyphRight, vAxis));
        vUp = cross(vAxis, vRight);
        // 盒子只界定积分范围；最终轮廓由三维光雾密度决定。
        vWorld = vOrigin + vAxis * (position.z + 0.5) * vLength
          + (vRight * position.x + vUp * position.y) * 2.6;
        gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      uniform float intensity;
      uniform sampler2D glyphMap;
      uniform mat4 projectionMatrix;
      varying vec3 vWorld;
      varying vec3 vOrigin;
      varying vec3 vAxis;
      varying vec3 vRight;
      varying vec3 vUp;
      varying float vLength;
      float glyphDensity(vec2 coordinate) {
        if (any(lessThan(coordinate, vec2(0.0)))
          || any(greaterThan(coordinate, vec2(1.0)))) return 0.0;
        // 纹理已在 CPU 上完成九点模糊；r 通道存储线性遮罩密度。
        return texture2D(glyphMap, vec2(coordinate.x, 1.0 - coordinate.y)).r;
      }
      void main() {
        vec3 ray = normalize(vWorld - cameraPosition);
        vec3 offset = cameraPosition - vOrigin;
        vec3 origin = vec3(dot(offset, vRight), dot(offset, vUp), dot(offset, vAxis));
        vec3 direction = vec3(dot(ray, vRight), dot(ray, vUp), dot(ray, vAxis));
        vec3 safeDirection = mix(direction, vec3(0.00001),
          lessThan(abs(direction), vec3(0.00001)));
        vec3 inverseRay = 1.0 / safeDirection;
        vec3 entry = (vec3(-1.3, -1.3, 0.0) - origin) * inverseRay;
        vec3 exit = (vec3(1.3, 1.3, vLength) - origin) * inverseRay;
        vec3 nearPlane = min(entry, exit);
        vec3 farPlane = max(entry, exit);
        float near = max(0.0, max(nearPlane.x, max(nearPlane.y, nearPlane.z)));
        float far = min(farPlane.x, min(farPlane.y, farPlane.z));
        if (far <= near) discard;
        float stepSize = (far - near) / 96.0;
        float opticalDepth = 0.0;
        float firstLight = far;
        // 每个截面采样同一星宿遮罩，空白区不产生圆锥底光。
        for (int i = 0; i < 96; i++) {
          float distance = near + (float(i) + 0.5) * stepSize;
          vec3 samplePoint = origin + direction * distance;
          float progress = clamp(samplePoint.z / vLength, 0.0, 1.0);
          float radius = mix(0.18, 1.3, progress);
          float density = glyphDensity(samplePoint.xy / (radius * 2.0) + 0.5)
            * smoothstep(0.0, 0.025, progress)
            * (1.0 - smoothstep(0.55, 1.0, progress))
            / (1.0 + progress * 1.5);
          if (density > 0.001) firstLight = min(firstLight, distance);
          opticalDepth += density * stepSize;
        }
        float alpha = (1.0 - exp(-opticalDepth * 1.6)) * intensity * 0.38;
        if (alpha < 0.001) discard;
        // 以第一处光雾写入片元深度，保留与碑身、中央模型的前后关系。
        vec4 depth = projectionMatrix * viewMatrix
          * vec4(cameraPosition + ray * firstLight, 1.0);
        gl_FragDepth = depth.z / depth.w * 0.5 + 0.5;
        gl_FragColor = vec4(mix(glowColor, vec3(1.0), 0.42), alpha);
        #include <colorspace_fragment>
      }
    `,
  })
}

/** 创建投射光控制器；稳态直接返回，避免四根柱子每帧重复阻尼和 uniform 写入。 */
export function createZodiacProjection(
  geometry: THREE.BufferGeometry,
  target: THREE.Vector3,
  color: THREE.ColorRepresentation,
  glyphMap: THREE.Texture
) {
  const material = createZodiacProjectionMaterial(target, color, glyphMap)
  const beam = new THREE.Mesh(geometry, material)
  beam.frustumCulled = false
  beam.visible = false
  let strength = 0
  const projection = {
    beam,
    material,
    moving: false,
    get strength() {
      return strength
    },
    update(active: boolean, elapsed: number) {
      const target = active ? 1 : 0
      if (strength === target) {
        projection.moving = false
        return false
      }
      strength = THREE.MathUtils.damp(strength, target, active ? 2 : 4, elapsed)
      if (Math.abs(strength - target) <= 0.001) strength = target
      projection.moving = strength !== target
      material.uniforms.intensity.value = strength
      beam.visible = strength > 0
      return true
    },
  }
  return projection
}
