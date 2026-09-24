/* ═══════════════════════════════════════════════════════════════════════
   LLEnergy · Light of Life Energy
   Pantallas, trabajos y guardado.

   Los datos viven SOLO en este teléfono. Nada se sube a ningún sitio.
   ═══════════════════════════════════════════════════════════════════════ */

import * as M from './motor.js';
import { MODELOS, BATS } from './datos.js';

const LS = 'llenergy-v1';
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const num = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const co  = x => String(x).replace('.', ',');
const din = n => '$' + Math.round(n).toLocaleString('es-ES');

/* ─────────── estado ─────────── */
const SISTEMA = { pinv:6, vac:230, vbat:51.2, ah:100, abms:100, nbat:1, icar:100,
  npan:4, wpan:650, voc:46, isc:18, vmax:450, vmppt:60, vmpmax:360, nmppt:1, impp:28,
  dist:12, plargo:2.38, pancho:1.13, orient:'v', filas:1, techo:'plano',
  modeloInv:'must-6048-eco', modeloBat:'fintera-5' };

// Un trabajo nuevo empieza en cero: los precios los pone Marcos, no vienen
// escritos en el programa. Así no hay ninguna cifra suya en el código.
const DINERO = { kit:0, ppan:0, prot:0, cab:0, estr:0, obra:0, trans:0, precio:0 };

// Solo el trabajo de ejemplo lleva cifras, y son redondas y de muestra.
const DINERO_EJEMPLO = { kit:2500, ppan:180, prot:600, cab:180, estr:200, obra:300, trans:80, precio:5800 };

const VISITA = { consumo:'', tipoTecho:'plano', orientacion:'sur', sombras:'no',
  neutro:'sin revisar', equiposCasa:'', pide:'', puede:'', extra:'', notas:'' };

const AJUSTES = { usdCup:0, cambioFecha:'', minPct:18, socioPct:30, fondoPct:3, capital:0 };

let S = { rol:'oficina', activo:null, ajustes:{...AJUSTES}, trabajos:[] };

function cargar(){
  try {
    const raw = localStorage.getItem(LS);
    if (raw){
      const g = JSON.parse(raw);
      S = { ...S, ...g, ajustes:{ ...AJUSTES, ...(g.ajustes||{}) } };
      S.trabajos = (g.trabajos||[]).map(t => ({
        ...t, sistema:{...SISTEMA, ...(t.sistema||{})},
        dinero:{...DINERO, ...(t.dinero||{})}, visita:{...VISITA, ...(t.visita||{})} }));
    }
  } catch(e){ /* si el guardado está corrupto, se empieza limpio */ }
  if (!S.trabajos.length) nuevoTrabajo('Ejemplo · casa de El Cobre', 'El Cobre, Santiago', true);
  if (!S.trabajos.find(t => t.id === S.activo)) S.activo = S.trabajos[0].id;
}
function guardar(){ try { localStorage.setItem(LS, JSON.stringify(S)); } catch(e){} }

function nuevoTrabajo(nombre, zona, ejemplo){
  const t = { id:'t'+Date.now()+Math.random().toString(36).slice(2,6),
    nombre: nombre || 'Trabajo nuevo', zona: zona || '', contacto:'',
    estado:'visita', ejemplo: !!ejemplo,
    sistema:{...SISTEMA},
    dinero: ejemplo ? {...DINERO_EJEMPLO} : {...DINERO},
    visita:{...VISITA} };
  S.trabajos.unshift(t); S.activo = t.id; return t;
}
const activo = () => S.trabajos.find(t => t.id === S.activo) || S.trabajos[0];

/* ─────────── piezas de interfaz ─────────── */
const caja = (tit, cuerpo, pista) =>
  '<div class="caja"><h2>' + tit + '</h2><div class="cuerpo">' + cuerpo + '</div>'
  + (pista ? '<p class="pista">' + pista + '</p>' : '') + '</div>';

const campo = (id, etiqueta, ayuda, control, ancho) =>
  '<div class="campo' + (ancho ? ' ancho' : '') + '"><label for="' + id + '">' + etiqueta
  + (ayuda ? '<small>' + ayuda + '</small>' : '') + '</label>' + control + '</div>';

const numInp = (id, v, min, max, paso) =>
  '<input type="number" id="' + id + '" value="' + v + '" min="' + min + '" max="' + max
  + '" step="' + (paso || 1) + '" inputmode="decimal">';

const txtInp = (id, v, ph) =>
  '<input type="text" id="' + id + '" value="' + esc(v) + '" placeholder="' + esc(ph||'') + '">';

const sel = (id, v, ops) => '<select id="' + id + '">' + ops.map(o =>
  '<option value="' + o[0] + '"' + (String(o[0]) === String(v) ? ' selected' : '') + '>' + o[1]
  + '</option>').join('') + '</select>';

const fila = (tx, vl, small, clase) =>
  '<div class="fila"><span class="tx">' + tx + (small ? '<small>' + small + '</small>' : '')
  + '</span><span class="vl ' + (clase||'') + '">' + vl + '</span></div>';

