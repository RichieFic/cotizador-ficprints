/* FICPRINTS — configuración de la calculadora online (captador de leads).
 *
 * FORMSPREE_ENDPOINT: endpoint de Formspree al que se manda el lead por email.
 *   Con una URL real (https://formspree.io/f/xxxxxxxx) el envío es REAL: al
 *   enviar, llega el correo con los datos del cliente.
 *
 *   Si algún día se vuelve a poner "ENDPOINT_PENDIENTE", el cotizador entra en
 *   MODO DEMO (muestra la pantalla de éxito SIN mandar correo) — útil para
 *   probar el flujo sin Formspree.
 *
 * Este es el ÚNICO lugar donde se configura el envío. Las constantes de
 * cálculo (precios, densidades, factor de relleno) viven en js/stl.js.
 */
window.FIC_CONFIG = {
  FORMSPREE_ENDPOINT: "https://formspree.io/f/mnjkjnaq",
};
