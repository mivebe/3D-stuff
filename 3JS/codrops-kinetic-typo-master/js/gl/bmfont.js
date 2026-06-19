import * as THREE from 'three';
import createLayout from 'layout-bmfont-text';
import createIndices from 'quad-indices';

// drop-in replacement for three-bmfont-text. that package is pinned to a global
// THREE (no UMD global in modern builds) and subclasses BufferGeometry via
// inherits()/Base.call(this), which throws on r155+ es6 classes. this rebuilds
// the same vec2 position/uv geometry from layout-bmfont-text + quad-indices.

function glyphPositions(glyphs) {
  const positions = new Float32Array(glyphs.length * 4 * 2);
  let i = 0;
  for (const glyph of glyphs) {
    const bitmap = glyph.data;
    const x = glyph.position[0] + bitmap.xoffset;
    const y = glyph.position[1] + bitmap.yoffset;
    const w = bitmap.width;
    const h = bitmap.height;

    // BL
    positions[i++] = x;
    positions[i++] = y;
    // TL
    positions[i++] = x;
    positions[i++] = y + h;
    // TR
    positions[i++] = x + w;
    positions[i++] = y + h;
    // BR
    positions[i++] = x + w;
    positions[i++] = y;
  }
  return positions;
}

function glyphUvs(glyphs, texWidth, texHeight, flipY) {
  const uvs = new Float32Array(glyphs.length * 4 * 2);
  let i = 0;
  for (const glyph of glyphs) {
    const bitmap = glyph.data;
    const bw = bitmap.x + bitmap.width;
    const bh = bitmap.y + bitmap.height;

    const u0 = bitmap.x / texWidth;
    let v1 = bitmap.y / texHeight;
    const u1 = bw / texWidth;
    let v0 = bh / texHeight;

    if (flipY) {
      v1 = (texHeight - bitmap.y) / texHeight;
      v0 = (texHeight - bh) / texHeight;
    }

    // BL
    uvs[i++] = u0;
    uvs[i++] = v1;
    // TL
    uvs[i++] = u0;
    uvs[i++] = v0;
    // TR
    uvs[i++] = u1;
    uvs[i++] = v0;
    // BR
    uvs[i++] = u1;
    uvs[i++] = v1;
  }
  return uvs;
}

export function createTextGeometry(opt) {
  if (typeof opt === 'string') opt = { text: opt };
  if (!opt.font) throw new TypeError('must specify a { font } in options');

  const layout = createLayout(opt);
  const flipY = opt.flipY !== false;
  const font = opt.font;
  const texWidth = font.common.scaleW;
  const texHeight = font.common.scaleH;

  const glyphs = layout.glyphs.filter((glyph) => {
    const bitmap = glyph.data;
    return bitmap.width * bitmap.height > 0;
  });

  const positions = glyphPositions(glyphs);
  const uvs = glyphUvs(glyphs, texWidth, texHeight, flipY);
  const indices = createIndices({
    clockwise: true,
    type: 'uint16',
    count: glyphs.length,
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 2));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.computeBoundingSphere();

  geometry.layout = layout;
  geometry.visibleGlyphs = glyphs;
  return geometry;
}

// equivalent of three-bmfont-text/shaders/msdf
export function MSDFShader(opt = {}) {
  const opacity = typeof opt.opacity === 'number' ? opt.opacity : 1;
  const alphaTest = typeof opt.alphaTest === 'number' ? opt.alphaTest : 0.0001;
  const precision = opt.precision || 'highp';
  const color = opt.color;
  const map = opt.map;
  const negate = typeof opt.negate === 'boolean' ? opt.negate : true;

  delete opt.map;
  delete opt.color;
  delete opt.precision;
  delete opt.opacity;
  delete opt.negate;

  return Object.assign(
    {
      uniforms: {
        opacity: { value: opacity },
        map: { value: map || new THREE.Texture() },
        color: { value: new THREE.Color(color) },
      },
      vertexShader: [
        'attribute vec2 uv;',
        'attribute vec4 position;',
        'uniform mat4 projectionMatrix;',
        'uniform mat4 modelViewMatrix;',
        'varying vec2 vUv;',
        'void main() {',
        'vUv = uv;',
        'gl_Position = projectionMatrix * modelViewMatrix * position;',
        '}',
      ].join('\n'),
      fragmentShader: [
        '#ifdef GL_OES_standard_derivatives',
        '#extension GL_OES_standard_derivatives : enable',
        '#endif',
        'precision ' + precision + ' float;',
        'uniform float opacity;',
        'uniform vec3 color;',
        'uniform sampler2D map;',
        'varying vec2 vUv;',
        'float median(float r, float g, float b) {',
        '  return max(min(r, g), min(max(r, g), b));',
        '}',
        'void main() {',
        '  vec3 sampleColor = ' + (negate ? '1.0 - ' : '') + 'texture2D(map, vUv).rgb;',
        '  float sigDist = median(sampleColor.r, sampleColor.g, sampleColor.b) - 0.5;',
        '  float alpha = clamp(sigDist/fwidth(sigDist) + 0.5, 0.0, 1.0);',
        '  gl_FragColor = vec4(color.xyz, alpha * opacity);',
        alphaTest === 0 ? '' : '  if (gl_FragColor.a < ' + alphaTest + ') discard;',
        '}',
      ].join('\n'),
    },
    opt,
  );
}
