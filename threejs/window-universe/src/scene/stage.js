import {
  Group,
  HalfFloatType,
  NeutralToneMapping,
  OrthographicCamera,
  Scene,
  Vector2,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

// world units are desktop pixels. x runs right, y runs up, so a point at
// desktop (sx, sy) lives at (sx, -sy) and the camera frames this window's slice.
export function createStage(canvas) {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = NeutralToneMapping;
  renderer.setClearColor(0x06070c, 1);

  const scene = new Scene();
  const world = new Group();
  scene.add(world);

  const camera = new OrthographicCamera(0, 1, 0, -1, -4000, 4000);
  camera.position.z = 10;

  // half float so additive glow can go past 1.0 and still bloom properly.
  // no msaa on purpose: a multisampled half float target renders black once a
  // second window opens its own context, which is exactly what this demo does.
  // bloom softens the edges enough to cover for it.
  const target = new WebGLRenderTarget(1, 1, { type: HalfFloatType });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(new Vector2(1, 1), 0.42, 0.55, 0.42);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  function resize(width, height) {
    camera.right = width;
    camera.bottom = -height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    bloom.setSize(width, height);
  }

  return {
    world,
    camera,
    renderer,
    resize,
    render: () => composer.render(),
    dispose: () => {
      composer.dispose();
      target.dispose();
      renderer.dispose();
    },
  };
}
