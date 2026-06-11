const canvas = document.getElementById('organismCanvas');
const ctx = canvas.getContext('2d', { alpha: false });

const micBtn = document.getElementById('micBtn');
const resetBtn = document.getElementById('resetBtn');
const saveBtn = document.getElementById('saveBtn');
const audioFile = document.getElementById('audioFile');
const audioPlayer = document.getElementById('audioPlayer');
const gainSlider = document.getElementById('gainSlider');
const memorySlider = document.getElementById('memorySlider');
const mutationSlider = document.getElementById('mutationSlider');
const statusEl = document.getElementById('status');
const bassReadout = document.getElementById('bassReadout');
const sporeReadout = document.getElementById('sporeReadout');
const modeReadout = document.getElementById('modeReadout');

let audioCtx;
let analyser;
let gainNode;
let sourceNode;
let fileSourceNode;
let mediaStream;
let mode = 'DORMANT';
let animationId;

let width = 0;
let height = 0;
let dpr = 1;
let trailCanvas;
let trailCtx;
let fogCanvas;
let fogCtx;
let frequencyData;
let timeData;

const organism = {
  branches: [],
  spores: [],
  pulses: [],
  seed: Date.now() % 100000,
  frame: 0,
  energy: 0,
  bass: 0,
  mids: 0,
  highs: 0,
  silence: 1,
  lastBass: 0,
  nucleusPhase: 0
};

const palette = {
  background: '#010304',
  deep: '#031115',
  cyan: [102, 255, 228],
  green: [157, 255, 138],
  amber: [255, 211, 109],
  magenta: [255, 95, 210],
  violet: [154, 120, 255]
};

function mulberry32(seed) {
  return function random() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let rand = mulberry32(organism.seed);

function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = Math.floor(rect.width);
  height = Math.floor(rect.height);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  trailCanvas = document.createElement('canvas');
  trailCanvas.width = canvas.width;
  trailCanvas.height = canvas.height;
  trailCtx = trailCanvas.getContext('2d');
  trailCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  fogCanvas = document.createElement('canvas');
  fogCanvas.width = canvas.width;
  fogCanvas.height = canvas.height;
  fogCtx = fogCanvas.getContext('2d');
  fogCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  resetSpecimen(false);
}

function resetSpecimen(newSeed = true) {
  if (newSeed) organism.seed = Math.floor(Date.now() % 999999);
  rand = mulberry32(organism.seed);
  organism.branches = [];
  organism.spores = [];
  organism.pulses = [];
  organism.frame = 0;
  organism.energy = 0;
  organism.bass = 0;
  organism.mids = 0;
  organism.highs = 0;
  organism.silence = 1;
  organism.lastBass = 0;
  organism.nucleusPhase = rand() * Math.PI * 2;

  clearLayer(trailCtx);
  clearLayer(fogCtx);
  seedRoots();
}

function clearLayer(layer) {
  if (!layer) return;
  layer.save();
  layer.setTransform(1, 0, 0, 1, 0, 0);
  layer.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
  layer.restore();
}

function seedRoots() {
  const cx = width / 2;
  const cy = height * 0.56;
  const count = 34;
  for (let i = 0; i < count; i++) {
    const angle = (-Math.PI * 0.96) + (Math.PI * 1.92) * (i / count) + (rand() - 0.5) * 0.28;
    const baseLength = 22 + rand() * 52;
    organism.branches.push(new Branch(cx, cy, angle, baseLength, 0, 2.4 + rand() * 2.6, pickColor(i / count)));
  }
}

function pickColor(t) {
  if (t < 0.28) return palette.cyan;
  if (t < 0.58) return palette.green;
  if (t < 0.78) return palette.amber;
  return palette.magenta;
}

class Branch {
  constructor(x, y, angle, length, depth, widthScale, rgb) {
    this.x = x;
    this.y = y;
    this.px = x;
    this.py = y;
    this.angle = angle;
    this.length = length;
    this.depth = depth;
    this.width = widthScale;
    this.rgb = rgb;
    this.life = 1;
    this.age = 0;
    this.maxAge = 60 + rand() * 170;
    this.curve = (rand() - 0.5) * 0.18;
    this.splitChance = 0.004 + rand() * 0.014;
  }

