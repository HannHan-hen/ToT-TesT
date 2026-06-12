import { loadAssets, drawSprite } from "./assets.js";
import { buildGround, buildStaticEntities, CHIMNEY, W, H } from "./scene.js";
import { drawAtmosphere, updateSmoke } from "./atmosphere.js";
import { initGame, updateGame, dynamicEntities, drawHud, pointerTarget } from "./game.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingQuality = "high";

function fit() {
  const scale = Math.min(innerWidth / W, innerHeight / H);
  canvas.style.width = `${Math.floor(W * scale)}px`;
  canvas.style.height = `${Math.floor(H * scale)}px`;
}
addEventListener("resize", fit);
fit();

await loadAssets();
const ground = buildGround();
const statics = buildStaticEntities();
initGame();
document.getElementById("loading").remove();

canvas.addEventListener("pointerdown", (e) => {
  const r = canvas.getBoundingClientRect();
  pointerTarget((e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (H / r.height));
});

let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  const t = now / 1000;

  updateGame(dt, t);

  ctx.drawImage(ground, 0, 0);
  const ents = statics.concat(dynamicEntities(t));
  ents.sort((a, b) => a.y - b.y);
  for (const e of ents) drawSprite(ctx, e.key, e.x, e.y, e.opts);

  updateSmoke(dt, CHIMNEY.x, CHIMNEY.y);
  drawAtmosphere(ctx, t);
  drawHud(ctx);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
