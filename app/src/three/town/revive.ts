// The revival mechanic. Every world material reads one shared field texture: for each ground point, its distance
// ALONG the lesson street (s) and its distance FROM the street (d). Points whose s is behind the child's progress
// are alive; everything ahead stays dusty grey desert. When a lesson is finished the front moves forward over a few
// seconds and the street behind Siraj is BUILT and GROWS in front of the child:
//   build  - houses, shops, posts rise out of the ground one after another (staggered per object)
//   grow   - palms, trees, shrubs, grass sprout and then sway
//   appear - flat things (alleys, wires) dissolve in
//   colour - dusty grey turns into the warm living palette; ground near the street turns green
import * as THREE from 'three';
import type { World } from './world';

export type ReviveUniforms = {
  uField: { value: THREE.DataTexture }; uBox: { value: THREE.Vector4 };
  uProg: { value: number }; uAll: { value: number }; uTime: { value: number };
};

export function makeReviveUniforms(w: World): ReviveUniforms {
  const { x0, x1, z0, z1 } = w.bounds;
  const tex = new THREE.DataTexture(w.fieldData, w.field.w, w.field.h, THREE.RGFormat, THREE.FloatType);
  tex.minFilter = tex.magFilter = THREE.NearestFilter; tex.needsUpdate = true;
  return { uField: { value: tex }, uBox: { value: new THREE.Vector4(x0, z0, x1, z1) }, uProg: { value: -50 }, uAll: { value: 0 }, uTime: { value: 0 } };
}

export const REVIVE_GLSL = /* glsl */ `
uniform sampler2D uField; uniform vec4 uBox; uniform float uProg; uniform float uAll; uniform float uTime;
vec2 rvField(vec2 xz) { return texture2D(uField, (xz - uBox.xy) / (uBox.zw - uBox.xy)).rg; }
// 0 = desert, 1 = alive. Near the street: alive once the front has passed (soft band). The living corridor fades out
// sideways; at the end of the world (uAll) the whole town comes alive.
float revive(vec2 xz) {
  vec2 f = rvField(xz);
  return max(smoothstep(-22.0, 0.0, uProg - f.r) * (1.0 - smoothstep(55.0, 120.0, f.g)), uAll);
}
float rvHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
`;

export type ReviveOpts = { grow?: boolean; build?: boolean; sway?: number; spin?: number; green?: boolean; appear?: boolean; detail?: THREE.Texture; detailBox?: THREE.Vector4 };

/** Adds the revival behaviour to a material (Lambert meshes, instanced meshes and lines). */
export function revivable<M extends THREE.Material>(mat: M, u: ReviveUniforms, o: ReviveOpts = {}): M {
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    if (o.detail) { sh.uniforms.uDetail = { value: o.detail }; sh.uniforms.uDetailBox = { value: o.detailBox }; }
    const stagger = o.build || o.grow;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${REVIVE_GLSL}\nvarying vec3 vRevWorld;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 rvO = vec4(0.0, 0.0, 0.0, 1.0);
        #ifdef USE_INSTANCING
          rvO = instanceMatrix * rvO;
        #endif
        rvO = modelMatrix * rvO;
        ${stagger ? `float rvR = revive(rvO.xz), rvK = rvHash(rvO.xz) * 0.55;
          float rvG = smoothstep(rvK, rvK + 0.45, rvR);` : ''}
        ${o.build ? 'transformed.y *= max(rvG, 0.0005); transformed.xz *= mix(0.9, 1.0, rvG);' : ''}
        ${o.grow ? 'transformed *= max(rvG * rvG * (3.0 - 2.0 * rvG), 0.0005);' : ''}
        ${o.spin ? `float rvSp = uTime * ${o.spin.toFixed(3)} * smoothstep(0.5, 1.0, revive(rvO.xz)); float rvC = cos(rvSp), rvS = sin(rvSp);
          transformed.yz = vec2(rvC * transformed.y - rvS * transformed.z, rvS * transformed.y + rvC * transformed.z);` : ''}
        ${o.sway ? `transformed.x += sin(uTime * 1.6 + rvO.x * 0.7 + rvO.z * 0.3) * ${o.sway.toFixed(3)} * max(transformed.y, 0.0);
          transformed.z += cos(uTime * 1.3 + rvO.z * 0.6) * ${(o.sway * 0.6).toFixed(3)} * max(transformed.y, 0.0);` : ''}`)
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 rvP = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          rvP = instanceMatrix * rvP;
        #endif
        vRevWorld = (modelMatrix * rvP).xyz;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n${REVIVE_GLSL}\nvarying vec3 vRevWorld;${o.detail ? '\nuniform sampler2D uDetail; uniform vec4 uDetailBox;' : ''}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float rvA = revive(vRevWorld.xz);
        ${o.appear ? 'if (rvA < rvHash(floor(vRevWorld.xz * 2.0)) * 0.9 + 0.05) discard;' : ''}
        ${o.detail ? `float rvD = texture2D(uDetail, (vRevWorld.xz - uDetailBox.xy) / (uDetailBox.zw - uDetailBox.xy)).r;
          diffuseColor.rgb *= 0.5 + rvD;` : ''}
        ${o.green ? `float rvNear = 1.0 - smoothstep(10.0, 70.0, rvField(vRevWorld.xz).g);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42, 0.62, 0.25), rvA * max(rvNear * 0.78, uAll * 0.55));` : ''}
        float rvL = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
        vec3 rvDust = mix(vec3(rvL) * vec3(0.93, 0.93, 0.92), vec3(0.58, 0.57, 0.55), 0.5);
        diffuseColor.rgb = mix(rvDust, diffuseColor.rgb, rvA);`);
  };
  mat.customProgramCacheKey = () => `revive-${o.grow ? 1 : 0}${o.build ? 1 : 0}${o.appear ? 1 : 0}${o.green ? 1 : 0}${o.detail ? 1 : 0}-${o.sway ?? 0}-${o.spin ?? 0}`;
  return mat;
}

