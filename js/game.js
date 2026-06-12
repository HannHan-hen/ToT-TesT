// The farming loop: one-minute days, plant / grow / harvest turnips,
// ship them at the log crate. Crops key off the day counter, so growth
// is simply `day - planted`, clamped to the mature stage.
import { drawSprite } from "./assets.js";
import { W, H, PLOT, STAGE_W, WALK, BLOCKERS, BIN } from "./scene.js";

const DAY_LENGTH = 60;  // seconds
const GROW_DAYS = 3;    // turnips mature on the third morning
const PRICE = 8;        // gold per turnip
const SAVE_KEY = "turnip-hollow-v1";

const state = {
  day: 4,
  time: 0,
  coins: 0,
  turnips: 0,
  // start with the concept-art arrangement, immediately playable
  crops: [3, 2, 3, 1, 3, 2, 3, 0, 3].map((s) => ({ planted: 4 - s })),
  phase: null, // day transition: {name: "out"|"hold"|"in", t}
};

const farmer = { x: 790, y: 520, speed: 175, facing: 1, moving: false, target: null };
const chicken = { x: 640, y: 320, vx: 0, vy: 0, timer: 0, flip: false };
const floats = [];
const keys = new Set();

const stageOf = (crop) => Math.min(GROW_DAYS, state.day - crop.planted);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

export function initGame() {
  window.__th = state; // debug handle (fast-forward days, inspect saves)
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && s.v === 1) {
      Object.assign(state, { day: s.day, coins: s.coins, turnips: s.turnips, crops: s.crops });
    }
  } catch { /* fresh farm */ }

  addEventListener("keydown", (e) => {
    if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) e.preventDefault();
    keys.add(e.key.toLowerCase());
    if ((e.key === " " || e.key.toLowerCase() === "e") && !e.repeat) interact();
  });
  addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
}

function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      v: 1, day: state.day, coins: state.coins, turnips: state.turnips, crops: state.crops,
    }));
  } catch { /* storage unavailable — play on */ }
}

export function pointerTarget(x, y) {
  farmer.target = { x: clamp(x, WALK.x1, WALK.x2), y: clamp(y, WALK.y1, WALK.y2), interact: true };
}

function blocked(x, y) {
  if (x < WALK.x1 || x > WALK.x2 || y < WALK.y1 || y > WALK.y2) return true;
  return BLOCKERS.some((b) => x > b.x1 && x < b.x2 && y > b.y1 && y < b.y2);
}

function nearestCell() {
  let best = -1, bd = Infinity;
  PLOT.forEach((c, i) => {
    const d = dist(farmer.x, farmer.y, c.x, c.y);
    if (d < bd) { bd = d; best = i; }
  });
  return bd < 62 ? best : -1;
}

const nearBin = () => dist(farmer.x, farmer.y, BIN.x, BIN.y) < 115;

function interact() {
  if (state.phase) return;
  const i = nearestCell();
  if (i >= 0) {
    const crop = state.crops[i];
    const c = PLOT[i];
    if (!crop) {
      state.crops[i] = { planted: state.day };
      float(c.x, c.y - 26, "planted");
    } else if (stageOf(crop) >= GROW_DAYS) {
      state.crops[i] = null;
      state.turnips++;
      float(c.x, c.y - 44, "+1 turnip");
    } else {
      float(c.x, c.y - 30, `day ${state.day - crop.planted + 1} of ${GROW_DAYS}`);
    }
    save();
    return;
  }
  if (nearBin()) {
    if (state.turnips > 0) {
      const g = state.turnips * PRICE;
      state.coins += g;
      state.turnips = 0;
      float(BIN.x, BIN.y - 76, `+${g}g`);
    } else {
      float(BIN.x, BIN.y - 76, "nothing to ship");
    }
    save();
  }
}

function float(x, y, text) {
  floats.push({ x, y, text, age: 0 });
}

export function updateGame(dt, t) {
  for (let i = floats.length - 1; i >= 0; i--) {
    floats[i].age += dt;
    if (floats[i].age > 1.4) floats.splice(i, 1);
  }

  if (state.phase) {
    const p = state.phase;
    const DUR = { out: 0.8, hold: 0.9, in: 0.8 };
    p.t += dt;
    if (p.t >= DUR[p.name]) {
      if (p.name === "out") {
        state.day++;
        state.time = 0;
        save();
        state.phase = { name: "hold", t: 0 };
      } else if (p.name === "hold") {
        state.phase = { name: "in", t: 0 };
      } else {
        state.phase = null;
      }
    }
    return; // the farm sleeps through the night
  }

  // farmer: keys win over a click target
  let dx = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
  let dy = (keys.has("s") || keys.has("arrowdown") ? 1 : 0) - (keys.has("w") || keys.has("arrowup") ? 1 : 0);
  if (dx || dy) farmer.target = null;
  else if (farmer.target) {
    const tdx = farmer.target.x - farmer.x, tdy = farmer.target.y - farmer.y;
    const d = Math.hypot(tdx, tdy);
    if (d < 6) {
      if (farmer.target.interact) interact();
      farmer.target = null;
    } else {
      dx = tdx / d;
      dy = tdy / d;
    }
  }
  farmer.moving = !!(dx || dy);
  if (farmer.moving) {
    const len = Math.hypot(dx, dy);
    const nx = farmer.x + (dx / len) * farmer.speed * dt;
    const ny = farmer.y + (dy / len) * farmer.speed * dt;
    if (!blocked(nx, farmer.y)) farmer.x = nx; // slide along blockers
    if (!blocked(farmer.x, ny)) farmer.y = ny;
    if (dx) farmer.facing = Math.sign(dx);
  }

  // chicken: aimless pottering near its patch
  chicken.timer -= dt;
  if (chicken.timer <= 0) {
    chicken.timer = 1.5 + Math.random() * 2.5;
    if (Math.random() < 0.4) {
      chicken.vx = chicken.vy = 0;
    } else {
      const a = Math.random() * Math.PI * 2;
      chicken.vx = Math.cos(a) * 26;
      chicken.vy = Math.sin(a) * 26;
    }
  }
  const cx = chicken.x + chicken.vx * dt, cy = chicken.y + chicken.vy * dt;
  if (dist(cx, cy, 660, 330) < 115 && !blocked(cx, cy)) { chicken.x = cx; chicken.y = cy; }
  else chicken.timer = 0;
  if (chicken.vx) chicken.flip = chicken.vx < 0;

  state.time += dt;
  if (state.time >= DAY_LENGTH) state.phase = { name: "out", t: 0 };
}