/* ─────────── datos del sistema listos para el motor ─────────── */
function sistemaDe(t){
  const s = t.sistema;
  return { ...s, pinv:num(s.pinv), vac:num(s.vac), vbat:num(s.vbat), ah:num(s.ah),
    abms:num(s.abms), nbat:num(s.nbat), icar:num(s.icar), npan:num(s.npan), wpan:num(s.wpan),
    voc:num(s.voc), isc:num(s.isc), vmax:num(s.vmax), vmppt:num(s.vmppt), vmpmax:num(s.vmpmax),
    nmppt:num(s.nmppt), impp:num(s.impp), dist:num(s.dist), plargo:num(s.plargo),
    pancho:num(s.pancho), filas:num(s.filas) };
}

/* ═══════════════ PANTALLA · TRABAJOS ═══════════════ */
function pintarTrabajos(){
  const ETIQ = { visita:'Visita', cotizado:'Cotizado', aceptado:'Aceptado', montado:'Montado' };
  let h = S.trabajos.map(t => {
    const e = M.dimensionar(sistemaDe(t));
    return '<button type="button" class="trab" data-ir="' + t.id + '"'
      + (t.id === S.activo ? ' aria-current="true"' : '') + '>'
      + '<span class="d"><span class="nm">' + esc(t.nombre) + '</span>'
      + '<span class="zn">' + (t.zona ? esc(t.zona) + ' · ' : '')
      + e.P/1000 + ' kW · ' + e.kWh.toFixed(1).replace('.',',') + ' kWh · '
      + e.npan + ' panel' + (e.npan===1?'':'es') + '</span></span>'
      + '<span class="estado ' + t.estado + '">' + ETIQ[t.estado] + '</span></button>';
  }).join('');
  h += '<button type="button" class="btn" id="btnNuevo">+ Trabajo nuevo</button>';

  const t = activo();
  h += caja('Datos del trabajo abierto',
    campo('t_nombre','Nombre del cliente','',txtInp('t_nombre', t.nombre, 'Nombre y apellido'), true)
    + campo('t_zona','Zona','',txtInp('t_zona', t.zona, 'El Cobre, Santiago'), true)
    + campo('t_contacto','Teléfono o WhatsApp','',txtInp('t_contacto', t.contacto, '+53 5 ...'), true)
    + campo('t_estado','En qué va','',sel('t_estado', t.estado,
        [['visita','Visita hecha'],['cotizado','Cotizado'],['aceptado','Aceptado'],['montado','Montado']]))
    + (S.trabajos.length > 1
        ? '<button type="button" class="btn peligro" id="btnBorrar" style="margin-top:12px">Borrar este trabajo</button>'
        : ''));

  $('p-trabajos').innerHTML = h;
}

/* ═══════════════ PANTALLA · VISITA ═══════════════ */
function pintarVisita(){
  const t = activo(), v = t.visita;
  let h = caja('Lo que hay que mirar en la casa',
    campo('v_consumo','Qué consume la casa','Los aparatos grandes: nevera, aire, bomba, lavadora',
      '<textarea id="v_consumo" placeholder="1 nevera, 2 aires de 12.000 BTU, bomba de agua...">' + esc(v.consumo) + '</textarea>', true)
    + campo('v_tipoTecho','Tipo de techo','',sel('v_tipoTecho', v.tipoTecho,
        [['plano','Plano de placa'],['inclinado','Inclinado'],['mixto','Mixto']]))
    + campo('v_orientacion','Hacia dónde mira el techo','',sel('v_orientacion', v.orientacion,
        [['sur','Sur'],['sureste','Sureste'],['suroeste','Suroeste'],['este','Este'],['oeste','Oeste'],['norte','Norte']]))
    + campo('v_sombras','¿Hay sombras?','Árboles, tanque, casa del vecino',sel('v_sombras', v.sombras,
        [['no','No, despejado'],['manana','Por la mañana'],['tarde','Por la tarde'],['todo','Buena parte del día']]))
    + campo('v_neutro','Estado del neutro','Es la causa número uno de equipos quemados',
        sel('v_neutro', v.neutro, [['sin revisar','Sin revisar'],['bueno','Bueno y apretado'],['dudoso','Flojo o con verdín'],['malo','Malo, hay que cambiarlo']])),
    'Mide la distancia del último panel al inversor y métela en Diseño: de ahí sale el metraje de cable.');

  h += caja('Los aparatos de la casa',
    campo('v_equiposCasa','Qué encontraste','Un ventilador sin aceite o un motor que arranca mal puede quemar el inversor, y eso no lo cubre la garantía',
      '<textarea id="v_equiposCasa" placeholder="Motor de la bomba hace ruido, ventilador de techo sin aceite...">' + esc(v.equiposCasa) + '</textarea>', true)
    + campo('v_extra','Trabajo eléctrico previo a cotizar aparte','Balanceo de carga, cambio de cables, tablero nuevo',
      '<textarea id="v_extra" placeholder="Hay que balancear la carga entre las dos fases...">' + esc(v.extra) + '</textarea>', true),
    '<b>Todo lo que no cumpla se le dice al cliente y queda por escrito.</b> Si decide montar igual, queda bajo su propio riesgo, y si después una avería la provoca un aparato de la casa, responde él.');

  h += caja('Lo que pide la casa y lo que puede pagar',
    campo('v_pide','Lo que la casa necesita de verdad','',txtInp('v_pide', v.pide, '6 kW y 10 kWh'), true)
    + campo('v_puede','Lo que el cliente puede pagar ahora','',txtInp('v_puede', v.puede, '5 kW y 5 kWh'), true)
    + campo('v_notas','Notas','',
      '<textarea id="v_notas" placeholder="Lo que haga falta recordar">' + esc(v.notas) + '</textarea>', true),
    'Si no son la misma cifra, eso es una venta de ampliación dentro de un año. Déjalo apuntado.');

  $('p-visita').innerHTML = h;
}

