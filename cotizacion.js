/* ═══════════════════════════════════════════════════════════════════════
   LLEnergy · COTIZACIÓN PARA EL CLIENTE

   Lo único que el cliente llega a ver. Por eso aquí NO entra ni un coste,
   ni el margen, ni el nombre de ningún proveedor: solo lo que se le
   instala, lo que le cuesta, lo que le resuelve y lo que firma.

   Va en blanco a propósito. La app es oscura porque es un instrumento de
   trabajo; esto es un documento, y un documento se imprime.
   ═══════════════════════════════════════════════════════════════════════ */

import * as M from './motor.js';

const co  = x => String(x).replace('.', ',');
const mil = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const din = n => '$' + mil(n);
const esc = s => String(s ?? '').replace(/[&<>"]/g,
  c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio',
  'agosto','septiembre','octubre','noviembre','diciembre'];
const fechaLarga = d => d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear();

/* ─────────── qué lleva la cotización ─────────── */
export function datosCot(t, aj){
  const s = t.sistema, d = M.dimensionar({
    ...s, pinv:+s.pinv, vac:+s.vac, vbat:+s.vbat, ah:+s.ah, abms:+s.abms,
    nbat:+s.nbat, icar:+s.icar, npan:+s.npan, wpan:+s.wpan, voc:+s.voc, isc:+s.isc,
    vmax:+s.vmax, vmppt:+s.vmppt, vmpmax:+s.vmpmax, nmppt:+s.nmppt, impp:+s.impp,
    dist:+s.dist, plargo:+s.plargo, pancho:+s.pancho, filas:+s.filas });

  const hoy = new Date();
  const vence = new Date(hoy.getTime() + (+aj.validezDias || 15) * 86400000);
  const util = d.kWh * 0.9;

  return {
    cliente: t.nombre, zona: t.zona,
    hoy: fechaLarga(hoy), vence: fechaLarga(vence),
    kwInv: d.P / 1000, kWh: d.kWh, npan: d.npan, wpan: d.Wpan, kWp: d.kWp,
    vac: d.Vac, nbat: d.nbat,
    serie: d.serie, cadenas: d.strings,
    util,
    horas500: util / 0.5, horas1500: util / 1.5,
    precio: +t.dinero.precio || 0,
    montaje: +t.dinero.cobroMontaje || 0,
    garantia: +aj.garantiaMeses || 12,
    protecciones: M.protecciones(d),
  };
}

/* ─────────── el documento ─────────── */
export function htmlCot(c){
  const fila = (a, b) => '<tr><td>' + a + '</td><td class="v">' + b + '</td></tr>';

  const equipos = [
    fila('Inversor híbrido', co(c.kwInv) + ' kW · salida ' + c.vac + ' V'),
    fila('Banco de baterías de litio',
      co(Math.round(c.kWh * 100) / 100) + ' kWh' + (c.nbat > 1 ? ' (' + c.nbat + ' módulos)' : '')),
    fila('Paneles solares', c.npan + ' × ' + c.wpan + ' W · ' + co(Math.round(c.kWp*100)/100) + ' kWp'),
    fila('Estructura de montaje', 'Acero, fabricada a medida del techo'),
    fila('Protecciones eléctricas', 'Juego completo, detallado más abajo'),
    fila('Puesta a tierra', 'Varilla, cables y conexión de todos los marcos'),
  ].join('');

  // las protecciones, dichas para alguien que no es electricista
  const prot = c.protecciones
    .filter(p => p.grupo !== 'Tierra')
    .map(p => '<li><b>' + esc(p.pieza) + '</b> — ' + esc(p.valor) + '</li>').join('');

  return `
<div class="cot">
  <header class="cab">
    <div class="marca">
      <svg viewBox="0 0 100 100" width="40" height="40" aria-hidden="true">
        <defs><clipPath id="cotH"><rect x="0" y="0" width="100" height="62"/></clipPath></defs>
        <circle cx="50" cy="58" r="21" fill="#E8701F" clip-path="url(#cotH)"/>
        <g stroke="#E8701F" stroke-linecap="round">
          <path d="M50 31L50 21M26.6 44.5L18 39.5M73.4 44.5L82 39.5" stroke-width="6.5"/>
          <path d="M36.5 34.6L33 28.6M63.5 34.6L67 28.6" stroke-width="4.5"/></g>
        <rect x="12" y="70" width="76" height="7" rx="3.5" fill="#1E8E52"/>
        <rect x="26" y="83" width="48" height="7" rx="3.5" fill="#1E8E52" opacity=".5"/>
      </svg>
      <div><div class="emp">Light of Life Energy</div>
        <div class="lin">Sistemas solares con respaldo de batería</div></div>
    </div>
    <div class="ref">
      <div>Cotización</div>
      <div class="fh">${c.hoy}</div>
    </div>
  </header>

  <h1>Propuesta para ${esc(c.cliente)}</h1>
  ${c.zona ? '<p class="zona">' + esc(c.zona) + '</p>' : ''}

  <section class="destacado">
    <div class="precio-caja">
      <div class="et">Precio total del sistema instalado</div>
      <div class="cifra">${din(c.precio)}</div>
      <div class="nota">Dólares estadounidenses. De ese total,
        <b>${din(c.montaje)}</b> corresponden al montaje.</div>
    </div>
  </section>

  <h2>Qué se instala</h2>
  <table>${equipos}</table>

  <h2>Qué resuelve en su casa</h2>
  <p class="cuerpo">Con el sistema cargado, y sin que entre corriente de la calle,
  la casa sigue funcionando <b>unas ${co(Math.round(c.horas500 * 10) / 10)} horas</b>
  con lo básico encendido —nevera, luces y ventiladores, alrededor de 500 W—
  o <b>unas ${co(Math.round(c.horas1500 * 10) / 10)} horas</b> si además pone un aire
  acondicionado.</p>
  <p class="cuerpo">Durante el día los paneles alimentan la casa y a la vez
  recargan las baterías, de modo que el sistema vuelve a estar lleno para el
  siguiente apagón.</p>

  <h2>Protecciones incluidas</h2>
  <p class="cuerpo">Van todas calculadas para este sistema en concreto. No son
  piezas genéricas: el amperaje de cada una sale de la potencia que va a mover
  su instalación.</p>
  <ul class="lista">${prot}</ul>

  <h2>Garantía</h2>
  <p class="cuerpo"><b>${c.garantia} meses</b> sobre los equipos instalados y sobre
  el trabajo de instalación, a partir de la puesta en marcha.</p>

  <h2>Condiciones que el cliente acepta</h2>
  <ol class="condiciones">
    <li><b>Si algo falla, no tocar nada.</b> Avisar y esperar. Cualquier
      manipulación por parte de otra persona anula la garantía de la pieza
      afectada, porque ya no se puede saber qué la dañó.</li>
    <li><b>Las baterías van en sitio fresco y ventilado.</b> Cargan entre 0 y
      45 °C. En un cuarto cerrado sin ventilación dejan de cargar solas: no es
      una avería, es el propio equipo protegiéndose.</li>
    <li><b>Los aparatos de la casa también pueden dañar el sistema.</b> Un motor
      que arranca mal, un ventilador sin aceite o una instalación con el neutro
      flojo pueden estropear el inversor. En la visita se revisa y se avisa por
      escrito de lo que no cumple; si aun así se decide instalar, esa parte
      queda bajo responsabilidad del cliente.</li>
    <li><b>No conectar cargas por encima de la capacidad contratada</b> sin
      consultarlo antes.</li>
  </ol>

  <h2>Qué no incluye</h2>
  <p class="cuerpo">Trabajo eléctrico previo en la casa (balanceo de carga,
  cambio de cables o de tablero), obra civil, y cualquier aparato nuevo que el
  cliente quiera añadir. Si en la visita se detecta algo de esto, se cotiza
  aparte y por separado.</p>

  <footer class="pie">
    <div class="validez">Esta cotización es válida hasta el <b>${c.vence}</b>.</div>
    <div class="pago">El pago puede hacerse en dólares, o en pesos cubanos
      al cambio del día en que se realice.</div>
  </footer>
</div>`;
}

/* ─────────── el enlace que se le manda al cliente ─────────── */
export function empaquetarCot(t, aj){
  const p = { v:1, n:t.nombre, z:t.zona, s:t.sistema,
    pr:+t.dinero.precio || 0, mo:+t.dinero.cobroMontaje || 0,
    ga:+aj.garantiaMeses || 12, va:+aj.validezDias || 15 };
  const bytes = new TextEncoder().encode(JSON.stringify(p));
  let bin = ''; bytes.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

export function desempaquetarCot(cod){
  try {
    const bin = atob(cod.replace(/-/g,'+').replace(/_/g,'/'));
    const p = JSON.parse(new TextDecoder().decode(
      Uint8Array.from(bin, ch => ch.charCodeAt(0))));
    if (!p || p.v !== 1 || !p.s) return null;
    return { t: { nombre:p.n, zona:p.z, sistema:p.s,
        dinero:{ precio:p.pr, cobroMontaje:p.mo } },
      aj: { garantiaMeses:p.ga, validezDias:p.va } };
  } catch(e){ return null; }
}