export function dynamicEntities(t) {
  const ents = [];
  for (let i = 0; i < PLOT.length; i++) {
    const crop = state.crops[i];
    if (!crop) continue;
    const st = stageOf(crop);
    ents.push({ key: `plant_turnip_${st}`, x: PLOT[i].x, y: PLOT[i].y, opts: { h: STAGE_W[st], fallback: "turnip", stage: st } });
  }
  const bob = farmer.moving ? Math.abs(Math.sin(t * 11)) * 3 : 0;
  ents.push({ key: "farmer", x: farmer.x, y: farmer.y - bob, opts: { h: 122, flipX: farmer.facing < 0, fallback: "character" } });
  ents.push({ key: "chicken", x: chicken.x, y: chicken.y, opts: { h: 68, flipX: chicken.flip } });
  return ents;
}

export function drawHud(ctx) {
  // wooden status panel
  ctx.save();
  ctx.fillStyle = "rgba(50,36,21,0.78)";
  ctx.strokeStyle = "rgba(243,230,200,0.28)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(16, 16, 168, 96, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#f3e6c8";
  ctx.font = "20px Georgia, serif";
  ctx.fillText(`Day ${state.day}`, 34, 44);
  ctx.font = "17px Georgia, serif";
  ctx.beginPath();
  ctx.fillStyle = "#e8c04a";
  ctx.arc(42, 66, 7, 0, 7);
  ctx.fill();
  ctx.fillStyle = "#f3e6c8";
  ctx.fillText(`${state.coins}g`, 58, 72);
  drawSprite(ctx, "plant_turnip_3", 42, 102, { h: 24, fallback: "turnip", stage: 3 });
  ctx.fillText(`x ${state.turnips}`, 58, 98);

  // context hint
  let hint = "WASD / arrows — walk · Space — interact · or click to go";
  const i = nearestCell();
  if (i >= 0) {
    const crop = state.crops[i];
    if (!crop) hint = "Space — plant a turnip seed";
    else if (stageOf(crop) >= GROW_DAYS) hint = "Space — harvest!";
    else hint = `growing… day ${state.day - crop.planted + 1} of ${GROW_DAYS}`;
  } else if (nearBin()) {
    hint = state.turnips > 0
      ? `Space — ship ${state.turnips} turnip${state.turnips > 1 ? "s" : ""} (+${state.turnips * PRICE}g)`
      : "the shipping bin — bring turnips here";
  }
  ctx.font = "16px Georgia, serif";
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(30,20,10,0.8)";
  ctx.shadowBlur = 6;
  ctx.fillStyle = "rgba(248,238,214,0.92)";
  ctx.fillText(hint, W / 2, H - 22);
  ctx.shadowBlur = 0;

  // floating feedback
  for (const f of floats) {
    const a = f.age < 0.2 ? f.age / 0.2 : 1 - (f.age - 0.2) / 1.2;
    ctx.globalAlpha = Math.max(0, a);
    ctx.font = "18px Georgia, serif";
    ctx.fillStyle = "#fdf6e3";
    ctx.shadowColor = "rgba(30,20,10,0.9)";
    ctx.shadowBlur = 5;
    ctx.fillText(f.text, f.x, f.y - f.age * 26);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = "left";

  // night fade between days
  if (state.phase) {
    const p = state.phase;
    const alpha = p.name === "out" ? p.t / 0.8 : p.name === "in" ? 1 - p.t / 0.8 : 1;
    ctx.fillStyle = `rgba(16,11,6,${Math.min(1, alpha) * 0.96})`;
    ctx.fillRect(0, 0, W, H);
    if (alpha > 0.65) {
      ctx.globalAlpha = (alpha - 0.65) / 0.35;
      ctx.fillStyle = "#f3e6c8";
      ctx.font = "46px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText(`Day ${state.day}`, W / 2, H / 2 - 8);
      ctx.font = "18px Georgia, serif";
      ctx.fillStyle = "rgba(243,230,200,0.75)";
      ctx.fillText("the turnips stretch toward the morning sun", W / 2, H / 2 + 28);
      ctx.textAlign = "left";
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}
