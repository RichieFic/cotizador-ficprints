/* FICPRINTS — parseo STL y estimación de gramos (100% en el navegador).
 * El archivo STL nunca se sube: solo se calcula su volumen aquí.
 * Expone window.FicStl = { parseSTL, volumeCm3, gramos, DENSITY, CONST }.
 */
(function () {
  "use strict";

  // Densidades g/cm³ por material.
  const DENSITY = { PLA: 1.24, PETG: 1.27, ABS: 1.04, TPU: 1.21 };

  // Constantes del estimado (deben coincidir con data.py).
  const CONST = {
    SHELL: 0.15,        // fracción sólida base (perímetros/tapas) sobre el relleno
    MIN_POR_GRAMO: 1.8, // tiempo ≈ gramos × 1.8 (anclado a #0017: 50 g / 90 min)
    PRECIO_GRAMO: 0.45,
    PRECIO_MIN: 1.00,
    CARGO: 0.20,        // cargo por servicio 20%
    RANGO: 0.18,        // ±18% para el rango (dentro de 15-20%)
    MAX_MM: 256,        // cama de impresión Bambu A1: 256×256×256 mm
  };

  // ---- Detección binario vs ASCII y parseo a lista de triángulos ----
  // Devuelve Float32Array [v0x,v0y,v0z, v1x,..., v2z, ...] en mm.
  function parseSTL(buffer) {
    const view = new DataView(buffer);
    if (_isBinary(view)) return _parseBinary(view);
    return _parseASCII(_utf8(buffer));
  }

  function _isBinary(view) {
    // Un STL binario válido mide 84 + 50*nTriángulos bytes.
    if (view.byteLength < 84) return false;
    const n = view.getUint32(80, true);
    const expected = 84 + n * 50;
    if (expected === view.byteLength) return true;
    // Si el tamaño no calza, decide por la cabecera "solid" (ASCII).
    const head = _utf8(view.buffer.slice(0, 5)).toLowerCase();
    return head !== "solid";
  }

  function _parseBinary(view) {
    const n = view.getUint32(80, true);
    const out = new Float32Array(n * 9);
    let off = 84, k = 0;
    for (let i = 0; i < n; i++) {
      off += 12; // saltar la normal (3 floats)
      for (let j = 0; j < 9; j++) { out[k++] = view.getFloat32(off, true); off += 4; }
      off += 2;  // attribute byte count
    }
    return out;
  }

  function _parseASCII(text) {
    const verts = [];
    const re = /vertex\s+(-?[\d.eE+]+)\s+(-?[\d.eE+]+)\s+(-?[\d.eE+]+)/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      verts.push(+m[1], +m[2], +m[3]);
    }
    return new Float32Array(verts);
  }

  function _utf8(buf) { return new TextDecoder("utf-8").decode(buf); }

  // ---- Volumen por suma de tetraedros con signo (mm³ → cm³) ----
  function volumeCm3(tris) {
    let v = 0;
    for (let i = 0; i < tris.length; i += 9) {
      const ax = tris[i],   ay = tris[i+1], az = tris[i+2];
      const bx = tris[i+3], by = tris[i+4], bz = tris[i+5];
      const cx = tris[i+6], cy = tris[i+7], cz = tris[i+8];
      // a · (b × c) / 6
      const crossx = by * cz - bz * cy;
      const crossy = bz * cx - bx * cz;
      const crossz = bx * cy - by * cx;
      v += (ax * crossx + ay * crossy + az * crossz) / 6;
    }
    return Math.abs(v) / 1000; // mm³ → cm³
  }

  // ---- Dimensiones (bounding box) en mm: {x, y, z} ----
  function dimensions(tris) {
    if (!tris.length) return { x: 0, y: 0, z: 0 };
    let minx = Infinity, miny = Infinity, minz = Infinity;
    let maxx = -Infinity, maxy = -Infinity, maxz = -Infinity;
    for (let i = 0; i < tris.length; i += 3) {
      const x = tris[i], y = tris[i + 1], z = tris[i + 2];
      if (x < minx) minx = x; if (x > maxx) maxx = x;
      if (y < miny) miny = y; if (y > maxy) maxy = y;
      if (z < minz) minz = z; if (z > maxz) maxz = z;
    }
    return { x: maxx - minx, y: maxy - miny, z: maxz - minz };
  }

  // ¿Excede la cama de impresión? Devuelve los ejes que no caben (cualquier
  // orientación: comparamos las dimensiones ordenadas contra el cubo de la cama).
  function excedeCama(dims) {
    return dims.x > CONST.MAX_MM || dims.y > CONST.MAX_MM || dims.z > CONST.MAX_MM;
  }

  // ---- Gramos estimados: volumen × densidad × fillFactor ----
  function fillFactor(relleno) {
    return CONST.SHELL + (1 - CONST.SHELL) * (relleno / 100);
  }

  function gramos(volCm3, material, relleno) {
    const d = DENSITY[material] || DENSITY.PLA;
    return volCm3 * d * fillFactor(relleno);
  }

  window.FicStl = { parseSTL, volumeCm3, gramos, fillFactor, dimensions, excedeCama, DENSITY, CONST };
})();