  update(audio) {
    this.age++;
    this.px = this.x;
    this.py = this.y;

    const mutation = parseFloat(mutationSlider.value);
    const turbulence = pseudoNoise(this.x * 0.004, this.y * 0.004, organism.frame * 0.008 + this.depth) - 0.5;
    const bend = turbulence * (0.18 + mutation * 0.44) + this.curve + (audio.mids - 0.18) * 0.08;
    const speed = 0.38 + audio.bass * 3.4 + audio.energy * 1.2;
    this.angle += bend * 0.11;
    this.x += Math.cos(this.angle) * speed;
    this.y += Math.sin(this.angle) * speed;
    this.length -= speed * 0.34;
    this.life *= 0.997 - audio.silence * 0.0014;

    const kick = audio.bass - organism.lastBass;
    if (kick > 0.13 && rand() < 0.45 && this.depth < 6) this.split(audio, kick);
    if (this.length > 0 && this.depth < 7 && rand() < this.splitChance * (0.3 + audio.highs * 2.7 + mutation)) this.split(audio, 0.05);
    if (audio.highs > 0.28 && rand() < audio.highs * 0.18) spawnSpore(this.x, this.y, this.rgb, audio.highs);

    const margin = 80;
    if (this.x < -margin || this.x > width + margin || this.y < -margin || this.y > height + margin) this.life = 0;
    if (this.age > this.maxAge || this.length <= 0) this.life *= 0.96;
  }

  split(audio, kick) {
    const side = rand() < 0.5 ? -1 : 1;
    const angle = this.angle + side * (0.34 + rand() * 0.62 + kick);
    const childLength = 24 + rand() * 90 + audio.bass * 90;
    const childWidth = Math.max(0.42, this.width * (0.58 + rand() * 0.2));
    const shifted = shiftColor(this.rgb, audio.highs);
    organism.branches.push(new Branch(this.x, this.y, angle, childLength, this.depth + 1, childWidth, shifted));
  }

  draw(layer, audio) {
    const [r, g, b] = this.rgb;
    const alpha = Math.max(0, Math.min(0.9, this.life * (0.24 + audio.energy * 0.7)));
    layer.save();
    layer.globalCompositeOperation = 'lighter';
    layer.lineCap = 'round';
    layer.lineJoin = 'round';
    layer.shadowColor = `rgba(${r}, ${g}, ${b}, ${0.34 + audio.highs * 0.55})`;
    layer.shadowBlur = 8 + audio.bass * 24;
    layer.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    layer.lineWidth = Math.max(0.28, this.width * (0.65 + audio.bass * 1.4));
    layer.beginPath();
    layer.moveTo(this.px, this.py);
    layer.lineTo(this.x, this.y);
    layer.stroke();
    layer.restore();
  }
}

class Spore {
  constructor(x, y, rgb, force) {
    const angle = rand() * Math.PI * 2;
    const speed = 0.4 + rand() * 2.4 + force * 3;
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - rand() * 1.2;
    this.rgb = rgb;
    this.life = 1;
    this.size = 0.7 + rand() * 2.4 + force * 3.2;
    this.spin = rand() * Math.PI * 2;
  }

  update(audio) {
    this.spin += 0.025 + audio.highs * 0.08;
    const n = pseudoNoise(this.x * 0.01, this.y * 0.01, organism.frame * 0.01) - 0.5;
    this.vx += n * 0.12;
    this.vy += Math.sin(this.spin) * 0.018 - 0.008;
    this.vx *= 0.992;
    this.vy *= 0.992;
    this.x += this.vx;
    this.y += this.vy;
    this.life -= 0.006 + audio.silence * 0.006;
  }

