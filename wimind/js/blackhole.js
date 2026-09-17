/* ============================================================
   WIMIND · blackhole.js
   WebGL-мини-чёрная-дыра. Тяни мышью — камера вращается.
   ============================================================ */

(function () {
  'use strict';

  const canvas = document.getElementById('c');
  if (!canvas) return;

  const gl = canvas.getContext('webgl', {
    antialias: true,
    alpha: true,
    premultipliedAlpha: true,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance'
  }) || canvas.getContext('experimental-webgl');

  if (!gl) { console.warn('WebGL недоступен'); return; }

  const VERT = `
    attribute vec2 aPos;
    void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }
  `;

  const FRAG = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif

  uniform vec2  uRes;
  uniform float uTime;
  uniform vec3  uCamPos;
  uniform mat3  uCamBasis;
  uniform float uFocal;

  const float PI = 3.14159265359;
  const float RS = 1.0;

  const vec3 C_DISK_1   = vec3(0.90, 0.95, 1.00);
  const vec3 C_DISK_2   = vec3(0.50, 0.75, 1.00);
  const vec3 C_DISK_3   = vec3(0.22, 0.48, 0.92);
  const vec3 C_OUTLINE  = vec3(0.10, 0.22, 0.50);
  const vec3 C_RING     = vec3(0.30, 0.62, 1.00);
  const vec3 C_VOID     = vec3(0.00, 0.00, 0.00);

  float hash31(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }
  vec3 hash33(vec3 p) {
    return vec3(hash31(p), hash31(p + 17.13), hash31(p + 41.77));
  }

  vec4 diskSample(vec3 hp) {
    float r = length(hp.xz);
    float rIn  = 2.20;
    float rOut = 4.80;
    if (r < rIn || r > rOut) return vec4(0.0);

    float t = (r - rIn) / (rOut - rIn);

    if (t < 0.07 || t > 0.93) return vec4(C_OUTLINE, 0.88);

    vec3 col;
    if (t < 0.36)      col = C_DISK_1;
    else if (t < 0.70) col = C_DISK_2;
    else               col = C_DISK_3;

    return vec4(col, 0.72);
  }

  vec4 starField(vec3 d) {
    vec3  col = vec3(0.0);
    float a   = 0.0;

    const vec3 STAR_COL = vec3(0.35, 0.62, 1.00);

    for (int k = 0; k < 3; k++) {
      float fk = float(k);
      float scale = 14.0 + fk * 15.0;

      vec3 p = d * scale;
      vec3 i = floor(p);
      vec3 f = p - i;
      vec3 seed = i + fk * 43.7;

      float hasStar = step(hash31(seed + 5.31), 0.80);

      vec3 rnd = hash33(seed);
      vec3 center = vec3(0.5) + (rnd - 0.5) * 0.55;
      float dd = length(f - center);

      float size = 0.22 - fk * 0.02;
      float star = 1.0 - smoothstep(0.0, size, dd);

      float bright = 0.70 + 0.30 * hash31(seed + 12.11);

      float contrib = star * bright * hasStar;

      col += STAR_COL * contrib;
      a = max(a, contrib);
    }

    return vec4(col, a);
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    vec3 rd = normalize(uCamBasis * vec3(uv, uFocal));

    vec3 pos = uCamPos;
    vec3 dir = rd;

    vec3 hv = cross(pos, dir);
    float h2 = dot(hv, hv);

    vec3  pmCol = vec3(0.0);
    float alpha = 0.0;

    float minR = 1e9;
    bool  captured = false;
    vec3  bgDir = dir;

    for (int i = 0; i < 200; i++) {
      float r = length(pos);
      minR = min(minR, r);

      if (r < RS) { captured = true; break; }
      if (r > 55.0 && dot(pos, dir) > 0.0) { bgDir = normalize(dir); break; }

      float dt = clamp(0.07 * r, 0.014, 0.9);
      vec3 npos = pos + dir * dt;

      if (pos.y * npos.y < 0.0) {
        float tt = pos.y / (pos.y - npos.y);
        vec3 hp = mix(pos, npos, tt);
        vec4 dc = diskSample(hp);
        if (dc.a > 0.0) {
          float a = dc.a;
          pmCol = dc.rgb * a + pmCol * (1.0 - a);
          alpha = a + alpha * (1.0 - a);
        }
      }

      float rr = dot(npos, npos);
      dir += (-1.5 * h2 / (rr * rr * sqrt(rr))) * npos * dt;

      pos = npos;
    }

    if (captured) {
      pmCol = C_VOID * (1.0 - alpha) + pmCol;
      alpha = 1.0;
    }

    if (!captured) {
      float ring = smoothstep(1.75, 1.45, minR);
      if (ring > 0.001) {
        pmCol = C_RING * ring + pmCol * (1.0 - ring);
        alpha = ring + alpha * (1.0 - ring);
      }
    }

    if (!captured) {
      vec4 bg = starField(bgDir);
      pmCol += bg.rgb * bg.a * (1.0 - alpha);
      alpha += bg.a * (1.0 - alpha);
    }

    gl_FragColor = vec4(pmCol, alpha);
  }
  `;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(s));
    }
    return s;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(prog));
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW
  );
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const U = {
    res:      gl.getUniformLocation(prog, 'uRes'),
    time:     gl.getUniformLocation(prog, 'uTime'),
    camPos:   gl.getUniformLocation(prog, 'uCamPos'),
    camBasis: gl.getUniformLocation(prog, 'uCamBasis'),
    focal:    gl.getUniformLocation(prog, 'uFocal')
  };

  const PHI_MIN = 0.35;
  const PHI_MAX = Math.PI - 0.35;

  let theta = 0.0,  thetaT = 0.0;
  let phi   = 1.35, phiT   = 1.35;
  const DIST = 35.0;

  let dragging = false;
  let lastX = 0, lastY = 0;
  let idleTimer = 0;

  function onDown(x, y) {
    dragging = true;
    lastX = x; lastY = y;
    canvas.parentElement.classList.add('grabbing');
    idleTimer = 0;
  }
  function onMove(x, y) {
    if (!dragging) return;
    const dx = x - lastX;
    const dy = y - lastY;
    lastX = x; lastY = y;
    thetaT -= dx * 0.006;
    phiT   -= dy * 0.006;
    phiT = Math.max(PHI_MIN, Math.min(PHI_MAX, phiT));
    idleTimer = 0;
  }
  function onUp() {
    dragging = false;
    canvas.parentElement.classList.remove('grabbing');
  }

  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId);
    onDown(e.clientX, e.clientY);
  });
  canvas.addEventListener('pointermove', e => onMove(e.clientX, e.clientY));
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(canvas.clientWidth  * dpr));
    const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    return [w, h];
  }

  let last = performance.now();

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const time = now * 0.001;

    if (!dragging) {
      idleTimer += dt;
      if (idleTimer > 0.6) thetaT += dt * 0.12;
    }

    const k = 1 - Math.pow(0.001, dt);
    theta += (thetaT - theta) * k;
    phi   += (phiT   - phi)   * k;

    const sp = Math.sin(phi), cp = Math.cos(phi);
    const px = DIST * sp * Math.cos(theta);
    const py = DIST * cp;
    const pz = DIST * sp * Math.sin(theta);

    let fx = -px, fy = -py, fz = -pz;
    const fl = Math.hypot(fx, fy, fz) || 1;
    fx /= fl; fy /= fl; fz /= fl;

    let rx = -fz, ry = 0, rz = fx;
    const rl = Math.hypot(rx, ry, rz) || 1;
    rx /= rl; ry /= rl; rz /= rl;

    const ux = ry * fz - rz * fy;
    const uy = rz * fx - rx * fz;
    const uz = rx * fy - ry * fx;

    const [w, h] = resize();
    const aspect = w / h;

    const focal = Math.min(1.35, Math.max(0.85, 0.95 * Math.sqrt(aspect)));

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.uniform2f(U.res, w, h);
    gl.uniform1f(U.time, time);
    gl.uniform3f(U.camPos, px, py, pz);
    gl.uniformMatrix3fv(U.camBasis, false,
      new Float32Array([rx, ry, rz, ux, uy, uz, fx, fy, fz]));
    gl.uniform1f(U.focal, focal);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    requestAnimationFrame(frame);
  }

  resize();
  requestAnimationFrame(frame);
})();