/* ═══════════════ PANTALLA · DISEÑO ═══════════════ */
function pintarDiseno(){
  const t = activo(), s = t.sistema, e = sistemaDe(t);
  const d = M.dimensionar(e);
  const inv = MODELOS[s.modeloInv] || MODELOS.manual;
  const bat = BATS[s.modeloBat] || BATS.manual;

  const grupos = tabla => {
    const g = {};
    Object.entries(tabla).forEach(([k,v]) => {
      const marca = ({must:'MUST',sako:'SAKO',growatt:'Growatt',powmr:'PowMr',sumry:'SUMRY',
        ecoworthy:'ECO-WORTHY',pylontech:'Pylontech',fintera:'Fintera',
        todo:'Sin marca identificada',gen:'Plantillas genéricas'})[k.split('-')[0]] || '';
      (g[marca] = g[marca] || []).push([k, v.n]);
    });
    return g;
  };
  const selMarcas = (id, valor, tabla) => {
    const g = grupos(tabla);
    let o = '';
    Object.entries(g).forEach(([marca, items]) => {
      const opts = items.map(([k,n]) => '<option value="'+k+'"'
        + (k===valor?' selected':'') + '>' + esc(n) + '</option>').join('');
      o += marca ? '<optgroup label="'+marca+'">'+opts+'</optgroup>' : opts;
    });
    return '<select id="'+id+'">' + o + '</select>';
  };

  /* --- equipos --- */
  let h = caja('Equipos',
    campo('s_modeloInv','<b>Inversor</b>','Elígelo y se rellenan los datos solos, o mételos a mano',
      selMarcas('s_modeloInv', s.modeloInv, MODELOS), true)
    + (inv.ficha ? '<div class="fila"><span class="tx">Ficha del fabricante</span>'
        + '<a class="vl" href="'+inv.ficha+'" target="_blank" rel="noopener">Abrir</a></div>' : '')
    + (inv.nota ? '<div class="fila"><span class="tx"><small>' + inv.nota + '</small></span></div>' : '')
    + campo('s_modeloBat','<b>Batería</b>','',selMarcas('s_modeloBat', s.modeloBat, BATS), true)
    + (bat.ficha ? '<div class="fila"><span class="tx">Ficha de la batería</span>'
        + '<a class="vl" href="'+bat.ficha+'" target="_blank" rel="noopener">Abrir</a></div>' : '')
    + (bat.nota ? '<div class="fila"><span class="tx"><small>' + bat.nota + '</small></span></div>' : ''));

  h += caja('Números del sistema',
    campo('s_pinv','Potencia del inversor','En kW', numInp('s_pinv', s.pinv, 1, 30, 0.1))
    + campo('s_vac','Salida del inversor','', sel('s_vac', s.vac,
        [[110,'110 V'],[120,'120 V'],[220,'220 V'],[230,'230 V'],[240,'240 V bifásico']]))
    + campo('s_vbat','Voltaje de la batería','Las de litio de «48 V» son 51,2 V reales', numInp('s_vbat', s.vbat, 10, 60, 0.1))
    + campo('s_ah','Capacidad','En amperios-hora', numInp('s_ah', s.ah, 10, 2000, 10))
    + campo('s_abms','Corriente del BMS','De la etiqueta. Si no la tienes, pon los mismos Ah', numInp('s_abms', s.abms, 10, 1000, 10))
    + campo('s_nbat','Baterías en paralelo','', numInp('s_nbat', s.nbat, 1, 12, 1))
    + campo('s_icar','Carga máxima del inversor','Amperios que le mete a la batería', numInp('s_icar', s.icar, 5, 300, 5))
    + campo('s_kwh','Energía de la batería','', '<div class="calc">' + d.kWh.toFixed(2).replace('.',',')
        + ' kWh</div>')
    + campo('s_npan','Número de paneles','', numInp('s_npan', s.npan, 1, 40, 1))
    + campo('s_wpan','Vatios de cada panel','', numInp('s_wpan', s.wpan, 100, 800, 10))
    + campo('s_kwp','Campo solar','', '<div class="calc">' + d.kWp.toFixed(2).replace('.',',') + ' kWp</div>'));

  h += caja('Ficha del panel y límites del inversor',
    campo('s_voc','Voc del panel','Tensión en circuito abierto, detrás del panel', numInp('s_voc', s.voc, 10, 90, 0.1))
    + campo('s_isc','Isc del panel','Corriente de cortocircuito', numInp('s_isc', s.isc, 1, 30, 0.1))
    + campo('s_vmax','Tensión máxima FV','La que NO se puede pasar nunca', numInp('s_vmax', s.vmax, 60, 1500, 10))
    + campo('s_vmppt','Mínimo del MPPT','Por debajo no arranca', numInp('s_vmppt', s.vmppt, 20, 400, 5))
    + campo('s_vmpmax','Máximo del MPPT','', numInp('s_vmpmax', s.vmpmax, 60, 1000, 10))
    + campo('s_nmppt','Cuántos MPPT','', numInp('s_nmppt', s.nmppt, 1, 4, 1))
    + campo('s_impp','Corriente máxima por MPPT','', numInp('s_impp', s.impp, 5, 60, 1)));

  /* --- cómo se conectan --- */
  const g = d.cfg;
  let conex;
  if (g.best){
    const b = g.best, una = b.cadenas === 1;
    conex = '<div class="titular"><b>' + (una
        ? 'Los ' + g.N + ' paneles EN SERIE'
        : b.cadenas + ' grupos de ' + b.s + ' en serie, y los ' + b.cadenas + ' grupos EN PARALELO')
      + '</b><small>' + (una
        ? 'Uno detrás de otro: el <b>+</b> de cada panel al <b>−</b> del siguiente. Del primero y del último salen los dos cables que bajan al inversor. Aquí no hay nada en paralelo.'
        : 'Primero armas ' + b.cadenas + ' grupos de ' + b.s + ' paneles (<b>+</b> con <b>−</b>). Luego juntas los grupos: todos los <b>+</b> con los <b>+</b> y los <b>−</b> con los <b>−</b>.')
      + '</small></div>'
      + fila('Tensión en frío','Tope: ' + g.Vmax + ' V', 'La que ve el inversor al amanecer')
        .replace('<span class="vl ">Tope: ' + g.Vmax + ' V</span>',
          '<span class="vl ' + (b.Vfrio < g.Vmax*0.9 ? 'ok':'warn') + '">' + Math.round(b.Vfrio) + ' V</span>')
      + fila('Tensión en calor', Math.round(b.Vcalor) + ' V', 'Célula a 65 °C. Mínimo del MPPT: ' + g.Vmin + ' V',
          b.Vcalor > g.Vmin*1.1 ? 'ok':'warn')
      + fila('Corriente por MPPT', b.Impptreal.toFixed(1) + ' A', 'Tope del inversor: ' + g.Im + ' A',
          b.Impptreal > g.Im*0.92 ? 'warn':'ok');
  } else {
    conex = '<div class="titular rojo"><b>Con ' + g.N + ' paneles no cuadra</b>'
      + '<small>' + (g.razones.length ? g.razones.join(' · ') : '')
      + '<br><br>Con este panel y este inversor caben entre <b>' + g.minSerie + '</b> y <b>'
      + g.maxSerie + '</b> paneles en serie'
      + (g.prueba.length ? '. Prueba con <b>' + g.prueba.join(', ') + '</b> paneles' : '')
      + '.</small></div>';
  }
  h += caja('Cómo se conectan los paneles', conex);

  /* --- inclinación --- */
  const inc = M.inclinacion(e);
  h += caja('Inclinación y orientación',
    '<div class="titular"><b>' + (inc.plano ? inc.grados + '° de inclinación, mirando al SUR' : 'Siguiendo la pendiente del techo, al SUR')
    + '</b><small>' + (inc.plano
      ? 'A ' + inc.grados + '° se saca casi todo el sol del año, agarra menos viento que a 20° y la lluvia todavía arrastra el polvo. Por debajo de 10° el polvo se queda pegado.'
      : 'Si el techo ya cae entre 10° y 30°, se aprovecha: la estructura sale mucho más barata y se pierde muy poco.')
    + '</small></div>'
    + fila('Cómo encontrar el sur sin brújula', 'Al mediodía',
        'Clava un palo derecho. A mediodía solar su sombra apunta al <b>norte</b>: los paneles miran justo al lado contrario. La brújula del teléfono se desvía varios grados y engaña.')
    + (inc.plano ? fila('Altura del triángulo', co(inc.alto) + ' m', 'La parte de atrás sube esto sobre el techo') : '')
    + (inc.plano ? fila('Fondo que ocupa cada fila', co(inc.base) + ' m', 'Medido sobre el techo, no la longitud del panel') : '')
    + (inc.separacion > 0 ? fila('Separación entre filas', co(inc.separacion) + ' m',
        'Para que una fila no le dé sombra a la siguiente. Calculado con el sol más bajo del año: a esta latitud está a unos ' + inc.solInvierno + '° al mediodía en diciembre', 'info') : ''),
    'Si el techo no puede mirar al sur exacto, no pasa nada: a inclinaciones bajas, apuntar al sureste o al suroeste cuesta muy poco. Lo que sí hay que evitar es el norte.');

  /* --- compatibilidad --- */
  const c = M.compatibilidad(d, inv, bat);
  h += caja('¿Se llevan bien la batería y el inversor?',
    c.filas.map(f => fila(f.tit, f.valor, f.nota, f.estado)).join(''),
    c.vOK
      ? '<b>Ajustes para meterle al inversor</b> (' + c.celdas + ' celdas, ' + co(d.Vbat) + ' V):<br>'
        + 'Tipo <b>LITIO / USER</b> · Absorción <b>' + co(c.vAbs) + ' V</b> · Flotación <b>' + co(c.vFlo)
        + ' V</b> · Corte por baja <b>' + co(c.vMin) + ' V</b> · Corriente de carga <b>' + c.limiteCarga + ' A</b>.<br>'
        + 'Límite absoluto de la química: <b>' + co(c.vCel) + ' V</b>. <b>Nunca copies los voltajes de una batería a otra con distinto número de celdas.</b>'
      : 'Arregla primero el voltaje.');

  /* --- protecciones --- */
  let ult = '', prot = '';
  M.protecciones(d).forEach(p => {
    if (p.grupo !== ult){ prot += '<div class="sep">' + p.grupo + '</div>'; ult = p.grupo; }
    prot += fila(p.pieza, p.valor, p.nota);
  });
  h += caja('Protecciones que hay que montar', prot,
    'Calculado al 125 % de la corriente de trabajo. Si un valor cae entre dos tamaños comerciales, se coge <b>el inmediatamente superior</b>.');

  /* --- materiales --- */
  const mo = M.montaje(e), cx = M.conexion(d, e);
  let mat = '';
  if (cx){
    mat += '<div class="sep">Conexión</div>'
      + fila('Cable solar rojo', cx.metrosCable + ' m', cx.cabFV + ' · ida y vuelta con margen')
      + fila('Cable solar negro', cx.metrosCable + ' m', 'Mismo metraje')
      + fila('Pares de conectores MC4', cx.paresMC4 + ' pares', 'Incluye 2 de repuesto')
      + fila('Conectores Y de derivación',
          cx.conectorY === 'si' ? '1 par' : (cx.conectorY === 'prohibido' ? 'NO USAR' : 'No hacen falta'),
          cx.conectorY === 'si' ? 'Unen las 2 cadenas en una bajada'
          : cx.conectorY === 'prohibido' ? '<b>Con ' + cx.cadenas + ' cadenas hacen falta fusibles, y los conectores Y los saltan.</b> Únelas dentro de la caja CC'
          : 'Con una sola cadena va directo a la caja',
          cx.conectorY === 'prohibido' ? 'bad' : '')
      + fila('Prensaestopas', cx.prensa + ' uds.', 'Para que la caja siga estanca')
      + fila('Tubo corrugado', cx.corrugado + ' m', 'Protege el cable del sol y los roedores')
      + fila('Bridas resistentes a UV', cx.bridas + ' uds.', 'Negras de exterior; las blancas se parten en un año');
  }
  mat += '<div class="sep">Sujeción</div>'
    + fila('Presillas intermedias', mo.presMedio + ' uds.', 'Las de forma de <b>T</b>: cada una pisa dos paneles vecinos')
    + fila('Presillas de extremo', mo.presExtremo + ' uds.', 'Las de forma de <b>L</b>: cierran cada riel. <b>No son intercambiables</b>')
    + fila('Tornillos T y tuercas', mo.tornillos + ' juegos', 'Uno por presilla')
    + fila('Perfil o ángulo de acero', mo.metrosPerfil + ' m',
        co(mo.metrosRiel) + ' m de rieles + ' + co(mo.metrosApoyo) + ' m de '
        + (inc.plano ? 'triángulos a ' + inc.grados + '°' : 'pies de anclaje') + ', con 10 % de margen')
    + fila('Apoyos al techo', mo.apoyos + ' uds.', 'Uno cada 1,7 m. Cada uno con 2 anclajes')
    + fila('Superficie que ocupa', co(mo.superficie) + ' m²',
        mo.porFila + ' por fila' + (mo.filas>1 ? ' × ' + mo.filas + ' filas' : '') + '. Mídelo antes de prometer nada', 'info');

  h += caja('Materiales que hay que llevar',
    campo('s_dist','Distancia del techo al inversor','En metros', numInp('s_dist', s.dist, 2, 80, 1))
    + campo('s_filas','Número de filas','', numInp('s_filas', s.filas, 1, 8, 1))
    + campo('s_techo','Tipo de techo','Cambia mucho el metraje de perfil', sel('s_techo', s.techo,
        [['plano','Plano (hay que hacer triángulos)'],['incl','Inclinado (rieles pegados)']]))
    + campo('s_orient','Cómo se montan','', sel('s_orient', s.orient, [['v','Vertical'],['h','Horizontal']]))
    + campo('s_plargo','Largo del panel','En metros', numInp('s_plargo', s.plargo, 0.8, 3, 0.01))
    + campo('s_pancho','Ancho del panel','En metros', numInp('s_pancho', s.pancho, 0.5, 1.5, 0.01))
    + mat,
    '<b>Los paneles ya vienen con su cable y su MC4 de fábrica:</b> para conectarlos en serie no hace falta nada, se enchufa uno con el siguiente. Las presillas aprietan solo donde el fabricante marca el marco, nunca sobre el cristal.');

  /* --- comprobaciones --- */
  h += caja('Comprobaciones del diseño',
    M.comprobaciones(d).map(k => fila(
      ({ok:'✅',warn:'⚠️',bad:'⛔',info:'ℹ️'})[k.e] + ' ' + k.t, '', k.n, k.e)).join(''));

  $('p-diseno').innerHTML = h;
}

