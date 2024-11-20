import { Node } from '../core/node.js';
import { Material } from '../core/material.js';
import { Primitive, PrimitiveAttribute } from '../core/primitive.js';

const GL = WebGLRenderingContext;

const ncolors = [
  1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   // Красный
  0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   // Зеленый
  0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   // Синий
  1.0, 1.0, 0.0,   1.0, 1.0, 0.0    // Желтый
];

class MeshMaterial extends Material {
  constructor() {
    super();
  }

  get materialName() {
    return "MESH_MATERIAL";
  }

  get vertexSource() {
    return `
    attribute vec3 POSITION;
    attribute vec3 COLOR_0;
    varying vec3 vColor;

    vec4 vertex_main(mat4 proj, mat4 view, mat4 model) {
        vColor = COLOR_0;
        return proj * view * model * vec4(POSITION, 1.0);
    }
    `;
  }

  get fragmentSource() {
    return `
    precision mediump float;
    varying vec3 vColor;

    vec4 fragment_main() {
        return vec4(vColor, 1.0);
    }
    `;
  }
}

export class MeshNode extends Node {
  constructor(gl, vertices, colors, indices) {
    super();
    this.vertices = vertices;
    this.colors = colors;
    this.indices = indices;
    this.material = new MeshMaterial();
    this.vertexBuffer = null;
    this.colorBuffer = null;
    this.indexBuffer = null;
    this.primitive = null;

  }


  onRendererChanged(renderer) {
    const gl = renderer.gl;

    this.vertexBuffer = renderer.createRenderBuffer(GL.ARRAY_BUFFER, new Float32Array(this.vertices));
    this.colorBuffer = renderer.createRenderBuffer(GL.ARRAY_BUFFER, new Float32Array(this.colors));

    const attribs = [
      new PrimitiveAttribute("POSITION", this.vertexBuffer, 3, gl.FLOAT, 0, 0),
      new PrimitiveAttribute("COLOR_0", this.colorBuffer, 3, gl.FLOAT, 0, 0)
    ];

    this.primitive = new Primitive(attribs, this.indices.length);
    this.primitive.mode = gl.LINE_LOOP; // Устанавливаем режим wireframe
    this.primitive.setIndexBuffer(renderer.createRenderBuffer(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices)));

    const renderPrimitive = renderer.createRenderPrimitive(this.primitive, this.material);
    this.clearRenderPrimitives();
    this.addRenderPrimitive(renderPrimitive);

    gl.disable(gl.CULL_FACE);
  }
}