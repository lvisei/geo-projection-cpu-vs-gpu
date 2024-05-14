import * as webglUtils from "https://esm.sh/webgl-utils.js@1";
import { mat4 } from "https://esm.sh/gl-matrix@3";

const PI = Math.PI;
const PI_4 = PI / 4;
const DEGREES_TO_RADIANS = PI / 180;
const TILE_SIZE = 512;

export function lngLatToWorld(lngLat) {
  const [lng, lat] = lngLat;
  const lambda2 = lng * DEGREES_TO_RADIANS;
  const phi2 = lat * DEGREES_TO_RADIANS;
  const x = (TILE_SIZE * (lambda2 + PI)) / (2 * PI);
  const y =
    (TILE_SIZE * (PI + Math.log(Math.tan(PI_4 + phi2 * 0.5)))) / (2 * PI);
  return [x, y];
}

const glsl = (x) => `${x}`;

export const PROJECT_VSHADER = glsl`
const float TILE_SIZE = 512.0;
const float PI = 3.1415926536;
const float WORLD_SCALE = TILE_SIZE / (PI * 2.0);

// Projecting positions - non-linear projection: lnglat coords => world coords
vec2 project_mercator(vec2 lnglat) {
  float x = lnglat.x;
  float y = clamp(lnglat.y, -89.9, 89.9);
  return vec2(
    radians(x) + PI,
    PI + log(tan(PI * 0.25 + radians(y) * 0.5))
  ) * WORLD_SCALE;
}
`;

const VSHADER_SOURCE = glsl`#version 300 es
in vec2 a_Position;

uniform mat4 u_vpMatrix;

void main() {
  gl_Position = u_vpMatrix * vec4(a_Position, 0, 1.);
  gl_PointSize = 2.0;
}
`;

const FSHADER_SOURCE = glsl`#version 300 es
precision mediump float;

out vec4 outColor;

void main() {
  // Generate a random color
  // float randomValue = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  // outColor = vec4(vec3(randomValue), 1.0);
  outColor = vec4(vec3(1, 0.5, 0), 0.8);
}`;

/**
 * render data to canvas
 */
export function renderToMap(
  canvas,
  points,
  vertexShaderSource = VSHADER_SOURCE,
  fragmentShaderSource = FSHADER_SOURCE
) {
  // Get A WebGL context
  var gl = canvas.getContext("webgl2");
  if (!gl) {
    return;
  }

  // Link the two shaders into a program
  const program = webglUtils.createProgramFromSources(gl, [
    vertexShaderSource,
    fragmentShaderSource,
  ]);
  if (!program) {
    console.log("Failed to intialize shaders.");
    return;
  }

  const positionAttributeLocation = gl.getAttribLocation(program, "a_Position");
  if (positionAttributeLocation < 0) {
    console.log("Failed to get the storage location of a_Position");
    return;
  }

  // Create a buffer and put three 2d clip space points in it
  const positionBuffer = gl.createBuffer();

  // Bind it to ARRAY_BUFFER
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  const count = points.length;
  const positions = points.flat();

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  // Create a vertex array object
  var vao = gl.createVertexArray();

  // and make it the one we're currently working with
  gl.bindVertexArray(vao);

  // Turn on the attribute
  gl.enableVertexAttribArray(positionAttributeLocation);

  // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
  gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

  gl.bindVertexArray(null);

  // Get the storage location of u_vpMatrix
  const u_vpMatrix = gl.getUniformLocation(program, "u_vpMatrix");
  if (!u_vpMatrix) {
    console.log("Failed to get the storage location of u_vpMatrix");
    return;
  }

  // View matrix
  const viewMatrix = mat4.create();
  mat4.lookAt(viewMatrix, [256, 256, 1.5], [256, 256, 0], [0, 1, 0]);
  //  Projection matrix
  const projMatrix = mat4.create();
  const fovy = 90.429 * 2;
  const fovyRadians = DEGREES_TO_RADIANS * fovy;
  mat4.perspective(
    projMatrix,
    fovyRadians, // fovy
    gl.canvas.clientWidth / gl.canvas.clientHeight,
    0.1, // near
    1.6 // far
  );
  let viewProjectionMatrix = mat4.create();
  viewProjectionMatrix = mat4.multiply(
    viewProjectionMatrix,
    projMatrix,
    viewMatrix
  );

  webglUtils.resizeCanvasToDisplaySize(gl.canvas, window.devicePixelRatio);
  //  convert from clip space to pixels
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  // Clear the canvas
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(program);

  // Bind the attribute/buffer
  gl.bindVertexArray(vao);

  gl.uniformMatrix4fv(u_vpMatrix, false, viewProjectionMatrix);

  // draw
  gl.drawArrays(gl.POINTS, 0, count);
}