/* ═══════════════ PANTALLA · DINERO ═══════════════ */
function pintarDinero(){
  if (S.rol === 'campo'){
    $('p-dinero').innerHTML = '<div class="bloqueado"><b>Esta parte no es del modo Campo</b>'
      + 'Los costes, el precio y el reparto solo se ven en modo Oficina.</div>';
    return;
  }
  const t = activo(), m = t.dinero, a = S.ajustes;
  const n = M.negocio({ kit:num(m.kit), npan:num(t.sistema.npan), ppan:num(m.ppan),
    prot:num(m.prot), cab:num(m.cab), estr:num(m.estr), obra:num(m.obra), trans:num(m.trans),
    precio:num(m.precio), fondoPct:num(a.fondoPct), minPct:num(a.minPct), socioPct:num(a.socioPct) });

  const bajo = n.pctVenta < num(a.minPct);
  let h = '<div class="kpi"><div class="k">Ganancia limpia por sistema</div>'
    + '<div class="v ' + (bajo ? 'bad' : 'ok') + '">' + din(n.ganancia) + '</div>'
    + '<div class="s">' + n.pctVenta.toFixed(1).replace('.',',') + ' % de la venta · '
    + n.pctInversion.toFixed(1).replace('.',',') + ' % de lo invertido · ya descontado el fondo de garantía</div></div>';

  h += '<div class="kpi dos"><div><div class="k">Te cuesta</div><div class="v">' + din(n.coste) + '</div></div>'
    + '<div><div class="k">Precio mínimo al ' + a.minPct + ' %</div>'
    + '<div class="v ' + (bajo ? 'bad' : 'ok') + '">' + din(n.precioMin) + '</div></div></div>';

  if (bajo)
    h += caja('Estás por debajo de tu suelo',
      '<div class="titular rojo"><b>No vendas a ' + din(num(m.precio)) + '</b>'
      + '<small>Tu suelo es el <b>' + a.minPct + ' %</b> de la venta. Para respetarlo, este sistema '
      + 'no puede salir por menos de <b>' + din(n.precioMin) + '</b>. Te faltan '
      + din(n.precioMin - num(m.precio)) + '.</small></div>');

  if (t.ejemplo)
    h += caja('Ojo con este trabajo',
      '<div class=\"titular\"><b>Es el trabajo de ejemplo</b><small>Las cifras de abajo son de muestra, redondas y sin ningún valor real. '
      + 'Cámbialas por las tuyas o crea un trabajo nuevo, que empieza en blanco.</small></div>');

  h += caja('Lo que te cuesta',
    campo('m_kit','Inversor y batería','Lo que pagas por el kit', numInp('m_kit', m.kit, 0, 20000, 10))
    + campo('m_ppan','Precio de cada panel','', numInp('m_ppan', m.ppan, 0, 600, 5))
    + campo('m_paneles','Paneles en total','' , '<div class="calc">' + din(num(t.sistema.npan)*num(m.ppan)) + '</div>')
    + campo('m_prot','Protecciones','Breakers, Clase T, diferencial, SPD, caja', numInp('m_prot', m.prot, 0, 3000, 10))
    + campo('m_cab','Cables y conectores','', numInp('m_cab', m.cab, 0, 2000, 10))
    + campo('m_estr','Estructura y presillas','Lo que se paga en CUP', numInp('m_estr', m.estr, 0, 3000, 10))
    + campo('m_obra','Mano de obra','Lo que le pagas al equipo, en CUP', numInp('m_obra', m.obra, 0, 3000, 10))
    + campo('m_trans','Transporte','', numInp('m_trans', m.trans, 0, 1000, 10)));

  h += caja('Lo que le cobras',
    campo('m_precio','Precio al cliente','Siempre cotizado en dólares', numInp('m_precio', m.precio, 0, 30000, 10))
    + fila('Fondo de garantía', din(n.fondo), 'El ' + n.fondoPct + ' % de la venta. Tu proveedor no cubre nada después del montaje, así que esto es la garantía entera')
    + fila('Para ti', din(n.paraMi), (100 - num(a.socioPct)) + ' % de la ganancia', 'ok')
    + fila('Para la socia', din(n.paraSocia), num(a.socioPct) + ' % de la ganancia. Si el mes no hay ventas, no cobra'));

  /* --- el cambio del día --- */
  const r = num(a.usdCup);
  h += caja('Cómo está el dólar hoy',
    campo('a_usdCup','Cuántos CUP vale 1 USD','Actualízalo cuando cambie', numInp('a_usdCup', a.usdCup, 0, 2000, 1))
    + campo('a_cambioFecha','Última vez que lo miraste','', txtInp('a_cambioFecha', a.cambioFecha, 'hoy'), true)
    + (r > 0
        ? fila('El precio de este sistema en pesos', Math.round(num(m.precio)*r).toLocaleString('es-ES') + ' CUP',
            din(num(m.precio)) + ' × ' + r + ' CUP/USD', 'info')
          + fila('Lo que hay que gastar en pesos', Math.round((num(m.estr)+num(m.obra))*r).toLocaleString('es-ES') + ' CUP',
            'Estructura y mano de obra: ' + din(num(m.estr)+num(m.obra)) + '. <b>Esa es la parte que conviene cobrar en CUP</b>', 'info')
        : fila('Pon el cambio arriba', '—', 'Con el cambio puesto te calculo cuántos pesos son el precio y cuántos hacen falta para lo que se paga en pesos')),
    'Tú siempre cotizas en dólares, así que el cambio no te quita nada: el cliente entrega los pesos que equivalgan. Esto es solo para saber cuántos pesos son y si alcanzan para lo que se paga en CUP.');

  /* --- capital --- */
  const cabenOps = num(a.capital) > 0 && n.coste > 0 ? Math.floor(num(a.capital) / n.coste) : 0;
  h += caja('Capital',
    campo('a_capital','Capital disponible','Lo que puso la socia, en la misma moneda que los costes', numInp('a_capital', a.capital, 0, 200000, 100))
    + fila('Operaciones abiertas que caben', cabenOps || '—',
        cabenOps ? 'Con ' + din(num(a.capital)) + ' y un coste de ' + din(n.coste) + ' por sistema'
                 : 'El capital no llega ni para un sistema completo', cabenOps ? 'ok' : 'bad')
    + fila('Ganancia si se cierran los ' + (cabenOps||0), din(n.ganancia * cabenOps), 'Antes de repartir', 'ok'),
    'Acuérdate de descontar el inversor de repuesto: va siempre con el equipo y también es capital inmovilizado.');

  $('p-dinero').innerHTML = h;
}

