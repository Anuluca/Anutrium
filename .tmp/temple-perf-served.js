import { gsap } from "/node_modules/.vite/deps/gsap.js?v=40063064";
import * as THREE from "/node_modules/.vite/deps/three.js?v=40063064";
import { loadIslandLucarioModel } from "/src/utils/islandLucarioModel.ts?t=1791479125649";
import { subscribePointerSamples } from "/src/utils/pointerSamples.ts?t=1791458559667";
import { templeCategories } from "/src/views/Island/templeCategories.ts?t=1791482967031";
export function createIslandTemple(stage, buttons, callbacks) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.localClippingEnabled = true;
  renderer.domElement.setAttribute("role", "img");
  renderer.domElement.setAttribute(
    "aria-label",
    "头部跟随指针的路卡利欧三维模型"
  );
  stage.appendChild(renderer.domElement);
  stage.dataset.maxFps = "60";
  stage.dataset.pointerSampleMs = String(1e3 / 30);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  const lookAt = new THREE.Vector3(0, 4, -2);
  const homePosition = new THREE.Vector3(0, 1.3, 20);
  const homeTarget = lookAt.clone();
  camera.position.copy(homePosition);
  const geometries = /* @__PURE__ */ new Set();
  const materials = /* @__PURE__ */ new Set();
  const textures = /* @__PURE__ */ new Set();
  const geometry = (value) => {
    geometries.add(value);
    return value;
  };
  const material = (value) => {
    materials.add(value);
    return value;
  };
  const texture = (value) => {
    textures.add(value);
    return value;
  };
  let disposed = false;
  let ready = false;
  let frame;
  let lastDraw = 0;
  let selected = null;
  let transition;
  let transitionActive = false;
  let motionStart = 0;
  let hiddenAt = 0;
  let hovered = null;
  const lastPointer = new THREE.Vector2();
  let hasPointer = false;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const reflection = new THREE.Group();
  reflection.scale.y = -1;
  scene.add(reflection);
  const monuments = new THREE.Group();
  scene.add(monuments);
  scene.add(new THREE.AmbientLight(11820401, 0.65));
  const key = new THREE.DirectionalLight(16758729, 1.6);
  key.position.set(-5, 10, 8);
  scene.add(key);
  const rim = new THREE.DirectionalLight(15864136, 2.8);
  rim.position.set(6, 6, -9);
  scene.add(rim);
  const bodyGeometry = geometry(new THREE.BoxGeometry(1.3, 4.55, 1.3));
  const positions = bodyGeometry.attributes.position;
  for (let index = 0; index < positions.count; index++) {
    const taper = positions.getY(index) > 0 ? 0.72 : 1;
    positions.setX(index, positions.getX(index) * taper);
    positions.setZ(index, positions.getZ(index) * taper);
  }
  bodyGeometry.computeVertexNormals();
  const capGeometry = geometry(new THREE.ConeGeometry(0.663, 1.05, 4));
  capGeometry.rotateY(Math.PI / 4);
  const footGeometry = geometry(new THREE.BoxGeometry(1.8, 0.21, 1.8));
  const stepGeometry = geometry(new THREE.BoxGeometry(2.35, 0.13, 2.35));
  const edgeGeometry = geometry(new THREE.EdgesGeometry(bodyGeometry, 25));
  const capEdges = geometry(new THREE.EdgesGeometry(capGeometry, 25));
  const labelGeometry = geometry(new THREE.PlaneGeometry(0.82, 4.22));
  const plinthMaterial = material(
    new THREE.MeshStandardMaterial({
      color: 590341,
      metalness: 0.8,
      roughness: 0.42,
      envMapIntensity: 0.3
    })
  );
  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = glowCanvas.height = 128;
  const glowContext = glowCanvas.getContext("2d");
  const gradient = glowContext.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,35,81,0.7)");
  gradient.addColorStop(0.22, "rgba(199,9,49,0.3)");
  gradient.addColorStop(1, "rgba(120,0,22,0)");
  glowContext.fillStyle = gradient;
  glowContext.fillRect(0, 0, 128, 128);
  const glowMap = texture(new THREE.CanvasTexture(glowCanvas));
  glowMap.colorSpace = THREE.SRGBColorSpace;
  const glowGeometry = geometry(new THREE.PlaneGeometry(5, 5));
  const labelTexture = (roman, title) => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 1536;
    const context = canvas.getContext("2d");
    context.textAlign = "center";
    context.textBaseline = "middle";
    const paint = () => {
      context.clearRect(0, 0, 256, 1536);
      context.fillStyle = "#f52e5b";
      context.font = "700 72px UnboundedSans, sans-serif";
      context.fillText(roman, 128, 130);
      context.save();
      context.translate(128, 810);
      context.rotate(Math.PI / 2);
      context.fillStyle = "#fff3f5";
      context.font = "800 90px UnboundedSans, sans-serif";
      const spacing = 13;
      const widths = [...title].map(
        (letter) => context.measureText(letter).width
      );
      let x = -(widths.reduce((sum, width) => sum + width, 0) + spacing * (title.length - 1)) / 2;
      context.textAlign = "left";
      for (let index = 0; index < title.length; index++) {
        context.fillText(title[index], x, 0);
        x += widths[index] + spacing;
      }
      context.restore();
    };
    paint();
    const map = texture(new THREE.CanvasTexture(canvas));
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    document.fonts.ready.then(() => {
      if (disposed)
        return;
      paint();
      map.needsUpdate = true;
      invalidate();
    });
    return map;
  };
  const beamGeometry = geometry(
    new THREE.CylinderGeometry(0.18, 1.7, 16, 32, 1, true)
  );
  const poolGeometry = geometry(new THREE.PlaneGeometry(5, 5));
  const obelisks = templeCategories.map((category) => {
    const group = new THREE.Group();
    group.position.set(category.x, 0, category.z);
    const inwardAngle = Math.abs(category.x) > 5 ? 32 : 16;
    group.rotation.y = -Math.sign(category.x) * THREE.MathUtils.degToRad(inwardAngle);
    monuments.add(group);
    const surface = material(
      new THREE.MeshPhysicalMaterial({
        color: 2164494,
        metalness: 0.85,
        roughness: 0.27,
        clearcoat: 0.5,
        envMapIntensity: 0.4,
        emissive: 4261394,
        emissiveIntensity: 0.13
      })
    );
    const body = new THREE.Mesh(bodyGeometry, surface);
    body.position.y = 2.66;
    body.userData.category = category.id;
    group.add(body);
    const crystal = material(
      new THREE.MeshPhysicalMaterial({
        color: 6688037,
        emissive: 10292271,
        emissiveIntensity: 0.2,
        metalness: 0.72,
        roughness: 0.13,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
        depthWrite: false,
        flatShading: true,
        clearcoat: 1,
        envMapIntensity: 0.65
      })
    );
    const cap = new THREE.Mesh(capGeometry, crystal);
    cap.position.y = 5.46;
    cap.userData.category = category.id;
    group.add(cap);
    const core = new THREE.Mesh(
      capGeometry,
      material(
        new THREE.MeshBasicMaterial({
          color: 15738454,
          transparent: true,
          opacity: 0.24,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      )
    );
    core.position.copy(cap.position);
    core.scale.set(0.6, 0.82, 0.6);
    group.add(core);
    const edge = material(
      new THREE.LineBasicMaterial({
        color: 15610714,
        transparent: true,
        opacity: 0.58,
        toneMapped: false
      })
    );
    const lines = new THREE.LineSegments(edgeGeometry, edge);
    lines.position.copy(body.position);
    group.add(lines);
    const capLines = new THREE.LineSegments(capEdges, edge);
    capLines.position.copy(cap.position);
    group.add(capLines);
    for (const [shape, y] of [
      [stepGeometry, 0.065],
      [footGeometry, 0.235]
    ]) {
      const foot = new THREE.Mesh(shape, plinthMaterial);
      foot.position.y = y;
      group.add(foot);
    }
    const labelMaterial = material(
      new THREE.MeshBasicMaterial({
        map: labelTexture(category.roman, category.title),
        transparent: true,
        depthWrite: false,
        toneMapped: false
      })
    );
    const label = new THREE.Mesh(labelGeometry, labelMaterial);
    label.position.set(0, 2.66, 0.565);
    label.rotation.x = -Math.atan(0.182 / 4.55);
    group.add(label);
    const glowMaterial = material(
      new THREE.MeshBasicMaterial({
        map: glowMap,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.018;
    glow.renderOrder = 2;
    group.add(glow);
    const beamMaterial = material(
      new THREE.ShaderMaterial({
        uniforms: { intensity: { value: 0 } },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        vertexShader: "varying vec2 vUv;varying vec3 world;varying vec3 normalWorld;void main(){vUv=uv;world=(modelMatrix*vec4(position,1.)).xyz;normalWorld=mat3(modelMatrix)*normal;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}",
        fragmentShader: `varying vec2 vUv;varying vec3 world;varying vec3 normalWorld;uniform float intensity;
        void main(){
          float edge=pow(abs(dot(normalize(normalWorld),normalize(cameraPosition-world))),1.3);
          float falloff=pow(1.-vUv.y,0.7)*smoothstep(0.,0.05,vUv.y);
          gl_FragColor=vec4(0.78,0.015,0.10,edge*falloff*intensity*0.5);
        }`
      })
    );
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    beam.position.y = 8.1;
    group.add(beam);
    const poolMaterial = material(
      new THREE.MeshBasicMaterial({
        map: glowMap,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    const pool = new THREE.Mesh(poolGeometry, poolMaterial);
    pool.position.y = 0.025;
    pool.rotation.x = -Math.PI / 2;
    pool.renderOrder = 3;
    group.add(pool);
    const spot = new THREE.SpotLight(16717641, 0, 15, Math.PI / 32, 0.85, 1.5);
    spot.position.set(category.x, 12, category.z + 0.6);
    spot.target.position.set(category.x, 1, category.z);
    scene.add(spot, spot.target);
    return {
      category,
      group,
      body,
      cap,
      surface,
      crystal,
      core,
      edge,
      labelMaterial,
      glowMaterial,
      beamMaterial,
      poolMaterial,
      spot,
      strength: 0,
      hoverStrength: 0,
      reflected: new THREE.Group()
    };
  });
  const ground = new THREE.Group();
  scene.add(ground);
  const horizonZ = -40;
  const floor = new THREE.Mesh(
    geometry(new THREE.PlaneGeometry(240, 160)),
    material(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        vertexShader: `varying vec3 world;void main(){world=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}`,
        fragmentShader: `varying vec3 world;void main(){
        float sheen=0.5+0.5*sin(world.z*4.+sin(world.x*1.5)*0.25);
        gl_FragColor=vec4(vec3(0.008+sheen*0.003,0.001,0.003),0.78);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
      })
    )
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -0.012, horizonZ + 80);
  floor.renderOrder = 1;
  ground.add(floor);
  const horizonGlow = new THREE.Mesh(
    geometry(new THREE.PlaneGeometry(240, 9)),
    material(
      new THREE.ShaderMaterial({
        uniforms: { glowColor: { value: new THREE.Color("#E23455") } },
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        blending: THREE.AdditiveBlending,
        vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `varying vec2 vUv;uniform vec3 glowColor;void main(){
        float rise=exp(-vUv.y*5.)*(1.-smoothstep(0.7,1.,vUv.y));
        gl_FragColor=vec4(glowColor,rise*0.34);
        #include <colorspace_fragment>
      }`
      })
    )
  );
  horizonGlow.position.set(0, 4.5 - 0.012, horizonZ);
  horizonGlow.renderOrder = -1;
  ground.add(horizonGlow);
  const statueZ = -3;
  const pedestal = new THREE.Group();
  pedestal.position.z = statueZ;
  for (const [width, height, y] of [
    [6.4, 0.14, 0.07],
    [5.8, 0.18, 0.23],
    [5.2, 0.2, 0.42]
  ]) {
    const step = new THREE.Mesh(
      geometry(new THREE.BoxGeometry(width, height, 3.2)),
      plinthMaterial
    );
    step.position.y = y;
    pedestal.add(step);
  }
  scene.add(pedestal);
  const statueGlow = new THREE.Mesh(
    geometry(new THREE.PlaneGeometry(10, 8)),
    material(
      new THREE.MeshBasicMaterial({
        map: glowMap,
        transparent: true,
        opacity: 0.62,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    )
  );
  statueGlow.rotation.x = -Math.PI / 2;
  statueGlow.position.set(0, 0.02, statueZ + 1);
  statueGlow.renderOrder = 2;
  scene.add(statueGlow);
  const statueLight = new THREE.PointLight(16717389, 42, 13, 2);
  statueLight.position.set(0, 2.7, statueZ + 3);
  scene.add(statueLight);
  const mirror = (source, target2, opacity) => {
    const copy = source.clone(true);
    copy.traverse((object) => {
      if (!(object instanceof THREE.Mesh || object instanceof THREE.LineSegments))
        return;
      const original = object.material;
      if (original instanceof THREE.ShaderMaterial) {
        object.visible = false;
        return;
      }
      const faded = material(original.clone());
      faded.transparent = true;
      faded.opacity = opacity;
      faded.depthWrite = false;
      if (original.clippingPlanes?.length) {
        faded.clippingPlanes = original.clippingPlanes.map(
          (plane) => new THREE.Plane(
            new THREE.Vector3(
              plane.normal.x,
              -plane.normal.y,
              plane.normal.z
            ),
            plane.constant
          )
        );
        faded.onBeforeCompile = original.onBeforeCompile;
      }
      object.material = faded;
    });
    target2.add(copy);
  };
  for (const item of obelisks) {
    mirror(item.group, item.reflected, 0.2);
    reflection.add(item.reflected);
  }
  mirror(pedestal, reflection, 0.14);
  const target = new THREE.WebGLRenderTarget(1, 1, {
    depthTexture: new THREE.DepthTexture(1, 1)
  });
  const focus = { value: 20 };
  const blur = { value: 0 };
  const post = material(
    new THREE.ShaderMaterial({
      uniforms: {
        image: { value: target.texture },
        depth: { value: target.depthTexture },
        texel: { value: new THREE.Vector2() },
        focus,
        blur
      },
      vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}",
      fragmentShader: `varying vec2 vUv;uniform sampler2D image;uniform sampler2D depth;uniform vec2 texel;uniform float focus;uniform float blur;
      void main(){
        float d=texture2D(depth,vUv).x;
        float distance=10./(100.-d*99.9);
        // 未写入深度的地面、地平线光幕保持清晰；建筑依然使用景深。
        float amount=d>0.99999?0.:smoothstep(1.5,9.,abs(distance-focus))*blur;
        vec2 stepSize=texel*amount*3.4;
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
      depthWrite: false
    })
  );
  const postScene = new THREE.Scene();
  postScene.add(new THREE.Mesh(geometry(new THREE.PlaneGeometry(2, 2)), post));
  const postCamera = new THREE.Camera();
  const headRotation = { value: new THREE.Vector4(0, 0, 0, 1) };
  const headPivot = { value: new THREE.Vector3() };
  const headCurrent = new THREE.Vector2();
  const headTarget = new THREE.Vector2();
  const pointerTarget = new THREE.Vector2();
  const headQuaternion = new THREE.Quaternion();
  const headAngles = new THREE.Euler(0, 0, 0, "YXZ");
  const statue = new THREE.Group();
  statue.position.set(0, 3.87, statueZ);
  scene.add(statue);
  const chromeMaterial = material(
    new THREE.MeshPhysicalMaterial({
      color: 15224171,
      side: THREE.DoubleSide,
      metalness: 1,
      roughness: 0.09,
      clearcoat: 0.45,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.8,
      clippingPlanes: [new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.52)]
    })
  );
  chromeMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.headRotation = headRotation;
    shader.uniforms.headPivot = headPivot;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      `#include <common>
      attribute float headInfluence; uniform vec4 headRotation; uniform vec3 headPivot;
      vec3 rotateHead(vec3 v,vec4 q){return v+2.*cross(q.xyz,cross(q.xyz,v)+q.w*v);}
      vec4 getHeadRotation(){
        if(headInfluence>=0.999)return headRotation;
        if(headInfluence<=0.)return vec4(0.,0.,0.,1.);
        float angle=acos(clamp(headRotation.w,-1.,1.));
        return vec4(headRotation.xyz*sin(angle*headInfluence)/max(sin(angle),0.00001),cos(angle*headInfluence));
      }`
    ).replace(
      "#include <beginnormal_vertex>",
      "#include <beginnormal_vertex>\nobjectNormal=rotateHead(objectNormal,getHeadRotation());"
    ).replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\ntransformed=rotateHead(transformed-headPivot,getHeadRotation())+headPivot;"
    );
  };
  const screenPoint = new THREE.Vector3();
  const hitPoints = [
    [-0.65, 0.1, 0.65],
    [-0.65, 0.1, -0.65],
    [0.65, 0.1, 0.65],
    [0.65, 0.1, -0.65],
    [-0.468, 4.94, 0.468],
    [-0.468, 4.94, -0.468],
    [0.468, 4.94, 0.468],
    [0.468, 4.94, -0.468],
    [0, 5.99, 0]
  ];
  const projectButtons = () => {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    for (const item of obelisks) {
      const button = buttons.get(item.category.id);
      if (!button)
        continue;
      const points = hitPoints.map(([x, y, z]) => {
        screenPoint.set(x, y, z).applyMatrix4(item.group.matrixWorld).project(camera);
        return {
          x: (screenPoint.x * 0.5 + 0.5) * width,
          y: (-screenPoint.y * 0.5 + 0.5) * height
        };
      });
      const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
      const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
      const hull = [];
      for (const point of sorted) {
        while (hull.length >= 2 && cross(hull[hull.length - 2], hull[hull.length - 1], point) <= 0)
          hull.pop();
        hull.push(point);
      }
      const lower = hull.length;
      for (const point of sorted.reverse().slice(1)) {
        while (hull.length > lower && cross(hull[hull.length - 2], hull[hull.length - 1], point) <= 0)
          hull.pop();
        hull.push(point);
      }
      const minX = Math.min(...points.map((point) => point.x));
      const minY = Math.min(...points.map((point) => point.y));
      const w = Math.max(...points.map((point) => point.x)) - minX;
      const h = Math.max(...points.map((point) => point.y)) - minY;
      Object.assign(button.style, {
        left: `${minX}px`,
        top: `${minY}px`,
        width: `${w}px`,
        height: `${h}px`,
        clipPath: `polygon(${hull.map(
          (point) => `${(point.x - minX) / w * 100}% ${(point.y - minY) / h * 100}%`
        ).join(",")})`,
        visibility: "visible",
        zIndex: String(
          Math.round(100 - camera.position.distanceTo(item.group.position))
        )
      });
    }
  };
  const canRender = () => !disposed && !document.hidden && stage.isConnected;
  const render = (now) => {
    frame = void 0;
    if (!canRender())
      return;
    if (now - lastDraw < 1e3 / 60 - 0.1) {
      invalidate();
      return;
    }
    const elapsed = Math.min((now - lastDraw) / 1e3, 0.1);
    lastDraw = now;
    if (transitionActive && transition) {
      transition.totalTime(
        Math.min((now - motionStart) / 1e3, transition.duration())
      );
    }
    if (!selected)
      headCurrent.lerp(headTarget, 1 - Math.exp(-elapsed * 18));
    const moving = !selected && headCurrent.distanceToSquared(headTarget) > 1e-6;
    if (!moving && !selected)
      headCurrent.copy(headTarget);
    headAngles.set(
      THREE.MathUtils.degToRad(7 + headCurrent.y * 14),
      THREE.MathUtils.degToRad(headCurrent.x * 28),
      0
    );
    headQuaternion.setFromEuler(headAngles);
    headRotation.value.set(
      headQuaternion.x,
      headQuaternion.y,
      headQuaternion.z,
      headQuaternion.w
    );
    camera.lookAt(lookAt);
    camera.updateMatrixWorld();
    ground.rotation.y = Math.atan2(
      camera.position.x - lookAt.x,
      camera.position.z - lookAt.z
    );
    monuments.updateMatrixWorld(true);
    if (hasPointer)
      hovered = raycast({ clientX: lastPointer.x, clientY: lastPointer.y }) || null;
    let hoverMoving = false;
    for (const item of obelisks) {
      const hoverTarget = hovered === item.category.id ? 1 : 0;
      item.hoverStrength = THREE.MathUtils.damp(
        item.hoverStrength,
        hoverTarget,
        18,
        elapsed
      );
      if (Math.abs(item.hoverStrength - hoverTarget) > 1e-3)
        hoverMoving = true;
      else
        item.hoverStrength = hoverTarget;
      const dim = 1 - 0.84 * blur.value * (1 - item.strength);
      item.surface.envMapIntensity = 0.4 * dim;
      item.crystal.envMapIntensity = 0.65 * dim;
      item.surface.emissiveIntensity = 0.1 + item.strength * 0.38;
      item.surface.color.setHex(2164494).multiplyScalar(dim);
      item.reflected.position.set(
        item.group.position.x - item.category.x,
        0,
        item.group.position.z - item.category.z
      );
      item.crystal.emissiveIntensity = (0.38 + Math.max(item.strength, item.hoverStrength) * 0.7) * dim;
      item.core.material.opacity = (0.24 + item.hoverStrength * 0.12) * dim;
      item.edge.opacity = (0.48 + item.strength * 0.5 + (hovered === item.category.id ? 0.16 : 0)) * dim;
      item.labelMaterial.color.setScalar(dim);
      item.glowMaterial.opacity = 0.3 * dim;
      const illumination = item.strength * 0.5;
      item.beamMaterial.uniforms.intensity.value = illumination;
      item.poolMaterial.opacity = illumination * 0.8;
      item.spot.intensity = illumination * 55;
      item.spot.position.set(
        item.group.position.x,
        12,
        item.group.position.z + 0.6
      );
      item.spot.target.position.set(
        item.group.position.x,
        1,
        item.group.position.z
      );
    }
    const active = obelisks.find((item) => item.category.id === selected);
    if (active) {
      screenPoint.set(active.category.x, 2.7, active.category.z).applyMatrix4(camera.matrixWorldInverse);
      focus.value = -screenPoint.z;
    }
    document.body.style.setProperty(
      "--island-zodiac-blur",
      `${(blur.value * 4).toFixed(3)}px`
    );
    stage.dataset.statueZ = String(statue.position.z);
    stage.dataset.monumentZ = obelisks.map((item) => item.group.position.z.toFixed(3)).join(",");
    stage.dataset.monumentYaw = obelisks.map((item) => THREE.MathUtils.radToDeg(item.group.rotation.y).toFixed(1)).join(",");
    stage.dataset.headRotation = headRotation.value.toArray().map((value) => value.toFixed(6)).join(",");
    stage.dataset.hovered = hovered || "none";
    stage.dataset.capGlow = obelisks.map((item) => item.crystal.emissiveIntensity.toFixed(3)).join(",");
    stage.dataset.topLight = obelisks.map((item) => item.beamMaterial.uniforms.intensity.value.toFixed(3)).join(",");
    renderer.setRenderTarget(blur.value > 1e-3 ? target : null);
    renderer.render(scene, camera);
    if (blur.value > 1e-3) {
      renderer.setRenderTarget(null);
      renderer.render(postScene, postCamera);
    }
    projectButtons();
    stage.dataset.cameraPosition = camera.position.toArray().map((value) => value.toFixed(4)).join(",");
    stage.dataset.cameraTarget = lookAt.toArray().map((value) => value.toFixed(4)).join(",");
    if (moving || transitionActive || hoverMoving)
      invalidate();
  };
  function invalidate() {
    if (frame === void 0 && canRender())
      frame = requestAnimationFrame(render);
  }
  const resize = () => {
    if (!stage.clientWidth || !stage.clientHeight)
      return;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.setSize(stage.clientWidth, stage.clientHeight, false);
    camera.aspect = stage.clientWidth / stage.clientHeight;
    homePosition.z = Math.max(17.5, 31 / camera.aspect);
    if (!selected && !transitionActive)
      camera.position.copy(homePosition);
    camera.updateProjectionMatrix();
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    target.setSize(size.x, size.y);
    post.uniforms.texel.value.set(1 / size.x, 1 / size.y);
    invalidate();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(stage);
  resize();
  const select = (id) => {
    if (!ready || disposed)
      return;
    const next = selected === id ? null : id;
    if (next === selected)
      return;
    if (!selected && next)
      headTarget.copy(headCurrent);
    selected = next;
    if (!selected)
      headTarget.copy(pointerTarget);
    callbacks.select(selected);
    transition?.kill();
    const item = obelisks.find((obelisk) => obelisk.category.id === selected);
    const duration = reducedMotion ? 0.01 : 1.65;
    transitionActive = true;
    motionStart = performance.now();
    transition = gsap.timeline({
      paused: true,
      onUpdate: invalidate,
      onComplete: () => {
        transitionActive = false;
        callbacks.settled();
        invalidate();
      }
    });
    let destination = homePosition.clone();
    let aim = homeTarget.clone();
    if (item) {
      const side = Math.sign(item.category.x);
      const outer = Math.abs(item.category.x) > 5;
      const distance = outer ? (homePosition.z - item.category.z + 4.8) * 0.5 : statueZ - item.category.z + 11.2;
      const yaw = Math.atan2(8.8, 12.8) * (outer ? 0.5 : 0.35);
      const pitch = Math.atan2(5.5, Math.hypot(8.8, 12.8)) * (outer ? 0.5 : 0.4);
      destination = new THREE.Vector3(
        item.category.x - side * distance * Math.tan(THREE.MathUtils.degToRad(13)),
        outer ? 1.1 : 2,
        item.category.z + distance
      );
      aim = destination.clone().add(
        new THREE.Vector3(
          -side * Math.sin(yaw) * 15.5,
          Math.tan(pitch) * 15.5,
          -Math.cos(yaw) * 15.5
        )
      );
    }
    transition.to(
      camera,
      {
        fov: item ? Math.abs(item.category.x) > 5 ? 54 : 64 : 38,
        duration,
        ease: "power3.inOut",
        onUpdate: () => camera.updateProjectionMatrix()
      },
      0
    );
    transition.to(
      camera.position,
      {
        x: destination.x,
        y: destination.y,
        z: destination.z,
        duration,
        ease: "power3.inOut"
      },
      0
    ).to(
      lookAt,
      { x: aim.x, y: aim.y, z: aim.z, duration, ease: "power3.inOut" },
      0
    ).to(
      blur,
      { value: item ? 1 : 0, duration: duration * 0.8, ease: "power2.inOut" },
      0
    );
    for (const obelisk of obelisks) {
      transition.to(
        obelisk,
        {
          strength: obelisk === item ? 1 : 0,
          duration: duration * 0.65,
          ease: "power2.out"
        },
        0
      );
      const outer = Math.abs(obelisk.category.x) > 5;
      const opposite = item && Math.sign(obelisk.category.x) !== Math.sign(item.category.x);
      const innerFocus = item && Math.abs(item.category.x) < 5;
      transition.to(
        obelisk.group.position,
        {
          x: innerFocus && opposite ? Math.sign(obelisk.category.x) * (outer ? 8.1 : 5) : item && outer && obelisk !== item ? Math.sign(obelisk.category.x) * (opposite ? 7.8 : 9.4) : obelisk.category.x,
          z: innerFocus && opposite ? outer ? -9 : -7.5 : item && obelisk !== item ? outer ? opposite ? -5.6 : -9 : -8 : obelisk.category.z,
          duration,
          ease: "power3.inOut"
        },
        0
      );
    }
    invalidate();
  };
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const raycast = (event) => {
    const bounds = renderer.domElement.getBoundingClientRect();
    pointer.set(
      (event.clientX - bounds.left) / bounds.width * 2 - 1,
      -(event.clientY - bounds.top) / bounds.height * 2 + 1
    );
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(
      obelisks.flatMap((item) => [item.body, item.cap])
    )[0]?.object.userData.category;
  };
  const click = (event) => {
    const id = raycast(event);
    if (id)
      select(id);
    else if (selected)
      select(null);
  };
  renderer.domElement.addEventListener("click", click);
  const follow = (event) => {
    if (!canRender())
      return;
    hasPointer = true;
    lastPointer.set(event.clientX, event.clientY);
    pointerTarget.set(
      (event.clientX / innerWidth - 0.5) * 2,
      (event.clientY / innerHeight - 0.5) * 2
    ).clampScalar(-1, 1);
    const nextHover = raycast(event) || null;
    const hoverChanged = hovered !== nextHover;
    hovered = nextHover;
    if (!selected)
      headTarget.copy(pointerTarget);
    if (!selected || hoverChanged)
      invalidate();
  };
  let unsubscribe;
  const syncActivity = () => {
    if (document.hidden) {
      unsubscribe?.();
      unsubscribe = void 0;
      if (frame !== void 0)
        cancelAnimationFrame(frame);
      frame = void 0;
      hiddenAt = performance.now();
    } else {
      if (ready && !unsubscribe)
        unsubscribe = subscribePointerSamples(follow, 1e3 / 30);
      if (hiddenAt && transitionActive)
        motionStart += performance.now() - hiddenAt;
      hiddenAt = 0;
      invalidate();
    }
  };
  document.addEventListener("visibilitychange", syncActivity);
  const resetPointer = () => {
    hasPointer = false;
    pointerTarget.set(0, 0);
    if (!selected)
      headTarget.copy(pointerTarget);
    hovered = null;
    invalidate();
  };
  document.documentElement.addEventListener("pointerleave", resetPointer);
  loadIslandLucarioModel().then(({ metadata, buffer, environment, radiance }) => {
    if (disposed)
      return;
    const environmentTexture = texture(
      new THREE.DataTexture(
        new Uint16Array(radiance),
        environment.width,
        environment.height,
        THREE.RGBAFormat,
        THREE.HalfFloatType
      )
    );
    environmentTexture.mapping = THREE.CubeUVReflectionMapping;
    environmentTexture.minFilter = THREE.LinearFilter;
    environmentTexture.magFilter = THREE.LinearFilter;
    environmentTexture.needsUpdate = true;
    scene.environment = environmentTexture;
    const surface = geometry(new THREE.BufferGeometry());
    for (const [name, source, itemSize] of [
      ["position", "positions", 3],
      ["normal", "normals", 3],
      ["headInfluence", "weights", 1]
    ]) {
      const attribute = metadata.attributes[source];
      surface.setAttribute(
        name,
        new THREE.BufferAttribute(
          new Float32Array(buffer, attribute.offset, attribute.count),
          itemSize
        )
      );
    }
    const indices = metadata.attributes.indices;
    surface.setIndex(
      new THREE.BufferAttribute(
        new Uint16Array(buffer, indices.offset, indices.count),
        1
      )
    );
    headPivot.value.fromArray(metadata.headPivot);
    const mesh = new THREE.Mesh(surface, chromeMaterial);
    mesh.position.fromArray(metadata.center).multiplyScalar(-1);
    const cropY = 1.2;
    const modelScale = 6.7 * 1.6 / metadata.size[1];
    statue.scale.setScalar(modelScale);
    statue.position.y = 0.52 - (cropY - metadata.center[1]) * modelScale;
    statue.add(mesh);
    mirror(statue, reflection, 0.18);
    for (const [name, value] of Object.entries(metadata.stats))
      stage.dataset[name] = String(value);
    stage.dataset.materialPhase = "chrome";
    ready = true;
    stage.dataset.entranceFinished = "true";
    callbacks.ready();
    syncActivity();
  }).catch((error) => {
    if (!disposed)
      callbacks.error(error);
  });
  return {
    select,
    dispose: () => {
      disposed = true;
      transition?.kill();
      document.body.style.removeProperty("--island-zodiac-blur");
      unsubscribe?.();
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncActivity);
      document.documentElement.removeEventListener("pointerleave", resetPointer);
      renderer.domElement.removeEventListener("click", click);
      if (frame !== void 0)
        cancelAnimationFrame(frame);
      geometries.forEach((value) => value.dispose());
      materials.forEach((value) => value.dispose());
      textures.forEach((value) => value.dispose());
      target.depthTexture?.dispose();
      target.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    }
  };
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImlzbGFuZFRlbXBsZVNjZW5lLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGdzYXAgfSBmcm9tICdnc2FwJ1xuaW1wb3J0ICogYXMgVEhSRUUgZnJvbSAndGhyZWUnXG5cbmltcG9ydCB7IGxvYWRJc2xhbmRMdWNhcmlvTW9kZWwgfSBmcm9tICdAL3V0aWxzL2lzbGFuZEx1Y2FyaW9Nb2RlbCdcbmltcG9ydCB7IHN1YnNjcmliZVBvaW50ZXJTYW1wbGVzIH0gZnJvbSAnQC91dGlscy9wb2ludGVyU2FtcGxlcydcblxuaW1wb3J0IHsgdGVtcGxlQ2F0ZWdvcmllcywgdHlwZSBUZW1wbGVDYXRlZ29yeUlkIH0gZnJvbSAnLi90ZW1wbGVDYXRlZ29yaWVzJ1xuXG5pbnRlcmZhY2UgVGVtcGxlQ2FsbGJhY2tzIHtcbiAgcmVhZHk6ICgpID0+IHZvaWRcbiAgc2VsZWN0OiAoaWQ6IFRlbXBsZUNhdGVnb3J5SWQgfCBudWxsKSA9PiB2b2lkXG4gIHNldHRsZWQ6ICgpID0+IHZvaWRcbiAgZXJyb3I6IChlcnJvcjogdW5rbm93bikgPT4gdm9pZFxufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlSXNsYW5kVGVtcGxlKFxuICBzdGFnZTogSFRNTEVsZW1lbnQsXG4gIGJ1dHRvbnM6IE1hcDxzdHJpbmcsIEhUTUxFbGVtZW50PixcbiAgY2FsbGJhY2tzOiBUZW1wbGVDYWxsYmFja3Ncbikge1xuICBjb25zdCByZW5kZXJlciA9IG5ldyBUSFJFRS5XZWJHTFJlbmRlcmVyKHsgYWxwaGE6IHRydWUsIGFudGlhbGlhczogdHJ1ZSB9KVxuICByZW5kZXJlci5zZXRDbGVhckNvbG9yKDB4MDAwMDAwLCAwKVxuICByZW5kZXJlci5vdXRwdXRDb2xvclNwYWNlID0gVEhSRUUuU1JHQkNvbG9yU3BhY2VcbiAgcmVuZGVyZXIudG9uZU1hcHBpbmcgPSBUSFJFRS5BQ0VTRmlsbWljVG9uZU1hcHBpbmdcbiAgcmVuZGVyZXIudG9uZU1hcHBpbmdFeHBvc3VyZSA9IDEuMDVcbiAgcmVuZGVyZXIubG9jYWxDbGlwcGluZ0VuYWJsZWQgPSB0cnVlXG4gIHJlbmRlcmVyLmRvbUVsZW1lbnQuc2V0QXR0cmlidXRlKCdyb2xlJywgJ2ltZycpXG4gIHJlbmRlcmVyLmRvbUVsZW1lbnQuc2V0QXR0cmlidXRlKFxuICAgICdhcmlhLWxhYmVsJyxcbiAgICAn5aS06YOo6Lef6ZqP5oyH6ZKI55qE6Lev5Y2h5Yip5qyn5LiJ57u05qih5Z6LJ1xuICApXG4gIHN0YWdlLmFwcGVuZENoaWxkKHJlbmRlcmVyLmRvbUVsZW1lbnQpXG4gIHN0YWdlLmRhdGFzZXQubWF4RnBzID0gJzYwJ1xuICBzdGFnZS5kYXRhc2V0LnBvaW50ZXJTYW1wbGVNcyA9IFN0cmluZygxMDAwIC8gMzApXG5cbiAgY29uc3Qgc2NlbmUgPSBuZXcgVEhSRUUuU2NlbmUoKVxuICBjb25zdCBjYW1lcmEgPSBuZXcgVEhSRUUuUGVyc3BlY3RpdmVDYW1lcmEoMzgsIDEsIDAuMSwgMTAwKVxuICBjb25zdCBsb29rQXQgPSBuZXcgVEhSRUUuVmVjdG9yMygwLCA0LCAtMilcbiAgY29uc3QgaG9tZVBvc2l0aW9uID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwgMS4zLCAyMClcbiAgY29uc3QgaG9tZVRhcmdldCA9IGxvb2tBdC5jbG9uZSgpXG4gIGNhbWVyYS5wb3NpdGlvbi5jb3B5KGhvbWVQb3NpdGlvbilcbiAgY29uc3QgZ2VvbWV0cmllcyA9IG5ldyBTZXQ8VEhSRUUuQnVmZmVyR2VvbWV0cnk+KClcbiAgY29uc3QgbWF0ZXJpYWxzID0gbmV3IFNldDxUSFJFRS5NYXRlcmlhbD4oKVxuICBjb25zdCB0ZXh0dXJlcyA9IG5ldyBTZXQ8VEhSRUUuVGV4dHVyZT4oKVxuICBjb25zdCBnZW9tZXRyeSA9IDxUIGV4dGVuZHMgVEhSRUUuQnVmZmVyR2VvbWV0cnk+KHZhbHVlOiBUKTogVCA9PiB7XG4gICAgZ2VvbWV0cmllcy5hZGQodmFsdWUpXG4gICAgcmV0dXJuIHZhbHVlXG4gIH1cbiAgY29uc3QgbWF0ZXJpYWwgPSA8VCBleHRlbmRzIFRIUkVFLk1hdGVyaWFsPih2YWx1ZTogVCk6IFQgPT4ge1xuICAgIG1hdGVyaWFscy5hZGQodmFsdWUpXG4gICAgcmV0dXJuIHZhbHVlXG4gIH1cbiAgY29uc3QgdGV4dHVyZSA9IDxUIGV4dGVuZHMgVEhSRUUuVGV4dHVyZT4odmFsdWU6IFQpOiBUID0+IHtcbiAgICB0ZXh0dXJlcy5hZGQodmFsdWUpXG4gICAgcmV0dXJuIHZhbHVlXG4gIH1cbiAgbGV0IGRpc3Bvc2VkID0gZmFsc2VcbiAgbGV0IHJlYWR5ID0gZmFsc2VcbiAgbGV0IGZyYW1lOiBudW1iZXIgfCB1bmRlZmluZWRcbiAgbGV0IGxhc3REcmF3ID0gMFxuICBsZXQgc2VsZWN0ZWQ6IFRlbXBsZUNhdGVnb3J5SWQgfCBudWxsID0gbnVsbFxuICBsZXQgdHJhbnNpdGlvbjogZ3NhcC5jb3JlLlRpbWVsaW5lIHwgdW5kZWZpbmVkXG4gIGxldCB0cmFuc2l0aW9uQWN0aXZlID0gZmFsc2VcbiAgbGV0IG1vdGlvblN0YXJ0ID0gMFxuICBsZXQgaGlkZGVuQXQgPSAwXG4gIGxldCBob3ZlcmVkOiBUZW1wbGVDYXRlZ29yeUlkIHwgbnVsbCA9IG51bGxcbiAgY29uc3QgbGFzdFBvaW50ZXIgPSBuZXcgVEhSRUUuVmVjdG9yMigpXG4gIGxldCBoYXNQb2ludGVyID0gZmFsc2VcbiAgY29uc3QgcmVkdWNlZE1vdGlvbiA9IG1hdGNoTWVkaWEoJyhwcmVmZXJzLXJlZHVjZWQtbW90aW9uOiByZWR1Y2UpJykubWF0Y2hlc1xuXG4gIGNvbnN0IHJlZmxlY3Rpb24gPSBuZXcgVEhSRUUuR3JvdXAoKVxuICByZWZsZWN0aW9uLnNjYWxlLnkgPSAtMVxuICBzY2VuZS5hZGQocmVmbGVjdGlvbilcbiAgY29uc3QgbW9udW1lbnRzID0gbmV3IFRIUkVFLkdyb3VwKClcbiAgc2NlbmUuYWRkKG1vbnVtZW50cylcbiAgc2NlbmUuYWRkKG5ldyBUSFJFRS5BbWJpZW50TGlnaHQoMHhiNDVkNzEsIDAuNjUpKVxuICBjb25zdCBrZXkgPSBuZXcgVEhSRUUuRGlyZWN0aW9uYWxMaWdodCgweGZmYjdjOSwgMS42KVxuICBrZXkucG9zaXRpb24uc2V0KC01LCAxMCwgOClcbiAgc2NlbmUuYWRkKGtleSlcbiAgY29uc3QgcmltID0gbmV3IFRIUkVFLkRpcmVjdGlvbmFsTGlnaHQoMHhmMjExNDgsIDIuOClcbiAgcmltLnBvc2l0aW9uLnNldCg2LCA2LCAtOSlcbiAgc2NlbmUuYWRkKHJpbSlcblxuICAvLyDmiYDmnInmlrnlsJbnopHlhbHnlKjlh6DkvZXkvZPvvJvpobbpg6jni6znq4vkvb/nlKjlrozmlbTnmoTlm5vpnaLplKXkvZPjgIJcbiAgY29uc3QgYm9keUdlb21ldHJ5ID0gZ2VvbWV0cnkobmV3IFRIUkVFLkJveEdlb21ldHJ5KDEuMywgNC41NSwgMS4zKSlcbiAgY29uc3QgcG9zaXRpb25zID0gYm9keUdlb21ldHJ5LmF0dHJpYnV0ZXMucG9zaXRpb25cbiAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IHBvc2l0aW9ucy5jb3VudDsgaW5kZXgrKykge1xuICAgIGNvbnN0IHRhcGVyID0gcG9zaXRpb25zLmdldFkoaW5kZXgpID4gMCA/IDAuNzIgOiAxXG4gICAgcG9zaXRpb25zLnNldFgoaW5kZXgsIHBvc2l0aW9ucy5nZXRYKGluZGV4KSAqIHRhcGVyKVxuICAgIHBvc2l0aW9ucy5zZXRaKGluZGV4LCBwb3NpdGlvbnMuZ2V0WihpbmRleCkgKiB0YXBlcilcbiAgfVxuICBib2R5R2VvbWV0cnkuY29tcHV0ZVZlcnRleE5vcm1hbHMoKVxuICBjb25zdCBjYXBHZW9tZXRyeSA9IGdlb21ldHJ5KG5ldyBUSFJFRS5Db25lR2VvbWV0cnkoMC42NjMsIDEuMDUsIDQpKVxuICBjYXBHZW9tZXRyeS5yb3RhdGVZKE1hdGguUEkgLyA0KVxuICBjb25zdCBmb290R2VvbWV0cnkgPSBnZW9tZXRyeShuZXcgVEhSRUUuQm94R2VvbWV0cnkoMS44LCAwLjIxLCAxLjgpKVxuICBjb25zdCBzdGVwR2VvbWV0cnkgPSBnZW9tZXRyeShuZXcgVEhSRUUuQm94R2VvbWV0cnkoMi4zNSwgMC4xMywgMi4zNSkpXG4gIGNvbnN0IGVkZ2VHZW9tZXRyeSA9IGdlb21ldHJ5KG5ldyBUSFJFRS5FZGdlc0dlb21ldHJ5KGJvZHlHZW9tZXRyeSwgMjUpKVxuICBjb25zdCBjYXBFZGdlcyA9IGdlb21ldHJ5KG5ldyBUSFJFRS5FZGdlc0dlb21ldHJ5KGNhcEdlb21ldHJ5LCAyNSkpXG4gIGNvbnN0IGxhYmVsR2VvbWV0cnkgPSBnZW9tZXRyeShuZXcgVEhSRUUuUGxhbmVHZW9tZXRyeSgwLjgyLCA0LjIyKSlcbiAgY29uc3QgcGxpbnRoTWF0ZXJpYWwgPSBtYXRlcmlhbChcbiAgICBuZXcgVEhSRUUuTWVzaFN0YW5kYXJkTWF0ZXJpYWwoe1xuICAgICAgY29sb3I6IDB4MDkwMjA1LFxuICAgICAgbWV0YWxuZXNzOiAwLjgsXG4gICAgICByb3VnaG5lc3M6IDAuNDIsXG4gICAgICBlbnZNYXBJbnRlbnNpdHk6IDAuMyxcbiAgICB9KVxuICApXG5cbiAgY29uc3QgZ2xvd0NhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpXG4gIGdsb3dDYW52YXMud2lkdGggPSBnbG93Q2FudmFzLmhlaWdodCA9IDEyOFxuICBjb25zdCBnbG93Q29udGV4dCA9IGdsb3dDYW52YXMuZ2V0Q29udGV4dCgnMmQnKSFcbiAgY29uc3QgZ3JhZGllbnQgPSBnbG93Q29udGV4dC5jcmVhdGVSYWRpYWxHcmFkaWVudCg2NCwgNjQsIDAsIDY0LCA2NCwgNjQpXG4gIGdyYWRpZW50LmFkZENvbG9yU3RvcCgwLCAncmdiYSgyNTUsMzUsODEsMC43KScpXG4gIGdyYWRpZW50LmFkZENvbG9yU3RvcCgwLjIyLCAncmdiYSgxOTksOSw0OSwwLjMpJylcbiAgZ3JhZGllbnQuYWRkQ29sb3JTdG9wKDEsICdyZ2JhKDEyMCwwLDIyLDApJylcbiAgZ2xvd0NvbnRleHQuZmlsbFN0eWxlID0gZ3JhZGllbnRcbiAgZ2xvd0NvbnRleHQuZmlsbFJlY3QoMCwgMCwgMTI4LCAxMjgpXG4gIGNvbnN0IGdsb3dNYXAgPSB0ZXh0dXJlKG5ldyBUSFJFRS5DYW52YXNUZXh0dXJlKGdsb3dDYW52YXMpKVxuICBnbG93TWFwLmNvbG9yU3BhY2UgPSBUSFJFRS5TUkdCQ29sb3JTcGFjZVxuICBjb25zdCBnbG93R2VvbWV0cnkgPSBnZW9tZXRyeShuZXcgVEhSRUUuUGxhbmVHZW9tZXRyeSg1LCA1KSlcblxuICBjb25zdCBsYWJlbFRleHR1cmUgPSAocm9tYW46IHN0cmluZywgdGl0bGU6IHN0cmluZykgPT4ge1xuICAgIGNvbnN0IGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpXG4gICAgY2FudmFzLndpZHRoID0gMjU2XG4gICAgY2FudmFzLmhlaWdodCA9IDE1MzZcbiAgICBjb25zdCBjb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJykhXG4gICAgY29udGV4dC50ZXh0QWxpZ24gPSAnY2VudGVyJ1xuICAgIGNvbnRleHQudGV4dEJhc2VsaW5lID0gJ21pZGRsZSdcbiAgICBjb25zdCBwYWludCA9ICgpID0+IHtcbiAgICAgIGNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIDI1NiwgMTUzNilcbiAgICAgIGNvbnRleHQuZmlsbFN0eWxlID0gJyNmNTJlNWInXG4gICAgICBjb250ZXh0LmZvbnQgPSAnNzAwIDcycHggVW5ib3VuZGVkU2Fucywgc2Fucy1zZXJpZidcbiAgICAgIGNvbnRleHQuZmlsbFRleHQocm9tYW4sIDEyOCwgMTMwKVxuICAgICAgY29udGV4dC5zYXZlKClcbiAgICAgIGNvbnRleHQudHJhbnNsYXRlKDEyOCwgODEwKVxuICAgICAgY29udGV4dC5yb3RhdGUoTWF0aC5QSSAvIDIpXG4gICAgICBjb250ZXh0LmZpbGxTdHlsZSA9ICcjZmZmM2Y1J1xuICAgICAgY29udGV4dC5mb250ID0gJzgwMCA5MHB4IFVuYm91bmRlZFNhbnMsIHNhbnMtc2VyaWYnXG4gICAgICBjb25zdCBzcGFjaW5nID0gMTNcbiAgICAgIGNvbnN0IHdpZHRocyA9IFsuLi50aXRsZV0ubWFwKFxuICAgICAgICAobGV0dGVyKSA9PiBjb250ZXh0Lm1lYXN1cmVUZXh0KGxldHRlcikud2lkdGhcbiAgICAgIClcbiAgICAgIGxldCB4ID1cbiAgICAgICAgLShcbiAgICAgICAgICB3aWR0aHMucmVkdWNlKChzdW0sIHdpZHRoKSA9PiBzdW0gKyB3aWR0aCwgMCkgK1xuICAgICAgICAgIHNwYWNpbmcgKiAodGl0bGUubGVuZ3RoIC0gMSlcbiAgICAgICAgKSAvIDJcbiAgICAgIGNvbnRleHQudGV4dEFsaWduID0gJ2xlZnQnXG4gICAgICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgdGl0bGUubGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICAgIGNvbnRleHQuZmlsbFRleHQodGl0bGVbaW5kZXhdLCB4LCAwKVxuICAgICAgICB4ICs9IHdpZHRoc1tpbmRleF0gKyBzcGFjaW5nXG4gICAgICB9XG4gICAgICBjb250ZXh0LnJlc3RvcmUoKVxuICAgIH1cbiAgICBwYWludCgpXG4gICAgY29uc3QgbWFwID0gdGV4dHVyZShuZXcgVEhSRUUuQ2FudmFzVGV4dHVyZShjYW52YXMpKVxuICAgIG1hcC5jb2xvclNwYWNlID0gVEhSRUUuU1JHQkNvbG9yU3BhY2VcbiAgICBtYXAuYW5pc290cm9weSA9IE1hdGgubWluKDQsIHJlbmRlcmVyLmNhcGFiaWxpdGllcy5nZXRNYXhBbmlzb3Ryb3B5KCkpXG4gICAgZG9jdW1lbnQuZm9udHMucmVhZHkudGhlbigoKSA9PiB7XG4gICAgICBpZiAoZGlzcG9zZWQpIHJldHVyblxuICAgICAgcGFpbnQoKVxuICAgICAgbWFwLm5lZWRzVXBkYXRlID0gdHJ1ZVxuICAgICAgaW52YWxpZGF0ZSgpXG4gICAgfSlcbiAgICByZXR1cm4gbWFwXG4gIH1cblxuICBjb25zdCBiZWFtR2VvbWV0cnkgPSBnZW9tZXRyeShcbiAgICBuZXcgVEhSRUUuQ3lsaW5kZXJHZW9tZXRyeSgwLjE4LCAxLjcsIDE2LCAzMiwgMSwgdHJ1ZSlcbiAgKVxuICBjb25zdCBwb29sR2VvbWV0cnkgPSBnZW9tZXRyeShuZXcgVEhSRUUuUGxhbmVHZW9tZXRyeSg1LCA1KSlcbiAgY29uc3Qgb2JlbGlza3MgPSB0ZW1wbGVDYXRlZ29yaWVzLm1hcCgoY2F0ZWdvcnkpID0+IHtcbiAgICBjb25zdCBncm91cCA9IG5ldyBUSFJFRS5Hcm91cCgpXG4gICAgZ3JvdXAucG9zaXRpb24uc2V0KGNhdGVnb3J5LngsIDAsIGNhdGVnb3J5LnopXG4gICAgY29uc3QgaW53YXJkQW5nbGUgPSBNYXRoLmFicyhjYXRlZ29yeS54KSA+IDUgPyAzMiA6IDE2XG4gICAgZ3JvdXAucm90YXRpb24ueSA9XG4gICAgICAtTWF0aC5zaWduKGNhdGVnb3J5LngpICogVEhSRUUuTWF0aFV0aWxzLmRlZ1RvUmFkKGlud2FyZEFuZ2xlKVxuICAgIG1vbnVtZW50cy5hZGQoZ3JvdXApXG4gICAgY29uc3Qgc3VyZmFjZSA9IG1hdGVyaWFsKFxuICAgICAgbmV3IFRIUkVFLk1lc2hQaHlzaWNhbE1hdGVyaWFsKHtcbiAgICAgICAgY29sb3I6IDB4MjEwNzBlLFxuICAgICAgICBtZXRhbG5lc3M6IDAuODUsXG4gICAgICAgIHJvdWdobmVzczogMC4yNyxcbiAgICAgICAgY2xlYXJjb2F0OiAwLjUsXG4gICAgICAgIGVudk1hcEludGVuc2l0eTogMC40LFxuICAgICAgICBlbWlzc2l2ZTogMHg0MTA2MTIsXG4gICAgICAgIGVtaXNzaXZlSW50ZW5zaXR5OiAwLjEzLFxuICAgICAgfSlcbiAgICApXG4gICAgY29uc3QgYm9keSA9IG5ldyBUSFJFRS5NZXNoKGJvZHlHZW9tZXRyeSwgc3VyZmFjZSlcbiAgICBib2R5LnBvc2l0aW9uLnkgPSAyLjY2XG4gICAgYm9keS51c2VyRGF0YS5jYXRlZ29yeSA9IGNhdGVnb3J5LmlkXG4gICAgZ3JvdXAuYWRkKGJvZHkpXG4gICAgY29uc3QgY3J5c3RhbCA9IG1hdGVyaWFsKFxuICAgICAgbmV3IFRIUkVFLk1lc2hQaHlzaWNhbE1hdGVyaWFsKHtcbiAgICAgICAgY29sb3I6IDB4NjYwZDI1LFxuICAgICAgICBlbWlzc2l2ZTogMHg5ZDBjMmYsXG4gICAgICAgIGVtaXNzaXZlSW50ZW5zaXR5OiAwLjIsXG4gICAgICAgIG1ldGFsbmVzczogMC43MixcbiAgICAgICAgcm91Z2huZXNzOiAwLjEzLFxuICAgICAgICB0cmFuc3BhcmVudDogdHJ1ZSxcbiAgICAgICAgb3BhY2l0eTogMC43MixcbiAgICAgICAgc2lkZTogVEhSRUUuRG91YmxlU2lkZSxcbiAgICAgICAgZGVwdGhXcml0ZTogZmFsc2UsXG4gICAgICAgIGZsYXRTaGFkaW5nOiB0cnVlLFxuICAgICAgICBjbGVhcmNvYXQ6IDEsXG4gICAgICAgIGVudk1hcEludGVuc2l0eTogMC42NSxcbiAgICAgIH0pXG4gICAgKVxuICAgIGNvbnN0IGNhcCA9IG5ldyBUSFJFRS5NZXNoKGNhcEdlb21ldHJ5LCBjcnlzdGFsKVxuICAgIGNhcC5wb3NpdGlvbi55ID0gNS40NlxuICAgIGNhcC51c2VyRGF0YS5jYXRlZ29yeSA9IGNhdGVnb3J5LmlkXG4gICAgZ3JvdXAuYWRkKGNhcClcbiAgICBjb25zdCBjb3JlID0gbmV3IFRIUkVFLk1lc2goXG4gICAgICBjYXBHZW9tZXRyeSxcbiAgICAgIG1hdGVyaWFsKFxuICAgICAgICBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe1xuICAgICAgICAgIGNvbG9yOiAweGYwMjY1NixcbiAgICAgICAgICB0cmFuc3BhcmVudDogdHJ1ZSxcbiAgICAgICAgICBvcGFjaXR5OiAwLjI0LFxuICAgICAgICAgIGRlcHRoV3JpdGU6IGZhbHNlLFxuICAgICAgICAgIGJsZW5kaW5nOiBUSFJFRS5BZGRpdGl2ZUJsZW5kaW5nLFxuICAgICAgICB9KVxuICAgICAgKVxuICAgIClcbiAgICBjb3JlLnBvc2l0aW9uLmNvcHkoY2FwLnBvc2l0aW9uKVxuICAgIGNvcmUuc2NhbGUuc2V0KDAuNiwgMC44MiwgMC42KVxuICAgIGdyb3VwLmFkZChjb3JlKVxuICAgIGNvbnN0IGVkZ2UgPSBtYXRlcmlhbChcbiAgICAgIG5ldyBUSFJFRS5MaW5lQmFzaWNNYXRlcmlhbCh7XG4gICAgICAgIGNvbG9yOiAweGVlMzM1YSxcbiAgICAgICAgdHJhbnNwYXJlbnQ6IHRydWUsXG4gICAgICAgIG9wYWNpdHk6IDAuNTgsXG4gICAgICAgIHRvbmVNYXBwZWQ6IGZhbHNlLFxuICAgICAgfSlcbiAgICApXG4gICAgY29uc3QgbGluZXMgPSBuZXcgVEhSRUUuTGluZVNlZ21lbnRzKGVkZ2VHZW9tZXRyeSwgZWRnZSlcbiAgICBsaW5lcy5wb3NpdGlvbi5jb3B5KGJvZHkucG9zaXRpb24pXG4gICAgZ3JvdXAuYWRkKGxpbmVzKVxuICAgIGNvbnN0IGNhcExpbmVzID0gbmV3IFRIUkVFLkxpbmVTZWdtZW50cyhjYXBFZGdlcywgZWRnZSlcbiAgICBjYXBMaW5lcy5wb3NpdGlvbi5jb3B5KGNhcC5wb3NpdGlvbilcbiAgICBncm91cC5hZGQoY2FwTGluZXMpXG4gICAgZm9yIChjb25zdCBbc2hhcGUsIHldIG9mIFtcbiAgICAgIFtzdGVwR2VvbWV0cnksIDAuMDY1XSxcbiAgICAgIFtmb290R2VvbWV0cnksIDAuMjM1XSxcbiAgICBdIGFzIGNvbnN0KSB7XG4gICAgICBjb25zdCBmb290ID0gbmV3IFRIUkVFLk1lc2goc2hhcGUsIHBsaW50aE1hdGVyaWFsKVxuICAgICAgZm9vdC5wb3NpdGlvbi55ID0geVxuICAgICAgZ3JvdXAuYWRkKGZvb3QpXG4gICAgfVxuICAgIGNvbnN0IGxhYmVsTWF0ZXJpYWwgPSBtYXRlcmlhbChcbiAgICAgIG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7XG4gICAgICAgIG1hcDogbGFiZWxUZXh0dXJlKGNhdGVnb3J5LnJvbWFuLCBjYXRlZ29yeS50aXRsZSksXG4gICAgICAgIHRyYW5zcGFyZW50OiB0cnVlLFxuICAgICAgICBkZXB0aFdyaXRlOiBmYWxzZSxcbiAgICAgICAgdG9uZU1hcHBlZDogZmFsc2UsXG4gICAgICB9KVxuICAgIClcbiAgICBjb25zdCBsYWJlbCA9IG5ldyBUSFJFRS5NZXNoKGxhYmVsR2VvbWV0cnksIGxhYmVsTWF0ZXJpYWwpXG4gICAgLy8g5q2j6Z2i6ZqP56KR6Lqr5pS25YiG5YC+5pac77yM5paH5a2X5LiO55+z5p2Q5L+d5oyB5ZCM5LiA5Liq6YCP6KeG5bmz6Z2i44CCXG4gICAgbGFiZWwucG9zaXRpb24uc2V0KDAsIDIuNjYsIDAuNTY1KVxuICAgIGxhYmVsLnJvdGF0aW9uLnggPSAtTWF0aC5hdGFuKDAuMTgyIC8gNC41NSlcbiAgICBncm91cC5hZGQobGFiZWwpXG4gICAgY29uc3QgZ2xvd01hdGVyaWFsID0gbWF0ZXJpYWwoXG4gICAgICBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe1xuICAgICAgICBtYXA6IGdsb3dNYXAsXG4gICAgICAgIHRyYW5zcGFyZW50OiB0cnVlLFxuICAgICAgICBvcGFjaXR5OiAwLjMyLFxuICAgICAgICBkZXB0aFdyaXRlOiBmYWxzZSxcbiAgICAgICAgYmxlbmRpbmc6IFRIUkVFLkFkZGl0aXZlQmxlbmRpbmcsXG4gICAgICB9KVxuICAgIClcbiAgICBjb25zdCBnbG93ID0gbmV3IFRIUkVFLk1lc2goZ2xvd0dlb21ldHJ5LCBnbG93TWF0ZXJpYWwpXG4gICAgZ2xvdy5yb3RhdGlvbi54ID0gLU1hdGguUEkgLyAyXG4gICAgZ2xvdy5wb3NpdGlvbi55ID0gMC4wMThcbiAgICBnbG93LnJlbmRlck9yZGVyID0gMlxuICAgIGdyb3VwLmFkZChnbG93KVxuICAgIGNvbnN0IGJlYW1NYXRlcmlhbCA9IG1hdGVyaWFsKFxuICAgICAgbmV3IFRIUkVFLlNoYWRlck1hdGVyaWFsKHtcbiAgICAgICAgdW5pZm9ybXM6IHsgaW50ZW5zaXR5OiB7IHZhbHVlOiAwIH0gfSxcbiAgICAgICAgdHJhbnNwYXJlbnQ6IHRydWUsXG4gICAgICAgIGRlcHRoV3JpdGU6IGZhbHNlLFxuICAgICAgICBzaWRlOiBUSFJFRS5Eb3VibGVTaWRlLFxuICAgICAgICBibGVuZGluZzogVEhSRUUuQWRkaXRpdmVCbGVuZGluZyxcbiAgICAgICAgdmVydGV4U2hhZGVyOlxuICAgICAgICAgICd2YXJ5aW5nIHZlYzIgdlV2O3ZhcnlpbmcgdmVjMyB3b3JsZDt2YXJ5aW5nIHZlYzMgbm9ybWFsV29ybGQ7dm9pZCBtYWluKCl7dlV2PXV2O3dvcmxkPShtb2RlbE1hdHJpeCp2ZWM0KHBvc2l0aW9uLDEuKSkueHl6O25vcm1hbFdvcmxkPW1hdDMobW9kZWxNYXRyaXgpKm5vcm1hbDtnbF9Qb3NpdGlvbj1wcm9qZWN0aW9uTWF0cml4KnZpZXdNYXRyaXgqdmVjNCh3b3JsZCwxLik7fScsXG4gICAgICAgIGZyYWdtZW50U2hhZGVyOiBgdmFyeWluZyB2ZWMyIHZVdjt2YXJ5aW5nIHZlYzMgd29ybGQ7dmFyeWluZyB2ZWMzIG5vcm1hbFdvcmxkO3VuaWZvcm0gZmxvYXQgaW50ZW5zaXR5O1xuICAgICAgICB2b2lkIG1haW4oKXtcbiAgICAgICAgICBmbG9hdCBlZGdlPXBvdyhhYnMoZG90KG5vcm1hbGl6ZShub3JtYWxXb3JsZCksbm9ybWFsaXplKGNhbWVyYVBvc2l0aW9uLXdvcmxkKSkpLDEuMyk7XG4gICAgICAgICAgZmxvYXQgZmFsbG9mZj1wb3coMS4tdlV2LnksMC43KSpzbW9vdGhzdGVwKDAuLDAuMDUsdlV2LnkpO1xuICAgICAgICAgIGdsX0ZyYWdDb2xvcj12ZWM0KDAuNzgsMC4wMTUsMC4xMCxlZGdlKmZhbGxvZmYqaW50ZW5zaXR5KjAuNSk7XG4gICAgICAgIH1gLFxuICAgICAgfSlcbiAgICApXG4gICAgY29uc3QgYmVhbSA9IG5ldyBUSFJFRS5NZXNoKGJlYW1HZW9tZXRyeSwgYmVhbU1hdGVyaWFsKVxuICAgIGJlYW0ucG9zaXRpb24ueSA9IDguMVxuICAgIGdyb3VwLmFkZChiZWFtKVxuICAgIGNvbnN0IHBvb2xNYXRlcmlhbCA9IG1hdGVyaWFsKFxuICAgICAgbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKHtcbiAgICAgICAgbWFwOiBnbG93TWFwLFxuICAgICAgICB0cmFuc3BhcmVudDogdHJ1ZSxcbiAgICAgICAgb3BhY2l0eTogMCxcbiAgICAgICAgZGVwdGhXcml0ZTogZmFsc2UsXG4gICAgICAgIGJsZW5kaW5nOiBUSFJFRS5BZGRpdGl2ZUJsZW5kaW5nLFxuICAgICAgfSlcbiAgICApXG4gICAgY29uc3QgcG9vbCA9IG5ldyBUSFJFRS5NZXNoKHBvb2xHZW9tZXRyeSwgcG9vbE1hdGVyaWFsKVxuICAgIHBvb2wucG9zaXRpb24ueSA9IDAuMDI1XG4gICAgcG9vbC5yb3RhdGlvbi54ID0gLU1hdGguUEkgLyAyXG4gICAgcG9vbC5yZW5kZXJPcmRlciA9IDNcbiAgICBncm91cC5hZGQocG9vbClcbiAgICBjb25zdCBzcG90ID0gbmV3IFRIUkVFLlNwb3RMaWdodCgweGZmMTc0OSwgMCwgMTUsIE1hdGguUEkgLyAzMiwgMC44NSwgMS41KVxuICAgIHNwb3QucG9zaXRpb24uc2V0KGNhdGVnb3J5LngsIDEyLCBjYXRlZ29yeS56ICsgMC42KVxuICAgIHNwb3QudGFyZ2V0LnBvc2l0aW9uLnNldChjYXRlZ29yeS54LCAxLCBjYXRlZ29yeS56KVxuICAgIHNjZW5lLmFkZChzcG90LCBzcG90LnRhcmdldClcbiAgICByZXR1cm4ge1xuICAgICAgY2F0ZWdvcnksXG4gICAgICBncm91cCxcbiAgICAgIGJvZHksXG4gICAgICBjYXAsXG4gICAgICBzdXJmYWNlLFxuICAgICAgY3J5c3RhbCxcbiAgICAgIGNvcmUsXG4gICAgICBlZGdlLFxuICAgICAgbGFiZWxNYXRlcmlhbCxcbiAgICAgIGdsb3dNYXRlcmlhbCxcbiAgICAgIGJlYW1NYXRlcmlhbCxcbiAgICAgIHBvb2xNYXRlcmlhbCxcbiAgICAgIHNwb3QsXG4gICAgICBzdHJlbmd0aDogMCxcbiAgICAgIGhvdmVyU3RyZW5ndGg6IDAsXG4gICAgICByZWZsZWN0ZWQ6IG5ldyBUSFJFRS5Hcm91cCgpLFxuICAgIH1cbiAgfSlcblxuICAvLyDlnLDpnaLkuI7ov5zlpITlhYnluZXlhbHnlKjmuIXmmbDnmoTovrnnlYzvvJvmsr/plZzlpLTmsLTlubPmnJ3lkJHmjpLliJfvvIzkv53or4HlnLDlubPnur/ml6DlgL7mlpzjgIJcbiAgY29uc3QgZ3JvdW5kID0gbmV3IFRIUkVFLkdyb3VwKClcbiAgc2NlbmUuYWRkKGdyb3VuZClcbiAgY29uc3QgaG9yaXpvblogPSAtNDBcbiAgY29uc3QgZmxvb3IgPSBuZXcgVEhSRUUuTWVzaChcbiAgICBnZW9tZXRyeShuZXcgVEhSRUUuUGxhbmVHZW9tZXRyeSgyNDAsIDE2MCkpLFxuICAgIG1hdGVyaWFsKFxuICAgICAgbmV3IFRIUkVFLlNoYWRlck1hdGVyaWFsKHtcbiAgICAgICAgdHJhbnNwYXJlbnQ6IHRydWUsXG4gICAgICAgIGRlcHRoV3JpdGU6IGZhbHNlLFxuICAgICAgICB2ZXJ0ZXhTaGFkZXI6IGB2YXJ5aW5nIHZlYzMgd29ybGQ7dm9pZCBtYWluKCl7d29ybGQ9KG1vZGVsTWF0cml4KnZlYzQocG9zaXRpb24sMS4pKS54eXo7Z2xfUG9zaXRpb249cHJvamVjdGlvbk1hdHJpeCp2aWV3TWF0cml4KnZlYzQod29ybGQsMS4pO31gLFxuICAgICAgICBmcmFnbWVudFNoYWRlcjogYHZhcnlpbmcgdmVjMyB3b3JsZDt2b2lkIG1haW4oKXtcbiAgICAgICAgZmxvYXQgc2hlZW49MC41KzAuNSpzaW4od29ybGQueio0LitzaW4od29ybGQueCoxLjUpKjAuMjUpO1xuICAgICAgICBnbF9GcmFnQ29sb3I9dmVjNCh2ZWMzKDAuMDA4K3NoZWVuKjAuMDAzLDAuMDAxLDAuMDAzKSwwLjc4KTtcbiAgICAgICAgI2luY2x1ZGUgPHRvbmVtYXBwaW5nX2ZyYWdtZW50PlxuICAgICAgICAjaW5jbHVkZSA8Y29sb3JzcGFjZV9mcmFnbWVudD5cbiAgICAgIH1gLFxuICAgICAgfSlcbiAgICApXG4gIClcbiAgZmxvb3Iucm90YXRpb24ueCA9IC1NYXRoLlBJIC8gMlxuICBmbG9vci5wb3NpdGlvbi5zZXQoMCwgLTAuMDEyLCBob3Jpem9uWiArIDgwKVxuICBmbG9vci5yZW5kZXJPcmRlciA9IDFcbiAgZ3JvdW5kLmFkZChmbG9vcilcbiAgY29uc3QgaG9yaXpvbkdsb3cgPSBuZXcgVEhSRUUuTWVzaChcbiAgICBnZW9tZXRyeShuZXcgVEhSRUUuUGxhbmVHZW9tZXRyeSgyNDAsIDkpKSxcbiAgICBtYXRlcmlhbChcbiAgICAgIG5ldyBUSFJFRS5TaGFkZXJNYXRlcmlhbCh7XG4gICAgICAgIHVuaWZvcm1zOiB7IGdsb3dDb2xvcjogeyB2YWx1ZTogbmV3IFRIUkVFLkNvbG9yKCcjRTIzNDU1JykgfSB9LFxuICAgICAgICB0cmFuc3BhcmVudDogdHJ1ZSxcbiAgICAgICAgZGVwdGhXcml0ZTogZmFsc2UsXG4gICAgICAgIHRvbmVNYXBwZWQ6IGZhbHNlLFxuICAgICAgICBibGVuZGluZzogVEhSRUUuQWRkaXRpdmVCbGVuZGluZyxcbiAgICAgICAgdmVydGV4U2hhZGVyOiBgdmFyeWluZyB2ZWMyIHZVdjt2b2lkIG1haW4oKXt2VXY9dXY7Z2xfUG9zaXRpb249cHJvamVjdGlvbk1hdHJpeCptb2RlbFZpZXdNYXRyaXgqdmVjNChwb3NpdGlvbiwxLik7fWAsXG4gICAgICAgIGZyYWdtZW50U2hhZGVyOiBgdmFyeWluZyB2ZWMyIHZVdjt1bmlmb3JtIHZlYzMgZ2xvd0NvbG9yO3ZvaWQgbWFpbigpe1xuICAgICAgICBmbG9hdCByaXNlPWV4cCgtdlV2LnkqNS4pKigxLi1zbW9vdGhzdGVwKDAuNywxLix2VXYueSkpO1xuICAgICAgICBnbF9GcmFnQ29sb3I9dmVjNChnbG93Q29sb3IscmlzZSowLjM0KTtcbiAgICAgICAgI2luY2x1ZGUgPGNvbG9yc3BhY2VfZnJhZ21lbnQ+XG4gICAgICB9YCxcbiAgICAgIH0pXG4gICAgKVxuICApXG4gIGhvcml6b25HbG93LnBvc2l0aW9uLnNldCgwLCA0LjUgLSAwLjAxMiwgaG9yaXpvblopXG4gIGhvcml6b25HbG93LnJlbmRlck9yZGVyID0gLTFcbiAgZ3JvdW5kLmFkZChob3Jpem9uR2xvdylcbiAgY29uc3Qgc3RhdHVlWiA9IC0zXG4gIGNvbnN0IHBlZGVzdGFsID0gbmV3IFRIUkVFLkdyb3VwKClcbiAgcGVkZXN0YWwucG9zaXRpb24ueiA9IHN0YXR1ZVpcbiAgZm9yIChjb25zdCBbd2lkdGgsIGhlaWdodCwgeV0gb2YgW1xuICAgIFs2LjQsIDAuMTQsIDAuMDddLFxuICAgIFs1LjgsIDAuMTgsIDAuMjNdLFxuICAgIFs1LjIsIDAuMiwgMC40Ml0sXG4gIF0pIHtcbiAgICBjb25zdCBzdGVwID0gbmV3IFRIUkVFLk1lc2goXG4gICAgICBnZW9tZXRyeShuZXcgVEhSRUUuQm94R2VvbWV0cnkod2lkdGgsIGhlaWdodCwgMy4yKSksXG4gICAgICBwbGludGhNYXRlcmlhbFxuICAgIClcbiAgICBzdGVwLnBvc2l0aW9uLnkgPSB5XG4gICAgcGVkZXN0YWwuYWRkKHN0ZXApXG4gIH1cbiAgc2NlbmUuYWRkKHBlZGVzdGFsKVxuICBjb25zdCBzdGF0dWVHbG93ID0gbmV3IFRIUkVFLk1lc2goXG4gICAgZ2VvbWV0cnkobmV3IFRIUkVFLlBsYW5lR2VvbWV0cnkoMTAsIDgpKSxcbiAgICBtYXRlcmlhbChcbiAgICAgIG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7XG4gICAgICAgIG1hcDogZ2xvd01hcCxcbiAgICAgICAgdHJhbnNwYXJlbnQ6IHRydWUsXG4gICAgICAgIG9wYWNpdHk6IDAuNjIsXG4gICAgICAgIGJsZW5kaW5nOiBUSFJFRS5BZGRpdGl2ZUJsZW5kaW5nLFxuICAgICAgICBkZXB0aFdyaXRlOiBmYWxzZSxcbiAgICAgIH0pXG4gICAgKVxuICApXG4gIHN0YXR1ZUdsb3cucm90YXRpb24ueCA9IC1NYXRoLlBJIC8gMlxuICBzdGF0dWVHbG93LnBvc2l0aW9uLnNldCgwLCAwLjAyLCBzdGF0dWVaICsgMSlcbiAgc3RhdHVlR2xvdy5yZW5kZXJPcmRlciA9IDJcbiAgc2NlbmUuYWRkKHN0YXR1ZUdsb3cpXG4gIGNvbnN0IHN0YXR1ZUxpZ2h0ID0gbmV3IFRIUkVFLlBvaW50TGlnaHQoMHhmZjE2NGQsIDQyLCAxMywgMilcbiAgc3RhdHVlTGlnaHQucG9zaXRpb24uc2V0KDAsIDIuNywgc3RhdHVlWiArIDMpXG4gIHNjZW5lLmFkZChzdGF0dWVMaWdodClcblxuICAvLyDkvb/nlKjplZzlg4/lh6DkvZXkvZPkuqfnlJ/nnJ/lrp7pgI/op4bnmoTkvY7kuq7luqblgJLlvbHvvIzml6DpnIDmr4/luKfpop3lpJbmuLLmn5Plj43lsITnm7jmnLrjgIJcbiAgY29uc3QgbWlycm9yID0gKFxuICAgIHNvdXJjZTogVEhSRUUuT2JqZWN0M0QsXG4gICAgdGFyZ2V0OiBUSFJFRS5Hcm91cCxcbiAgICBvcGFjaXR5OiBudW1iZXJcbiAgKSA9PiB7XG4gICAgY29uc3QgY29weSA9IHNvdXJjZS5jbG9uZSh0cnVlKVxuICAgIGNvcHkudHJhdmVyc2UoKG9iamVjdCkgPT4ge1xuICAgICAgaWYgKFxuICAgICAgICAhKG9iamVjdCBpbnN0YW5jZW9mIFRIUkVFLk1lc2ggfHwgb2JqZWN0IGluc3RhbmNlb2YgVEhSRUUuTGluZVNlZ21lbnRzKVxuICAgICAgKVxuICAgICAgICByZXR1cm5cbiAgICAgIGNvbnN0IG9yaWdpbmFsID0gb2JqZWN0Lm1hdGVyaWFsIGFzIFRIUkVFLk1hdGVyaWFsXG4gICAgICBpZiAob3JpZ2luYWwgaW5zdGFuY2VvZiBUSFJFRS5TaGFkZXJNYXRlcmlhbCkge1xuICAgICAgICBvYmplY3QudmlzaWJsZSA9IGZhbHNlXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgY29uc3QgZmFkZWQgPSBtYXRlcmlhbChvcmlnaW5hbC5jbG9uZSgpKVxuICAgICAgZmFkZWQudHJhbnNwYXJlbnQgPSB0cnVlXG4gICAgICBmYWRlZC5vcGFjaXR5ID0gb3BhY2l0eVxuICAgICAgZmFkZWQuZGVwdGhXcml0ZSA9IGZhbHNlXG4gICAgICAvLyDlj43lsITlia/mnKzlnKjlnLDpnaLkuIvkv53nlZnlkIzkuIDmrrXljYrouqvvvIzlubblhbHkuqvljp/mqKHlnovnmoTlpLTpg6jlvaLlj5jjgIJcbiAgICAgIGlmIChvcmlnaW5hbC5jbGlwcGluZ1BsYW5lcz8ubGVuZ3RoKSB7XG4gICAgICAgIGZhZGVkLmNsaXBwaW5nUGxhbmVzID0gb3JpZ2luYWwuY2xpcHBpbmdQbGFuZXMubWFwKFxuICAgICAgICAgIChwbGFuZSkgPT5cbiAgICAgICAgICAgIG5ldyBUSFJFRS5QbGFuZShcbiAgICAgICAgICAgICAgbmV3IFRIUkVFLlZlY3RvcjMoXG4gICAgICAgICAgICAgICAgcGxhbmUubm9ybWFsLngsXG4gICAgICAgICAgICAgICAgLXBsYW5lLm5vcm1hbC55LFxuICAgICAgICAgICAgICAgIHBsYW5lLm5vcm1hbC56XG4gICAgICAgICAgICAgICksXG4gICAgICAgICAgICAgIHBsYW5lLmNvbnN0YW50XG4gICAgICAgICAgICApXG4gICAgICAgIClcbiAgICAgICAgZmFkZWQub25CZWZvcmVDb21waWxlID0gb3JpZ2luYWwub25CZWZvcmVDb21waWxlXG4gICAgICB9XG4gICAgICBvYmplY3QubWF0ZXJpYWwgPSBmYWRlZFxuICAgIH0pXG4gICAgdGFyZ2V0LmFkZChjb3B5KVxuICB9XG4gIGZvciAoY29uc3QgaXRlbSBvZiBvYmVsaXNrcykge1xuICAgIG1pcnJvcihpdGVtLmdyb3VwLCBpdGVtLnJlZmxlY3RlZCwgMC4yKVxuICAgIHJlZmxlY3Rpb24uYWRkKGl0ZW0ucmVmbGVjdGVkKVxuICB9XG4gIG1pcnJvcihwZWRlc3RhbCwgcmVmbGVjdGlvbiwgMC4xNClcblxuICAvLyDmv4DmtLvml7bmiY3lkK/nlKjkuZ3ph4fmoLfmma/mt7HvvJvpu5jorqTnirbmgIHnm7TmjqXnu5jliLbvvIznqbrpl7LjgIHlkI7lj7DlnYflgZzmraLmuLLmn5PjgIJcbiAgY29uc3QgdGFyZ2V0ID0gbmV3IFRIUkVFLldlYkdMUmVuZGVyVGFyZ2V0KDEsIDEsIHtcbiAgICBkZXB0aFRleHR1cmU6IG5ldyBUSFJFRS5EZXB0aFRleHR1cmUoMSwgMSksXG4gIH0pXG4gIGNvbnN0IGZvY3VzID0geyB2YWx1ZTogMjAgfVxuICBjb25zdCBibHVyID0geyB2YWx1ZTogMCB9XG4gIGNvbnN0IHBvc3QgPSBtYXRlcmlhbChcbiAgICBuZXcgVEhSRUUuU2hhZGVyTWF0ZXJpYWwoe1xuICAgICAgdW5pZm9ybXM6IHtcbiAgICAgICAgaW1hZ2U6IHsgdmFsdWU6IHRhcmdldC50ZXh0dXJlIH0sXG4gICAgICAgIGRlcHRoOiB7IHZhbHVlOiB0YXJnZXQuZGVwdGhUZXh0dXJlIH0sXG4gICAgICAgIHRleGVsOiB7IHZhbHVlOiBuZXcgVEhSRUUuVmVjdG9yMigpIH0sXG4gICAgICAgIGZvY3VzLFxuICAgICAgICBibHVyLFxuICAgICAgfSxcbiAgICAgIHZlcnRleFNoYWRlcjpcbiAgICAgICAgJ3ZhcnlpbmcgdmVjMiB2VXY7dm9pZCBtYWluKCl7dlV2PXV2O2dsX1Bvc2l0aW9uPXZlYzQocG9zaXRpb24ueHksMC4sMS4pO30nLFxuICAgICAgZnJhZ21lbnRTaGFkZXI6IGB2YXJ5aW5nIHZlYzIgdlV2O3VuaWZvcm0gc2FtcGxlcjJEIGltYWdlO3VuaWZvcm0gc2FtcGxlcjJEIGRlcHRoO3VuaWZvcm0gdmVjMiB0ZXhlbDt1bmlmb3JtIGZsb2F0IGZvY3VzO3VuaWZvcm0gZmxvYXQgYmx1cjtcbiAgICAgIHZvaWQgbWFpbigpe1xuICAgICAgICBmbG9hdCBkPXRleHR1cmUyRChkZXB0aCx2VXYpLng7XG4gICAgICAgIGZsb2F0IGRpc3RhbmNlPTEwLi8oMTAwLi1kKjk5LjkpO1xuICAgICAgICAvLyDmnKrlhpnlhaXmt7HluqbnmoTlnLDpnaLjgIHlnLDlubPnur/lhYnluZXkv53mjIHmuIXmmbDvvJvlu7rnrZHkvp3nhLbkvb/nlKjmma/mt7HjgIJcbiAgICAgICAgZmxvYXQgYW1vdW50PWQ+MC45OTk5OT8wLjpzbW9vdGhzdGVwKDEuNSw5LixhYnMoZGlzdGFuY2UtZm9jdXMpKSpibHVyO1xuICAgICAgICB2ZWMyIHN0ZXBTaXplPXRleGVsKmFtb3VudCozLjQ7XG4gICAgICAgIHZlYzQgY29sb3I9dGV4dHVyZTJEKGltYWdlLHZVdikqMC4yNDtcbiAgICAgICAgY29sb3IrPXRleHR1cmUyRChpbWFnZSx2VXYrdmVjMihzdGVwU2l6ZS54LDAuKSkqMC4xMjtcbiAgICAgICAgY29sb3IrPXRleHR1cmUyRChpbWFnZSx2VXYtdmVjMihzdGVwU2l6ZS54LDAuKSkqMC4xMjtcbiAgICAgICAgY29sb3IrPXRleHR1cmUyRChpbWFnZSx2VXYrdmVjMigwLixzdGVwU2l6ZS55KSkqMC4xMjtcbiAgICAgICAgY29sb3IrPXRleHR1cmUyRChpbWFnZSx2VXYtdmVjMigwLixzdGVwU2l6ZS55KSkqMC4xMjtcbiAgICAgICAgY29sb3IrPXRleHR1cmUyRChpbWFnZSx2VXYrc3RlcFNpemUpKjAuMDc7XG4gICAgICAgIGNvbG9yKz10ZXh0dXJlMkQoaW1hZ2UsdlV2LXN0ZXBTaXplKSowLjA3O1xuICAgICAgICBjb2xvcis9dGV4dHVyZTJEKGltYWdlLHZVdit2ZWMyKHN0ZXBTaXplLngsLXN0ZXBTaXplLnkpKSowLjA3O1xuICAgICAgICBjb2xvcis9dGV4dHVyZTJEKGltYWdlLHZVdit2ZWMyKC1zdGVwU2l6ZS54LHN0ZXBTaXplLnkpKSowLjA3O1xuICAgICAgICBnbF9GcmFnQ29sb3I9Y29sb3I7XG4gICAgICAgICNpbmNsdWRlIDx0b25lbWFwcGluZ19mcmFnbWVudD5cbiAgICAgICAgI2luY2x1ZGUgPGNvbG9yc3BhY2VfZnJhZ21lbnQ+XG4gICAgICB9YCxcbiAgICAgIHRyYW5zcGFyZW50OiB0cnVlLFxuICAgICAgZGVwdGhUZXN0OiBmYWxzZSxcbiAgICAgIGRlcHRoV3JpdGU6IGZhbHNlLFxuICAgIH0pXG4gIClcbiAgY29uc3QgcG9zdFNjZW5lID0gbmV3IFRIUkVFLlNjZW5lKClcbiAgcG9zdFNjZW5lLmFkZChuZXcgVEhSRUUuTWVzaChnZW9tZXRyeShuZXcgVEhSRUUuUGxhbmVHZW9tZXRyeSgyLCAyKSksIHBvc3QpKVxuICBjb25zdCBwb3N0Q2FtZXJhID0gbmV3IFRIUkVFLkNhbWVyYSgpXG4gIGNvbnN0IGhlYWRSb3RhdGlvbiA9IHsgdmFsdWU6IG5ldyBUSFJFRS5WZWN0b3I0KDAsIDAsIDAsIDEpIH1cbiAgY29uc3QgaGVhZFBpdm90ID0geyB2YWx1ZTogbmV3IFRIUkVFLlZlY3RvcjMoKSB9XG4gIGNvbnN0IGhlYWRDdXJyZW50ID0gbmV3IFRIUkVFLlZlY3RvcjIoKVxuICBjb25zdCBoZWFkVGFyZ2V0ID0gbmV3IFRIUkVFLlZlY3RvcjIoKVxuICBjb25zdCBwb2ludGVyVGFyZ2V0ID0gbmV3IFRIUkVFLlZlY3RvcjIoKVxuICBjb25zdCBoZWFkUXVhdGVybmlvbiA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKClcbiAgY29uc3QgaGVhZEFuZ2xlcyA9IG5ldyBUSFJFRS5FdWxlcigwLCAwLCAwLCAnWVhaJylcbiAgY29uc3Qgc3RhdHVlID0gbmV3IFRIUkVFLkdyb3VwKClcbiAgc3RhdHVlLnBvc2l0aW9uLnNldCgwLCAzLjg3LCBzdGF0dWVaKVxuICBzY2VuZS5hZGQoc3RhdHVlKVxuICBjb25zdCBjaHJvbWVNYXRlcmlhbCA9IG1hdGVyaWFsKFxuICAgIG5ldyBUSFJFRS5NZXNoUGh5c2ljYWxNYXRlcmlhbCh7XG4gICAgICBjb2xvcjogMHhlODRkNmIsXG4gICAgICBzaWRlOiBUSFJFRS5Eb3VibGVTaWRlLFxuICAgICAgbWV0YWxuZXNzOiAxLFxuICAgICAgcm91Z2huZXNzOiAwLjA5LFxuICAgICAgY2xlYXJjb2F0OiAwLjQ1LFxuICAgICAgY2xlYXJjb2F0Um91Z2huZXNzOiAwLjA4LFxuICAgICAgZW52TWFwSW50ZW5zaXR5OiAxLjgsXG4gICAgICBjbGlwcGluZ1BsYW5lczogW25ldyBUSFJFRS5QbGFuZShuZXcgVEhSRUUuVmVjdG9yMygwLCAxLCAwKSwgLTAuNTIpXSxcbiAgICB9KVxuICApXG4gIGNocm9tZU1hdGVyaWFsLm9uQmVmb3JlQ29tcGlsZSA9IChzaGFkZXIpID0+IHtcbiAgICBzaGFkZXIudW5pZm9ybXMuaGVhZFJvdGF0aW9uID0gaGVhZFJvdGF0aW9uXG4gICAgc2hhZGVyLnVuaWZvcm1zLmhlYWRQaXZvdCA9IGhlYWRQaXZvdFxuICAgIHNoYWRlci52ZXJ0ZXhTaGFkZXIgPSBzaGFkZXIudmVydGV4U2hhZGVyXG4gICAgICAucmVwbGFjZShcbiAgICAgICAgJyNpbmNsdWRlIDxjb21tb24+JyxcbiAgICAgICAgYCNpbmNsdWRlIDxjb21tb24+XG4gICAgICBhdHRyaWJ1dGUgZmxvYXQgaGVhZEluZmx1ZW5jZTsgdW5pZm9ybSB2ZWM0IGhlYWRSb3RhdGlvbjsgdW5pZm9ybSB2ZWMzIGhlYWRQaXZvdDtcbiAgICAgIHZlYzMgcm90YXRlSGVhZCh2ZWMzIHYsdmVjNCBxKXtyZXR1cm4gdisyLipjcm9zcyhxLnh5eixjcm9zcyhxLnh5eix2KStxLncqdik7fVxuICAgICAgdmVjNCBnZXRIZWFkUm90YXRpb24oKXtcbiAgICAgICAgaWYoaGVhZEluZmx1ZW5jZT49MC45OTkpcmV0dXJuIGhlYWRSb3RhdGlvbjtcbiAgICAgICAgaWYoaGVhZEluZmx1ZW5jZTw9MC4pcmV0dXJuIHZlYzQoMC4sMC4sMC4sMS4pO1xuICAgICAgICBmbG9hdCBhbmdsZT1hY29zKGNsYW1wKGhlYWRSb3RhdGlvbi53LC0xLiwxLikpO1xuICAgICAgICByZXR1cm4gdmVjNChoZWFkUm90YXRpb24ueHl6KnNpbihhbmdsZSpoZWFkSW5mbHVlbmNlKS9tYXgoc2luKGFuZ2xlKSwwLjAwMDAxKSxjb3MoYW5nbGUqaGVhZEluZmx1ZW5jZSkpO1xuICAgICAgfWBcbiAgICAgIClcbiAgICAgIC5yZXBsYWNlKFxuICAgICAgICAnI2luY2x1ZGUgPGJlZ2lubm9ybWFsX3ZlcnRleD4nLFxuICAgICAgICAnI2luY2x1ZGUgPGJlZ2lubm9ybWFsX3ZlcnRleD5cXG5vYmplY3ROb3JtYWw9cm90YXRlSGVhZChvYmplY3ROb3JtYWwsZ2V0SGVhZFJvdGF0aW9uKCkpOydcbiAgICAgIClcbiAgICAgIC5yZXBsYWNlKFxuICAgICAgICAnI2luY2x1ZGUgPGJlZ2luX3ZlcnRleD4nLFxuICAgICAgICAnI2luY2x1ZGUgPGJlZ2luX3ZlcnRleD5cXG50cmFuc2Zvcm1lZD1yb3RhdGVIZWFkKHRyYW5zZm9ybWVkLWhlYWRQaXZvdCxnZXRIZWFkUm90YXRpb24oKSkraGVhZFBpdm90OydcbiAgICAgIClcbiAgfVxuXG4gIGNvbnN0IHNjcmVlblBvaW50ID0gbmV3IFRIUkVFLlZlY3RvcjMoKVxuICBjb25zdCBoaXRQb2ludHMgPSBbXG4gICAgWy0wLjY1LCAwLjEsIDAuNjVdLFxuICAgIFstMC42NSwgMC4xLCAtMC42NV0sXG4gICAgWzAuNjUsIDAuMSwgMC42NV0sXG4gICAgWzAuNjUsIDAuMSwgLTAuNjVdLFxuICAgIFstMC40NjgsIDQuOTQsIDAuNDY4XSxcbiAgICBbLTAuNDY4LCA0Ljk0LCAtMC40NjhdLFxuICAgIFswLjQ2OCwgNC45NCwgMC40NjhdLFxuICAgIFswLjQ2OCwgNC45NCwgLTAuNDY4XSxcbiAgICBbMCwgNS45OSwgMF0sXG4gIF1cbiAgLy8gRE9NIOS7heaPkOS+m+S4juaKleW9sei9ruW7k+WQu+WQiOeahOaXoOmanOeijeeCueWHu+WMuuWfn++8jOS4jeWPguS4juW7uuetkeeahOe7mOWItuaIlue8qeaUvuOAglxuICBjb25zdCBwcm9qZWN0QnV0dG9ucyA9ICgpID0+IHtcbiAgICBjb25zdCB3aWR0aCA9IHN0YWdlLmNsaWVudFdpZHRoXG4gICAgY29uc3QgaGVpZ2h0ID0gc3RhZ2UuY2xpZW50SGVpZ2h0XG4gICAgZm9yIChjb25zdCBpdGVtIG9mIG9iZWxpc2tzKSB7XG4gICAgICBjb25zdCBidXR0b24gPSBidXR0b25zLmdldChpdGVtLmNhdGVnb3J5LmlkKVxuICAgICAgaWYgKCFidXR0b24pIGNvbnRpbnVlXG4gICAgICBjb25zdCBwb2ludHMgPSBoaXRQb2ludHMubWFwKChbeCwgeSwgel0pID0+IHtcbiAgICAgICAgc2NyZWVuUG9pbnRcbiAgICAgICAgICAuc2V0KHgsIHksIHopXG4gICAgICAgICAgLmFwcGx5TWF0cml4NChpdGVtLmdyb3VwLm1hdHJpeFdvcmxkKVxuICAgICAgICAgIC5wcm9qZWN0KGNhbWVyYSlcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICB4OiAoc2NyZWVuUG9pbnQueCAqIDAuNSArIDAuNSkgKiB3aWR0aCxcbiAgICAgICAgICB5OiAoLXNjcmVlblBvaW50LnkgKiAwLjUgKyAwLjUpICogaGVpZ2h0LFxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgY29uc3Qgc29ydGVkID0gWy4uLnBvaW50c10uc29ydCgoYSwgYikgPT4gYS54IC0gYi54IHx8IGEueSAtIGIueSlcbiAgICAgIGNvbnN0IGNyb3NzID0gKFxuICAgICAgICBvOiAodHlwZW9mIHBvaW50cylbMF0sXG4gICAgICAgIGE6ICh0eXBlb2YgcG9pbnRzKVswXSxcbiAgICAgICAgYjogKHR5cGVvZiBwb2ludHMpWzBdXG4gICAgICApID0+IChhLnggLSBvLngpICogKGIueSAtIG8ueSkgLSAoYS55IC0gby55KSAqIChiLnggLSBvLngpXG4gICAgICBjb25zdCBodWxsOiB0eXBlb2YgcG9pbnRzID0gW11cbiAgICAgIGZvciAoY29uc3QgcG9pbnQgb2Ygc29ydGVkKSB7XG4gICAgICAgIHdoaWxlIChcbiAgICAgICAgICBodWxsLmxlbmd0aCA+PSAyICYmXG4gICAgICAgICAgY3Jvc3MoaHVsbFtodWxsLmxlbmd0aCAtIDJdLCBodWxsW2h1bGwubGVuZ3RoIC0gMV0sIHBvaW50KSA8PSAwXG4gICAgICAgIClcbiAgICAgICAgICBodWxsLnBvcCgpXG4gICAgICAgIGh1bGwucHVzaChwb2ludClcbiAgICAgIH1cbiAgICAgIGNvbnN0IGxvd2VyID0gaHVsbC5sZW5ndGhcbiAgICAgIGZvciAoY29uc3QgcG9pbnQgb2Ygc29ydGVkLnJldmVyc2UoKS5zbGljZSgxKSkge1xuICAgICAgICB3aGlsZSAoXG4gICAgICAgICAgaHVsbC5sZW5ndGggPiBsb3dlciAmJlxuICAgICAgICAgIGNyb3NzKGh1bGxbaHVsbC5sZW5ndGggLSAyXSwgaHVsbFtodWxsLmxlbmd0aCAtIDFdLCBwb2ludCkgPD0gMFxuICAgICAgICApXG4gICAgICAgICAgaHVsbC5wb3AoKVxuICAgICAgICBodWxsLnB1c2gocG9pbnQpXG4gICAgICB9XG4gICAgICBjb25zdCBtaW5YID0gTWF0aC5taW4oLi4ucG9pbnRzLm1hcCgocG9pbnQpID0+IHBvaW50LngpKVxuICAgICAgY29uc3QgbWluWSA9IE1hdGgubWluKC4uLnBvaW50cy5tYXAoKHBvaW50KSA9PiBwb2ludC55KSlcbiAgICAgIGNvbnN0IHcgPSBNYXRoLm1heCguLi5wb2ludHMubWFwKChwb2ludCkgPT4gcG9pbnQueCkpIC0gbWluWFxuICAgICAgY29uc3QgaCA9IE1hdGgubWF4KC4uLnBvaW50cy5tYXAoKHBvaW50KSA9PiBwb2ludC55KSkgLSBtaW5ZXG4gICAgICBPYmplY3QuYXNzaWduKGJ1dHRvbi5zdHlsZSwge1xuICAgICAgICBsZWZ0OiBgJHttaW5YfXB4YCxcbiAgICAgICAgdG9wOiBgJHttaW5ZfXB4YCxcbiAgICAgICAgd2lkdGg6IGAke3d9cHhgLFxuICAgICAgICBoZWlnaHQ6IGAke2h9cHhgLFxuICAgICAgICBjbGlwUGF0aDogYHBvbHlnb24oJHtodWxsXG4gICAgICAgICAgLm1hcChcbiAgICAgICAgICAgIChwb2ludCkgPT5cbiAgICAgICAgICAgICAgYCR7KChwb2ludC54IC0gbWluWCkgLyB3KSAqIDEwMH0lICR7XG4gICAgICAgICAgICAgICAgKChwb2ludC55IC0gbWluWSkgLyBoKSAqIDEwMFxuICAgICAgICAgICAgICB9JWBcbiAgICAgICAgICApXG4gICAgICAgICAgLmpvaW4oJywnKX0pYCxcbiAgICAgICAgdmlzaWJpbGl0eTogJ3Zpc2libGUnLFxuICAgICAgICB6SW5kZXg6IFN0cmluZyhcbiAgICAgICAgICBNYXRoLnJvdW5kKDEwMCAtIGNhbWVyYS5wb3NpdGlvbi5kaXN0YW5jZVRvKGl0ZW0uZ3JvdXAucG9zaXRpb24pKVxuICAgICAgICApLFxuICAgICAgfSlcbiAgICB9XG4gIH1cblxuICBjb25zdCBjYW5SZW5kZXIgPSAoKSA9PiAhZGlzcG9zZWQgJiYgIWRvY3VtZW50LmhpZGRlbiAmJiBzdGFnZS5pc0Nvbm5lY3RlZFxuICBjb25zdCByZW5kZXIgPSAobm93OiBudW1iZXIpID0+IHtcbiAgICBmcmFtZSA9IHVuZGVmaW5lZFxuICAgIGlmICghY2FuUmVuZGVyKCkpIHJldHVyblxuICAgIGlmIChub3cgLSBsYXN0RHJhdyA8IDEwMDAgLyA2MCAtIDAuMSkge1xuICAgICAgaW52YWxpZGF0ZSgpXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgY29uc3QgZWxhcHNlZCA9IE1hdGgubWluKChub3cgLSBsYXN0RHJhdykgLyAxMDAwLCAwLjEpXG4gICAgbGFzdERyYXcgPSBub3dcbiAgICBpZiAodHJhbnNpdGlvbkFjdGl2ZSAmJiB0cmFuc2l0aW9uKSB7XG4gICAgICB0cmFuc2l0aW9uLnRvdGFsVGltZShcbiAgICAgICAgTWF0aC5taW4oKG5vdyAtIG1vdGlvblN0YXJ0KSAvIDEwMDAsIHRyYW5zaXRpb24uZHVyYXRpb24oKSlcbiAgICAgIClcbiAgICB9XG4gICAgaWYgKCFzZWxlY3RlZCkgaGVhZEN1cnJlbnQubGVycChoZWFkVGFyZ2V0LCAxIC0gTWF0aC5leHAoLWVsYXBzZWQgKiAxOCkpXG4gICAgY29uc3QgbW92aW5nID1cbiAgICAgICFzZWxlY3RlZCAmJiBoZWFkQ3VycmVudC5kaXN0YW5jZVRvU3F1YXJlZChoZWFkVGFyZ2V0KSA+IDAuMDAwMDAxXG4gICAgaWYgKCFtb3ZpbmcgJiYgIXNlbGVjdGVkKSBoZWFkQ3VycmVudC5jb3B5KGhlYWRUYXJnZXQpXG4gICAgaGVhZEFuZ2xlcy5zZXQoXG4gICAgICBUSFJFRS5NYXRoVXRpbHMuZGVnVG9SYWQoNyArIGhlYWRDdXJyZW50LnkgKiAxNCksXG4gICAgICBUSFJFRS5NYXRoVXRpbHMuZGVnVG9SYWQoaGVhZEN1cnJlbnQueCAqIDI4KSxcbiAgICAgIDBcbiAgICApXG4gICAgaGVhZFF1YXRlcm5pb24uc2V0RnJvbUV1bGVyKGhlYWRBbmdsZXMpXG4gICAgaGVhZFJvdGF0aW9uLnZhbHVlLnNldChcbiAgICAgIGhlYWRRdWF0ZXJuaW9uLngsXG4gICAgICBoZWFkUXVhdGVybmlvbi55LFxuICAgICAgaGVhZFF1YXRlcm5pb24ueixcbiAgICAgIGhlYWRRdWF0ZXJuaW9uLndcbiAgICApXG4gICAgY2FtZXJhLmxvb2tBdChsb29rQXQpXG4gICAgY2FtZXJhLnVwZGF0ZU1hdHJpeFdvcmxkKClcbiAgICBncm91bmQucm90YXRpb24ueSA9IE1hdGguYXRhbjIoXG4gICAgICBjYW1lcmEucG9zaXRpb24ueCAtIGxvb2tBdC54LFxuICAgICAgY2FtZXJhLnBvc2l0aW9uLnogLSBsb29rQXQuelxuICAgIClcbiAgICBtb251bWVudHMudXBkYXRlTWF0cml4V29ybGQodHJ1ZSlcbiAgICAvLyDov5DplZzmnJ/pl7Tph43mlrDmo4DmtYvpnZnmraLmjIfpkojvvIzpgb/lhY3lnKPlhYnlgZznlZnlnKjlt7Lnp7vlvIDpvKDmoIfnmoTlu7rnrZHkuIrjgIJcbiAgICBpZiAoaGFzUG9pbnRlcilcbiAgICAgIGhvdmVyZWQgPVxuICAgICAgICByYXljYXN0KHsgY2xpZW50WDogbGFzdFBvaW50ZXIueCwgY2xpZW50WTogbGFzdFBvaW50ZXIueSB9KSB8fCBudWxsXG4gICAgbGV0IGhvdmVyTW92aW5nID0gZmFsc2VcbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2Ygb2JlbGlza3MpIHtcbiAgICAgIGNvbnN0IGhvdmVyVGFyZ2V0ID0gaG92ZXJlZCA9PT0gaXRlbS5jYXRlZ29yeS5pZCA/IDEgOiAwXG4gICAgICBpdGVtLmhvdmVyU3RyZW5ndGggPSBUSFJFRS5NYXRoVXRpbHMuZGFtcChcbiAgICAgICAgaXRlbS5ob3ZlclN0cmVuZ3RoLFxuICAgICAgICBob3ZlclRhcmdldCxcbiAgICAgICAgMTgsXG4gICAgICAgIGVsYXBzZWRcbiAgICAgIClcbiAgICAgIGlmIChNYXRoLmFicyhpdGVtLmhvdmVyU3RyZW5ndGggLSBob3ZlclRhcmdldCkgPiAwLjAwMSkgaG92ZXJNb3ZpbmcgPSB0cnVlXG4gICAgICBlbHNlIGl0ZW0uaG92ZXJTdHJlbmd0aCA9IGhvdmVyVGFyZ2V0XG4gICAgICBjb25zdCBkaW0gPSAxIC0gMC44NCAqIGJsdXIudmFsdWUgKiAoMSAtIGl0ZW0uc3RyZW5ndGgpXG4gICAgICBpdGVtLnN1cmZhY2UuZW52TWFwSW50ZW5zaXR5ID0gMC40ICogZGltXG4gICAgICBpdGVtLmNyeXN0YWwuZW52TWFwSW50ZW5zaXR5ID0gMC42NSAqIGRpbVxuICAgICAgaXRlbS5zdXJmYWNlLmVtaXNzaXZlSW50ZW5zaXR5ID0gMC4xICsgaXRlbS5zdHJlbmd0aCAqIDAuMzhcbiAgICAgIGl0ZW0uc3VyZmFjZS5jb2xvci5zZXRIZXgoMHgyMTA3MGUpLm11bHRpcGx5U2NhbGFyKGRpbSlcbiAgICAgIGl0ZW0ucmVmbGVjdGVkLnBvc2l0aW9uLnNldChcbiAgICAgICAgaXRlbS5ncm91cC5wb3NpdGlvbi54IC0gaXRlbS5jYXRlZ29yeS54LFxuICAgICAgICAwLFxuICAgICAgICBpdGVtLmdyb3VwLnBvc2l0aW9uLnogLSBpdGVtLmNhdGVnb3J5LnpcbiAgICAgIClcbiAgICAgIGl0ZW0uY3J5c3RhbC5lbWlzc2l2ZUludGVuc2l0eSA9XG4gICAgICAgICgwLjM4ICsgTWF0aC5tYXgoaXRlbS5zdHJlbmd0aCwgaXRlbS5ob3ZlclN0cmVuZ3RoKSAqIDAuNykgKiBkaW1cbiAgICAgIDsoaXRlbS5jb3JlLm1hdGVyaWFsIGFzIFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKS5vcGFjaXR5ID1cbiAgICAgICAgKDAuMjQgKyBpdGVtLmhvdmVyU3RyZW5ndGggKiAwLjEyKSAqIGRpbVxuICAgICAgaXRlbS5lZGdlLm9wYWNpdHkgPVxuICAgICAgICAoMC40OCArXG4gICAgICAgICAgaXRlbS5zdHJlbmd0aCAqIDAuNSArXG4gICAgICAgICAgKGhvdmVyZWQgPT09IGl0ZW0uY2F0ZWdvcnkuaWQgPyAwLjE2IDogMCkpICpcbiAgICAgICAgZGltXG4gICAgICBpdGVtLmxhYmVsTWF0ZXJpYWwuY29sb3Iuc2V0U2NhbGFyKGRpbSlcbiAgICAgIGl0ZW0uZ2xvd01hdGVyaWFsLm9wYWNpdHkgPSAwLjMgKiBkaW1cbiAgICAgIC8vIOaCrOWBnOS7heaPkOS6rumhtumDqOaZtuS9k++8m+iBmueEpuWco+WFiee7tOaMgeWOn+S6ruW6pueahCA1MCXjgIJcbiAgICAgIGNvbnN0IGlsbHVtaW5hdGlvbiA9IGl0ZW0uc3RyZW5ndGggKiAwLjVcbiAgICAgIGl0ZW0uYmVhbU1hdGVyaWFsLnVuaWZvcm1zLmludGVuc2l0eS52YWx1ZSA9IGlsbHVtaW5hdGlvblxuICAgICAgaXRlbS5wb29sTWF0ZXJpYWwub3BhY2l0eSA9IGlsbHVtaW5hdGlvbiAqIDAuOFxuICAgICAgaXRlbS5zcG90LmludGVuc2l0eSA9IGlsbHVtaW5hdGlvbiAqIDU1XG4gICAgICBpdGVtLnNwb3QucG9zaXRpb24uc2V0KFxuICAgICAgICBpdGVtLmdyb3VwLnBvc2l0aW9uLngsXG4gICAgICAgIDEyLFxuICAgICAgICBpdGVtLmdyb3VwLnBvc2l0aW9uLnogKyAwLjZcbiAgICAgIClcbiAgICAgIGl0ZW0uc3BvdC50YXJnZXQucG9zaXRpb24uc2V0KFxuICAgICAgICBpdGVtLmdyb3VwLnBvc2l0aW9uLngsXG4gICAgICAgIDEsXG4gICAgICAgIGl0ZW0uZ3JvdXAucG9zaXRpb24uelxuICAgICAgKVxuICAgIH1cbiAgICBjb25zdCBhY3RpdmUgPSBvYmVsaXNrcy5maW5kKChpdGVtKSA9PiBpdGVtLmNhdGVnb3J5LmlkID09PSBzZWxlY3RlZClcbiAgICBpZiAoYWN0aXZlKSB7XG4gICAgICBzY3JlZW5Qb2ludFxuICAgICAgICAuc2V0KGFjdGl2ZS5jYXRlZ29yeS54LCAyLjcsIGFjdGl2ZS5jYXRlZ29yeS56KVxuICAgICAgICAuYXBwbHlNYXRyaXg0KGNhbWVyYS5tYXRyaXhXb3JsZEludmVyc2UpXG4gICAgICBmb2N1cy52YWx1ZSA9IC1zY3JlZW5Qb2ludC56XG4gICAgfVxuICAgIGRvY3VtZW50LmJvZHkuc3R5bGUuc2V0UHJvcGVydHkoXG4gICAgICAnLS1pc2xhbmQtem9kaWFjLWJsdXInLFxuICAgICAgYCR7KGJsdXIudmFsdWUgKiA0KS50b0ZpeGVkKDMpfXB4YFxuICAgIClcbiAgICBzdGFnZS5kYXRhc2V0LnN0YXR1ZVogPSBTdHJpbmcoc3RhdHVlLnBvc2l0aW9uLnopXG4gICAgc3RhZ2UuZGF0YXNldC5tb251bWVudFogPSBvYmVsaXNrc1xuICAgICAgLm1hcCgoaXRlbSkgPT4gaXRlbS5ncm91cC5wb3NpdGlvbi56LnRvRml4ZWQoMykpXG4gICAgICAuam9pbignLCcpXG4gICAgc3RhZ2UuZGF0YXNldC5tb251bWVudFlhdyA9IG9iZWxpc2tzXG4gICAgICAubWFwKChpdGVtKSA9PiBUSFJFRS5NYXRoVXRpbHMucmFkVG9EZWcoaXRlbS5ncm91cC5yb3RhdGlvbi55KS50b0ZpeGVkKDEpKVxuICAgICAgLmpvaW4oJywnKVxuICAgIHN0YWdlLmRhdGFzZXQuaGVhZFJvdGF0aW9uID0gaGVhZFJvdGF0aW9uLnZhbHVlXG4gICAgICAudG9BcnJheSgpXG4gICAgICAubWFwKCh2YWx1ZSkgPT4gdmFsdWUudG9GaXhlZCg2KSlcbiAgICAgIC5qb2luKCcsJylcbiAgICBzdGFnZS5kYXRhc2V0LmhvdmVyZWQgPSBob3ZlcmVkIHx8ICdub25lJ1xuICAgIHN0YWdlLmRhdGFzZXQuY2FwR2xvdyA9IG9iZWxpc2tzXG4gICAgICAubWFwKChpdGVtKSA9PiBpdGVtLmNyeXN0YWwuZW1pc3NpdmVJbnRlbnNpdHkudG9GaXhlZCgzKSlcbiAgICAgIC5qb2luKCcsJylcbiAgICBzdGFnZS5kYXRhc2V0LnRvcExpZ2h0ID0gb2JlbGlza3NcbiAgICAgIC5tYXAoKGl0ZW0pID0+IGl0ZW0uYmVhbU1hdGVyaWFsLnVuaWZvcm1zLmludGVuc2l0eS52YWx1ZS50b0ZpeGVkKDMpKVxuICAgICAgLmpvaW4oJywnKVxuICAgIHJlbmRlcmVyLnNldFJlbmRlclRhcmdldChibHVyLnZhbHVlID4gMC4wMDEgPyB0YXJnZXQgOiBudWxsKVxuICAgIHJlbmRlcmVyLnJlbmRlcihzY2VuZSwgY2FtZXJhKVxuICAgIGlmIChibHVyLnZhbHVlID4gMC4wMDEpIHtcbiAgICAgIHJlbmRlcmVyLnNldFJlbmRlclRhcmdldChudWxsKVxuICAgICAgcmVuZGVyZXIucmVuZGVyKHBvc3RTY2VuZSwgcG9zdENhbWVyYSlcbiAgICB9XG4gICAgcHJvamVjdEJ1dHRvbnMoKVxuICAgIHN0YWdlLmRhdGFzZXQuY2FtZXJhUG9zaXRpb24gPSBjYW1lcmEucG9zaXRpb25cbiAgICAgIC50b0FycmF5KClcbiAgICAgIC5tYXAoKHZhbHVlKSA9PiB2YWx1ZS50b0ZpeGVkKDQpKVxuICAgICAgLmpvaW4oJywnKVxuICAgIHN0YWdlLmRhdGFzZXQuY2FtZXJhVGFyZ2V0ID0gbG9va0F0XG4gICAgICAudG9BcnJheSgpXG4gICAgICAubWFwKCh2YWx1ZSkgPT4gdmFsdWUudG9GaXhlZCg0KSlcbiAgICAgIC5qb2luKCcsJylcbiAgICBpZiAobW92aW5nIHx8IHRyYW5zaXRpb25BY3RpdmUgfHwgaG92ZXJNb3ZpbmcpIGludmFsaWRhdGUoKVxuICB9XG4gIGZ1bmN0aW9uIGludmFsaWRhdGUoKSB7XG4gICAgaWYgKGZyYW1lID09PSB1bmRlZmluZWQgJiYgY2FuUmVuZGVyKCkpXG4gICAgICBmcmFtZSA9IHJlcXVlc3RBbmltYXRpb25GcmFtZShyZW5kZXIpXG4gIH1cbiAgY29uc3QgcmVzaXplID0gKCkgPT4ge1xuICAgIGlmICghc3RhZ2UuY2xpZW50V2lkdGggfHwgIXN0YWdlLmNsaWVudEhlaWdodCkgcmV0dXJuXG4gICAgcmVuZGVyZXIuc2V0UGl4ZWxSYXRpbyhNYXRoLm1pbihkZXZpY2VQaXhlbFJhdGlvIHx8IDEsIDEuNSkpXG4gICAgcmVuZGVyZXIuc2V0U2l6ZShzdGFnZS5jbGllbnRXaWR0aCwgc3RhZ2UuY2xpZW50SGVpZ2h0LCBmYWxzZSlcbiAgICBjYW1lcmEuYXNwZWN0ID0gc3RhZ2UuY2xpZW50V2lkdGggLyBzdGFnZS5jbGllbnRIZWlnaHRcbiAgICBob21lUG9zaXRpb24ueiA9IE1hdGgubWF4KDE3LjUsIDMxIC8gY2FtZXJhLmFzcGVjdClcbiAgICBpZiAoIXNlbGVjdGVkICYmICF0cmFuc2l0aW9uQWN0aXZlKSBjYW1lcmEucG9zaXRpb24uY29weShob21lUG9zaXRpb24pXG4gICAgY2FtZXJhLnVwZGF0ZVByb2plY3Rpb25NYXRyaXgoKVxuICAgIGNvbnN0IHNpemUgPSByZW5kZXJlci5nZXREcmF3aW5nQnVmZmVyU2l6ZShuZXcgVEhSRUUuVmVjdG9yMigpKVxuICAgIHRhcmdldC5zZXRTaXplKHNpemUueCwgc2l6ZS55KVxuICAgIHBvc3QudW5pZm9ybXMudGV4ZWwudmFsdWUuc2V0KDEgLyBzaXplLngsIDEgLyBzaXplLnkpXG4gICAgaW52YWxpZGF0ZSgpXG4gIH1cbiAgY29uc3Qgb2JzZXJ2ZXIgPSBuZXcgUmVzaXplT2JzZXJ2ZXIocmVzaXplKVxuICBvYnNlcnZlci5vYnNlcnZlKHN0YWdlKVxuICByZXNpemUoKVxuXG4gIGNvbnN0IHNlbGVjdCA9IChpZDogVGVtcGxlQ2F0ZWdvcnlJZCB8IG51bGwpID0+IHtcbiAgICBpZiAoIXJlYWR5IHx8IGRpc3Bvc2VkKSByZXR1cm5cbiAgICBjb25zdCBuZXh0ID0gc2VsZWN0ZWQgPT09IGlkID8gbnVsbCA6IGlkXG4gICAgaWYgKG5leHQgPT09IHNlbGVjdGVkKSByZXR1cm5cbiAgICAvLyDogZrnhKbml7bkv53nlZnmnIDlkI7lrp7pmYXnu5jliLbnmoTlp7/lir/vvJvpgIDlh7rlkI7lkJHmnIDmlrDmjIfpkojkvY3nva7lubPmu5HmgaLlpI3ot5/pmo/jgIJcbiAgICBpZiAoIXNlbGVjdGVkICYmIG5leHQpIGhlYWRUYXJnZXQuY29weShoZWFkQ3VycmVudClcbiAgICBzZWxlY3RlZCA9IG5leHRcbiAgICBpZiAoIXNlbGVjdGVkKSBoZWFkVGFyZ2V0LmNvcHkocG9pbnRlclRhcmdldClcbiAgICBjYWxsYmFja3Muc2VsZWN0KHNlbGVjdGVkKVxuICAgIHRyYW5zaXRpb24/LmtpbGwoKVxuICAgIGNvbnN0IGl0ZW0gPSBvYmVsaXNrcy5maW5kKChvYmVsaXNrKSA9PiBvYmVsaXNrLmNhdGVnb3J5LmlkID09PSBzZWxlY3RlZClcbiAgICBjb25zdCBkdXJhdGlvbiA9IHJlZHVjZWRNb3Rpb24gPyAwLjAxIDogMS42NVxuICAgIHRyYW5zaXRpb25BY3RpdmUgPSB0cnVlXG4gICAgbW90aW9uU3RhcnQgPSBwZXJmb3JtYW5jZS5ub3coKVxuICAgIHRyYW5zaXRpb24gPSBnc2FwLnRpbWVsaW5lKHtcbiAgICAgIHBhdXNlZDogdHJ1ZSxcbiAgICAgIG9uVXBkYXRlOiBpbnZhbGlkYXRlLFxuICAgICAgb25Db21wbGV0ZTogKCkgPT4ge1xuICAgICAgICB0cmFuc2l0aW9uQWN0aXZlID0gZmFsc2VcbiAgICAgICAgY2FsbGJhY2tzLnNldHRsZWQoKVxuICAgICAgICBpbnZhbGlkYXRlKClcbiAgICAgIH0sXG4gICAgfSlcbiAgICBsZXQgZGVzdGluYXRpb24gPSBob21lUG9zaXRpb24uY2xvbmUoKVxuICAgIGxldCBhaW0gPSBob21lVGFyZ2V0LmNsb25lKClcbiAgICBpZiAoaXRlbSkge1xuICAgICAgY29uc3Qgc2lkZSA9IE1hdGguc2lnbihpdGVtLmNhdGVnb3J5LngpXG4gICAgICBjb25zdCBvdXRlciA9IE1hdGguYWJzKGl0ZW0uY2F0ZWdvcnkueCkgPiA1XG4gICAgICAvLyDlhoXkvqfmn7Hkv53mjIHmm7TlpKfnmoTplZzlpLTot53nprvvvIzphY3lkIjovoPnqoTop4bph47lkozovoPlsI/ml4vovazvvIzlh4/lvLHov5HlpKfov5zlsI/jgIJcbiAgICAgIGNvbnN0IGRpc3RhbmNlID0gb3V0ZXJcbiAgICAgICAgPyAoaG9tZVBvc2l0aW9uLnogLSBpdGVtLmNhdGVnb3J5LnogKyA0LjgpICogMC41XG4gICAgICAgIDogc3RhdHVlWiAtIGl0ZW0uY2F0ZWdvcnkueiArIDExLjJcbiAgICAgIGNvbnN0IHlhdyA9IE1hdGguYXRhbjIoOC44LCAxMi44KSAqIChvdXRlciA/IDAuNSA6IDAuMzUpXG4gICAgICBjb25zdCBwaXRjaCA9IE1hdGguYXRhbjIoNS41LCBNYXRoLmh5cG90KDguOCwgMTIuOCkpICogKG91dGVyID8gMC41IDogMC40KVxuICAgICAgZGVzdGluYXRpb24gPSBuZXcgVEhSRUUuVmVjdG9yMyhcbiAgICAgICAgaXRlbS5jYXRlZ29yeS54IC1cbiAgICAgICAgICBzaWRlICogZGlzdGFuY2UgKiBNYXRoLnRhbihUSFJFRS5NYXRoVXRpbHMuZGVnVG9SYWQoMTMpKSxcbiAgICAgICAgb3V0ZXIgPyAxLjEgOiAyLFxuICAgICAgICBpdGVtLmNhdGVnb3J5LnogKyBkaXN0YW5jZVxuICAgICAgKVxuICAgICAgYWltID0gZGVzdGluYXRpb25cbiAgICAgICAgLmNsb25lKClcbiAgICAgICAgLmFkZChcbiAgICAgICAgICBuZXcgVEhSRUUuVmVjdG9yMyhcbiAgICAgICAgICAgIC1zaWRlICogTWF0aC5zaW4oeWF3KSAqIDE1LjUsXG4gICAgICAgICAgICBNYXRoLnRhbihwaXRjaCkgKiAxNS41LFxuICAgICAgICAgICAgLU1hdGguY29zKHlhdykgKiAxNS41XG4gICAgICAgICAgKVxuICAgICAgICApXG4gICAgfVxuICAgIHRyYW5zaXRpb24udG8oXG4gICAgICBjYW1lcmEsXG4gICAgICB7XG4gICAgICAgIGZvdjogaXRlbSA/IChNYXRoLmFicyhpdGVtLmNhdGVnb3J5LngpID4gNSA/IDU0IDogNjQpIDogMzgsXG4gICAgICAgIGR1cmF0aW9uLFxuICAgICAgICBlYXNlOiAncG93ZXIzLmluT3V0JyxcbiAgICAgICAgb25VcGRhdGU6ICgpID0+IGNhbWVyYS51cGRhdGVQcm9qZWN0aW9uTWF0cml4KCksXG4gICAgICB9LFxuICAgICAgMFxuICAgIClcbiAgICB0cmFuc2l0aW9uXG4gICAgICAudG8oXG4gICAgICAgIGNhbWVyYS5wb3NpdGlvbixcbiAgICAgICAge1xuICAgICAgICAgIHg6IGRlc3RpbmF0aW9uLngsXG4gICAgICAgICAgeTogZGVzdGluYXRpb24ueSxcbiAgICAgICAgICB6OiBkZXN0aW5hdGlvbi56LFxuICAgICAgICAgIGR1cmF0aW9uLFxuICAgICAgICAgIGVhc2U6ICdwb3dlcjMuaW5PdXQnLFxuICAgICAgICB9LFxuICAgICAgICAwXG4gICAgICApXG4gICAgICAudG8oXG4gICAgICAgIGxvb2tBdCxcbiAgICAgICAgeyB4OiBhaW0ueCwgeTogYWltLnksIHo6IGFpbS56LCBkdXJhdGlvbiwgZWFzZTogJ3Bvd2VyMy5pbk91dCcgfSxcbiAgICAgICAgMFxuICAgICAgKVxuICAgICAgLnRvKFxuICAgICAgICBibHVyLFxuICAgICAgICB7IHZhbHVlOiBpdGVtID8gMSA6IDAsIGR1cmF0aW9uOiBkdXJhdGlvbiAqIDAuOCwgZWFzZTogJ3Bvd2VyMi5pbk91dCcgfSxcbiAgICAgICAgMFxuICAgICAgKVxuICAgIGZvciAoY29uc3Qgb2JlbGlzayBvZiBvYmVsaXNrcykge1xuICAgICAgdHJhbnNpdGlvbi50byhcbiAgICAgICAgb2JlbGlzayxcbiAgICAgICAge1xuICAgICAgICAgIHN0cmVuZ3RoOiBvYmVsaXNrID09PSBpdGVtID8gMSA6IDAsXG4gICAgICAgICAgZHVyYXRpb246IGR1cmF0aW9uICogMC42NSxcbiAgICAgICAgICBlYXNlOiAncG93ZXIyLm91dCcsXG4gICAgICAgIH0sXG4gICAgICAgIDBcbiAgICAgIClcbiAgICAgIC8vIOmdnueEpueCueW7uuetkeayv+Wkp+mBk+mAgOWQju+8jOS/neaMgeecn+WunumAj+inhu+8jOW5tuS4uuS+p+i+ueiPnOWNleeVmeWHuuepuumXtOOAglxuICAgICAgY29uc3Qgb3V0ZXIgPSBNYXRoLmFicyhvYmVsaXNrLmNhdGVnb3J5LngpID4gNVxuICAgICAgY29uc3Qgb3Bwb3NpdGUgPVxuICAgICAgICBpdGVtICYmIE1hdGguc2lnbihvYmVsaXNrLmNhdGVnb3J5LngpICE9PSBNYXRoLnNpZ24oaXRlbS5jYXRlZ29yeS54KVxuICAgICAgY29uc3QgaW5uZXJGb2N1cyA9IGl0ZW0gJiYgTWF0aC5hYnMoaXRlbS5jYXRlZ29yeS54KSA8IDVcbiAgICAgIC8vIOWGheS+p+iBmueEpuaUtueqhOinhumHjuWQju+8jOWvueS+p+W7uuetkemUmeW8gOmAgOi/nO+8jOS/neeVmeWPr+eCueWHu+WMuuWfn+WPiuiPnOWNleepuueZveOAglxuICAgICAgdHJhbnNpdGlvbi50byhcbiAgICAgICAgb2JlbGlzay5ncm91cC5wb3NpdGlvbixcbiAgICAgICAge1xuICAgICAgICAgIHg6XG4gICAgICAgICAgICBpbm5lckZvY3VzICYmIG9wcG9zaXRlXG4gICAgICAgICAgICAgID8gTWF0aC5zaWduKG9iZWxpc2suY2F0ZWdvcnkueCkgKiAob3V0ZXIgPyA4LjEgOiA1KVxuICAgICAgICAgICAgICA6IGl0ZW0gJiYgb3V0ZXIgJiYgb2JlbGlzayAhPT0gaXRlbVxuICAgICAgICAgICAgICA/IE1hdGguc2lnbihvYmVsaXNrLmNhdGVnb3J5LngpICogKG9wcG9zaXRlID8gNy44IDogOS40KVxuICAgICAgICAgICAgICA6IG9iZWxpc2suY2F0ZWdvcnkueCxcbiAgICAgICAgICB6OlxuICAgICAgICAgICAgaW5uZXJGb2N1cyAmJiBvcHBvc2l0ZVxuICAgICAgICAgICAgICA/IG91dGVyXG4gICAgICAgICAgICAgICAgPyAtOVxuICAgICAgICAgICAgICAgIDogLTcuNVxuICAgICAgICAgICAgICA6IGl0ZW0gJiYgb2JlbGlzayAhPT0gaXRlbVxuICAgICAgICAgICAgICA/IG91dGVyXG4gICAgICAgICAgICAgICAgPyBvcHBvc2l0ZVxuICAgICAgICAgICAgICAgICAgPyAtNS42XG4gICAgICAgICAgICAgICAgICA6IC05XG4gICAgICAgICAgICAgICAgOiAtOFxuICAgICAgICAgICAgICA6IG9iZWxpc2suY2F0ZWdvcnkueixcbiAgICAgICAgICBkdXJhdGlvbixcbiAgICAgICAgICBlYXNlOiAncG93ZXIzLmluT3V0JyxcbiAgICAgICAgfSxcbiAgICAgICAgMFxuICAgICAgKVxuICAgIH1cbiAgICBpbnZhbGlkYXRlKClcbiAgfVxuICBjb25zdCByYXljYXN0ZXIgPSBuZXcgVEhSRUUuUmF5Y2FzdGVyKClcbiAgY29uc3QgcG9pbnRlciA9IG5ldyBUSFJFRS5WZWN0b3IyKClcbiAgY29uc3QgcmF5Y2FzdCA9IChldmVudDogUGljazxNb3VzZUV2ZW50LCAnY2xpZW50WCcgfCAnY2xpZW50WSc+KSA9PiB7XG4gICAgY29uc3QgYm91bmRzID0gcmVuZGVyZXIuZG9tRWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKVxuICAgIHBvaW50ZXIuc2V0KFxuICAgICAgKChldmVudC5jbGllbnRYIC0gYm91bmRzLmxlZnQpIC8gYm91bmRzLndpZHRoKSAqIDIgLSAxLFxuICAgICAgKC0oZXZlbnQuY2xpZW50WSAtIGJvdW5kcy50b3ApIC8gYm91bmRzLmhlaWdodCkgKiAyICsgMVxuICAgIClcbiAgICByYXljYXN0ZXIuc2V0RnJvbUNhbWVyYShwb2ludGVyLCBjYW1lcmEpXG4gICAgcmV0dXJuIHJheWNhc3Rlci5pbnRlcnNlY3RPYmplY3RzKFxuICAgICAgb2JlbGlza3MuZmxhdE1hcCgoaXRlbSkgPT4gW2l0ZW0uYm9keSwgaXRlbS5jYXBdKVxuICAgIClbMF0/Lm9iamVjdC51c2VyRGF0YS5jYXRlZ29yeSBhcyBUZW1wbGVDYXRlZ29yeUlkIHwgdW5kZWZpbmVkXG4gIH1cbiAgY29uc3QgY2xpY2sgPSAoZXZlbnQ6IE1vdXNlRXZlbnQpID0+IHtcbiAgICBjb25zdCBpZCA9IHJheWNhc3QoZXZlbnQpXG4gICAgaWYgKGlkKSBzZWxlY3QoaWQpXG4gICAgZWxzZSBpZiAoc2VsZWN0ZWQpIHNlbGVjdChudWxsKVxuICB9XG4gIHJlbmRlcmVyLmRvbUVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBjbGljaylcbiAgY29uc3QgZm9sbG93ID0gKGV2ZW50OiBQb2ludGVyRXZlbnQpID0+IHtcbiAgICBpZiAoIWNhblJlbmRlcigpKSByZXR1cm5cbiAgICBoYXNQb2ludGVyID0gdHJ1ZVxuICAgIGxhc3RQb2ludGVyLnNldChldmVudC5jbGllbnRYLCBldmVudC5jbGllbnRZKVxuICAgIHBvaW50ZXJUYXJnZXRcbiAgICAgIC5zZXQoXG4gICAgICAgIChldmVudC5jbGllbnRYIC8gaW5uZXJXaWR0aCAtIDAuNSkgKiAyLFxuICAgICAgICAoZXZlbnQuY2xpZW50WSAvIGlubmVySGVpZ2h0IC0gMC41KSAqIDJcbiAgICAgIClcbiAgICAgIC5jbGFtcFNjYWxhcigtMSwgMSlcbiAgICBjb25zdCBuZXh0SG92ZXIgPSByYXljYXN0KGV2ZW50KSB8fCBudWxsXG4gICAgY29uc3QgaG92ZXJDaGFuZ2VkID0gaG92ZXJlZCAhPT0gbmV4dEhvdmVyXG4gICAgaG92ZXJlZCA9IG5leHRIb3ZlclxuICAgIGlmICghc2VsZWN0ZWQpIGhlYWRUYXJnZXQuY29weShwb2ludGVyVGFyZ2V0KVxuICAgIGlmICghc2VsZWN0ZWQgfHwgaG92ZXJDaGFuZ2VkKSBpbnZhbGlkYXRlKClcbiAgfVxuICBsZXQgdW5zdWJzY3JpYmU6ICgoKSA9PiB2b2lkKSB8IHVuZGVmaW5lZFxuICBjb25zdCBzeW5jQWN0aXZpdHkgPSAoKSA9PiB7XG4gICAgaWYgKGRvY3VtZW50LmhpZGRlbikge1xuICAgICAgdW5zdWJzY3JpYmU/LigpXG4gICAgICB1bnN1YnNjcmliZSA9IHVuZGVmaW5lZFxuICAgICAgaWYgKGZyYW1lICE9PSB1bmRlZmluZWQpIGNhbmNlbEFuaW1hdGlvbkZyYW1lKGZyYW1lKVxuICAgICAgZnJhbWUgPSB1bmRlZmluZWRcbiAgICAgIGhpZGRlbkF0ID0gcGVyZm9ybWFuY2Uubm93KClcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHJlYWR5ICYmICF1bnN1YnNjcmliZSlcbiAgICAgICAgdW5zdWJzY3JpYmUgPSBzdWJzY3JpYmVQb2ludGVyU2FtcGxlcyhmb2xsb3csIDEwMDAgLyAzMClcbiAgICAgIGlmIChoaWRkZW5BdCAmJiB0cmFuc2l0aW9uQWN0aXZlKVxuICAgICAgICBtb3Rpb25TdGFydCArPSBwZXJmb3JtYW5jZS5ub3coKSAtIGhpZGRlbkF0XG4gICAgICBoaWRkZW5BdCA9IDBcbiAgICAgIGludmFsaWRhdGUoKVxuICAgIH1cbiAgfVxuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCd2aXNpYmlsaXR5Y2hhbmdlJywgc3luY0FjdGl2aXR5KVxuICBjb25zdCByZXNldFBvaW50ZXIgPSAoKSA9PiB7XG4gICAgaGFzUG9pbnRlciA9IGZhbHNlXG4gICAgcG9pbnRlclRhcmdldC5zZXQoMCwgMClcbiAgICBpZiAoIXNlbGVjdGVkKSBoZWFkVGFyZ2V0LmNvcHkocG9pbnRlclRhcmdldClcbiAgICBob3ZlcmVkID0gbnVsbFxuICAgIGludmFsaWRhdGUoKVxuICB9XG4gIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVybGVhdmUnLCByZXNldFBvaW50ZXIpXG5cbiAgbG9hZElzbGFuZEx1Y2FyaW9Nb2RlbCgpXG4gICAgLnRoZW4oKHsgbWV0YWRhdGEsIGJ1ZmZlciwgZW52aXJvbm1lbnQsIHJhZGlhbmNlIH0pID0+IHtcbiAgICAgIGlmIChkaXNwb3NlZCkgcmV0dXJuXG4gICAgICBjb25zdCBlbnZpcm9ubWVudFRleHR1cmUgPSB0ZXh0dXJlKFxuICAgICAgICBuZXcgVEhSRUUuRGF0YVRleHR1cmUoXG4gICAgICAgICAgbmV3IFVpbnQxNkFycmF5KHJhZGlhbmNlKSxcbiAgICAgICAgICBlbnZpcm9ubWVudC53aWR0aCxcbiAgICAgICAgICBlbnZpcm9ubWVudC5oZWlnaHQsXG4gICAgICAgICAgVEhSRUUuUkdCQUZvcm1hdCxcbiAgICAgICAgICBUSFJFRS5IYWxmRmxvYXRUeXBlXG4gICAgICAgIClcbiAgICAgIClcbiAgICAgIGVudmlyb25tZW50VGV4dHVyZS5tYXBwaW5nID0gVEhSRUUuQ3ViZVVWUmVmbGVjdGlvbk1hcHBpbmdcbiAgICAgIGVudmlyb25tZW50VGV4dHVyZS5taW5GaWx0ZXIgPSBUSFJFRS5MaW5lYXJGaWx0ZXJcbiAgICAgIGVudmlyb25tZW50VGV4dHVyZS5tYWdGaWx0ZXIgPSBUSFJFRS5MaW5lYXJGaWx0ZXJcbiAgICAgIGVudmlyb25tZW50VGV4dHVyZS5uZWVkc1VwZGF0ZSA9IHRydWVcbiAgICAgIHNjZW5lLmVudmlyb25tZW50ID0gZW52aXJvbm1lbnRUZXh0dXJlXG4gICAgICBjb25zdCBzdXJmYWNlID0gZ2VvbWV0cnkobmV3IFRIUkVFLkJ1ZmZlckdlb21ldHJ5KCkpXG4gICAgICBmb3IgKGNvbnN0IFtuYW1lLCBzb3VyY2UsIGl0ZW1TaXplXSBvZiBbXG4gICAgICAgIFsncG9zaXRpb24nLCAncG9zaXRpb25zJywgM10sXG4gICAgICAgIFsnbm9ybWFsJywgJ25vcm1hbHMnLCAzXSxcbiAgICAgICAgWydoZWFkSW5mbHVlbmNlJywgJ3dlaWdodHMnLCAxXSxcbiAgICAgIF0gYXMgY29uc3QpIHtcbiAgICAgICAgY29uc3QgYXR0cmlidXRlID0gbWV0YWRhdGEuYXR0cmlidXRlc1tzb3VyY2VdXG4gICAgICAgIHN1cmZhY2Uuc2V0QXR0cmlidXRlKFxuICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZShcbiAgICAgICAgICAgIG5ldyBGbG9hdDMyQXJyYXkoYnVmZmVyLCBhdHRyaWJ1dGUub2Zmc2V0LCBhdHRyaWJ1dGUuY291bnQpLFxuICAgICAgICAgICAgaXRlbVNpemVcbiAgICAgICAgICApXG4gICAgICAgIClcbiAgICAgIH1cbiAgICAgIGNvbnN0IGluZGljZXMgPSBtZXRhZGF0YS5hdHRyaWJ1dGVzLmluZGljZXNcbiAgICAgIHN1cmZhY2Uuc2V0SW5kZXgoXG4gICAgICAgIG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUoXG4gICAgICAgICAgbmV3IFVpbnQxNkFycmF5KGJ1ZmZlciwgaW5kaWNlcy5vZmZzZXQsIGluZGljZXMuY291bnQpLFxuICAgICAgICAgIDFcbiAgICAgICAgKVxuICAgICAgKVxuICAgICAgaGVhZFBpdm90LnZhbHVlLmZyb21BcnJheShtZXRhZGF0YS5oZWFkUGl2b3QpXG4gICAgICBjb25zdCBtZXNoID0gbmV3IFRIUkVFLk1lc2goc3VyZmFjZSwgY2hyb21lTWF0ZXJpYWwpXG4gICAgICBtZXNoLnBvc2l0aW9uLmZyb21BcnJheShtZXRhZGF0YS5jZW50ZXIpLm11bHRpcGx5U2NhbGFyKC0xKVxuICAgICAgLy8g5Zyo5LiK5LiA54mI5bC65a+45LiK57yp5bCP6IezIDgwJe+8jOaPkOmrmOijgeWIh+e6v++8jOW5tuiuqeWIh+mdouS4juW6leW6p+WPsOmdoum9kOW5s+OAglxuICAgICAgY29uc3QgY3JvcFkgPSAxLjJcbiAgICAgIGNvbnN0IG1vZGVsU2NhbGUgPSAoNi43ICogMS42KSAvIG1ldGFkYXRhLnNpemVbMV1cbiAgICAgIHN0YXR1ZS5zY2FsZS5zZXRTY2FsYXIobW9kZWxTY2FsZSlcbiAgICAgIHN0YXR1ZS5wb3NpdGlvbi55ID0gMC41MiAtIChjcm9wWSAtIG1ldGFkYXRhLmNlbnRlclsxXSkgKiBtb2RlbFNjYWxlXG4gICAgICBzdGF0dWUuYWRkKG1lc2gpXG4gICAgICBtaXJyb3Ioc3RhdHVlLCByZWZsZWN0aW9uLCAwLjE4KVxuICAgICAgZm9yIChjb25zdCBbbmFtZSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKG1ldGFkYXRhLnN0YXRzKSlcbiAgICAgICAgc3RhZ2UuZGF0YXNldFtuYW1lXSA9IFN0cmluZyh2YWx1ZSlcbiAgICAgIHN0YWdlLmRhdGFzZXQubWF0ZXJpYWxQaGFzZSA9ICdjaHJvbWUnXG4gICAgICByZWFkeSA9IHRydWVcbiAgICAgIHN0YWdlLmRhdGFzZXQuZW50cmFuY2VGaW5pc2hlZCA9ICd0cnVlJ1xuICAgICAgY2FsbGJhY2tzLnJlYWR5KClcbiAgICAgIHN5bmNBY3Rpdml0eSgpXG4gICAgfSlcbiAgICAuY2F0Y2goKGVycm9yKSA9PiB7XG4gICAgICBpZiAoIWRpc3Bvc2VkKSBjYWxsYmFja3MuZXJyb3IoZXJyb3IpXG4gICAgfSlcblxuICByZXR1cm4ge1xuICAgIHNlbGVjdCxcbiAgICBkaXNwb3NlOiAoKSA9PiB7XG4gICAgICBkaXNwb3NlZCA9IHRydWVcbiAgICAgIHRyYW5zaXRpb24/LmtpbGwoKVxuICAgICAgZG9jdW1lbnQuYm9keS5zdHlsZS5yZW1vdmVQcm9wZXJ0eSgnLS1pc2xhbmQtem9kaWFjLWJsdXInKVxuICAgICAgdW5zdWJzY3JpYmU/LigpXG4gICAgICBvYnNlcnZlci5kaXNjb25uZWN0KClcbiAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Zpc2liaWxpdHljaGFuZ2UnLCBzeW5jQWN0aXZpdHkpXG4gICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcigncG9pbnRlcmxlYXZlJywgcmVzZXRQb2ludGVyKVxuICAgICAgcmVuZGVyZXIuZG9tRWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIGNsaWNrKVxuICAgICAgaWYgKGZyYW1lICE9PSB1bmRlZmluZWQpIGNhbmNlbEFuaW1hdGlvbkZyYW1lKGZyYW1lKVxuICAgICAgZ2VvbWV0cmllcy5mb3JFYWNoKCh2YWx1ZSkgPT4gdmFsdWUuZGlzcG9zZSgpKVxuICAgICAgbWF0ZXJpYWxzLmZvckVhY2goKHZhbHVlKSA9PiB2YWx1ZS5kaXNwb3NlKCkpXG4gICAgICB0ZXh0dXJlcy5mb3JFYWNoKCh2YWx1ZSkgPT4gdmFsdWUuZGlzcG9zZSgpKVxuICAgICAgdGFyZ2V0LmRlcHRoVGV4dHVyZT8uZGlzcG9zZSgpXG4gICAgICB0YXJnZXQuZGlzcG9zZSgpXG4gICAgICByZW5kZXJlci5kaXNwb3NlKClcbiAgICAgIHJlbmRlcmVyLmZvcmNlQ29udGV4dExvc3MoKVxuICAgICAgcmVuZGVyZXIuZG9tRWxlbWVudC5yZW1vdmUoKVxuICAgIH0sXG4gIH1cbn1cbiJdLCJtYXBwaW5ncyI6IkFBQUEsU0FBUyxZQUFZO0FBQ3JCLFlBQVksV0FBVztBQUV2QixTQUFTLDhCQUE4QjtBQUN2QyxTQUFTLCtCQUErQjtBQUV4QyxTQUFTLHdCQUErQztBQVNqRCxnQkFBUyxtQkFDZCxPQUNBLFNBQ0EsV0FDQTtBQUNBLFFBQU0sV0FBVyxJQUFJLE1BQU0sY0FBYyxFQUFFLE9BQU8sTUFBTSxXQUFXLEtBQUssQ0FBQztBQUN6RSxXQUFTLGNBQWMsR0FBVSxDQUFDO0FBQ2xDLFdBQVMsbUJBQW1CLE1BQU07QUFDbEMsV0FBUyxjQUFjLE1BQU07QUFDN0IsV0FBUyxzQkFBc0I7QUFDL0IsV0FBUyx1QkFBdUI7QUFDaEMsV0FBUyxXQUFXLGFBQWEsUUFBUSxLQUFLO0FBQzlDLFdBQVMsV0FBVztBQUFBLElBQ2xCO0FBQUEsSUFDQTtBQUFBLEVBQ0Y7QUFDQSxRQUFNLFlBQVksU0FBUyxVQUFVO0FBQ3JDLFFBQU0sUUFBUSxTQUFTO0FBQ3ZCLFFBQU0sUUFBUSxrQkFBa0IsT0FBTyxNQUFPLEVBQUU7QUFFaEQsUUFBTSxRQUFRLElBQUksTUFBTSxNQUFNO0FBQzlCLFFBQU0sU0FBUyxJQUFJLE1BQU0sa0JBQWtCLElBQUksR0FBRyxLQUFLLEdBQUc7QUFDMUQsUUFBTSxTQUFTLElBQUksTUFBTSxRQUFRLEdBQUcsR0FBRyxFQUFFO0FBQ3pDLFFBQU0sZUFBZSxJQUFJLE1BQU0sUUFBUSxHQUFHLEtBQUssRUFBRTtBQUNqRCxRQUFNLGFBQWEsT0FBTyxNQUFNO0FBQ2hDLFNBQU8sU0FBUyxLQUFLLFlBQVk7QUFDakMsUUFBTSxhQUFhLG9CQUFJLElBQTBCO0FBQ2pELFFBQU0sWUFBWSxvQkFBSSxJQUFvQjtBQUMxQyxRQUFNLFdBQVcsb0JBQUksSUFBbUI7QUFDeEMsUUFBTSxXQUFXLENBQWlDLFVBQWdCO0FBQ2hFLGVBQVcsSUFBSSxLQUFLO0FBQ3BCLFdBQU87QUFBQSxFQUNUO0FBQ0EsUUFBTSxXQUFXLENBQTJCLFVBQWdCO0FBQzFELGNBQVUsSUFBSSxLQUFLO0FBQ25CLFdBQU87QUFBQSxFQUNUO0FBQ0EsUUFBTSxVQUFVLENBQTBCLFVBQWdCO0FBQ3hELGFBQVMsSUFBSSxLQUFLO0FBQ2xCLFdBQU87QUFBQSxFQUNUO0FBQ0EsTUFBSSxXQUFXO0FBQ2YsTUFBSSxRQUFRO0FBQ1osTUFBSTtBQUNKLE1BQUksV0FBVztBQUNmLE1BQUksV0FBb0M7QUFDeEMsTUFBSTtBQUNKLE1BQUksbUJBQW1CO0FBQ3ZCLE1BQUksY0FBYztBQUNsQixNQUFJLFdBQVc7QUFDZixNQUFJLFVBQW1DO0FBQ3ZDLFFBQU0sY0FBYyxJQUFJLE1BQU0sUUFBUTtBQUN0QyxNQUFJLGFBQWE7QUFDakIsUUFBTSxnQkFBZ0IsV0FBVyxrQ0FBa0MsRUFBRTtBQUVyRSxRQUFNLGFBQWEsSUFBSSxNQUFNLE1BQU07QUFDbkMsYUFBVyxNQUFNLElBQUk7QUFDckIsUUFBTSxJQUFJLFVBQVU7QUFDcEIsUUFBTSxZQUFZLElBQUksTUFBTSxNQUFNO0FBQ2xDLFFBQU0sSUFBSSxTQUFTO0FBQ25CLFFBQU0sSUFBSSxJQUFJLE1BQU0sYUFBYSxVQUFVLElBQUksQ0FBQztBQUNoRCxRQUFNLE1BQU0sSUFBSSxNQUFNLGlCQUFpQixVQUFVLEdBQUc7QUFDcEQsTUFBSSxTQUFTLElBQUksSUFBSSxJQUFJLENBQUM7QUFDMUIsUUFBTSxJQUFJLEdBQUc7QUFDYixRQUFNLE1BQU0sSUFBSSxNQUFNLGlCQUFpQixVQUFVLEdBQUc7QUFDcEQsTUFBSSxTQUFTLElBQUksR0FBRyxHQUFHLEVBQUU7QUFDekIsUUFBTSxJQUFJLEdBQUc7QUFHYixRQUFNLGVBQWUsU0FBUyxJQUFJLE1BQU0sWUFBWSxLQUFLLE1BQU0sR0FBRyxDQUFDO0FBQ25FLFFBQU0sWUFBWSxhQUFhLFdBQVc7QUFDMUMsV0FBUyxRQUFRLEdBQUcsUUFBUSxVQUFVLE9BQU8sU0FBUztBQUNwRCxVQUFNLFFBQVEsVUFBVSxLQUFLLEtBQUssSUFBSSxJQUFJLE9BQU87QUFDakQsY0FBVSxLQUFLLE9BQU8sVUFBVSxLQUFLLEtBQUssSUFBSSxLQUFLO0FBQ25ELGNBQVUsS0FBSyxPQUFPLFVBQVUsS0FBSyxLQUFLLElBQUksS0FBSztBQUFBLEVBQ3JEO0FBQ0EsZUFBYSxxQkFBcUI7QUFDbEMsUUFBTSxjQUFjLFNBQVMsSUFBSSxNQUFNLGFBQWEsT0FBTyxNQUFNLENBQUMsQ0FBQztBQUNuRSxjQUFZLFFBQVEsS0FBSyxLQUFLLENBQUM7QUFDL0IsUUFBTSxlQUFlLFNBQVMsSUFBSSxNQUFNLFlBQVksS0FBSyxNQUFNLEdBQUcsQ0FBQztBQUNuRSxRQUFNLGVBQWUsU0FBUyxJQUFJLE1BQU0sWUFBWSxNQUFNLE1BQU0sSUFBSSxDQUFDO0FBQ3JFLFFBQU0sZUFBZSxTQUFTLElBQUksTUFBTSxjQUFjLGNBQWMsRUFBRSxDQUFDO0FBQ3ZFLFFBQU0sV0FBVyxTQUFTLElBQUksTUFBTSxjQUFjLGFBQWEsRUFBRSxDQUFDO0FBQ2xFLFFBQU0sZ0JBQWdCLFNBQVMsSUFBSSxNQUFNLGNBQWMsTUFBTSxJQUFJLENBQUM7QUFDbEUsUUFBTSxpQkFBaUI7QUFBQSxJQUNyQixJQUFJLE1BQU0scUJBQXFCO0FBQUEsTUFDN0IsT0FBTztBQUFBLE1BQ1AsV0FBVztBQUFBLE1BQ1gsV0FBVztBQUFBLE1BQ1gsaUJBQWlCO0FBQUEsSUFDbkIsQ0FBQztBQUFBLEVBQ0g7QUFFQSxRQUFNLGFBQWEsU0FBUyxjQUFjLFFBQVE7QUFDbEQsYUFBVyxRQUFRLFdBQVcsU0FBUztBQUN2QyxRQUFNLGNBQWMsV0FBVyxXQUFXLElBQUk7QUFDOUMsUUFBTSxXQUFXLFlBQVkscUJBQXFCLElBQUksSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFO0FBQ3ZFLFdBQVMsYUFBYSxHQUFHLHFCQUFxQjtBQUM5QyxXQUFTLGFBQWEsTUFBTSxvQkFBb0I7QUFDaEQsV0FBUyxhQUFhLEdBQUcsa0JBQWtCO0FBQzNDLGNBQVksWUFBWTtBQUN4QixjQUFZLFNBQVMsR0FBRyxHQUFHLEtBQUssR0FBRztBQUNuQyxRQUFNLFVBQVUsUUFBUSxJQUFJLE1BQU0sY0FBYyxVQUFVLENBQUM7QUFDM0QsVUFBUSxhQUFhLE1BQU07QUFDM0IsUUFBTSxlQUFlLFNBQVMsSUFBSSxNQUFNLGNBQWMsR0FBRyxDQUFDLENBQUM7QUFFM0QsUUFBTSxlQUFlLENBQUMsT0FBZSxVQUFrQjtBQUNyRCxVQUFNLFNBQVMsU0FBUyxjQUFjLFFBQVE7QUFDOUMsV0FBTyxRQUFRO0FBQ2YsV0FBTyxTQUFTO0FBQ2hCLFVBQU0sVUFBVSxPQUFPLFdBQVcsSUFBSTtBQUN0QyxZQUFRLFlBQVk7QUFDcEIsWUFBUSxlQUFlO0FBQ3ZCLFVBQU0sUUFBUSxNQUFNO0FBQ2xCLGNBQVEsVUFBVSxHQUFHLEdBQUcsS0FBSyxJQUFJO0FBQ2pDLGNBQVEsWUFBWTtBQUNwQixjQUFRLE9BQU87QUFDZixjQUFRLFNBQVMsT0FBTyxLQUFLLEdBQUc7QUFDaEMsY0FBUSxLQUFLO0FBQ2IsY0FBUSxVQUFVLEtBQUssR0FBRztBQUMxQixjQUFRLE9BQU8sS0FBSyxLQUFLLENBQUM7QUFDMUIsY0FBUSxZQUFZO0FBQ3BCLGNBQVEsT0FBTztBQUNmLFlBQU0sVUFBVTtBQUNoQixZQUFNLFNBQVMsQ0FBQyxHQUFHLEtBQUssRUFBRTtBQUFBLFFBQ3hCLENBQUMsV0FBVyxRQUFRLFlBQVksTUFBTSxFQUFFO0FBQUEsTUFDMUM7QUFDQSxVQUFJLElBQ0YsRUFDRSxPQUFPLE9BQU8sQ0FBQyxLQUFLLFVBQVUsTUFBTSxPQUFPLENBQUMsSUFDNUMsV0FBVyxNQUFNLFNBQVMsTUFDeEI7QUFDTixjQUFRLFlBQVk7QUFDcEIsZUFBUyxRQUFRLEdBQUcsUUFBUSxNQUFNLFFBQVEsU0FBUztBQUNqRCxnQkFBUSxTQUFTLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQztBQUNuQyxhQUFLLE9BQU8sS0FBSyxJQUFJO0FBQUEsTUFDdkI7QUFDQSxjQUFRLFFBQVE7QUFBQSxJQUNsQjtBQUNBLFVBQU07QUFDTixVQUFNLE1BQU0sUUFBUSxJQUFJLE1BQU0sY0FBYyxNQUFNLENBQUM7QUFDbkQsUUFBSSxhQUFhLE1BQU07QUFDdkIsUUFBSSxhQUFhLEtBQUssSUFBSSxHQUFHLFNBQVMsYUFBYSxpQkFBaUIsQ0FBQztBQUNyRSxhQUFTLE1BQU0sTUFBTSxLQUFLLE1BQU07QUFDOUIsVUFBSTtBQUFVO0FBQ2QsWUFBTTtBQUNOLFVBQUksY0FBYztBQUNsQixpQkFBVztBQUFBLElBQ2IsQ0FBQztBQUNELFdBQU87QUFBQSxFQUNUO0FBRUEsUUFBTSxlQUFlO0FBQUEsSUFDbkIsSUFBSSxNQUFNLGlCQUFpQixNQUFNLEtBQUssSUFBSSxJQUFJLEdBQUcsSUFBSTtBQUFBLEVBQ3ZEO0FBQ0EsUUFBTSxlQUFlLFNBQVMsSUFBSSxNQUFNLGNBQWMsR0FBRyxDQUFDLENBQUM7QUFDM0QsUUFBTSxXQUFXLGlCQUFpQixJQUFJLENBQUMsYUFBYTtBQUNsRCxVQUFNLFFBQVEsSUFBSSxNQUFNLE1BQU07QUFDOUIsVUFBTSxTQUFTLElBQUksU0FBUyxHQUFHLEdBQUcsU0FBUyxDQUFDO0FBQzVDLFVBQU0sY0FBYyxLQUFLLElBQUksU0FBUyxDQUFDLElBQUksSUFBSSxLQUFLO0FBQ3BELFVBQU0sU0FBUyxJQUNiLENBQUMsS0FBSyxLQUFLLFNBQVMsQ0FBQyxJQUFJLE1BQU0sVUFBVSxTQUFTLFdBQVc7QUFDL0QsY0FBVSxJQUFJLEtBQUs7QUFDbkIsVUFBTSxVQUFVO0FBQUEsTUFDZCxJQUFJLE1BQU0scUJBQXFCO0FBQUEsUUFDN0IsT0FBTztBQUFBLFFBQ1AsV0FBVztBQUFBLFFBQ1gsV0FBVztBQUFBLFFBQ1gsV0FBVztBQUFBLFFBQ1gsaUJBQWlCO0FBQUEsUUFDakIsVUFBVTtBQUFBLFFBQ1YsbUJBQW1CO0FBQUEsTUFDckIsQ0FBQztBQUFBLElBQ0g7QUFDQSxVQUFNLE9BQU8sSUFBSSxNQUFNLEtBQUssY0FBYyxPQUFPO0FBQ2pELFNBQUssU0FBUyxJQUFJO0FBQ2xCLFNBQUssU0FBUyxXQUFXLFNBQVM7QUFDbEMsVUFBTSxJQUFJLElBQUk7QUFDZCxVQUFNLFVBQVU7QUFBQSxNQUNkLElBQUksTUFBTSxxQkFBcUI7QUFBQSxRQUM3QixPQUFPO0FBQUEsUUFDUCxVQUFVO0FBQUEsUUFDVixtQkFBbUI7QUFBQSxRQUNuQixXQUFXO0FBQUEsUUFDWCxXQUFXO0FBQUEsUUFDWCxhQUFhO0FBQUEsUUFDYixTQUFTO0FBQUEsUUFDVCxNQUFNLE1BQU07QUFBQSxRQUNaLFlBQVk7QUFBQSxRQUNaLGFBQWE7QUFBQSxRQUNiLFdBQVc7QUFBQSxRQUNYLGlCQUFpQjtBQUFBLE1BQ25CLENBQUM7QUFBQSxJQUNIO0FBQ0EsVUFBTSxNQUFNLElBQUksTUFBTSxLQUFLLGFBQWEsT0FBTztBQUMvQyxRQUFJLFNBQVMsSUFBSTtBQUNqQixRQUFJLFNBQVMsV0FBVyxTQUFTO0FBQ2pDLFVBQU0sSUFBSSxHQUFHO0FBQ2IsVUFBTSxPQUFPLElBQUksTUFBTTtBQUFBLE1BQ3JCO0FBQUEsTUFDQTtBQUFBLFFBQ0UsSUFBSSxNQUFNLGtCQUFrQjtBQUFBLFVBQzFCLE9BQU87QUFBQSxVQUNQLGFBQWE7QUFBQSxVQUNiLFNBQVM7QUFBQSxVQUNULFlBQVk7QUFBQSxVQUNaLFVBQVUsTUFBTTtBQUFBLFFBQ2xCLENBQUM7QUFBQSxNQUNIO0FBQUEsSUFDRjtBQUNBLFNBQUssU0FBUyxLQUFLLElBQUksUUFBUTtBQUMvQixTQUFLLE1BQU0sSUFBSSxLQUFLLE1BQU0sR0FBRztBQUM3QixVQUFNLElBQUksSUFBSTtBQUNkLFVBQU0sT0FBTztBQUFBLE1BQ1gsSUFBSSxNQUFNLGtCQUFrQjtBQUFBLFFBQzFCLE9BQU87QUFBQSxRQUNQLGFBQWE7QUFBQSxRQUNiLFNBQVM7QUFBQSxRQUNULFlBQVk7QUFBQSxNQUNkLENBQUM7QUFBQSxJQUNIO0FBQ0EsVUFBTSxRQUFRLElBQUksTUFBTSxhQUFhLGNBQWMsSUFBSTtBQUN2RCxVQUFNLFNBQVMsS0FBSyxLQUFLLFFBQVE7QUFDakMsVUFBTSxJQUFJLEtBQUs7QUFDZixVQUFNLFdBQVcsSUFBSSxNQUFNLGFBQWEsVUFBVSxJQUFJO0FBQ3RELGFBQVMsU0FBUyxLQUFLLElBQUksUUFBUTtBQUNuQyxVQUFNLElBQUksUUFBUTtBQUNsQixlQUFXLENBQUMsT0FBTyxDQUFDLEtBQUs7QUFBQSxNQUN2QixDQUFDLGNBQWMsS0FBSztBQUFBLE1BQ3BCLENBQUMsY0FBYyxLQUFLO0FBQUEsSUFDdEIsR0FBWTtBQUNWLFlBQU0sT0FBTyxJQUFJLE1BQU0sS0FBSyxPQUFPLGNBQWM7QUFDakQsV0FBSyxTQUFTLElBQUk7QUFDbEIsWUFBTSxJQUFJLElBQUk7QUFBQSxJQUNoQjtBQUNBLFVBQU0sZ0JBQWdCO0FBQUEsTUFDcEIsSUFBSSxNQUFNLGtCQUFrQjtBQUFBLFFBQzFCLEtBQUssYUFBYSxTQUFTLE9BQU8sU0FBUyxLQUFLO0FBQUEsUUFDaEQsYUFBYTtBQUFBLFFBQ2IsWUFBWTtBQUFBLFFBQ1osWUFBWTtBQUFBLE1BQ2QsQ0FBQztBQUFBLElBQ0g7QUFDQSxVQUFNLFFBQVEsSUFBSSxNQUFNLEtBQUssZUFBZSxhQUFhO0FBRXpELFVBQU0sU0FBUyxJQUFJLEdBQUcsTUFBTSxLQUFLO0FBQ2pDLFVBQU0sU0FBUyxJQUFJLENBQUMsS0FBSyxLQUFLLFFBQVEsSUFBSTtBQUMxQyxVQUFNLElBQUksS0FBSztBQUNmLFVBQU0sZUFBZTtBQUFBLE1BQ25CLElBQUksTUFBTSxrQkFBa0I7QUFBQSxRQUMxQixLQUFLO0FBQUEsUUFDTCxhQUFhO0FBQUEsUUFDYixTQUFTO0FBQUEsUUFDVCxZQUFZO0FBQUEsUUFDWixVQUFVLE1BQU07QUFBQSxNQUNsQixDQUFDO0FBQUEsSUFDSDtBQUNBLFVBQU0sT0FBTyxJQUFJLE1BQU0sS0FBSyxjQUFjLFlBQVk7QUFDdEQsU0FBSyxTQUFTLElBQUksQ0FBQyxLQUFLLEtBQUs7QUFDN0IsU0FBSyxTQUFTLElBQUk7QUFDbEIsU0FBSyxjQUFjO0FBQ25CLFVBQU0sSUFBSSxJQUFJO0FBQ2QsVUFBTSxlQUFlO0FBQUEsTUFDbkIsSUFBSSxNQUFNLGVBQWU7QUFBQSxRQUN2QixVQUFVLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRSxFQUFFO0FBQUEsUUFDcEMsYUFBYTtBQUFBLFFBQ2IsWUFBWTtBQUFBLFFBQ1osTUFBTSxNQUFNO0FBQUEsUUFDWixVQUFVLE1BQU07QUFBQSxRQUNoQixjQUNFO0FBQUEsUUFDRixnQkFBZ0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsTUFNbEIsQ0FBQztBQUFBLElBQ0g7QUFDQSxVQUFNLE9BQU8sSUFBSSxNQUFNLEtBQUssY0FBYyxZQUFZO0FBQ3RELFNBQUssU0FBUyxJQUFJO0FBQ2xCLFVBQU0sSUFBSSxJQUFJO0FBQ2QsVUFBTSxlQUFlO0FBQUEsTUFDbkIsSUFBSSxNQUFNLGtCQUFrQjtBQUFBLFFBQzFCLEtBQUs7QUFBQSxRQUNMLGFBQWE7QUFBQSxRQUNiLFNBQVM7QUFBQSxRQUNULFlBQVk7QUFBQSxRQUNaLFVBQVUsTUFBTTtBQUFBLE1BQ2xCLENBQUM7QUFBQSxJQUNIO0FBQ0EsVUFBTSxPQUFPLElBQUksTUFBTSxLQUFLLGNBQWMsWUFBWTtBQUN0RCxTQUFLLFNBQVMsSUFBSTtBQUNsQixTQUFLLFNBQVMsSUFBSSxDQUFDLEtBQUssS0FBSztBQUM3QixTQUFLLGNBQWM7QUFDbkIsVUFBTSxJQUFJLElBQUk7QUFDZCxVQUFNLE9BQU8sSUFBSSxNQUFNLFVBQVUsVUFBVSxHQUFHLElBQUksS0FBSyxLQUFLLElBQUksTUFBTSxHQUFHO0FBQ3pFLFNBQUssU0FBUyxJQUFJLFNBQVMsR0FBRyxJQUFJLFNBQVMsSUFBSSxHQUFHO0FBQ2xELFNBQUssT0FBTyxTQUFTLElBQUksU0FBUyxHQUFHLEdBQUcsU0FBUyxDQUFDO0FBQ2xELFVBQU0sSUFBSSxNQUFNLEtBQUssTUFBTTtBQUMzQixXQUFPO0FBQUEsTUFDTDtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0EsVUFBVTtBQUFBLE1BQ1YsZUFBZTtBQUFBLE1BQ2YsV0FBVyxJQUFJLE1BQU0sTUFBTTtBQUFBLElBQzdCO0FBQUEsRUFDRixDQUFDO0FBR0QsUUFBTSxTQUFTLElBQUksTUFBTSxNQUFNO0FBQy9CLFFBQU0sSUFBSSxNQUFNO0FBQ2hCLFFBQU0sV0FBVztBQUNqQixRQUFNLFFBQVEsSUFBSSxNQUFNO0FBQUEsSUFDdEIsU0FBUyxJQUFJLE1BQU0sY0FBYyxLQUFLLEdBQUcsQ0FBQztBQUFBLElBQzFDO0FBQUEsTUFDRSxJQUFJLE1BQU0sZUFBZTtBQUFBLFFBQ3ZCLGFBQWE7QUFBQSxRQUNiLFlBQVk7QUFBQSxRQUNaLGNBQWM7QUFBQSxRQUNkLGdCQUFnQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxNQU1sQixDQUFDO0FBQUEsSUFDSDtBQUFBLEVBQ0Y7QUFDQSxRQUFNLFNBQVMsSUFBSSxDQUFDLEtBQUssS0FBSztBQUM5QixRQUFNLFNBQVMsSUFBSSxHQUFHLFFBQVEsV0FBVyxFQUFFO0FBQzNDLFFBQU0sY0FBYztBQUNwQixTQUFPLElBQUksS0FBSztBQUNoQixRQUFNLGNBQWMsSUFBSSxNQUFNO0FBQUEsSUFDNUIsU0FBUyxJQUFJLE1BQU0sY0FBYyxLQUFLLENBQUMsQ0FBQztBQUFBLElBQ3hDO0FBQUEsTUFDRSxJQUFJLE1BQU0sZUFBZTtBQUFBLFFBQ3ZCLFVBQVUsRUFBRSxXQUFXLEVBQUUsT0FBTyxJQUFJLE1BQU0sTUFBTSxTQUFTLEVBQUUsRUFBRTtBQUFBLFFBQzdELGFBQWE7QUFBQSxRQUNiLFlBQVk7QUFBQSxRQUNaLFlBQVk7QUFBQSxRQUNaLFVBQVUsTUFBTTtBQUFBLFFBQ2hCLGNBQWM7QUFBQSxRQUNkLGdCQUFnQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsTUFLbEIsQ0FBQztBQUFBLElBQ0g7QUFBQSxFQUNGO0FBQ0EsY0FBWSxTQUFTLElBQUksR0FBRyxNQUFNLE9BQU8sUUFBUTtBQUNqRCxjQUFZLGNBQWM7QUFDMUIsU0FBTyxJQUFJLFdBQVc7QUFDdEIsUUFBTSxVQUFVO0FBQ2hCLFFBQU0sV0FBVyxJQUFJLE1BQU0sTUFBTTtBQUNqQyxXQUFTLFNBQVMsSUFBSTtBQUN0QixhQUFXLENBQUMsT0FBTyxRQUFRLENBQUMsS0FBSztBQUFBLElBQy9CLENBQUMsS0FBSyxNQUFNLElBQUk7QUFBQSxJQUNoQixDQUFDLEtBQUssTUFBTSxJQUFJO0FBQUEsSUFDaEIsQ0FBQyxLQUFLLEtBQUssSUFBSTtBQUFBLEVBQ2pCLEdBQUc7QUFDRCxVQUFNLE9BQU8sSUFBSSxNQUFNO0FBQUEsTUFDckIsU0FBUyxJQUFJLE1BQU0sWUFBWSxPQUFPLFFBQVEsR0FBRyxDQUFDO0FBQUEsTUFDbEQ7QUFBQSxJQUNGO0FBQ0EsU0FBSyxTQUFTLElBQUk7QUFDbEIsYUFBUyxJQUFJLElBQUk7QUFBQSxFQUNuQjtBQUNBLFFBQU0sSUFBSSxRQUFRO0FBQ2xCLFFBQU0sYUFBYSxJQUFJLE1BQU07QUFBQSxJQUMzQixTQUFTLElBQUksTUFBTSxjQUFjLElBQUksQ0FBQyxDQUFDO0FBQUEsSUFDdkM7QUFBQSxNQUNFLElBQUksTUFBTSxrQkFBa0I7QUFBQSxRQUMxQixLQUFLO0FBQUEsUUFDTCxhQUFhO0FBQUEsUUFDYixTQUFTO0FBQUEsUUFDVCxVQUFVLE1BQU07QUFBQSxRQUNoQixZQUFZO0FBQUEsTUFDZCxDQUFDO0FBQUEsSUFDSDtBQUFBLEVBQ0Y7QUFDQSxhQUFXLFNBQVMsSUFBSSxDQUFDLEtBQUssS0FBSztBQUNuQyxhQUFXLFNBQVMsSUFBSSxHQUFHLE1BQU0sVUFBVSxDQUFDO0FBQzVDLGFBQVcsY0FBYztBQUN6QixRQUFNLElBQUksVUFBVTtBQUNwQixRQUFNLGNBQWMsSUFBSSxNQUFNLFdBQVcsVUFBVSxJQUFJLElBQUksQ0FBQztBQUM1RCxjQUFZLFNBQVMsSUFBSSxHQUFHLEtBQUssVUFBVSxDQUFDO0FBQzVDLFFBQU0sSUFBSSxXQUFXO0FBR3JCLFFBQU0sU0FBUyxDQUNiLFFBQ0FBLFNBQ0EsWUFDRztBQUNILFVBQU0sT0FBTyxPQUFPLE1BQU0sSUFBSTtBQUM5QixTQUFLLFNBQVMsQ0FBQyxXQUFXO0FBQ3hCLFVBQ0UsRUFBRSxrQkFBa0IsTUFBTSxRQUFRLGtCQUFrQixNQUFNO0FBRTFEO0FBQ0YsWUFBTSxXQUFXLE9BQU87QUFDeEIsVUFBSSxvQkFBb0IsTUFBTSxnQkFBZ0I7QUFDNUMsZUFBTyxVQUFVO0FBQ2pCO0FBQUEsTUFDRjtBQUNBLFlBQU0sUUFBUSxTQUFTLFNBQVMsTUFBTSxDQUFDO0FBQ3ZDLFlBQU0sY0FBYztBQUNwQixZQUFNLFVBQVU7QUFDaEIsWUFBTSxhQUFhO0FBRW5CLFVBQUksU0FBUyxnQkFBZ0IsUUFBUTtBQUNuQyxjQUFNLGlCQUFpQixTQUFTLGVBQWU7QUFBQSxVQUM3QyxDQUFDLFVBQ0MsSUFBSSxNQUFNO0FBQUEsWUFDUixJQUFJLE1BQU07QUFBQSxjQUNSLE1BQU0sT0FBTztBQUFBLGNBQ2IsQ0FBQyxNQUFNLE9BQU87QUFBQSxjQUNkLE1BQU0sT0FBTztBQUFBLFlBQ2Y7QUFBQSxZQUNBLE1BQU07QUFBQSxVQUNSO0FBQUEsUUFDSjtBQUNBLGNBQU0sa0JBQWtCLFNBQVM7QUFBQSxNQUNuQztBQUNBLGFBQU8sV0FBVztBQUFBLElBQ3BCLENBQUM7QUFDRCxJQUFBQSxRQUFPLElBQUksSUFBSTtBQUFBLEVBQ2pCO0FBQ0EsYUFBVyxRQUFRLFVBQVU7QUFDM0IsV0FBTyxLQUFLLE9BQU8sS0FBSyxXQUFXLEdBQUc7QUFDdEMsZUFBVyxJQUFJLEtBQUssU0FBUztBQUFBLEVBQy9CO0FBQ0EsU0FBTyxVQUFVLFlBQVksSUFBSTtBQUdqQyxRQUFNLFNBQVMsSUFBSSxNQUFNLGtCQUFrQixHQUFHLEdBQUc7QUFBQSxJQUMvQyxjQUFjLElBQUksTUFBTSxhQUFhLEdBQUcsQ0FBQztBQUFBLEVBQzNDLENBQUM7QUFDRCxRQUFNLFFBQVEsRUFBRSxPQUFPLEdBQUc7QUFDMUIsUUFBTSxPQUFPLEVBQUUsT0FBTyxFQUFFO0FBQ3hCLFFBQU0sT0FBTztBQUFBLElBQ1gsSUFBSSxNQUFNLGVBQWU7QUFBQSxNQUN2QixVQUFVO0FBQUEsUUFDUixPQUFPLEVBQUUsT0FBTyxPQUFPLFFBQVE7QUFBQSxRQUMvQixPQUFPLEVBQUUsT0FBTyxPQUFPLGFBQWE7QUFBQSxRQUNwQyxPQUFPLEVBQUUsT0FBTyxJQUFJLE1BQU0sUUFBUSxFQUFFO0FBQUEsUUFDcEM7QUFBQSxRQUNBO0FBQUEsTUFDRjtBQUFBLE1BQ0EsY0FDRTtBQUFBLE1BQ0YsZ0JBQWdCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxNQW9CaEIsYUFBYTtBQUFBLE1BQ2IsV0FBVztBQUFBLE1BQ1gsWUFBWTtBQUFBLElBQ2QsQ0FBQztBQUFBLEVBQ0g7QUFDQSxRQUFNLFlBQVksSUFBSSxNQUFNLE1BQU07QUFDbEMsWUFBVSxJQUFJLElBQUksTUFBTSxLQUFLLFNBQVMsSUFBSSxNQUFNLGNBQWMsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7QUFDM0UsUUFBTSxhQUFhLElBQUksTUFBTSxPQUFPO0FBQ3BDLFFBQU0sZUFBZSxFQUFFLE9BQU8sSUFBSSxNQUFNLFFBQVEsR0FBRyxHQUFHLEdBQUcsQ0FBQyxFQUFFO0FBQzVELFFBQU0sWUFBWSxFQUFFLE9BQU8sSUFBSSxNQUFNLFFBQVEsRUFBRTtBQUMvQyxRQUFNLGNBQWMsSUFBSSxNQUFNLFFBQVE7QUFDdEMsUUFBTSxhQUFhLElBQUksTUFBTSxRQUFRO0FBQ3JDLFFBQU0sZ0JBQWdCLElBQUksTUFBTSxRQUFRO0FBQ3hDLFFBQU0saUJBQWlCLElBQUksTUFBTSxXQUFXO0FBQzVDLFFBQU0sYUFBYSxJQUFJLE1BQU0sTUFBTSxHQUFHLEdBQUcsR0FBRyxLQUFLO0FBQ2pELFFBQU0sU0FBUyxJQUFJLE1BQU0sTUFBTTtBQUMvQixTQUFPLFNBQVMsSUFBSSxHQUFHLE1BQU0sT0FBTztBQUNwQyxRQUFNLElBQUksTUFBTTtBQUNoQixRQUFNLGlCQUFpQjtBQUFBLElBQ3JCLElBQUksTUFBTSxxQkFBcUI7QUFBQSxNQUM3QixPQUFPO0FBQUEsTUFDUCxNQUFNLE1BQU07QUFBQSxNQUNaLFdBQVc7QUFBQSxNQUNYLFdBQVc7QUFBQSxNQUNYLFdBQVc7QUFBQSxNQUNYLG9CQUFvQjtBQUFBLE1BQ3BCLGlCQUFpQjtBQUFBLE1BQ2pCLGdCQUFnQixDQUFDLElBQUksTUFBTSxNQUFNLElBQUksTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFDO0FBQUEsSUFDckUsQ0FBQztBQUFBLEVBQ0g7QUFDQSxpQkFBZSxrQkFBa0IsQ0FBQyxXQUFXO0FBQzNDLFdBQU8sU0FBUyxlQUFlO0FBQy9CLFdBQU8sU0FBUyxZQUFZO0FBQzVCLFdBQU8sZUFBZSxPQUFPLGFBQzFCO0FBQUEsTUFDQztBQUFBLE1BQ0E7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFTRixFQUNDO0FBQUEsTUFDQztBQUFBLE1BQ0E7QUFBQSxJQUNGLEVBQ0M7QUFBQSxNQUNDO0FBQUEsTUFDQTtBQUFBLElBQ0Y7QUFBQSxFQUNKO0FBRUEsUUFBTSxjQUFjLElBQUksTUFBTSxRQUFRO0FBQ3RDLFFBQU0sWUFBWTtBQUFBLElBQ2hCLENBQUMsT0FBTyxLQUFLLElBQUk7QUFBQSxJQUNqQixDQUFDLE9BQU8sS0FBSyxLQUFLO0FBQUEsSUFDbEIsQ0FBQyxNQUFNLEtBQUssSUFBSTtBQUFBLElBQ2hCLENBQUMsTUFBTSxLQUFLLEtBQUs7QUFBQSxJQUNqQixDQUFDLFFBQVEsTUFBTSxLQUFLO0FBQUEsSUFDcEIsQ0FBQyxRQUFRLE1BQU0sTUFBTTtBQUFBLElBQ3JCLENBQUMsT0FBTyxNQUFNLEtBQUs7QUFBQSxJQUNuQixDQUFDLE9BQU8sTUFBTSxNQUFNO0FBQUEsSUFDcEIsQ0FBQyxHQUFHLE1BQU0sQ0FBQztBQUFBLEVBQ2I7QUFFQSxRQUFNLGlCQUFpQixNQUFNO0FBQzNCLFVBQU0sUUFBUSxNQUFNO0FBQ3BCLFVBQU0sU0FBUyxNQUFNO0FBQ3JCLGVBQVcsUUFBUSxVQUFVO0FBQzNCLFlBQU0sU0FBUyxRQUFRLElBQUksS0FBSyxTQUFTLEVBQUU7QUFDM0MsVUFBSSxDQUFDO0FBQVE7QUFDYixZQUFNLFNBQVMsVUFBVSxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNO0FBQzFDLG9CQUNHLElBQUksR0FBRyxHQUFHLENBQUMsRUFDWCxhQUFhLEtBQUssTUFBTSxXQUFXLEVBQ25DLFFBQVEsTUFBTTtBQUNqQixlQUFPO0FBQUEsVUFDTCxJQUFJLFlBQVksSUFBSSxNQUFNLE9BQU87QUFBQSxVQUNqQyxJQUFJLENBQUMsWUFBWSxJQUFJLE1BQU0sT0FBTztBQUFBLFFBQ3BDO0FBQUEsTUFDRixDQUFDO0FBQ0QsWUFBTSxTQUFTLENBQUMsR0FBRyxNQUFNLEVBQUUsS0FBSyxDQUFDLEdBQUcsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUM7QUFDaEUsWUFBTSxRQUFRLENBQ1osR0FDQSxHQUNBLE9BQ0ksRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7QUFDeEQsWUFBTSxPQUFzQixDQUFDO0FBQzdCLGlCQUFXLFNBQVMsUUFBUTtBQUMxQixlQUNFLEtBQUssVUFBVSxLQUNmLE1BQU0sS0FBSyxLQUFLLFNBQVMsQ0FBQyxHQUFHLEtBQUssS0FBSyxTQUFTLENBQUMsR0FBRyxLQUFLLEtBQUs7QUFFOUQsZUFBSyxJQUFJO0FBQ1gsYUFBSyxLQUFLLEtBQUs7QUFBQSxNQUNqQjtBQUNBLFlBQU0sUUFBUSxLQUFLO0FBQ25CLGlCQUFXLFNBQVMsT0FBTyxRQUFRLEVBQUUsTUFBTSxDQUFDLEdBQUc7QUFDN0MsZUFDRSxLQUFLLFNBQVMsU0FDZCxNQUFNLEtBQUssS0FBSyxTQUFTLENBQUMsR0FBRyxLQUFLLEtBQUssU0FBUyxDQUFDLEdBQUcsS0FBSyxLQUFLO0FBRTlELGVBQUssSUFBSTtBQUNYLGFBQUssS0FBSyxLQUFLO0FBQUEsTUFDakI7QUFDQSxZQUFNLE9BQU8sS0FBSyxJQUFJLEdBQUcsT0FBTyxJQUFJLENBQUMsVUFBVSxNQUFNLENBQUMsQ0FBQztBQUN2RCxZQUFNLE9BQU8sS0FBSyxJQUFJLEdBQUcsT0FBTyxJQUFJLENBQUMsVUFBVSxNQUFNLENBQUMsQ0FBQztBQUN2RCxZQUFNLElBQUksS0FBSyxJQUFJLEdBQUcsT0FBTyxJQUFJLENBQUMsVUFBVSxNQUFNLENBQUMsQ0FBQyxJQUFJO0FBQ3hELFlBQU0sSUFBSSxLQUFLLElBQUksR0FBRyxPQUFPLElBQUksQ0FBQyxVQUFVLE1BQU0sQ0FBQyxDQUFDLElBQUk7QUFDeEQsYUFBTyxPQUFPLE9BQU8sT0FBTztBQUFBLFFBQzFCLE1BQU0sR0FBRyxJQUFJO0FBQUEsUUFDYixLQUFLLEdBQUcsSUFBSTtBQUFBLFFBQ1osT0FBTyxHQUFHLENBQUM7QUFBQSxRQUNYLFFBQVEsR0FBRyxDQUFDO0FBQUEsUUFDWixVQUFVLFdBQVcsS0FDbEI7QUFBQSxVQUNDLENBQUMsVUFDQyxJQUFLLE1BQU0sSUFBSSxRQUFRLElBQUssR0FBRyxNQUMzQixNQUFNLElBQUksUUFBUSxJQUFLLEdBQzNCO0FBQUEsUUFDSixFQUNDLEtBQUssR0FBRyxDQUFDO0FBQUEsUUFDWixZQUFZO0FBQUEsUUFDWixRQUFRO0FBQUEsVUFDTixLQUFLLE1BQU0sTUFBTSxPQUFPLFNBQVMsV0FBVyxLQUFLLE1BQU0sUUFBUSxDQUFDO0FBQUEsUUFDbEU7QUFBQSxNQUNGLENBQUM7QUFBQSxJQUNIO0FBQUEsRUFDRjtBQUVBLFFBQU0sWUFBWSxNQUFNLENBQUMsWUFBWSxDQUFDLFNBQVMsVUFBVSxNQUFNO0FBQy9ELFFBQU0sU0FBUyxDQUFDLFFBQWdCO0FBQzlCLFlBQVE7QUFDUixRQUFJLENBQUMsVUFBVTtBQUFHO0FBQ2xCLFFBQUksTUFBTSxXQUFXLE1BQU8sS0FBSyxLQUFLO0FBQ3BDLGlCQUFXO0FBQ1g7QUFBQSxJQUNGO0FBQ0EsVUFBTSxVQUFVLEtBQUssS0FBSyxNQUFNLFlBQVksS0FBTSxHQUFHO0FBQ3JELGVBQVc7QUFDWCxRQUFJLG9CQUFvQixZQUFZO0FBQ2xDLGlCQUFXO0FBQUEsUUFDVCxLQUFLLEtBQUssTUFBTSxlQUFlLEtBQU0sV0FBVyxTQUFTLENBQUM7QUFBQSxNQUM1RDtBQUFBLElBQ0Y7QUFDQSxRQUFJLENBQUM7QUFBVSxrQkFBWSxLQUFLLFlBQVksSUFBSSxLQUFLLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztBQUN2RSxVQUFNLFNBQ0osQ0FBQyxZQUFZLFlBQVksa0JBQWtCLFVBQVUsSUFBSTtBQUMzRCxRQUFJLENBQUMsVUFBVSxDQUFDO0FBQVUsa0JBQVksS0FBSyxVQUFVO0FBQ3JELGVBQVc7QUFBQSxNQUNULE1BQU0sVUFBVSxTQUFTLElBQUksWUFBWSxJQUFJLEVBQUU7QUFBQSxNQUMvQyxNQUFNLFVBQVUsU0FBUyxZQUFZLElBQUksRUFBRTtBQUFBLE1BQzNDO0FBQUEsSUFDRjtBQUNBLG1CQUFlLGFBQWEsVUFBVTtBQUN0QyxpQkFBYSxNQUFNO0FBQUEsTUFDakIsZUFBZTtBQUFBLE1BQ2YsZUFBZTtBQUFBLE1BQ2YsZUFBZTtBQUFBLE1BQ2YsZUFBZTtBQUFBLElBQ2pCO0FBQ0EsV0FBTyxPQUFPLE1BQU07QUFDcEIsV0FBTyxrQkFBa0I7QUFDekIsV0FBTyxTQUFTLElBQUksS0FBSztBQUFBLE1BQ3ZCLE9BQU8sU0FBUyxJQUFJLE9BQU87QUFBQSxNQUMzQixPQUFPLFNBQVMsSUFBSSxPQUFPO0FBQUEsSUFDN0I7QUFDQSxjQUFVLGtCQUFrQixJQUFJO0FBRWhDLFFBQUk7QUFDRixnQkFDRSxRQUFRLEVBQUUsU0FBUyxZQUFZLEdBQUcsU0FBUyxZQUFZLEVBQUUsQ0FBQyxLQUFLO0FBQ25FLFFBQUksY0FBYztBQUNsQixlQUFXLFFBQVEsVUFBVTtBQUMzQixZQUFNLGNBQWMsWUFBWSxLQUFLLFNBQVMsS0FBSyxJQUFJO0FBQ3ZELFdBQUssZ0JBQWdCLE1BQU0sVUFBVTtBQUFBLFFBQ25DLEtBQUs7QUFBQSxRQUNMO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxNQUNGO0FBQ0EsVUFBSSxLQUFLLElBQUksS0FBSyxnQkFBZ0IsV0FBVyxJQUFJO0FBQU8sc0JBQWM7QUFBQTtBQUNqRSxhQUFLLGdCQUFnQjtBQUMxQixZQUFNLE1BQU0sSUFBSSxPQUFPLEtBQUssU0FBUyxJQUFJLEtBQUs7QUFDOUMsV0FBSyxRQUFRLGtCQUFrQixNQUFNO0FBQ3JDLFdBQUssUUFBUSxrQkFBa0IsT0FBTztBQUN0QyxXQUFLLFFBQVEsb0JBQW9CLE1BQU0sS0FBSyxXQUFXO0FBQ3ZELFdBQUssUUFBUSxNQUFNLE9BQU8sT0FBUSxFQUFFLGVBQWUsR0FBRztBQUN0RCxXQUFLLFVBQVUsU0FBUztBQUFBLFFBQ3RCLEtBQUssTUFBTSxTQUFTLElBQUksS0FBSyxTQUFTO0FBQUEsUUFDdEM7QUFBQSxRQUNBLEtBQUssTUFBTSxTQUFTLElBQUksS0FBSyxTQUFTO0FBQUEsTUFDeEM7QUFDQSxXQUFLLFFBQVEscUJBQ1YsT0FBTyxLQUFLLElBQUksS0FBSyxVQUFVLEtBQUssYUFBYSxJQUFJLE9BQU87QUFDOUQsTUFBQyxLQUFLLEtBQUssU0FBcUMsV0FDOUMsT0FBTyxLQUFLLGdCQUFnQixRQUFRO0FBQ3ZDLFdBQUssS0FBSyxXQUNQLE9BQ0MsS0FBSyxXQUFXLE9BQ2YsWUFBWSxLQUFLLFNBQVMsS0FBSyxPQUFPLE1BQ3pDO0FBQ0YsV0FBSyxjQUFjLE1BQU0sVUFBVSxHQUFHO0FBQ3RDLFdBQUssYUFBYSxVQUFVLE1BQU07QUFFbEMsWUFBTSxlQUFlLEtBQUssV0FBVztBQUNyQyxXQUFLLGFBQWEsU0FBUyxVQUFVLFFBQVE7QUFDN0MsV0FBSyxhQUFhLFVBQVUsZUFBZTtBQUMzQyxXQUFLLEtBQUssWUFBWSxlQUFlO0FBQ3JDLFdBQUssS0FBSyxTQUFTO0FBQUEsUUFDakIsS0FBSyxNQUFNLFNBQVM7QUFBQSxRQUNwQjtBQUFBLFFBQ0EsS0FBSyxNQUFNLFNBQVMsSUFBSTtBQUFBLE1BQzFCO0FBQ0EsV0FBSyxLQUFLLE9BQU8sU0FBUztBQUFBLFFBQ3hCLEtBQUssTUFBTSxTQUFTO0FBQUEsUUFDcEI7QUFBQSxRQUNBLEtBQUssTUFBTSxTQUFTO0FBQUEsTUFDdEI7QUFBQSxJQUNGO0FBQ0EsVUFBTSxTQUFTLFNBQVMsS0FBSyxDQUFDLFNBQVMsS0FBSyxTQUFTLE9BQU8sUUFBUTtBQUNwRSxRQUFJLFFBQVE7QUFDVixrQkFDRyxJQUFJLE9BQU8sU0FBUyxHQUFHLEtBQUssT0FBTyxTQUFTLENBQUMsRUFDN0MsYUFBYSxPQUFPLGtCQUFrQjtBQUN6QyxZQUFNLFFBQVEsQ0FBQyxZQUFZO0FBQUEsSUFDN0I7QUFDQSxhQUFTLEtBQUssTUFBTTtBQUFBLE1BQ2xCO0FBQUEsTUFDQSxJQUFJLEtBQUssUUFBUSxHQUFHLFFBQVEsQ0FBQyxDQUFDO0FBQUEsSUFDaEM7QUFDQSxVQUFNLFFBQVEsVUFBVSxPQUFPLE9BQU8sU0FBUyxDQUFDO0FBQ2hELFVBQU0sUUFBUSxZQUFZLFNBQ3ZCLElBQUksQ0FBQyxTQUFTLEtBQUssTUFBTSxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUMsRUFDOUMsS0FBSyxHQUFHO0FBQ1gsVUFBTSxRQUFRLGNBQWMsU0FDekIsSUFBSSxDQUFDLFNBQVMsTUFBTSxVQUFVLFNBQVMsS0FBSyxNQUFNLFNBQVMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLEVBQ3hFLEtBQUssR0FBRztBQUNYLFVBQU0sUUFBUSxlQUFlLGFBQWEsTUFDdkMsUUFBUSxFQUNSLElBQUksQ0FBQyxVQUFVLE1BQU0sUUFBUSxDQUFDLENBQUMsRUFDL0IsS0FBSyxHQUFHO0FBQ1gsVUFBTSxRQUFRLFVBQVUsV0FBVztBQUNuQyxVQUFNLFFBQVEsVUFBVSxTQUNyQixJQUFJLENBQUMsU0FBUyxLQUFLLFFBQVEsa0JBQWtCLFFBQVEsQ0FBQyxDQUFDLEVBQ3ZELEtBQUssR0FBRztBQUNYLFVBQU0sUUFBUSxXQUFXLFNBQ3RCLElBQUksQ0FBQyxTQUFTLEtBQUssYUFBYSxTQUFTLFVBQVUsTUFBTSxRQUFRLENBQUMsQ0FBQyxFQUNuRSxLQUFLLEdBQUc7QUFDWCxhQUFTLGdCQUFnQixLQUFLLFFBQVEsT0FBUSxTQUFTLElBQUk7QUFDM0QsYUFBUyxPQUFPLE9BQU8sTUFBTTtBQUM3QixRQUFJLEtBQUssUUFBUSxNQUFPO0FBQ3RCLGVBQVMsZ0JBQWdCLElBQUk7QUFDN0IsZUFBUyxPQUFPLFdBQVcsVUFBVTtBQUFBLElBQ3ZDO0FBQ0EsbUJBQWU7QUFDZixVQUFNLFFBQVEsaUJBQWlCLE9BQU8sU0FDbkMsUUFBUSxFQUNSLElBQUksQ0FBQyxVQUFVLE1BQU0sUUFBUSxDQUFDLENBQUMsRUFDL0IsS0FBSyxHQUFHO0FBQ1gsVUFBTSxRQUFRLGVBQWUsT0FDMUIsUUFBUSxFQUNSLElBQUksQ0FBQyxVQUFVLE1BQU0sUUFBUSxDQUFDLENBQUMsRUFDL0IsS0FBSyxHQUFHO0FBQ1gsUUFBSSxVQUFVLG9CQUFvQjtBQUFhLGlCQUFXO0FBQUEsRUFDNUQ7QUFDQSxXQUFTLGFBQWE7QUFDcEIsUUFBSSxVQUFVLFVBQWEsVUFBVTtBQUNuQyxjQUFRLHNCQUFzQixNQUFNO0FBQUEsRUFDeEM7QUFDQSxRQUFNLFNBQVMsTUFBTTtBQUNuQixRQUFJLENBQUMsTUFBTSxlQUFlLENBQUMsTUFBTTtBQUFjO0FBQy9DLGFBQVMsY0FBYyxLQUFLLElBQUksb0JBQW9CLEdBQUcsR0FBRyxDQUFDO0FBQzNELGFBQVMsUUFBUSxNQUFNLGFBQWEsTUFBTSxjQUFjLEtBQUs7QUFDN0QsV0FBTyxTQUFTLE1BQU0sY0FBYyxNQUFNO0FBQzFDLGlCQUFhLElBQUksS0FBSyxJQUFJLE1BQU0sS0FBSyxPQUFPLE1BQU07QUFDbEQsUUFBSSxDQUFDLFlBQVksQ0FBQztBQUFrQixhQUFPLFNBQVMsS0FBSyxZQUFZO0FBQ3JFLFdBQU8sdUJBQXVCO0FBQzlCLFVBQU0sT0FBTyxTQUFTLHFCQUFxQixJQUFJLE1BQU0sUUFBUSxDQUFDO0FBQzlELFdBQU8sUUFBUSxLQUFLLEdBQUcsS0FBSyxDQUFDO0FBQzdCLFNBQUssU0FBUyxNQUFNLE1BQU0sSUFBSSxJQUFJLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQztBQUNwRCxlQUFXO0FBQUEsRUFDYjtBQUNBLFFBQU0sV0FBVyxJQUFJLGVBQWUsTUFBTTtBQUMxQyxXQUFTLFFBQVEsS0FBSztBQUN0QixTQUFPO0FBRVAsUUFBTSxTQUFTLENBQUMsT0FBZ0M7QUFDOUMsUUFBSSxDQUFDLFNBQVM7QUFBVTtBQUN4QixVQUFNLE9BQU8sYUFBYSxLQUFLLE9BQU87QUFDdEMsUUFBSSxTQUFTO0FBQVU7QUFFdkIsUUFBSSxDQUFDLFlBQVk7QUFBTSxpQkFBVyxLQUFLLFdBQVc7QUFDbEQsZUFBVztBQUNYLFFBQUksQ0FBQztBQUFVLGlCQUFXLEtBQUssYUFBYTtBQUM1QyxjQUFVLE9BQU8sUUFBUTtBQUN6QixnQkFBWSxLQUFLO0FBQ2pCLFVBQU0sT0FBTyxTQUFTLEtBQUssQ0FBQyxZQUFZLFFBQVEsU0FBUyxPQUFPLFFBQVE7QUFDeEUsVUFBTSxXQUFXLGdCQUFnQixPQUFPO0FBQ3hDLHVCQUFtQjtBQUNuQixrQkFBYyxZQUFZLElBQUk7QUFDOUIsaUJBQWEsS0FBSyxTQUFTO0FBQUEsTUFDekIsUUFBUTtBQUFBLE1BQ1IsVUFBVTtBQUFBLE1BQ1YsWUFBWSxNQUFNO0FBQ2hCLDJCQUFtQjtBQUNuQixrQkFBVSxRQUFRO0FBQ2xCLG1CQUFXO0FBQUEsTUFDYjtBQUFBLElBQ0YsQ0FBQztBQUNELFFBQUksY0FBYyxhQUFhLE1BQU07QUFDckMsUUFBSSxNQUFNLFdBQVcsTUFBTTtBQUMzQixRQUFJLE1BQU07QUFDUixZQUFNLE9BQU8sS0FBSyxLQUFLLEtBQUssU0FBUyxDQUFDO0FBQ3RDLFlBQU0sUUFBUSxLQUFLLElBQUksS0FBSyxTQUFTLENBQUMsSUFBSTtBQUUxQyxZQUFNLFdBQVcsU0FDWixhQUFhLElBQUksS0FBSyxTQUFTLElBQUksT0FBTyxNQUMzQyxVQUFVLEtBQUssU0FBUyxJQUFJO0FBQ2hDLFlBQU0sTUFBTSxLQUFLLE1BQU0sS0FBSyxJQUFJLEtBQUssUUFBUSxNQUFNO0FBQ25ELFlBQU0sUUFBUSxLQUFLLE1BQU0sS0FBSyxLQUFLLE1BQU0sS0FBSyxJQUFJLENBQUMsS0FBSyxRQUFRLE1BQU07QUFDdEUsb0JBQWMsSUFBSSxNQUFNO0FBQUEsUUFDdEIsS0FBSyxTQUFTLElBQ1osT0FBTyxXQUFXLEtBQUssSUFBSSxNQUFNLFVBQVUsU0FBUyxFQUFFLENBQUM7QUFBQSxRQUN6RCxRQUFRLE1BQU07QUFBQSxRQUNkLEtBQUssU0FBUyxJQUFJO0FBQUEsTUFDcEI7QUFDQSxZQUFNLFlBQ0gsTUFBTSxFQUNOO0FBQUEsUUFDQyxJQUFJLE1BQU07QUFBQSxVQUNSLENBQUMsT0FBTyxLQUFLLElBQUksR0FBRyxJQUFJO0FBQUEsVUFDeEIsS0FBSyxJQUFJLEtBQUssSUFBSTtBQUFBLFVBQ2xCLENBQUMsS0FBSyxJQUFJLEdBQUcsSUFBSTtBQUFBLFFBQ25CO0FBQUEsTUFDRjtBQUFBLElBQ0o7QUFDQSxlQUFXO0FBQUEsTUFDVDtBQUFBLE1BQ0E7QUFBQSxRQUNFLEtBQUssT0FBUSxLQUFLLElBQUksS0FBSyxTQUFTLENBQUMsSUFBSSxJQUFJLEtBQUssS0FBTTtBQUFBLFFBQ3hEO0FBQUEsUUFDQSxNQUFNO0FBQUEsUUFDTixVQUFVLE1BQU0sT0FBTyx1QkFBdUI7QUFBQSxNQUNoRDtBQUFBLE1BQ0E7QUFBQSxJQUNGO0FBQ0EsZUFDRztBQUFBLE1BQ0MsT0FBTztBQUFBLE1BQ1A7QUFBQSxRQUNFLEdBQUcsWUFBWTtBQUFBLFFBQ2YsR0FBRyxZQUFZO0FBQUEsUUFDZixHQUFHLFlBQVk7QUFBQSxRQUNmO0FBQUEsUUFDQSxNQUFNO0FBQUEsTUFDUjtBQUFBLE1BQ0E7QUFBQSxJQUNGLEVBQ0M7QUFBQSxNQUNDO0FBQUEsTUFDQSxFQUFFLEdBQUcsSUFBSSxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsSUFBSSxHQUFHLFVBQVUsTUFBTSxlQUFlO0FBQUEsTUFDL0Q7QUFBQSxJQUNGLEVBQ0M7QUFBQSxNQUNDO0FBQUEsTUFDQSxFQUFFLE9BQU8sT0FBTyxJQUFJLEdBQUcsVUFBVSxXQUFXLEtBQUssTUFBTSxlQUFlO0FBQUEsTUFDdEU7QUFBQSxJQUNGO0FBQ0YsZUFBVyxXQUFXLFVBQVU7QUFDOUIsaUJBQVc7QUFBQSxRQUNUO0FBQUEsUUFDQTtBQUFBLFVBQ0UsVUFBVSxZQUFZLE9BQU8sSUFBSTtBQUFBLFVBQ2pDLFVBQVUsV0FBVztBQUFBLFVBQ3JCLE1BQU07QUFBQSxRQUNSO0FBQUEsUUFDQTtBQUFBLE1BQ0Y7QUFFQSxZQUFNLFFBQVEsS0FBSyxJQUFJLFFBQVEsU0FBUyxDQUFDLElBQUk7QUFDN0MsWUFBTSxXQUNKLFFBQVEsS0FBSyxLQUFLLFFBQVEsU0FBUyxDQUFDLE1BQU0sS0FBSyxLQUFLLEtBQUssU0FBUyxDQUFDO0FBQ3JFLFlBQU0sYUFBYSxRQUFRLEtBQUssSUFBSSxLQUFLLFNBQVMsQ0FBQyxJQUFJO0FBRXZELGlCQUFXO0FBQUEsUUFDVCxRQUFRLE1BQU07QUFBQSxRQUNkO0FBQUEsVUFDRSxHQUNFLGNBQWMsV0FDVixLQUFLLEtBQUssUUFBUSxTQUFTLENBQUMsS0FBSyxRQUFRLE1BQU0sS0FDL0MsUUFBUSxTQUFTLFlBQVksT0FDN0IsS0FBSyxLQUFLLFFBQVEsU0FBUyxDQUFDLEtBQUssV0FBVyxNQUFNLE9BQ2xELFFBQVEsU0FBUztBQUFBLFVBQ3ZCLEdBQ0UsY0FBYyxXQUNWLFFBQ0UsS0FDQSxPQUNGLFFBQVEsWUFBWSxPQUNwQixRQUNFLFdBQ0UsT0FDQSxLQUNGLEtBQ0YsUUFBUSxTQUFTO0FBQUEsVUFDdkI7QUFBQSxVQUNBLE1BQU07QUFBQSxRQUNSO0FBQUEsUUFDQTtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQ0EsZUFBVztBQUFBLEVBQ2I7QUFDQSxRQUFNLFlBQVksSUFBSSxNQUFNLFVBQVU7QUFDdEMsUUFBTSxVQUFVLElBQUksTUFBTSxRQUFRO0FBQ2xDLFFBQU0sVUFBVSxDQUFDLFVBQW1EO0FBQ2xFLFVBQU0sU0FBUyxTQUFTLFdBQVcsc0JBQXNCO0FBQ3pELFlBQVE7QUFBQSxPQUNKLE1BQU0sVUFBVSxPQUFPLFFBQVEsT0FBTyxRQUFTLElBQUk7QUFBQSxNQUNwRCxFQUFFLE1BQU0sVUFBVSxPQUFPLE9BQU8sT0FBTyxTQUFVLElBQUk7QUFBQSxJQUN4RDtBQUNBLGNBQVUsY0FBYyxTQUFTLE1BQU07QUFDdkMsV0FBTyxVQUFVO0FBQUEsTUFDZixTQUFTLFFBQVEsQ0FBQyxTQUFTLENBQUMsS0FBSyxNQUFNLEtBQUssR0FBRyxDQUFDO0FBQUEsSUFDbEQsRUFBRSxDQUFDLEdBQUcsT0FBTyxTQUFTO0FBQUEsRUFDeEI7QUFDQSxRQUFNLFFBQVEsQ0FBQyxVQUFzQjtBQUNuQyxVQUFNLEtBQUssUUFBUSxLQUFLO0FBQ3hCLFFBQUk7QUFBSSxhQUFPLEVBQUU7QUFBQSxhQUNSO0FBQVUsYUFBTyxJQUFJO0FBQUEsRUFDaEM7QUFDQSxXQUFTLFdBQVcsaUJBQWlCLFNBQVMsS0FBSztBQUNuRCxRQUFNLFNBQVMsQ0FBQyxVQUF3QjtBQUN0QyxRQUFJLENBQUMsVUFBVTtBQUFHO0FBQ2xCLGlCQUFhO0FBQ2IsZ0JBQVksSUFBSSxNQUFNLFNBQVMsTUFBTSxPQUFPO0FBQzVDLGtCQUNHO0FBQUEsT0FDRSxNQUFNLFVBQVUsYUFBYSxPQUFPO0FBQUEsT0FDcEMsTUFBTSxVQUFVLGNBQWMsT0FBTztBQUFBLElBQ3hDLEVBQ0MsWUFBWSxJQUFJLENBQUM7QUFDcEIsVUFBTSxZQUFZLFFBQVEsS0FBSyxLQUFLO0FBQ3BDLFVBQU0sZUFBZSxZQUFZO0FBQ2pDLGNBQVU7QUFDVixRQUFJLENBQUM7QUFBVSxpQkFBVyxLQUFLLGFBQWE7QUFDNUMsUUFBSSxDQUFDLFlBQVk7QUFBYyxpQkFBVztBQUFBLEVBQzVDO0FBQ0EsTUFBSTtBQUNKLFFBQU0sZUFBZSxNQUFNO0FBQ3pCLFFBQUksU0FBUyxRQUFRO0FBQ25CLG9CQUFjO0FBQ2Qsb0JBQWM7QUFDZCxVQUFJLFVBQVU7QUFBVyw2QkFBcUIsS0FBSztBQUNuRCxjQUFRO0FBQ1IsaUJBQVcsWUFBWSxJQUFJO0FBQUEsSUFDN0IsT0FBTztBQUNMLFVBQUksU0FBUyxDQUFDO0FBQ1osc0JBQWMsd0JBQXdCLFFBQVEsTUFBTyxFQUFFO0FBQ3pELFVBQUksWUFBWTtBQUNkLHVCQUFlLFlBQVksSUFBSSxJQUFJO0FBQ3JDLGlCQUFXO0FBQ1gsaUJBQVc7QUFBQSxJQUNiO0FBQUEsRUFDRjtBQUNBLFdBQVMsaUJBQWlCLG9CQUFvQixZQUFZO0FBQzFELFFBQU0sZUFBZSxNQUFNO0FBQ3pCLGlCQUFhO0FBQ2Isa0JBQWMsSUFBSSxHQUFHLENBQUM7QUFDdEIsUUFBSSxDQUFDO0FBQVUsaUJBQVcsS0FBSyxhQUFhO0FBQzVDLGNBQVU7QUFDVixlQUFXO0FBQUEsRUFDYjtBQUNBLFdBQVMsZ0JBQWdCLGlCQUFpQixnQkFBZ0IsWUFBWTtBQUV0RSx5QkFBdUIsRUFDcEIsS0FBSyxDQUFDLEVBQUUsVUFBVSxRQUFRLGFBQWEsU0FBUyxNQUFNO0FBQ3JELFFBQUk7QUFBVTtBQUNkLFVBQU0scUJBQXFCO0FBQUEsTUFDekIsSUFBSSxNQUFNO0FBQUEsUUFDUixJQUFJLFlBQVksUUFBUTtBQUFBLFFBQ3hCLFlBQVk7QUFBQSxRQUNaLFlBQVk7QUFBQSxRQUNaLE1BQU07QUFBQSxRQUNOLE1BQU07QUFBQSxNQUNSO0FBQUEsSUFDRjtBQUNBLHVCQUFtQixVQUFVLE1BQU07QUFDbkMsdUJBQW1CLFlBQVksTUFBTTtBQUNyQyx1QkFBbUIsWUFBWSxNQUFNO0FBQ3JDLHVCQUFtQixjQUFjO0FBQ2pDLFVBQU0sY0FBYztBQUNwQixVQUFNLFVBQVUsU0FBUyxJQUFJLE1BQU0sZUFBZSxDQUFDO0FBQ25ELGVBQVcsQ0FBQyxNQUFNLFFBQVEsUUFBUSxLQUFLO0FBQUEsTUFDckMsQ0FBQyxZQUFZLGFBQWEsQ0FBQztBQUFBLE1BQzNCLENBQUMsVUFBVSxXQUFXLENBQUM7QUFBQSxNQUN2QixDQUFDLGlCQUFpQixXQUFXLENBQUM7QUFBQSxJQUNoQyxHQUFZO0FBQ1YsWUFBTSxZQUFZLFNBQVMsV0FBVyxNQUFNO0FBQzVDLGNBQVE7QUFBQSxRQUNOO0FBQUEsUUFDQSxJQUFJLE1BQU07QUFBQSxVQUNSLElBQUksYUFBYSxRQUFRLFVBQVUsUUFBUSxVQUFVLEtBQUs7QUFBQSxVQUMxRDtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUNBLFVBQU0sVUFBVSxTQUFTLFdBQVc7QUFDcEMsWUFBUTtBQUFBLE1BQ04sSUFBSSxNQUFNO0FBQUEsUUFDUixJQUFJLFlBQVksUUFBUSxRQUFRLFFBQVEsUUFBUSxLQUFLO0FBQUEsUUFDckQ7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUNBLGNBQVUsTUFBTSxVQUFVLFNBQVMsU0FBUztBQUM1QyxVQUFNLE9BQU8sSUFBSSxNQUFNLEtBQUssU0FBUyxjQUFjO0FBQ25ELFNBQUssU0FBUyxVQUFVLFNBQVMsTUFBTSxFQUFFLGVBQWUsRUFBRTtBQUUxRCxVQUFNLFFBQVE7QUFDZCxVQUFNLGFBQWMsTUFBTSxNQUFPLFNBQVMsS0FBSyxDQUFDO0FBQ2hELFdBQU8sTUFBTSxVQUFVLFVBQVU7QUFDakMsV0FBTyxTQUFTLElBQUksUUFBUSxRQUFRLFNBQVMsT0FBTyxDQUFDLEtBQUs7QUFDMUQsV0FBTyxJQUFJLElBQUk7QUFDZixXQUFPLFFBQVEsWUFBWSxJQUFJO0FBQy9CLGVBQVcsQ0FBQyxNQUFNLEtBQUssS0FBSyxPQUFPLFFBQVEsU0FBUyxLQUFLO0FBQ3ZELFlBQU0sUUFBUSxJQUFJLElBQUksT0FBTyxLQUFLO0FBQ3BDLFVBQU0sUUFBUSxnQkFBZ0I7QUFDOUIsWUFBUTtBQUNSLFVBQU0sUUFBUSxtQkFBbUI7QUFDakMsY0FBVSxNQUFNO0FBQ2hCLGlCQUFhO0FBQUEsRUFDZixDQUFDLEVBQ0EsTUFBTSxDQUFDLFVBQVU7QUFDaEIsUUFBSSxDQUFDO0FBQVUsZ0JBQVUsTUFBTSxLQUFLO0FBQUEsRUFDdEMsQ0FBQztBQUVILFNBQU87QUFBQSxJQUNMO0FBQUEsSUFDQSxTQUFTLE1BQU07QUFDYixpQkFBVztBQUNYLGtCQUFZLEtBQUs7QUFDakIsZUFBUyxLQUFLLE1BQU0sZUFBZSxzQkFBc0I7QUFDekQsb0JBQWM7QUFDZCxlQUFTLFdBQVc7QUFDcEIsZUFBUyxvQkFBb0Isb0JBQW9CLFlBQVk7QUFDN0QsZUFBUyxnQkFBZ0Isb0JBQW9CLGdCQUFnQixZQUFZO0FBQ3pFLGVBQVMsV0FBVyxvQkFBb0IsU0FBUyxLQUFLO0FBQ3RELFVBQUksVUFBVTtBQUFXLDZCQUFxQixLQUFLO0FBQ25ELGlCQUFXLFFBQVEsQ0FBQyxVQUFVLE1BQU0sUUFBUSxDQUFDO0FBQzdDLGdCQUFVLFFBQVEsQ0FBQyxVQUFVLE1BQU0sUUFBUSxDQUFDO0FBQzVDLGVBQVMsUUFBUSxDQUFDLFVBQVUsTUFBTSxRQUFRLENBQUM7QUFDM0MsYUFBTyxjQUFjLFFBQVE7QUFDN0IsYUFBTyxRQUFRO0FBQ2YsZUFBUyxRQUFRO0FBQ2pCLGVBQVMsaUJBQWlCO0FBQzFCLGVBQVMsV0FBVyxPQUFPO0FBQUEsSUFDN0I7QUFBQSxFQUNGO0FBQ0Y7IiwibmFtZXMiOlsidGFyZ2V0Il19