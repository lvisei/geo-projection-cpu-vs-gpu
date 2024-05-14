import { mat4 } from "https://esm.sh/gl-matrix@3.4.3";
import { PROJECT_VSHADER, renderToMap } from "./lib.js";

const VSHADER_SOURCE = `#version 300 es

${PROJECT_VSHADER}

in vec2 a_Position;

uniform mat4 u_vpMatrix;

void main() {
  vec2 projectedPosition = project_mercator(a_Position);
  gl_Position = u_vpMatrix * vec4(projectedPosition, 0, 1.);
  gl_PointSize = 10.0;
}
`;

export function projectInGPU(canvas, geoPoints) {
  renderToMap(canvas, geoPoints, VSHADER_SOURCE);
}