/* ═══════════════ PANTALLA · AJUSTES ═══════════════ */
function pintarAjustes(){
  const a = S.ajustes;
  let h = caja('Reglas del negocio',
    campo('a_minPct','Margen mínimo','Por debajo de esto la app te avisa. Medido sobre el precio de venta', numInp('a_minPct', a.minPct, 0, 60, 1))
    + campo('a_fondoPct','Fondo de garantía','Nunca menos del 3 %', numInp('a_fondoPct', a.fondoPct, 3, 30, 1))
    + campo('a_socioPct','Parte de la socia','El resto es tuyo', numInp('a_socioPct', a.socioPct, 0, 100, 5)),
    'El margen mínimo está medido sobre el <b>precio de venta</b>, que es como lo enseñaba la calculadora. Si lo querías sobre lo invertido, dímelo y lo cambio: son cifras distintas.');

  h += caja('Tus datos',
    fila('Dónde están', 'En este teléfono', 'Los trabajos, los precios y los márgenes no salen de aquí. No se suben a ningún servidor', 'ok')
    + fila('Trabajos guardados', S.trabajos.length, '')
    + '<button type="button" class="btn gris" id="btnExportar" style="margin-top:12px">Guardar copia en un archivo</button>'
    + '<button type="button" class="btn gris" id="btnImportar" style="margin-top:8px">Recuperar desde un archivo</button>'
    + '<input type="file" id="fileImportar" accept="application/json" hidden>',
    'Haz una copia de vez en cuando. Si cambias de teléfono o se borra el navegador, es lo único que te devuelve los trabajos.');

  h += caja('Sobre la aplicación',
    fila('Light of Life Energy', 'LLEnergy', 'Versión 1 · fase 1')
    + fila('Funciona sin internet', $('estadoSW') ? 'sí' : '—', 'Una vez abierta, se queda guardada en el teléfono', 'ok')
    + fila('Actualizaciones', 'Solas', 'Cuando haya una versión nueva se instala sola. No hay que desinstalar nada', 'ok'));

  $('p-ajustes').innerHTML = h;
}

