/* FICPRINTS — wizard del cotizador 3D (versión ONLINE estática).
 * Usa window.FicStl (parseo/volumen/gramos) y three.js (solo preview 3D).
 * Captador de leads: el envío va por EMAIL (Formspree), no a un backend.
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const C = window.FicStl.CONST;

// 8 colores con su muestra real (Tornasol = gradiente iridiscente).
const COLORS = [
  ["Amarillo", "#F5D90A"], ["Naranja", "#F97316"], ["Blanco", "#EDEDED"], ["Verde", "#36C95B"],
  ["Rojo", "#E5484D"], ["Rosa", "#EC5BA6"], ["Azul", "#3B82F6"],
  ["Azul Celeste", "#48C6F0"], ["Tornasol", "iridescent"],
];
const IRIDESCENT = "linear-gradient(135deg,#ff6ec4,#7873f5,#4ade80,#facc15)";

// ---- Estado del wizard ----
const state = {
  step: 1,
  fileName: null,
  volumeCm3: 0,
  triangles: 0,
  dims: { x: 0, y: 0, z: 0 },
  oversize: false,
  material: null,
  color: null,
  relleno: 20,
  soportes: false,
  aplicacion: null,
};

const $ = (id) => document.getElementById(id);

// ====================================================== Pantalla 1: STL + 3D
let renderer, scene, camera, controls, mesh, animId;

function initViewer() {
  const el = $("viewer");
  el.hidden = false;
  el.innerHTML = "";
  const w = el.clientWidth, h = 320;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1c1c1e);
  camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 5000);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(window.devicePixelRatio);
  el.appendChild(renderer.domElement);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(1, 1, 1);
  scene.add(dir);
}

function showMesh(tris) {
  if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(tris.slice(), 3));
  geom.computeVertexNormals();
  geom.center();
  const mat = new THREE.MeshStandardMaterial({ color: 0xC3F53C, metalness: 0.1, roughness: 0.6, flatShading: true });
  mesh = new THREE.Mesh(geom, mat);
  scene.add(mesh);
  // Encuadrar la cámara al tamaño de la pieza.
  geom.computeBoundingSphere();
  const r = geom.boundingSphere.radius || 10;
  camera.position.set(r * 2, r * 1.6, r * 2.2);
  camera.lookAt(0, 0, 0);
  controls.update();
  if (!animId) animate();
}

function animate() {
  animId = requestAnimationFrame(animate);
  if (controls) controls.update();
  if (renderer) renderer.render(scene, camera);
}

async function handleFile(file) {
  if (!file) return;
  const buf = await file.arrayBuffer();
  const tris = window.FicStl.parseSTL(buf);
  if (!tris.length) { alert("No se pudo leer el STL."); return; }
  state.fileName = file.name;
  state.volumeCm3 = window.FicStl.volumeCm3(tris);
  state.triangles = tris.length / 9;
  state.dims = window.FicStl.dimensions(tris);
  state.oversize = window.FicStl.excedeCama(state.dims);
  $("fileName").textContent = file.name;
  if (!renderer) initViewer(); else $("viewer").hidden = false;
  showMesh(tris);
  $("meshInfo").hidden = false;
  const d = state.dims, MAX = window.FicStl.CONST.MAX_MM;
  const fmt = (n) => n.toFixed(1);
  const over = (n) => n > MAX ? ` style="color:var(--red)"` : "";
  let html =
    `<b>${file.name}</b> · ${state.triangles.toLocaleString()} triángulos · ` +
    `volumen <span class="lime">${state.volumeCm3.toFixed(2)} cm³</span><br>` +
    `<span class="muted">Tamaño:</span> ` +
    `<span${over(d.x)}>${fmt(d.x)}</span> × <span${over(d.y)}>${fmt(d.y)}</span> × ` +
    `<span${over(d.z)}>${fmt(d.z)}</span> mm`;
  if (state.oversize) {
    html += `<div class="aviso" style="margin-top:12px">⛔ La pieza excede la cama de ` +
      `impresión (máx. ${MAX} × ${MAX} × ${MAX} mm de la Bambu A1). ` +
      `Reduce su tamaño o divídela para poder cotizarla.</div>`;
  }
  $("meshInfo").innerHTML = html;
  refreshNextEnabled();
}

// ====================================================== Pantalla 2: specs
function buildSwatches() {
  const box = $("colorSwatches");
  box.innerHTML = "";
  COLORS.forEach(([name, hex]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "swatch";
    b.dataset.val = name;
    b.title = name;
    b.style.background = hex === "iridescent" ? IRIDESCENT : hex;
    b.addEventListener("click", () => {
      state.color = name;
      [...box.children].forEach((c) => c.classList.remove("sel"));
      b.classList.add("sel");
      refreshNextEnabled();
    });
    box.appendChild(b);
  });
}

function chipGroup(id, key) {
  const box = $(id);
  box.querySelectorAll(".chip").forEach((c) => {
    c.addEventListener("click", () => {
      state[key] = c.dataset.val;
      box.querySelectorAll(".chip").forEach((x) => x.classList.remove("sel"));
      c.classList.add("sel");
      refreshNextEnabled();
    });
  });
}

function rellenoTag(v) {
  if (v <= 20) return "ligero";
  if (v <= 35) return "resistente";
  return "alta resistencia";
}

function initSpecs() {
  buildSwatches();
  chipGroup("materialChips", "material");
  chipGroup("aplicacionChips", "aplicacion");
  const sl = $("relleno");
  const upd = () => {
    state.relleno = +sl.value;
    $("rellenoVal").textContent = sl.value + "%";
    $("rellenoTag").textContent = "· " + rellenoTag(+sl.value);
  };
  sl.addEventListener("input", upd); upd();
  // toggle soportes
  $("soportes").querySelectorAll("button").forEach((b) => {
    b.addEventListener("click", () => {
      state.soportes = b.dataset.val === "si";
      $("soportes").querySelectorAll("button").forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
    });
  });
}

function specsComplete() {
  return state.material && state.color && state.aplicacion;
}

// ====================================================== Cálculo (en vivo)
function calcular() {
  const g = window.FicStl.gramos(state.volumeCm3, state.material || "PLA", state.relleno);
  const min = g * C.MIN_POR_GRAMO;
  const subtotal = g * C.PRECIO_GRAMO + min * C.PRECIO_MIN;
  const cargo = subtotal * C.CARGO;
  const total = subtotal + cargo;
  const lo = total * (1 - C.RANGO);
  const hi = total * (1 + C.RANGO);
  const dens = window.FicStl.DENSITY[state.material || "PLA"];
  const ff = window.FicStl.fillFactor(state.relleno);
  return { g, min, subtotal, cargo, total, lo, hi, dens, ff };
}

const money = (n) => "$" + n.toFixed(2);

function renderBreakdown() {
  const c = calcular();
  $("priceRange").textContent = `${money(c.lo)} – ${money(c.hi)}`;
  $("breakdown").innerHTML = `
    <tr><td>Volumen de la pieza</td><td>${state.volumeCm3.toFixed(2)} cm³</td></tr>
    <tr><td>Material</td><td>${state.material || "—"} (densidad ${c.dens} g/cm³)</td></tr>
    <tr><td>Relleno</td><td>${state.relleno}% · factor ${c.ff.toFixed(2)}</td></tr>
    <tr><td>Gramos estimados</td><td>${c.g.toFixed(1)} g</td></tr>
    <tr><td>Tiempo estimado</td><td>${c.min.toFixed(0)} min</td></tr>
    <tr><td>Costo material (${money(C.PRECIO_GRAMO)}/g)</td><td>${money(c.g * C.PRECIO_GRAMO)}</td></tr>
    <tr><td>Costo tiempo (${money(C.PRECIO_MIN)}/min)</td><td>${money(c.min * C.PRECIO_MIN)}</td></tr>
    <tr><td>Subtotal</td><td>${money(c.subtotal)}</td></tr>
    <tr><td>Cargo por servicio (20%)</td><td>${money(c.cargo)}</td></tr>
    <tr class="total"><td>Total estimado</td><td>${money(c.total)}</td></tr>
    <tr class="range"><td>Rango aproximado (±${(C.RANGO*100).toFixed(0)}%)</td><td>${money(c.lo)} – ${money(c.hi)}</td></tr>`;
}

// ====================================================== Pantalla 4: resumen
function renderResumen() {
  const c = calcular();
  $("resumen").innerHTML = `
    <div class="resumen-grid">
      <div><span>Pieza</span>${state.fileName || "—"}</div>
      <div><span>Tamaño</span>${state.dims.x.toFixed(1)} × ${state.dims.y.toFixed(1)} × ${state.dims.z.toFixed(1)} mm</div>
      <div><span>Material · Color</span>${state.material} · ${state.color}</div>
      <div><span>Relleno</span>${state.relleno}% (${rellenoTag(state.relleno)})</div>
      <div><span>Aplicación</span>${state.aplicacion}</div>
      <div><span>Gramos est.</span>${c.g.toFixed(1)} g</div>
      <div><span>Rango estimado</span class="lime">${money(c.lo)} – ${money(c.hi)}</div>
    </div>`;
  const av = $("soporteAviso");
  if (state.soportes) {
    av.hidden = false;
    av.innerHTML = "⚠ Esta pieza requiere soportes: puede aplicar <b>±20% por soportes</b> al precio final (no incluido en el estimado).";
  } else { av.hidden = true; }
}

// ====================================================== Navegación
function setStep(n) {
  state.step = n;
  document.querySelectorAll(".screen").forEach((s) => {
    s.hidden = +s.dataset.step !== n;
  });
  $("stepNum").textContent = n;
  $("progressFill").style.width = (n / 4 * 100) + "%";
  document.querySelectorAll(".progress-steps span").forEach((s) => {
    s.classList.toggle("on", +s.dataset.dot <= n);
  });
  $("btnBack").hidden = n === 1;
  $("btnNext").hidden = n === 4;
  $("btnSend").hidden = n !== 4;
  if (n === 3) renderBreakdown();
  if (n === 4) renderResumen();
  refreshNextEnabled();
}

function refreshNextEnabled() {
  let ok = true;
  if (state.step === 1) ok = !!state.fileName && !state.oversize;
  if (state.step === 2) ok = specsComplete();
  $("btnNext").disabled = !ok;
}

function next() {
  if (state.step === 1 && !state.fileName) return;
  if (state.step === 2 && !specsComplete()) { alert("Elige material, color y aplicación."); return; }
  if (state.step < 4) setStep(state.step + 1);
}
function back() { if (state.step > 1) setStep(state.step - 1); }

// Enviar — manda el lead por EMAIL vía Formspree (no hay backend ni folio).
// El payload lleva los datos del cliente + el estimado YA calculado (gramos y
// rango), porque online no hay servidor que recalcule: el dueño los lee del correo.
async function enviar() {
  const cliente = $("cliente").value.trim();
  const contacto = $("contacto").value.trim();
  if (!cliente || !contacto) { alert("Pon tu nombre y contacto."); return; }

  // Claves legibles en español: Formspree arma el email listando "clave: valor",
  // así que el correo se entiende de un vistazo. Valores con su unidad.
  const c = calcular();
  const payload = {
    "Cliente": cliente,
    "Contacto": contacto,
    "Descripción": $("pieza").value.trim() || state.fileName,
    "Archivo STL": state.fileName,
    "Material": state.material,
    "Color": state.color,
    "Relleno": state.relleno + "%",
    "Soportes": state.soportes ? "Sí" : "No",
    "Aplicación": state.aplicacion,
    "Volumen": state.volumeCm3.toFixed(2) + " cm³",
    "Gramos estimados": c.g.toFixed(1) + " g",
    "Precio estimado": money(c.total),
    "Rango de precio": `${money(c.lo)} – ${money(c.hi)}`,
    "_subject": `Nueva cotización FICPRINTS - ${cliente}`,
  };

  const btn = $("btnSend");
  const msg = $("enviarMsg");
  const endpoint = (window.FIC_CONFIG && window.FIC_CONFIG.FORMSPREE_ENDPOINT) || "ENDPOINT_PENDIENTE";

  // MODO DEMO: sin endpoint real configurado, no se manda correo; se muestra
  // el éxito para poder probar el flujo de punta a punta (etapa 1).
  if (endpoint === "ENDPOINT_PENDIENTE") {
    btn.disabled = true; btn.hidden = true; $("btnBack").hidden = true;
    msg.hidden = false;
    msg.textContent = "¡Listo! (demo — aquí se enviará el correo con tu solicitud). " +
      "Configura tu endpoint de Formspree en config.js para activar el envío real.";
    console.log("[FICPRINTS demo] lead que se enviaría:", payload);
    return;
  }

  btn.disabled = true; btn.textContent = "Enviando…";
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      msg.hidden = false;
      msg.textContent = "¡Listo! Recibimos tu solicitud. Te contactaremos con la cotización confirmada.";
      btn.hidden = true; $("btnBack").hidden = true;
    } else {
      const data = await res.json().catch(() => ({}));
      const err = (data.errors && data.errors.map((e) => e.message).join(", ")) || "no se pudo enviar.";
      msg.hidden = false; msg.textContent = "Error: " + err;
      btn.disabled = false; btn.textContent = "Enviar cotización";
    }
  } catch (e) {
    msg.hidden = false;
    msg.textContent = "No se pudo conectar. Revisa tu internet e inténtalo de nuevo.";
    btn.disabled = false; btn.textContent = "Enviar cotización";
  }
}

// ---- Wire-up ----
function init() {
  const dz = $("dropzone"), input = $("file");
  dz.addEventListener("click", () => input.click());
  input.addEventListener("change", (e) => handleFile(e.target.files[0]));
  ["dragover", "dragenter"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("drag"); }));
  ["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("drag"); }));
  dz.addEventListener("drop", (e) => handleFile(e.dataTransfer.files[0]));
  initSpecs();
  // Recalcular en vivo: cualquier cambio de specs refresca pantallas 3/4 si visibles.
  document.addEventListener("click", () => { if (state.step === 3) renderBreakdown(); if (state.step === 4) renderResumen(); });
  $("relleno").addEventListener("input", () => { if (state.step === 3) renderBreakdown(); if (state.step === 4) renderResumen(); });
  $("btnNext").addEventListener("click", next);
  $("btnBack").addEventListener("click", back);
  $("btnSend").addEventListener("click", enviar);
  setStep(1);
}
init();
window.__cotizador = { state, calcular };  // para pruebas headless
