import { randomPoint } from "https://esm.sh/v135/@turf/random@6/es2022/random.mjs";
import { projectInCPU } from "./project-cpu.js";
import { projectInGPU } from "./project-gpu.js";

const $ = (el) => document.querySelector(el);
const sleep = (time = 500) => {
  return new Promise((resolve) => setTimeout(resolve, time));
};
const getGeoPoints = (amount) => {
  const bbox = [-180, -85, 180, 85];
  // max random Point 1M
  const maxRandom = 1000000;
  if (amount <= maxRandom) {
    return randomPoint(amount, { bbox }).features.map(
      (feature) => feature.geometry.coordinates
    );
  }

  const points1M = randomPoint(maxRandom, { bbox }).features.map(
    (feature) => feature.geometry.coordinates
  );
  const multiple = Math.floor(amount / maxRandom);
  const remainder = amount % maxRandom;

  const points = new Array(multiple)
    .fill(0)
    .map(() => points1M)
    .flat();

  if (remainder) {
    points.push(...points1M.slice(0, remainder));
  }

  if (points.length !== amount) {
    console.error(points.length, amount);
  }

  return points;
};

let comparing = false;
const cpuCanvas = document.getElementById("cpu-canvas");
const gpuCanvas = document.getElementById("gpu-canvas");

let amountData = Number($("#amountData").value);

$("#amountData").onchange = (e) => {
  const amount = Number(e.target.value);
  if (amount <= 0) return;
  amountData = amount;
};

$("#startVS").onclick = async () => {
  if (comparing) return;
  comparing = true;
  $("#startVS").innerHTML = "Comparing";
  const geoPoints = await sleep().then(() => getGeoPoints(amountData));
  startComparison(geoPoints);
  $("#startVS").innerHTML = "Start Comparison";
  comparing = false;
};

function startComparison(geoPoints) {
  console.log("geoPoints: ", geoPoints);

  let start = performance.now();
  const costTimeProjectInCPU = projectInCPU(cpuCanvas, geoPoints);
  let end = performance.now();
  const costTimeInCPU = `${end - start}ms`;

  start = performance.now();
  projectInGPU(gpuCanvas, geoPoints);
  end = performance.now();
  const costTimeInGPU = `${end - start}ms`;

  $("#cpu-projecte-time").innerHTML = `${costTimeProjectInCPU}ms`;
  console.log("only project in cpu cost:", `${costTimeProjectInCPU}ms`);
  $("#cpu-all-time").innerHTML = costTimeInCPU;
  console.log("CPU cost is", costTimeInCPU);

  $("#gpu-projecte-time").innerHTML = `-`;
  console.log("only project in gpu cost:", `-`);
  $("#gpu-all-time").innerHTML = costTimeInGPU;
  console.log("GPU cost is", costTimeInGPU);
}