/** Warm lantern glows (points) that only light where the street has been revived. */
export function glowMaterial(u: ReviveUniforms, map: THREE.Texture, size: number) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { ...u, uMap: { value: map }, uSize: { value: size } },
    vertexShader: `${REVIVE_GLSL}
      uniform float uSize; varying float vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vA = smoothstep(0.6, 1.0, revive(position.xz)) * (0.85 + 0.15 * sin(uTime * 3.0 + position.x));
        gl_PointSize = uSize * 300.0 / -mv.z; gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform sampler2D uMap; varying float vA;
      void main() { vec4 c = texture2D(uMap, gl_PointCoord); if (vA < 0.01) discard; gl_FragColor = vec4(c.rgb, c.a * vA); }`,
  });
}

/** Water of the other worlds (Nile, sea, crater lakes): still and murky at first, it rises and turns living blue with
 *  ripples as the stations are built (uLife 0..1). */
export function lifeWaterMaterial(u: ReviveUniforms) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6,
    uniforms: { uLife: { value: 0 }, uTime: u.uTime },
    vertexShader: `uniform float uLife; varying vec3 vP; void main(){ vec3 p = position; p.y -= (1.0 - uLife) * 0.9; vP = p; gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0); }`,
    fragmentShader: `uniform float uLife; uniform float uTime; varying vec3 vP;
      void main(){
        float rip = 0.5 + 0.5 * sin(vP.x * 0.35 + uTime * 1.3) * sin(vP.z * 0.28 - uTime * 0.9);
        vec3 dead = vec3(0.55, 0.52, 0.46), alive = mix(vec3(0.16, 0.48, 0.70), vec3(0.45, 0.78, 0.90), rip * 0.4);
        gl_FragColor = vec4(mix(dead, alive, uLife), 0.62 + 0.3 * uLife);
      }`,
  });
}

/** The Gash water: a ribbon along the river's centre line that fills from upstream (south) as the first lessons are
 *  finished, with slow flowing ripples. */
export function waterMaterial(u: ReviveUniforms) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -8,
    uniforms: { uFill: { value: 0 }, uTime: u.uTime },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float uFill; uniform float uTime; varying vec2 vUv;
      void main(){
        float edge = 1.0 - smoothstep(uFill - 0.015, uFill, vUv.x);
        float side = smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.75, 1.0, vUv.y));
        float ripple = 0.5 + 0.5 * sin(vUv.x * 900.0 - uTime * 2.2 + sin(vUv.y * 9.0) * 1.5);
        vec3 c = mix(vec3(0.20, 0.55, 0.74), vec3(0.62, 0.86, 0.95), ripple * 0.35);
        float a = edge * (0.55 + 0.4 * side);
        if (a < 0.01) discard;
        gl_FragColor = vec4(c, a);
      }`,
  });
}