/* ═══════════════ pintar todo ═══════════════ */
let pantalla = 'trabajos';
function pintar(){
  const t = activo();
  $('nmTrabajo').textContent = t.nombre;
  $('rolCampo').setAttribute('aria-pressed', S.rol === 'campo');
  $('rolOficina').setAttribute('aria-pressed', S.rol === 'oficina');
  $('navDinero').hidden = S.rol === 'campo';
  if (S.rol === 'campo' && pantalla === 'dinero') pantalla = 'diseno';

  document.querySelectorAll('.pant').forEach(p => p.classList.toggle('on', p.id === 'p-' + pantalla));
  document.querySelectorAll('.nav button').forEach(b =>
    b.setAttribute('aria-current', b.dataset.p === pantalla ? 'page' : 'false'));

  if (pantalla === 'trabajos') pintarTrabajos();
  else if (pantalla === 'visita') pintarVisita();
  else if (pantalla === 'diseno') pintarDiseno();
  else if (pantalla === 'dinero') pintarDinero();
  else pintarAjustes();
  guardar();
}

/* ═══════════════ eventos ═══════════════ */
document.querySelectorAll('.nav button').forEach(b =>
  b.addEventListener('click', () => { pantalla = b.dataset.p; window.scrollTo(0,0); pintar(); }));

