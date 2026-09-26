/* ═══════════════════════════════════════════════════════════════════════
   LLEnergy · COTIZACIÓN PARA EL CLIENTE

   Lo único que el cliente llega a ver. Por eso aquí NO entra ni un coste,
   ni el margen, ni el nombre de ningún proveedor: solo lo que se le
   instala, lo que le cuesta, lo que le resuelve y lo que firma.

   Va en blanco a propósito. La app es oscura porque es un instrumento de
   trabajo; esto es un documento, y un documento se imprime.
   ═══════════════════════════════════════════════════════════════════════ */

import * as M from './motor.js';
import { APARATOS } from './datos.js';

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
  if ((t.tipo || 'montaje') === 'venta') return datosVenta(t, aj);
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
    protecciones: M.protecciones(d, null).filter(p => !p.viene),
    /* Los puntos de riesgo que el cliente asume, con su nombre y uno por uno.
       Van a la cotización porque es el papel que se firma: una condición
       genérica no sirve de nada el día que hay una discusión. */
    clausula: M.clausulaRiesgo(M.riesgos(t.visita || {}, (t.visita || {}).aparatos, APARATOS)),
  };
}

/* ─────────── cuando es venta de equipos, sin montaje ─────────── */
function datosVenta(t, aj){
  const hoy = new Date();
  const vence = new Date(hoy.getTime() + (+aj.validezDias || 15) * 86400000);
  const arts = (t.articulos || []).filter(a => +a.cant > 0);
  const total = arts.reduce((s,a) => s + (+a.precio||0) * (+a.cant||0), 0);
  return { venta:true, cliente:t.nombre, zona:t.zona,
    hoy: fechaLarga(hoy), vence: fechaLarga(vence),
    arts, precio: total, garantia: +aj.garantiaMeses || 12 };
}

/* ─────────── el documento ─────────── */
export function htmlCot(c){
  if (c.venta) return htmlVenta(c);
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
        <g stroke="#E8701F" stroke-width="4.5" stroke-linecap="round">
          <path d="M23.4 63.4L15.4 63.4M25.2 47.3L17.9 44.1M35.2 35.4L30.8 28.8M50 31L50 23M64.8 35.4L69.2 28.8M74.8 47.3L82.1 44.1M76.6 63.4L84.6 63.4"/></g>
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

  ${c.clausula ? `<h2>Puntos de su instalación que usted asume</h2>
  <p class="cuerpo">En la visita se encontraron <b>${c.clausula.n}
  ${c.clausula.n === 1 ? 'punto' : 'puntos'}</b> que no dependen de los equipos que
  le instalamos, sino del estado de la casa. Se los explicamos antes de montar para
  que decida con la información delante.</p>
  <ul class="lista riesgos">${c.clausula.puntos.map(x => '<li>' + esc(x) + '</li>').join('')}</ul>
  <p class="cuerpo asume">${esc(c.clausula.texto)}</p>
  <div class="firmas"><div><span></span>Firma del cliente</div><div><span></span>Fecha</div></div>` : ''}

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

/* ─────────── el documento de una venta de equipos ─────────── */
function htmlVenta(c){
  const filas = c.arts.map(a =>
    '<tr><td>' + esc(a.nombre) + (a.cant > 1 ? ' <span style="color:#8A8075">× ' + a.cant + '</span>' : '')
    + '</td><td class="v">' + din((+a.precio||0) * (+a.cant||0)) + '</td></tr>').join('');

  return `
<div class="cot">
  <header class="cab">
    <div class="marca">
      <svg viewBox="0 0 100 100" width="40" height="40" aria-hidden="true">
        <defs><clipPath id="cotV"><rect x="0" y="0" width="100" height="62"/></clipPath></defs>
        <circle cx="50" cy="58" r="21" fill="#E8701F" clip-path="url(#cotV)"/>
        <g stroke="#E8701F" stroke-width="4.5" stroke-linecap="round">
          <path d="M23.4 63.4L15.4 63.4M25.2 47.3L17.9 44.1M35.2 35.4L30.8 28.8M50 31L50 23M64.8 35.4L69.2 28.8M74.8 47.3L82.1 44.1M76.6 63.4L84.6 63.4"/></g>
        <rect x="12" y="70" width="76" height="7" rx="3.5" fill="#1E8E52"/>
        <rect x="26" y="83" width="48" height="7" rx="3.5" fill="#1E8E52" opacity=".5"/>
      </svg>
      <div><div class="emp">Light of Life Energy</div>
        <div class="lin">Equipos solares y de respaldo</div></div>
    </div>
    <div class="ref"><div>Venta de equipos</div><div class="fh">${c.hoy}</div></div>
  </header>

  <h1>Propuesta para ${esc(c.cliente)}</h1>
  ${c.zona ? '<p class="zona">' + esc(c.zona) + '</p>' : ''}

  <section class="destacado">
    <div class="precio-caja">
      <div class="et">Total de los equipos</div>
      <div class="cifra">${din(c.precio)}</div>
      <div class="nota">Dólares estadounidenses. <b>Solo equipos: no incluye montaje.</b></div>
    </div>
  </section>

  <h2>Qué se entrega</h2>
  <table>${filas}</table>

  <h2>Garantía</h2>
  <p class="cuerpo"><b>${c.garantia} meses</b> sobre los equipos, desde la entrega.</p>
  <p class="cuerpo">Los equipos se prueban <b>delante del cliente antes de entregarlos</b>.
  Si alguno no enciende o no funciona en ese momento, se cambia ahí mismo.</p>

  <h2>Lo que hay que entender antes de comprar</h2>
  <ol class="condiciones">
    <li><b>La instalación no va incluida, y eso cambia la garantía.</b> Al no
      montarlo nosotros, no podemos responder de cómo quede conectado. Un
      inversor bien hecho se estropea igual si se cablea mal, si se conecta a
      una batería que no le corresponde o si le falta la protección adecuada.</li>
    <li><b>Cada equipo tiene sus límites y hay que respetarlos.</b> El voltaje de
      la batería, la tensión máxima de los paneles y los amperios de cada
      protección no son orientativos: pasarse de ahí destruye el equipo y eso
      no lo cubre ninguna garantía.</li>
    <li><b>Si no está seguro, pregunte antes de conectar.</b> Le decimos sin
      coste cómo va montado. Una consulta de dos minutos sale más barata que un
      inversor quemado.</li>
    <li><b>Las baterías de litio van en sitio fresco y ventilado</b>, entre 0 y
      45 °C. Fuera de ese rango dejan de cargar solas.</li>
  </ol>

  <h2>Si prefiere que se lo montemos</h2>
  <p class="cuerpo">También hacemos la instalación completa, con todas las
  protecciones calculadas para el equipo, la estructura y la puesta a tierra.
  En ese caso la garantía cubre además el trabajo. Pídanos la cotización del
  sistema instalado y la comparamos.</p>

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
    ga:+aj.garantiaMeses || 12, va:+aj.validezDias || 15,
    ti: t.tipo || 'montaje',
    ar: (t.tipo === 'venta' ? (t.articulos || []) : [])
      .map(a => ({ n:a.nombre, c:+a.cant||0, p:+a.precio||0 })) };
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
        dinero:{ precio:p.pr, cobroMontaje:p.mo },
        tipo: p.ti || 'montaje',
        articulos: (p.ar || []).map(a => ({ nombre:a.n, cant:a.c, precio:a.p, coste:0 })) },
      aj: { garantiaMeses:p.ga, validezDias:p.va } };
  } catch(e){ return null; }
}