  draw(layer, audio) {
    const [r, g, b] = this.rgb;
    layer.save();
    layer.globalCompositeOperation = 'lighter';
    layer.shadowColor = `rgba(${r}, ${g}, ${b}, 0.75)`;
    layer.shadowBlur = 10 + audio.highs * 18;
    layer.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.max(0, this.life) * 0.58})`;
    layer.beginPath();
    layer.arc(this.x, this.y, this.size * (0.55 + audio.highs), 0, Math.PI * 2);
    layer.fill();
    layer.restore();
  }
}

function shiftColor(rgb, highs) {
  const drift = highs * 30;
  return [
    clamp(rgb[0] + (rand() - 0.45) * 24 + drift * 0.2, 80, 255),
    clamp(rgb[1] + (rand() - 0.4) * 20, 100, 255),
    clamp(rgb[2] + (rand() - 0.35) * 34 + drift, 100, 255)
  ];
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function pseudoNoise(x, y, z) {
  const a = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  const b = Math.sin((x + 4.13) * 39.346 + (y - 1.7) * 11.135 + z * 83.155) * 24634.6345;
  return ((a - Math.floor(a)) + (b - Math.floor(b))) * 0.5;
}

function spawnSpore(x, y, rgb, force = 0.5) {
  if (organism.spores.length > 650) return;
  organism.spores.push(new Spore(x, y, rgb, force));
}

async function ensureAudioContext() {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.82;
    gainNode = audioCtx.createGain();
    gainNode.gain.value = parseFloat(gainSlider.value);
    gainNode.connect(analyser);
    frequencyData = new Uint8Array(analyser.frequencyBinCount);
    timeData = new Uint8Array(analyser.fftSize);
  }
  if (audioCtx.state === 'suspended') await audioCtx.resume();
}

function routeGain({ audible }) {
  if (!gainNode || !analyser) return;
  try { gainNode.disconnect(); } catch (_) {}
  gainNode.connect(analyser);
  if (audible) gainNode.connect(audioCtx.destination);
}

function disconnectCurrentSource() {
  if (sourceNode) {
    try { sourceNode.disconnect(); } catch (_) {}
    sourceNode = null;
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
}

async function startMic() {
  await ensureAudioContext();
  disconnectCurrentSource();
  routeGain({ audible: false });
  audioPlayer.pause();
  audioPlayer.classList.remove('has-file');
  mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false
    }
  });
  sourceNode = audioCtx.createMediaStreamSource(mediaStream);
  sourceNode.connect(gainNode);
  mode = 'MIC FEED';
  micBtn.textContent = 'Stop Mic';
  setStatus('Mic is feeding the specimen. Play music near it or route an input in macOS.');
  startAnimation();
}

async function stopMic() {
  disconnectCurrentSource();
  mode = audioPlayer.src ? 'FILE READY' : 'DORMANT';
  micBtn.textContent = 'Start Mic Growth';
  setStatus(audioPlayer.src ? 'Audio file loaded. Press play on the audio control.' : 'Idle. Start the mic or feed it a track.');
}

async function loadAudioFile(file) {
  await ensureAudioContext();
  disconnectCurrentSource();
  const objectUrl = URL.createObjectURL(file);
  audioPlayer.src = objectUrl;
  audioPlayer.classList.add('has-file');
  if (!fileSourceNode) fileSourceNode = audioCtx.createMediaElementSource(audioPlayer);
  sourceNode = fileSourceNode;
  sourceNode.connect(gainNode);
  routeGain({ audible: true });
  mode = 'FILE FEED';
  micBtn.textContent = 'Start Mic Growth';
  setStatus(`Loaded ${file.name}. Press play and let the song grow its fossil.`);
  resetSpecimen(true);
  await audioPlayer.play();
  startAnimation();
}

function startAnimation() {
  if (!animationId) animationId = requestAnimationFrame(draw);
}

function analyzeAudio() {
  if (!analyser || !frequencyData) {
    return { bass: 0, mids: 0, highs: 0, energy: 0, silence: 1 };
  }
  analyser.getByteFrequencyData(frequencyData);
  analyser.getByteTimeDomainData(timeData);

  const bass = bandAverage(0, 8);
  const lowMids = bandAverage(8, 42);
  const mids = bandAverage(42, 150);
  const highs = bandAverage(150, frequencyData.length);

  let rms = 0;
  for (let i = 0; i < timeData.length; i++) {
    const centered = (timeData[i] - 128) / 128;
    rms += centered * centered;
  }
  rms = Math.sqrt(rms / timeData.length);

  const energy = clamp((bass * 0.42 + lowMids * 0.28 + mids * 0.2 + highs * 0.1 + rms) / 1.3, 0, 1);
  const silence = clamp(1 - energy * 2.2, 0, 1);
  return { bass, mids: (lowMids + mids) * 0.5, highs, energy, silence };
}

function bandAverage(start, end) {
  const safeEnd = Math.min(end, frequencyData.length);
  let total = 0;
  let count = 0;
  for (let i = start; i < safeEnd; i++) {
    total += frequencyData[i];
    count++;
  }
  return count ? total / count / 255 : 0;
}

function draw() {
  animationId = requestAnimationFrame(draw);
  organism.frame++;
  const raw = analyzeAudio();
  organism.bass = lerp(organism.bass, raw.bass, 0.16);
  organism.mids = lerp(organism.mids, raw.mids, 0.12);
  organism.highs = lerp(organism.highs, raw.highs, 0.18);
  organism.energy = lerp(organism.energy, raw.energy, 0.14);
  organism.silence = lerp(organism.silence, raw.silence, 0.08);

  const audio = {
    bass: organism.bass,
    mids: organism.mids,
    highs: organism.highs,
    energy: organism.energy,
    silence: organism.silence
  };

  fadeTrails(audio);
  drawAmbientFog(audio);
  growOrganism(audio);
  drawFrame(audio);
  updateHud(audio);
  organism.lastBass = organism.bass;
}

function lerp(a, b, t) { return a + (b - a) * t; }

function fadeTrails(audio) {
  const memory = parseFloat(memorySlider.value);
  const fade = clamp(1 - memory + audio.silence * 0.018, 0.006, 0.09);
  trailCtx.save();
  trailCtx.globalCompositeOperation = 'source-over';
  trailCtx.fillStyle = `rgba(1, 3, 4, ${fade})`;
  trailCtx.fillRect(0, 0, width, height);
  trailCtx.restore();
}

function drawAmbientFog(audio) {
  fogCtx.save();
  fogCtx.globalCompositeOperation = 'source-over';
  fogCtx.fillStyle = `rgba(1, 4, 7, ${0.08 + audio.silence * 0.055})`;
  fogCtx.fillRect(0, 0, width, height);
  fogCtx.globalCompositeOperation = 'lighter';

  const cx = width / 2;
  const cy = height * 0.56;
  for (let i = 0; i < 7; i++) {
    const t = organism.frame * 0.003 + i * 21.1;
    const x = cx + Math.cos(t * 0.7 + i) * width * (0.14 + i * 0.018);
    const y = cy + Math.sin(t * 0.53 + i * 0.4) * height * (0.11 + i * 0.012);
    const radius = 110 + i * 42 + audio.bass * 110;
    const grad = fogCtx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, `rgba(102, 255, 228, ${0.018 + audio.highs * 0.02})`);
    grad.addColorStop(0.52, `rgba(157, 255, 138, ${0.008 + audio.energy * 0.018})`);
    grad.addColorStop(1, 'rgba(1, 4, 7, 0)');
    fogCtx.fillStyle = grad;
    fogCtx.beginPath();
    fogCtx.arc(x, y, radius, 0, Math.PI * 2);
    fogCtx.fill();
  }
  fogCtx.restore();
}

function growOrganism(audio) {
  if (audio.energy > 0.018 || mode !== 'DORMANT') {
    const growthBudget = Math.floor(1 + audio.bass * 7 + audio.mids * 3);
    for (let i = 0; i < growthBudget; i++) {
      if (organism.branches.length < 1200 && rand() < 0.24 + audio.energy * 0.72) sproutFromNucleus(audio);
    }
  }

  for (let i = organism.branches.length - 1; i >= 0; i--) {
    const branch = organism.branches[i];
    branch.update(audio);
    branch.draw(trailCtx, audio);
    if (branch.life < 0.03) organism.branches.splice(i, 1);
  }

  const kick = audio.bass - organism.lastBass;
  if (kick > 0.085) {
    organism.pulses.push({ radius: 18, alpha: clamp(kick * 5, 0.15, 0.8), hue: rand() });
    for (let i = 0; i < 8 + Math.floor(kick * 45); i++) {
      spawnSpore(width / 2 + (rand() - 0.5) * 90, height * 0.56 + (rand() - 0.5) * 70, pickColor(rand()), kick);
    }
  }

  for (let i = organism.spores.length - 1; i >= 0; i--) {
    const spore = organism.spores[i];
    spore.update(audio);
    spore.draw(trailCtx, audio);
    if (spore.life <= 0 || spore.x < -80 || spore.x > width + 80 || spore.y < -80 || spore.y > height + 80) organism.spores.splice(i, 1);
  }
}

function sproutFromNucleus(audio) {
  const angle = rand() * Math.PI * 2;
  const radius = 12 + rand() * 48 + audio.bass * 34;
  const cx = width / 2 + Math.cos(angle) * radius * 0.32;
  const cy = height * 0.56 + Math.sin(angle) * radius * 0.22;
  const length = 18 + rand() * 60 + audio.bass * 105;
  const widthScale = 0.55 + audio.bass * 3.2 + rand() * 1.5;
  organism.branches.push(new Branch(cx, cy, angle + (rand() - 0.5) * 0.8, length, 0, widthScale, pickColor(rand())));
}

function drawFrame(audio) {
  drawBackground(audio);
  ctx.drawImage(fogCanvas, 0, 0, width, height);
  ctx.drawImage(trailCanvas, 0, 0, width, height);
  drawNucleus(audio);
  drawPulses(audio);
  drawWaveMembrane(audio);
  drawVignette(audio);
}

function drawBackground(audio) {
  const grad = ctx.createRadialGradient(width / 2, height * 0.56, 10, width / 2, height * 0.56, Math.max(width, height) * 0.72);
  grad.addColorStop(0, `rgba(9, 29, 25, ${0.98 + audio.energy * 0.02})`);
  grad.addColorStop(0.36, '#031014');
  grad.addColorStop(1, '#010203');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = 'rgba(102, 255, 228, 0.12)';
  ctx.lineWidth = 1;
  const spacing = 46;
  const drift = (organism.frame * 0.18) % spacing;
  for (let x = -spacing; x < width + spacing; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x + drift, 0);
    ctx.lineTo(x - width * 0.08 + drift, height);
    ctx.stroke();
  }
  ctx.restore();
}

function drawNucleus(audio) {
  const cx = width / 2;
  const cy = height * 0.56;
  organism.nucleusPhase += 0.01 + audio.bass * 0.04;
  const radius = 30 + audio.bass * 72 + Math.sin(organism.nucleusPhase) * 4;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 2.2);
  grad.addColorStop(0, `rgba(230, 255, 238, ${0.7 + audio.bass * 0.25})`);
  grad.addColorStop(0.18, `rgba(157, 255, 138, ${0.34 + audio.energy * 0.2})`);
  grad.addColorStop(0.48, `rgba(102, 255, 228, ${0.12 + audio.highs * 0.18})`);
  grad.addColorStop(1, 'rgba(102, 255, 228, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(255, 211, 109, ${0.2 + audio.bass * 0.45})`;
  ctx.lineWidth = 1.2 + audio.bass * 5;
  ctx.beginPath();
  for (let i = 0; i <= 92; i++) {
    const a = (i / 92) * Math.PI * 2;
    const warp = 1 + Math.sin(a * 6 + organism.nucleusPhase * 1.7) * 0.11 + pseudoNoise(Math.cos(a), Math.sin(a), organism.frame * 0.018) * 0.16;
    const x = cx + Math.cos(a) * radius * warp;
    const y = cy + Math.sin(a) * radius * 0.72 * warp;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawPulses(audio) {
  const cx = width / 2;
  const cy = height * 0.56;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = organism.pulses.length - 1; i >= 0; i--) {
    const pulse = organism.pulses[i];
    pulse.radius += 3.4 + audio.bass * 10;
    pulse.alpha *= 0.955;
    const rgb = pulse.hue > 0.5 ? palette.cyan : palette.magenta;
    ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${pulse.alpha})`;
    ctx.lineWidth = 1 + pulse.alpha * 4;
    ctx.beginPath();
    ctx.ellipse(cx, cy, pulse.radius * 1.3, pulse.radius * 0.72, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (pulse.alpha < 0.01) organism.pulses.splice(i, 1);
  }
  ctx.restore();
}

function drawWaveMembrane(audio) {
  if (!timeData) return;
  const cx = width / 2;
  const cy = height * 0.56;
  const base = 105 + audio.mids * 120;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(255, 95, 210, ${0.11 + audio.mids * 0.34})`;
  ctx.lineWidth = 0.8 + audio.mids * 2.4;
  ctx.beginPath();
  const steps = 180;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const sample = timeData[Math.floor((i / steps) * (timeData.length - 1))] || 128;
    const amp = (sample - 128) / 128;
    const r = base + amp * (32 + audio.energy * 80) + Math.sin(a * 9 + organism.frame * 0.03) * (4 + audio.highs * 16);
    const x = cx + Math.cos(a) * r * 1.36;
    const y = cy + Math.sin(a) * r * 0.78;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawVignette(audio) {
  const grad = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.22, width / 2, height / 2, Math.max(width, height) * 0.72);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.68, `rgba(0,0,0,${0.08 + audio.silence * 0.06})`);
  grad.addColorStop(1, 'rgba(0,0,0,0.78)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.06;
  for (let i = 0; i < 140; i++) {
    const x = (i * 97 + organism.frame * 0.13) % width;
    const y = (Math.sin(i * 44.1 + organism.frame * 0.011) * 0.5 + 0.5) * height;
    ctx.fillStyle = i % 3 === 0 ? '#66ffe4' : '#ffffff';
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.restore();
}

function updateHud(audio) {
  bassReadout.textContent = String(Math.round(audio.bass * 99)).padStart(2, '0');
  sporeReadout.textContent = String(organism.spores.length).padStart(3, '0');
  modeReadout.textContent = mode;
}

function setStatus(message) { statusEl.textContent = message; }

micBtn.addEventListener('click', async () => {
  try {
    if (mediaStream) await stopMic();
    else await startMic();
  } catch (err) {
    console.error(err);
    setStatus('Mic permission failed. Feed it an audio file instead.');
  }
});

audioFile.addEventListener('change', async (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  try {
    await loadAudioFile(file);
  } catch (err) {
    console.error(err);
    setStatus('Audio file could not start. Try clicking the player play button.');
  }
});

audioPlayer.addEventListener('play', async () => {
  await ensureAudioContext();
  mode = 'FILE FEED';
  startAnimation();
});

audioPlayer.addEventListener('pause', () => {
  if (!mediaStream) mode = 'FILE PAUSED';
});

audioPlayer.addEventListener('ended', () => {
  mode = 'FOSSILIZED';
  setStatus('Track complete. Save PNG to keep the specimen fossil.');
});

gainSlider.addEventListener('input', () => {
  if (gainNode) gainNode.gain.value = parseFloat(gainSlider.value);
});

resetBtn.addEventListener('click', () => {
  resetSpecimen(true);
  setStatus(`New specimen seed ${organism.seed}.`);
});

saveBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = `sonic-organism-${organism.seed}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
});

window.addEventListener('resize', resizeCanvas);

resizeCanvas();
startAnimation();