$('rolCampo').addEventListener('click', () => { S.rol = 'campo'; pintar(); });
$('rolOficina').addEventListener('click', () => { S.rol = 'oficina'; pintar(); });
$('btnCambiar').addEventListener('click', () => { pantalla = 'trabajos'; window.scrollTo(0,0); pintar(); });

/* un solo oyente para todo: los campos se llaman igual que el dato que guardan */
document.addEventListener('input', ev => {
  const id = ev.target.id; if (!id) return;
  const t = activo();
  const destino = { s:'sistema', m:'dinero', v:'visita', t:null, a:'ajustes' }[id[0]];
  const clave = id.slice(2);
  if (id.startsWith('s_') && t.sistema[clave] !== undefined){ t.sistema[clave] = ev.target.value; repinta(); }
  else if (id.startsWith('m_') && t.dinero[clave] !== undefined){ t.dinero[clave] = ev.target.value; repinta(); }
  else if (id.startsWith('v_') && t.visita[clave] !== undefined){ t.visita[clave] = ev.target.value; guardar(); }
  else if (id.startsWith('a_') && S.ajustes[clave] !== undefined){ S.ajustes[clave] = ev.target.value; repinta(); }
  else if (id.startsWith('t_')){ t[clave] = ev.target.value; if (clave==='nombre') $('nmTrabajo').textContent = ev.target.value; guardar(); }
});

