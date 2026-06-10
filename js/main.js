import { loadAssets } from "./assets.js";
import { buildGround, buildEntities, CHIMNEY, W, H } from "./scene.js";
import { drawAtmosphere, updateSmoke } from "./atmosphere.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function fit() {
  const scale = Math.min(innerWidth / W, innerHeight / H);
  canvas.style.width = `${Math.floor(W * scale)}px`;
  canvas.style.height = `${Math.floor(H * scale)}px`;
}
addEventListener("resize", fit);
fit();

await loadAssets();
const ground = buildGround();
const entities = buildEntities();
document.getElementById("loading").remove();

let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  const t = now / 1000;

  ctx.drawImage(ground, 0, 0);
  updateSmoke(dt, CHIMNEY.x, CHIMNEY.y);
  ctx.drawImage(entities, 0, 0);
  drawAtmosphere(ctx, t);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
