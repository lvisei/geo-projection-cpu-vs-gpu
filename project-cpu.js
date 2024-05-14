import { lngLatToWorld, renderToMap } from "./lib.js";

export function projectInCPU(canvas, geoPoints) {
  const start = performance.now();
  const points = geoPoints.map(lngLatToWorld);
  const end = performance.now();
  renderToMap(canvas, points);

  const cost = end - start;

  return cost;
}