/* al elegir un modelo se rellenan sus datos */
document.addEventListener('change', ev => {
  const t = activo();
  if (ev.target.id === 's_modeloInv'){
    const I = MODELOS[ev.target.value];
    t.sistema.modeloInv = ev.target.value;
    if (I && !I.manual){
      t.sistema.pinv = I.kw; t.sistema.vac = I.vac; t.sistema.vmax = I.vmax;
      t.sistema.vmppt = I.vmin; t.sistema.vmpmax = I.vmpmax;
      t.sistema.nmppt = I.nmppt; t.sistema.impp = I.impp;
      if (I.icar) t.sistema.icar = I.icar;
    }
    repinta();
  } else if (ev.target.id === 's_modeloBat'){
    const B = BATS[ev.target.value];
    t.sistema.modeloBat = ev.target.value;
    if (B && !B.manual){ t.sistema.vbat = B.v; t.sistema.ah = B.ah; t.sistema.abms = B.ides; }
    repinta();
  } else if (ev.target.id === 't_estado'){ t.estado = ev.target.value; repinta(); }
});

/* repintar sin perder el foco ni la posición del cursor */
let pendiente = null;
function repinta(){
  const act = document.activeElement;
  const id = act && act.id, pos = act && act.selectionStart;
  clearTimeout(pendiente);
  pendiente = setTimeout(() => {
    pintar();
    if (id){ const e = $(id); if (e){ e.focus();
      try { if (pos !== null && e.setSelectionRange) e.setSelectionRange(pos, pos); } catch(err){} } }
  }, 120);
}

document.addEventListener('click', ev => {
  const ir = ev.target.closest('[data-ir]');
  if (ir){ S.activo = ir.dataset.ir; pintar(); return; }
  if (ev.target.id === 'btnNuevo'){ nuevoTrabajo(); pintar(); window.scrollTo(0,0); return; }
  if (ev.target.id === 'btnBorrar'){
    const t = activo();
    if (confirm('¿Borrar «' + t.nombre + '»? No se puede deshacer.')){
      S.trabajos = S.trabajos.filter(x => x.id !== t.id);
      S.activo = S.trabajos[0].id; pintar();
    }
    return;
  }
  if (ev.target.id === 'btnExportar'){
    const b = new Blob([JSON.stringify(S, null, 2)], { type:'application/json' });
    const u = URL.createObjectURL(b), a = document.createElement('a');
    a.href = u; a.download = 'llenergy-' + new Date().toISOString().slice(0,10) + '.json';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(u);
    return;
  }
  if (ev.target.id === 'btnImportar'){ $('fileImportar').click(); return; }
});

document.addEventListener('change', ev => {
  if (ev.target.id !== 'fileImportar' || !ev.target.files[0]) return;
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const g = JSON.parse(fr.result);
      if (!g.trabajos) throw new Error('El archivo no tiene trabajos dentro');
      localStorage.setItem(LS, JSON.stringify(g));
      location.reload();
    } catch(e){ alert('No pude leer ese archivo: ' + e.message); }
  };
  fr.readAsText(ev.target.files[0]);
});

/* ═══════════════ arranque ═══════════════ */
cargar();
pintar();

/* que funcione sin internet: solo se activa si la app está en su propia dirección */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')){
  navigator.serviceWorker.register('sw.js').catch(() => { /* en vista previa no se puede, y no pasa nada */ });
}
