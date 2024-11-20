import { WebXRButton } from './js/util/webxr-button.js';
import { Scene } from './js/render/scenes/scene.js';
import { Renderer, createWebGLContext } from './js/render/core/renderer.js';
import { SkyboxNode } from './js/render/nodes/skybox.js';
import { InlineViewerHelper } from './js/util/inline-viewer-helper.js';
import { Gltf2Node } from './js/render/nodes/gltf2.js';
import { QueryArgs } from './js/util/query-args.js';

import { MeshNode } from './js/render/nodes/mesh-node.js';

// If requested, use the polyfill to provide support for mobile devices
// and devices which only support WebVR.
import WebXRPolyfill from './js/third-party/webxr-polyfill/build/webxr-polyfill.module.js';
if (QueryArgs.getBool('usePolyfill', true)) {
  let polyfill = new WebXRPolyfill();
}

// XR globals.
let xrButton = null;
let xrImmersiveRefSpace = null;
let inlineViewerHelper = null;

// WebGL scene globals.
let gl = null;
let renderer = null;
let scene = new Scene();
// let solarSystem = new Gltf2Node({url: 'media/gltf/space/space.gltf'});
let solarSystem = new Gltf2Node({ url: 'media/gltf/VC/glTF-Embedded/VC.gltf' });
// let solarSystem = new Gltf2Node({url: 'media/gltf/VC/glTF-Binary/VC.glb'});
// let solarSystem = new Gltf2Node({url: 'media/gltf/SciFiHelmet/glTF/SciFiHelmet.gltf'});
// The solar system is big (citation needed). Scale it down so that users
// can move around the planets more easily.
solarSystem.scale = [0.1, 0.1, 0.1];
solarSystem.translation = [0.0, -0.2, 0.0];
scene.addNode(solarSystem);


// Пример вершин, индексов и цветов для куба
const vertices = [
  -0.5, -0.5, -0.5, 0.5, -0.5, -0.5,
  0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
  -0.5, -0.5, 0.5, 0.5, -0.5, 0.5,
  0.5, 0.5, 0.5, -0.5, 0.5, 0.5
];
const colors = [
  1.0, 0.0, 0.0, 0.5, 0.0, 0.0,   // Красный
  0.0, 1.0, 0.0, 0.0, 0.5, 0.0,   // Зеленый
  0.0, 0.0, 1.0, 0.0, 0.0, 0.5,   // Синий
  1.0, 1.0, 0.0, 0.5, 0.5, 0.0    // Желтый
];
const indices = [
  0, 1, 2, 2, 3, 0,  // Передняя грань (нормаль внутрь)
  4, 7, 6, 6, 5, 4,  // Задняя грань (нормаль внутрь)
  0, 4, 5, 5, 1, 0,  // Нижняя грань (нормаль внутрь)
  2, 6, 7, 7, 3, 2,  // Верхняя грань (нормаль внутрь)
  0, 3, 7, 7, 4, 0,  // Левая грань (нормаль внутрь)
  1, 6, 2, 6, 1, 5   // Правая грань (нормаль внутрь)
];

const customMesh = new MeshNode(gl, vertices, colors, indices);
// customMesh.translation = [1.0, -0.5, -1.0];
customMesh.scale = [0.5, 0.5, 0.5];
scene.addNode(customMesh);


// Still adding a skybox, but only for the benefit of the inline view.
// let skybox = new SkyboxNode({url: 'media/textures/milky-way-2k.png'});
// let skybox = new SkyboxNode({url: 'media/textures/milky-way-4k.png'});
let skybox = new SkyboxNode({ url: 'media/textures/eilenriede-park-2k.png' });
// let skybox = new SkyboxNode({url: 'media/textures/mono_equirect_test.png'});


scene.addNode(skybox);

function initXR() {
  xrButton = new WebXRButton({
    onRequestSession: onRequestSession,
    onEndSession: onEndSession,
    textEnterXRTitle: "START AR",
    textXRNotFoundTitle: "NO AR",
    textExitXRTitle: "EXIT AR",
  });
  document.querySelector('header').appendChild(xrButton.domElement);

  if (navigator.xr) {
    // Checks to ensure that 'immersive-ar' mode is available, and only
    // enables the button if so.
    navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
      xrButton.enabled = supported;
    });

    navigator.xr.requestSession('inline').then(onSessionStarted);
  }
}

function onRequestSession() {
  // Requests an 'immersive-ar' session, which ensures that the users
  // environment will be visible either via video passthrough or a
  // transparent display. This may be presented either in a headset or
  // fullscreen on a mobile device.
  return navigator.xr.requestSession('immersive-ar')
    .then((session) => {
      xrButton.setSession(session);
      session.isImmersive = true;
      onSessionStarted(session);
    });
}

function initGL() {
  if (gl)
    return;

  gl = createWebGLContext({
    xrCompatible: true
  });
  document.body.appendChild(gl.canvas);

  function onResize() {
    gl.canvas.width = gl.canvas.clientWidth * window.devicePixelRatio;
    gl.canvas.height = gl.canvas.clientHeight * window.devicePixelRatio;
  }
  window.addEventListener('resize', onResize);
  onResize();

  renderer = new Renderer(gl);

  scene.setRenderer(renderer);
}

function onSessionStarted(session) {
  session.addEventListener('end', onSessionEnded);

  if (session.isImmersive) {
    // When in 'immersive-ar' mode don't draw an opaque background because
    // we want the real world to show through.
    skybox.visible = false;
  }

  initGL();

  session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl) });

  let refSpaceType = session.isImmersive ? 'local' : 'viewer';
  session.requestReferenceSpace(refSpaceType).then((refSpace) => {
    if (session.isImmersive) {
      xrImmersiveRefSpace = refSpace;

      xrImmersiveRefSpace.addEventListener('reset', (evt) => {
        if (evt.transform) {
          // AR experiences typically should stay grounded to the real world.
          // If there's a known origin shift, compensate for it here.
          xrImmersiveRefSpace = xrImmersiveRefSpace.getOffsetReferenceSpace(evt.transform);
        }
      });
    } else {
      inlineViewerHelper = new InlineViewerHelper(gl.canvas, refSpace);
    }
    session.requestAnimationFrame(onXRFrame);
  });
}

function onEndSession(session) {
  session.end();
}

function onSessionEnded(event) {
  if (event.session.isImmersive) {
    xrButton.setSession(null);
    // Turn the background back on when we go back to the inlive view.
    skybox.visible = true;
  }
}

// Called every time a XRSession requests that a new frame be drawn.
function onXRFrame(t, frame) {
  let session = frame.session;
  let refSpace = session.isImmersive ?
    xrImmersiveRefSpace :
    inlineViewerHelper.referenceSpace;
  let pose = frame.getViewerPose(refSpace);

  scene.startFrame();

  session.requestAnimationFrame(onXRFrame);

  scene.drawXRFrame(frame, pose);

  scene.endFrame();
}

// Start the XR application.
initXR();
