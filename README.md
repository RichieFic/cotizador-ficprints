# FICPRINTS — Cotizador 3D (versión online / estática)

Versión **estática** del cotizador STL, pensada como **captador de leads** para
publicar en la web (GitHub Pages u otro host estático). El cliente sube su `.STL`,
ve un estimado de precio como rango, y al enviar **te llega el lead por email**
(vía Formspree). No hay backend, ni tracker, ni base de datos, ni login.

> El **folio lo sigue gobernando solo tu dashboard local.** Esta calculadora
> **nunca** asigna folios: solo te avisa de un cliente interesado para que tú lo
> captures a mano en tu PC.

## Cómo funciona

- Todo corre **en el navegador del cliente**: el `.STL` se procesa localmente
  (volumen + dimensiones) y **nunca se sube** a ningún servidor.
- El estimado es **aproximado (±18%)**; el precio real se confirma después de
  slicear en Bambu Studio.
- Si la pieza excede la cama de la Bambu A1 (**256 × 256 × 256 mm**), se bloquea.
- **Requiere internet**: el preview 3D usa three.js desde un CDN.

## Estructura

```
calculadora-online/
├─ index.html      Página única del cotizador (4 pantallas).
├─ config.js       ⚠️ Aquí va tu URL de Formspree (ver abajo).
├─ css/style.css   Tema oscuro.
├─ js/stl.js       Parseo del STL + constantes de cálculo (precio, densidades…).
├─ js/cotizador.js Wizard + preview 3D + envío del lead.
├─ assets/         Logo.
└─ samples/        Cubos .STL de prueba (cubo20 = 8 cm³; cubo300 excede la cama).
```

## Configurar el envío por email (Formspree)

1. Crea un formulario gratis en [formspree.io](https://formspree.io) y copia su
   endpoint (`https://formspree.io/f/xxxxxxxx`).
2. Pégalo en **`config.js`**, reemplazando `"ENDPOINT_PENDIENTE"`.
3. Listo: al enviar, el lead llega a tu correo con los datos del cliente, el
   material/color, el relleno, los gramos estimados y el rango de precio.

> Mientras `config.js` siga con `"ENDPOINT_PENDIENTE"`, el cotizador corre en
> **modo demo**: muestra la pantalla de éxito **sin** mandar correo (útil para
> probar el flujo). El lead que se enviaría queda visible en la consola del
> navegador.

## Ajustar el estimado (precios, densidades, relleno)

Todas las constantes del cálculo viven en **un solo bloque** al inicio de
`js/stl.js` (`DENSITY` y `CONST`). Esta es la **única fuente** del estimado en la
versión online. Cambiar un valor ahí ajusta el resultado sin tocar la lógica.

## Probar en local

Por restricciones del navegador (los módulos ES no cargan vía `file://`), ábrelo
con un servidor estático trivial —**no** es Flask ni necesita el Excel:

```
cd calculadora-online
python -m http.server 8000
```

Luego abre `http://localhost:8000` y recorre las 4 pantallas con un `.STL` de
`samples/`.

## Publicar (pendiente — etapa posterior)

Esta carpeta es **autónoma** (rutas relativas, `index.html` en la raíz). Para
GitHub Pages se puede publicar como repo propio (raíz = sitio) o moviéndola a
`/docs`. El deploy se hará en una etapa siguiente.
