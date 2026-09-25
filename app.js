/* ═══════════════════════════════════════════════════════════════════════
   LLEnergy · Light of Life Energy
   Pantallas, trabajos y guardado.

   Los datos viven SOLO en este teléfono. Nada se sube a ningún sitio.
   ═══════════════════════════════════════════════════════════════════════ */

import * as M from './motor.js';
import { MODELOS, BATS, PRECIOS } from './datos.js';
import { datosCot, htmlCot, empaquetarCot, desempaquetarCot } from './cotizacion.js';

const LS = 'llenergy-v1';
const VERSION_APP = 'v20';   // sube con cada publicación, junto a la de sw.js
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const num = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const co  = x => String(x).replace('.', ',');
const miles = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const din = n => '$' + miles(n);

/* ─────────── estado ─────────── */
const SISTEMA = { pinv:6, vac:230, vbat:51.2, ah:100, abms:100, nbat:1, icar:100,
  npan:4, wpan:650, voc:46, isc:18, vmax:450, vmppt:60, vmpmax:360, nmppt:1, impp:28,
  dist:12, plargo:2.38, pancho:1.13, orient:'v', filas:1, techo:'plano',
  modeloInv:'must-6048-eco', modeloBat:'fintera-5' };

// Un trabajo nuevo empieza en cero: los precios los pone Marcos, no vienen
// escritos en el programa. Así no hay ninguna cifra suya en el código.
const DINERO = { kit:0, ppan:0, prot:0, cab:0, estr:0, obra:0, trans:0, precio:0,
  cobroMontaje:0 };   // lo que el cliente paga por el montaje; es lo único de dinero
                      // que viaja al instalador

// Solo el trabajo de ejemplo lleva cifras, y son redondas y de muestra.
const DINERO_EJEMPLO = { kit:2500, ppan:180, prot:600, cab:180, estr:200, obra:300, trans:80,
  precio:5800, cobroMontaje:650 };

const VISITA = { consumo:'', tipoTecho:'plano', orientacion:'sur', sombras:'no',
  neutro:'sin revisar', equiposCasa:'', pide:'', puede:'', extra:'', notas:'' };

const AJUSTES = { usdCup:705, cambioFecha:'', minPct:18, socioPct:30, fondoPct:3, capital:0,
  claveHash:'',      // de la clave solo se guarda su huella, nunca la clave
  dispositivo:'',    // de quién es este teléfono, para saber quién intentó entrar
  garantiaMeses:12, validezDias:15 };

let S = { rol:'oficina', activo:null, ajustes:{...AJUSTES}, trabajos:[], intentos:[] };

/* ─────────── candado de Oficina ───────────
   La clave nunca se guarda: se guarda su huella. Quien abra el
   almacenamiento del teléfono ve un churro de letras, no el número.
   Aviso honesto: esto para a una persona normal, no a alguien que se
   ponga a hurgar en las tripas del navegador a propósito. */
let abierto = false;
try { abierto = sessionStorage.getItem('llenergy-abierto') === '1'; } catch(e){}

async function huella(txt){
  if (!(crypto && crypto.subtle)) return 'simple:' + txt;   // respaldo si no hay https
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('LLEnergy·' + txt));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2,'0')).join('');
}
const hayClave = () => !!S.ajustes.claveHash;
const puedeOficina = () => !hayClave() || abierto;

function marcarAbierto(v){
  abierto = v;
  try { v ? sessionStorage.setItem('llenergy-abierto','1') : sessionStorage.removeItem('llenergy-abierto'); } catch(e){}
}

function cargar(){
  try {
    const raw = localStorage.getItem(LS);
    if (raw){
      const g = JSON.parse(raw);
      S = { ...S, ...g, ajustes:{ ...AJUSTES, ...(g.ajustes||{}) } };
      S.trabajos = (g.trabajos||[]).map(t => ({
        ...t, sistema:{...SISTEMA, ...(t.sistema||{})},
        dinero:{...DINERO, ...(t.dinero||{})}, visita:{...VISITA, ...(t.visita||{})},
        cobros: t.cobros || [], tipo: t.tipo || 'montaje', articulos: t.articulos || [] }));
    }
  } catch(e){ /* si el guardado está corrupto, se empieza limpio */ }
  if (!S.trabajos.length) nuevoTrabajo('Ejemplo · casa de El Cobre', 'El Cobre, Santiago', true);
  if (!S.trabajos.find(t => t.id === S.activo)) S.activo = S.trabajos[0].id;
  if (hayClave() && !abierto) S.rol = 'campo';
}
function guardar(){ try { localStorage.setItem(LS, JSON.stringify(S)); } catch(e){} }

function nuevoTrabajo(nombre, zona, ejemplo){
  const t = { id:'t'+Date.now()+Math.random().toString(36).slice(2,6),
    nombre: nombre || 'Trabajo nuevo', zona: zona || '', contacto:'',
    estado:'visita', ejemplo: !!ejemplo,
    sistema:{...SISTEMA},
    dinero: ejemplo ? {...DINERO_EJEMPLO} : {...DINERO},
    visita:{...VISITA}, cobros:[],
    tipo:'montaje',    // 'montaje' = sistema instalado · 'venta' = equipos sueltos
    articulos:[] };
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
/* el estado del cobro, de un vistazo, solo en modo Oficina */
function pagoChip(t){
  const esVenta = (t.tipo || 'montaje') === 'venta';
  const total = esVenta
    ? (t.articulos || []).reduce((s,a) => s + (+a.precio||0) * (+a.cant||0), 0)
    : num(t.dinero.precio);
  if (!(t.cobros || []).length && !total) return '';
  const r = M.resumenCobros(t.cobros, total, 0);
  const C = { 'sin cobrar':['visita','Sin cobrar'], parcial:['aceptado', Math.round(r.pct) + ' %'], pagado:['montado','Pagado'] };
  const [cl, tx] = C[r.estado];
  return '<span class="estado ' + cl + '" style="margin-left:5px">' + tx + '</span>';
}

function pintarPanel(){
  if (S.rol === 'campo') return '';
  const a = S.ajustes;
  const p = M.panel(S.trabajos, a);
  if (!p.vendido && !p.coste) return '';

  const sinCapital = !p.capital;
  const apretado = p.capital > 0 && p.libre < p.costeMedio;

  let h = '<div class="kpi"><div class="k">Ganancia de todo lo abierto</div>'
    + '<div class="v ' + (p.margen >= num(a.minPct) ? 'ok' : 'bad') + '">' + din(p.ganancia) + '</div>'
    + '<div class="s">' + p.margen.toFixed(1).replace('.',',') + ' % sobre ' + din(p.vendido)
    + ' vendidos · ' + p.n + ' trabajo' + (p.n===1?'':'s') + ' · fondo de garantía ' + din(p.fondo) + '</div></div>';

  h += '<div class="kpi dos"><div><div class="k">Ya entró</div>'
    + '<div class="v ok">' + din(p.cobrado) + '</div></div>'
    + '<div><div class="k">Falta por cobrar</div>'
    + '<div class="v ' + (p.porCobrar ? 'warn' : '') + '">' + din(p.porCobrar) + '</div></div></div>';

  let hc = fila('Capital que hay', sinCapital ? '—' : din(p.capital),
      sinCapital ? 'Ponlo en <b>Ajustes → Capital</b> y te digo cuántos trabajos caben a la vez'
                 : 'El que puso la socia', sinCapital ? 'warn' : '')
    + fila('Atrapado en trabajos sin cobrar', din(p.atrapado),
        'Lo que ya pusiste de tu bolsillo y todavía no ha vuelto', p.atrapado ? 'warn' : '')
    + fila('Libre para el próximo', din(p.libre), 'Con esto es con lo que puedes comprar ahora',
        p.libre > 0 ? 'ok' : 'bad');

  if (!sinCapital)
    hc += fila('Cuántos trabajos más caben', p.cabenMas || 'ninguno',
      p.cabenMas
        ? 'A un coste medio de ' + din(p.costeMedio) + ' por sistema'
        : '<b>El capital libre no llega para otro sistema.</b> Hasta que no cobres uno de los abiertos, no puedes comprar más',
      p.cabenMas ? 'ok' : 'bad');

  let h2 = caja('Cómo va el negocio', hc,
    apretado ? '<b>Ojo:</b> tienes casi todo el capital metido en trabajos sin cobrar. '
      + 'Cobrar lo abierto vale más ahora mismo que vender uno nuevo.' : '');

  h2 += caja('Reparto de lo ganado',
    fila('Para ti', din(p.paraMi), (100 - num(a.socioPct)) + ' % de la ganancia', 'ok')
    + fila('Para la socia', din(p.paraSocia), num(a.socioPct) + ' % · solo de lo que se haya ganado')
    + fila('Al fondo de garantía', din(p.fondo),
        'No es ganancia: es lo que cubre las averías. Tu proveedor no cubre nada después del montaje', 'info'));

  return h + h2;
}

function pintarTrabajos(){
  const ETIQ = { visita:'Visita', cotizado:'Cotizado', aceptado:'Aceptado', montado:'Montado' };
  let h = pintarPanel();
  h += S.trabajos.map(t => {
    const e = M.dimensionar(sistemaDe(t));
    return '<button type="button" class="trab" data-ir="' + t.id + '"'
      + (t.id === S.activo ? ' aria-current="true"' : '') + '>'
      + '<span class="d"><span class="nm">' + esc(t.nombre) + '</span>'
      + '<span class="zn">' + (t.zona ? esc(t.zona) + ' · ' : '')
      + ((t.tipo||'montaje') === 'venta'
          ? 'Venta de equipos · ' + (t.articulos||[]).length + ' artículo'
            + ((t.articulos||[]).length===1?'':'s')
          : e.P/1000 + ' kW · ' + e.kWh.toFixed(1).replace('.',',') + ' kWh · '
            + e.npan + ' panel' + (e.npan===1?'':'es')) + '</span></span>'
      + '<span class="estado ' + t.estado + '">' + ETIQ[t.estado] + '</span>'
      + (S.rol === 'oficina' ? pagoChip(t) : '') + '</button>';
  }).join('');
  h += '<button type="button" class="btn" id="btnNuevo">+ Trabajo nuevo</button>';

  const t = activo();
  if (t.recibido)
    h += caja('Trabajo recibido',
      '<div class="titular info"><b>Este trabajo te lo mandaron</b>'
      + '<small>Trae el diseño, las protecciones y los materiales ya calculados. '
      + 'Si algo no cuadra con lo que ves en la casa, <b>para y pregunta antes de conectar nada</b>.</small></div>');
  h += caja('Datos del trabajo abierto',
    campo('t_nombre','Nombre del cliente','',txtInp('t_nombre', t.nombre, 'Nombre y apellido'), true)
    + campo('t_zona','Zona','',txtInp('t_zona', t.zona, 'El Cobre, Santiago'), true)
    + campo('t_contacto','Teléfono o WhatsApp','',txtInp('t_contacto', t.contacto, '+53 5 ...'), true)
    + campo('t_tipo','Qué es este trabajo','Cambia lo que se calcula y lo que ve el cliente',
        sel('t_tipo', t.tipo || 'montaje',
          [['montaje','Sistema completo instalado'],['venta','Venta de equipos, sin montaje']]))
    + campo('t_estado','En qué va','',sel('t_estado', t.estado,
        [['visita','Visita hecha'],['cotizado','Cotizado'],['aceptado','Aceptado'],['montado','Montado']]))
    + '<button type="button" class="btn" id="btnEnviar" style="margin-top:14px">Enviar al instalador</button>'
    + (S.trabajos.length > 1
        ? '<button type="button" class="btn peligro" id="btnBorrar" style="margin-top:9px">Borrar este trabajo</button>'
        : ''),
    'El enlace lleva el diseño, las protecciones, los materiales y <b>lo que se cobra por el montaje</b>. '
    + '<b>No lleva ni tus costes, ni tu margen, ni el reparto.</b> Se lo mandas por WhatsApp y al abrirlo '
    + 'se le guarda en su teléfono, listo para usar sin internet.');

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
    c.filas.map(f => fila('<span class="pt ' + f.estado + '"></span>' + f.tit,
      f.valor, f.nota, f.estado)).join(''),
    c.vOK
      ? '<b>Ajustes para meterle al inversor</b> (' + c.celdas + ' celdas, ' + co(d.Vbat) + ' V):<br>'
        + 'Tipo <b>LITIO / USER</b> · Absorción <b>' + co(c.vAbs) + ' V</b> · Flotación <b>' + co(c.vFlo)
        + ' V</b> · Corte por baja <b>' + co(c.vMin) + ' V</b> · Corriente de carga <b>' + c.limiteCarga + ' A</b>.<br>'
        + 'Límite absoluto de la química: <b>' + co(c.vCel) + ' V</b>. <b>Nunca copies los voltajes de una batería a otra con distinto número de celdas.</b>'
      : 'Arregla primero el voltaje.');

  /* --- protecciones --- */
  const lista = M.protecciones(d, inv);
  const yaVienen = lista.filter(p => p.viene).length;
  const porMirar = lista.filter(p => p.comprobar).length;
  let ult = '', prot = '';
  if (yaVienen)
    prot += '<div class="titular"><b>' + yaVienen + ' de estas ya vienen en el inversor</b>'
      + '<small>Están marcadas abajo. <b>No las metas en el presupuesto</b>, que sería cobrarlas dos veces.</small></div>';
  lista.forEach(p => {
    if (p.grupo !== ult){ prot += '<div class="sep">' + p.grupo + '</div>'; ult = p.grupo; }
    const marca = p.viene
      ? '<span class="pt ok"></span>'
      : (p.comprobar ? '<span class="pt warn"></span>' : '');
    prot += fila(marca + p.pieza,
      p.viene ? 'YA VIENE' : p.valor,
      p.viene ? '<b>Este inversor ya lo trae de fábrica.</b> No hace falta comprarlo.'
        : (p.comprobar
            ? p.nota + ' · <b>Mira el equipo antes de comprarlo</b>: hay inversores que lo traen en el lateral'
            : p.nota),
      p.viene ? 'ok' : (p.comprobar ? 'warn' : ''));
  });
  h += caja('Protecciones que hay que montar', prot,
    'Calculado al 125 % de la corriente de trabajo. Si un valor cae entre dos tamaños comerciales, se coge <b>el inmediatamente superior</b>.'
    + (porMirar ? ' · <b>Las marcadas en ámbar</b> son las que algunos inversores traen de fábrica y otros no: míralo en el equipo antes de comprarlas.' : ''));

  /* qué poner si no hay Clase T */
  h += caja('El corte de la batería, sin Clase T',
    '<div class="titular info"><b>Busca el poder de corte, no el nombre</b>'
    + '<small>En corriente continua la corriente nunca pasa por cero, así que el arco no se apaga solo. '
    + 'Por eso lo que hay que exigir es <b>≥ 10 kA de poder de corte en CC</b> a la tensión de tu batería. '
    + 'Si la ficha solo da el dato en alterna, <b>no vale</b>.</small></div>'
    + M.sustitutosFusible(d).map(s => fila(
        '<span class="pt ' + (s.bien ? 'ok' : (s.color === 'bad' ? 'bad' : 'warn')) + '"></span>' + s.n,
        s.v, s.t, s.bien ? 'ok' : (s.color === 'bad' ? 'bad' : 'warn'))).join(''),
    'El BMS de la batería también corta por cortocircuito, y en un equipo bueno corta rápido. '
    + 'Pero <b>el fusible protege el tramo entre el borne y el BMS</b>, y protege también el día que el '
    + 'BMS falle. Por eso va igual.');

  /* cuánto cuestan estas protecciones en Cuba */
  {
    const P = PRECIOS.piezas, pk = PRECIOS.packs;
    const grande = d.P > 6000;
    const breq = grande ? pk.brequera1012 : pk.brequera36;
    // por piezas: el pack de cinco + la caja + la varilla de tierra
    const porPiezas = pk.proteccion.usd + P.cajaBreakers.usd + P.varillaTierra.usd;
    const conBrequera = breq.usd + P.varillaTierra.usd;
    const mejor = conBrequera <= porPiezas ? 'brequera' : 'piezas';

    let hp = '<div class="titular"><b>Entre ' + din(Math.min(porPiezas, conBrequera))
      + ' y ' + din(Math.max(porPiezas, conBrequera)) + '</b>'
      + '<small>Con precios de compra en Cuba de septiembre. '
      + 'Métele la cifra que elijas en <b>Dinero → Protecciones</b>.</small></div>';

    hp += '<div class="sep">Camino 1 · por piezas</div>'
      + fila(pk.proteccion.n, din(pk.proteccion.usd),
          'Trae: ' + pk.proteccion.lleva.join(', ') + '. Sueltas costarían '
          + din(145) + ', así que el pack ahorra ' + din(20))
      + fila(P.cajaBreakers.n, din(P.cajaBreakers.usd), P.cajaBreakers.de)
      + fila(P.varillaTierra.n, din(P.varillaTierra.usd), 'Sin esto no hay puesta a tierra')
      + fila('<b>Total por piezas</b>', din(porPiezas), '', mejor === 'piezas' ? 'ok' : '');

    hp += '<div class="sep">Camino 2 · brequera ya cableada</div>'
      + fila(breq.n, din(breq.usd), breq.lleva.join(' · '))
      + fila(P.varillaTierra.n, din(P.varillaTierra.usd), 'Va aparte igualmente')
      + fila('<b>Total con brequera</b>', din(conBrequera), 'Llega montada y cableada: se ahorra tiempo de taller',
          mejor === 'brequera' ? 'ok' : '');

    hp += '<div class="sep">Lo que falta comprobar</div>'
      + fila('<span class="pt warn"></span>¿Lleva diferencial de 30 mA?', 'PREGUNTAR',
          'Es la protección de las personas. <b>Si no lo trae, hay que sumarlo</b>', 'warn')
      + fila('<span class="pt warn"></span>¿Lleva fusible Clase T?', 'PREGUNTAR',
          'Un breaker no corta el cortocircuito de una batería de litio. <b>Si no lo trae, hay que sumarlo</b>', 'warn')
      + fila('<span class="pt warn"></span>¿De cuántos amperios vienen los breakers?', 'PREGUNTAR',
          'Este sistema pide <b>' + d.brkDC + ' A</b> en la batería y <b>' + d.brkAC + ' A</b> en alterna. '
          + 'Unos genéricos no valen', 'warn');

    h += caja('Cuánto cuestan estas protecciones', hp,
      'Precios de compra de <b>' + PRECIOS.fecha + '</b>, al cambio de <b>' + PRECIOS.cambio
      + ' CUP por dólar</b>. En Cuba se mueven, así que confírmalos antes de cotizar. '
      + '<b>El protector de voltaje y el SPD no son lo mismo</b>: el primero vigila que la red no se vaya '
      + 'de rango (el neutro flojo), el segundo se come el pico de un rayo. Hacen falta los dos.');
  }

  /* lo que el inversor ya lleva por dentro */
  h += caja('Lo que este inversor ya trae por dentro',
    M.internas(inv).map(([t, n]) => fila('<span class="pt ok"></span>' + t, 'SÍ', n, 'ok')).join(''),
    '<b>Cuidado con esto:</b> la electrónica del inversor protege <b>al inversor</b>. '
    + 'No protege el cable, ni la casa, ni a las personas. Por eso siguen haciendo falta las de arriba, '
    + 'salvo las que aparezcan marcadas como «ya viene».');

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

  /* --- lo que se cobra por el montaje: lo ve también el instalador --- */
  const cobro = num(t.dinero.cobroMontaje);
  if (cobro > 0)
    h += caja('Lo que se cobra por este montaje',
      '<div class="titular"><b>' + din(cobro) + '</b>'
      + '<small>Es lo acordado con el cliente <b>solo por el montaje</b>. '
      + 'Si el cliente pregunta por otra cosa, que hable con la oficina.</small></div>');

  /* --- comprobaciones --- */
  h += caja('Comprobaciones del diseño',
    M.comprobaciones(d).map(k => fila(
      '<span class="pt ' + k.e + '"></span>' + k.t, '', k.n, k.e)).join(''));

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
  if ((t.tipo || 'montaje') === 'venta') return pintarVenta(t, a);
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

  h += '<button type="button" class="btn" id="btnCot" style="margin-bottom:13px">'
    + 'Ver la cotización del cliente</button>';

  h += caja('Lo que le cobras',
    campo('m_precio','Precio al cliente','Siempre cotizado en dólares', numInp('m_precio', m.precio, 0, 30000, 10))
    + campo('m_cobroMontaje','De eso, cuánto es el montaje',
        'Lo único de dinero que ve el instalador cuando le mandas el trabajo',
        numInp('m_cobroMontaje', m.cobroMontaje, 0, 5000, 10))
    + fila('Fondo de garantía', din(n.fondo), 'El ' + n.fondoPct + ' % de la venta. Tu proveedor no cubre nada después del montaje, así que esto es la garantía entera')
    + fila('Para ti', din(n.paraMi), (100 - num(a.socioPct)) + ' % de la ganancia', 'ok')
    + fila('Para la socia', din(n.paraSocia), num(a.socioPct) + ' % de la ganancia. Si el mes no hay ventas, no cobra'));

  /* --- cobros --- */
  const gastoCup = num(m.estr) + num(m.obra);
  const rc = M.resumenCobros(t.cobros, num(m.precio), gastoCup);
  const tasa = num(a.usdCup);
  const fech = ts => { const d = new Date(ts); const p = n => String(n).padStart(2,'0');
    return p(d.getDate()) + '/' + p(d.getMonth()+1) + '/' + String(d.getFullYear()).slice(2); };
  const EST = { 'sin cobrar':['bad','Sin cobrar'], parcial:['warn','Cobrado a medias'], pagado:['ok','Pagado'] };
  const [clEst, txEst] = EST[rc.estado];

  let hc = '<div class="titular ' + (rc.estado === 'pagado' ? '' : rc.estado === 'parcial' ? 'info' : 'rojo') + '">'
    + '<b>' + txEst + '</b><small>'
    + (rc.estado === 'pagado'
        ? 'Han entrado ' + din(rc.cobrado) + ' de los ' + din(num(m.precio)) + ' del sistema.'
        : 'Han entrado <b>' + din(rc.cobrado) + '</b> de ' + din(num(m.precio))
          + '. Faltan <b>' + din(rc.falta) + '</b>.')
    + '</small></div>';

  hc += fila('Plan de cobro · en pesos', tasa > 0 ? miles(rc.planCup * tasa) + ' CUP' : din(rc.planCup),
    'Es lo que vas a gastar en pesos: estructura y mano de obra. <b>Cobra en CUP justo eso</b>, '
    + 'porque el peso que sobre no sale del país'
    + (tasa > 0 ? ' · equivale a ' + din(rc.planCup) : ' · pon el cambio abajo para verlo en pesos'), 'info');
  hc += fila('Plan de cobro · en dólares', din(rc.planUsd),
    'El resto: es con lo que se pagan los equipos', 'info');

  if (rc.sinCambio)
    hc += fila('<span class="pt bad"></span>Cobros en pesos sin cambio apuntado', rc.sinCambio,
      'Sin el cambio del día no se puede saber cuántos dólares entraron. Corrígelos abajo.', 'bad');

  if (rc.n){
    hc += '<div class="sep">Lo que ha entrado</div>';
    (t.cobros || []).forEach((c, i) => {
      const cup = c.moneda === 'CUP';
      const eq = cup && +c.cambio > 0 ? ' · ' + din((+c.importe) / (+c.cambio)) : (cup ? ' · <b>falta el cambio</b>' : '');
      hc += fila(esc(c.quien || 'Sin apuntar') + ' <span style="opacity:.55">· ' + fech(c.cuando) + '</span>',
        (cup ? miles(c.importe) + ' CUP' : din(c.importe)),
        (cup ? 'Al cambio de ' + (+c.cambio || '—') + ' CUP/USD' + eq : 'En dólares')
        + ' <button type="button" class="mini" data-quita="' + i + '">Quitar</button>',
        cup && !+c.cambio ? 'bad' : '');
    });
  }

  hc += '<div class="sep">Apuntar un cobro</div>'
    + campo('c_importe','Cuánto entró','', numInp('c_importe', '', 0, 9999999, 1))
    + campo('c_moneda','En qué moneda','', sel('c_moneda', 'USD', [['USD','Dólares'],['CUP','Pesos cubanos']]))
    + campo('c_cambio','Cambio de ese día','Solo si fue en pesos. CUP por 1 USD',
        numInp('c_cambio', tasa || '', 0, 5000, 1))
    + campo('c_quien','Quién lo cobró','', sel('c_quien', 'Instalador',
        [['Instalador','El instalador'],['Marcos','Yo'],['Otro','Otra persona']]))
    + '<button type="button" class="btn" id="btnCobro" style="margin-top:12px">Apuntar este cobro</button>';

  h += caja('Cobros', hc,
    'Cada cobro guarda su propio cambio, así que el total en dólares sale bien aunque el peso se mueva. '
    + '<b>A ti el cambio no te quita nada:</b> tú cotizas en dólares y el cliente entrega los pesos que equivalgan.');

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
    fila('Capital disponible', num(a.capital) ? din(num(a.capital)) : 'sin poner',
        'Se pone en <b>Ajustes</b>, porque es del negocio entero y no de este trabajo',
        num(a.capital) ? '' : 'warn')
    + fila('Operaciones abiertas que caben', cabenOps || '—',
        cabenOps ? 'Con ' + din(num(a.capital)) + ' y un coste de ' + din(n.coste) + ' por sistema'
                 : 'El capital no llega ni para un sistema completo', cabenOps ? 'ok' : 'bad')
    + fila('Ganancia si se cierran los ' + (cabenOps||0), din(n.ganancia * cabenOps), 'Antes de repartir', 'ok'),
    'Acuérdate de descontar el inversor de repuesto: va siempre con el equipo y también es capital inmovilizado.');

  $('p-dinero').innerHTML = h;
}

/* ═══════════════ DINERO · VENTA DE EQUIPOS SUELTOS ═══════════════ */
function pintarVenta(t, a){
  const arts = t.articulos || [];
  const v = M.negocioVenta(arts, num(a.fondoPct), num(a.minPct), num(a.socioPct));
  const bajo = v.venta > 0 && v.pctVenta < num(a.minPct);

  let h = '<div class="kpi"><div class="k">Ganancia limpia de la venta</div>'
    + '<div class="v ' + (v.venta <= 0 ? '' : bajo ? 'bad' : 'ok') + '">' + din(v.ganancia) + '</div>'
    + '<div class="s">' + (v.venta > 0
        ? v.pctVenta.toFixed(1).replace('.',',') + ' % de la venta · '
          + v.pctInversion.toFixed(1).replace('.',',') + ' % de lo invertido · ya descontado el fondo'
        : 'Añade los equipos que le vendes y aparece el número') + '</div></div>';

  h += '<div class="kpi dos"><div><div class="k">Te cuesta</div><div class="v">' + din(v.coste) + '</div></div>'
    + '<div><div class="k">Venta mínima al ' + a.minPct + ' %</div>'
    + '<div class="v ' + (bajo ? 'bad' : 'ok') + '">' + din(v.ventaMin) + '</div></div></div>';

  if (bajo)
    h += caja('Estás por debajo de tu suelo',
      '<div class="titular rojo"><b>No la cierres en ' + din(v.venta) + '</b>'
      + '<small>Tu suelo es el <b>' + a.minPct + ' %</b>. Con estos equipos la venta no puede bajar de '
      + '<b>' + din(v.ventaMin) + '</b>. Te faltan ' + din(v.ventaMin - v.venta) + '.</small></div>');

  /* los artículos */
  let ha = '';
  if (!arts.length){
    ha = '<div class="vacio"><b>Todavía no hay equipos</b>'
      + 'Añade abajo lo que le vas a vender: un inversor, unos paneles, unas baterías. '
      + 'Cada uno con lo que te cuesta y a cuánto lo vendes.</div>';
  } else {
    v.items.forEach((it, i) => {
      const flojo = it.pct < num(a.minPct);
      ha += fila(esc(it.nombre || 'Sin nombre')
          + ' <span style="opacity:.55">· ' + it.cant + ' ud.</span>',
        din(it.ventaTotal),
        'Te cuesta ' + din(it.costeTotal) + ' · ganas <b>' + din(it.ganancia) + '</b> ('
        + it.pct.toFixed(0) + ' %)'
        + (flojo ? ' · <b>por debajo de tu ' + a.minPct + ' %: mínimo ' + din(it.minUnidad) + ' la unidad</b>' : '')
        + ' <button type="button" class="mini" data-quitaart="' + i + '">Quitar</button>',
        flojo ? 'warn' : '');
    });
    ha += fila('<b>Total de la venta</b>', din(v.venta),
      'Coste ' + din(v.coste) + ' · fondo de garantía ' + din(v.fondo), 'ok');
  }

  ha += '<div class="sep">Añadir un equipo</div>'
    + campo('v_nombre','Qué es','Como se lo vas a decir al cliente',
        txtInp('v_nombre','','Inversor MUST 6 kW'), true)
    + campo('v_cant','Cuántos','', numInp('v_cant', 1, 1, 99, 1))
    + campo('v_coste','Lo que te cuesta cada uno','', numInp('v_coste','',0,99999,1))
    + campo('v_precio','A cuánto lo vendes cada uno','', numInp('v_precio','',0,99999,1))
    + '<button type="button" class="btn" id="btnArt" style="margin-top:12px">Añadir a la venta</button>';

  h += caja('Equipos que le vendes', ha,
    'Aquí no hay mano de obra ni estructura: <b>no montas nada</b>. El margen sale de cada equipo, '
    + 'y la app te avisa si alguno se queda por debajo de tu suelo aunque el total cuadre.');

  /* cobros: igual que en un montaje, pero sobre el total de la venta */
  const rc = M.resumenCobros(t.cobros, v.venta, 0);
  const tasa = num(a.usdCup);
  const fech = ts => { const d = new Date(ts); const p = n => String(n).padStart(2,'0');
    return p(d.getDate()) + '/' + p(d.getMonth()+1) + '/' + String(d.getFullYear()).slice(2); };
  const EST = { 'sin cobrar':'Sin cobrar', parcial:'Cobrado a medias', pagado:'Pagado' };

  let hc = '<div class="titular ' + (rc.estado === 'pagado' ? '' : rc.estado === 'parcial' ? 'info' : 'rojo') + '">'
    + '<b>' + EST[rc.estado] + '</b><small>'
    + (v.venta <= 0 ? 'Añade primero los equipos.'
       : rc.estado === 'pagado' ? 'Han entrado ' + din(rc.cobrado) + ' de ' + din(v.venta) + '.'
       : 'Han entrado <b>' + din(rc.cobrado) + '</b> de ' + din(v.venta) + '. Faltan <b>' + din(rc.falta) + '</b>.')
    + '</small></div>';

  if (rc.n){
    hc += '<div class="sep">Lo que ha entrado</div>';
    (t.cobros || []).forEach((c, i) => {
      const cup = c.moneda === 'CUP';
      hc += fila(esc(c.quien || 'Sin apuntar') + ' <span style="opacity:.55">· ' + fech(c.cuando) + '</span>',
        cup ? miles(c.importe) + ' CUP' : din(c.importe),
        (cup ? 'Al cambio de ' + (+c.cambio || '—') + ' CUP/USD · ' + din((+c.importe)/(+c.cambio||1)) : 'En dólares')
        + ' <button type="button" class="mini" data-quita="' + i + '">Quitar</button>');
    });
  }
  hc += '<div class="sep">Apuntar un cobro</div>'
    + campo('c_importe','Cuánto entró','', numInp('c_importe','',0,9999999,1))
    + campo('c_moneda','En qué moneda','', sel('c_moneda','USD',[['USD','Dólares'],['CUP','Pesos cubanos']]))
    + campo('c_cambio','Cambio de ese día','Solo si fue en pesos', numInp('c_cambio', tasa || '',0,5000,1))
    + campo('c_quien','Quién lo cobró','', sel('c_quien','Instalador',
        [['Instalador','El instalador'],['Marcos','Yo'],['Otro','Otra persona']]))
    + '<button type="button" class="btn" id="btnCobro" style="margin-top:12px">Apuntar este cobro</button>';

  h += caja('Cobros', hc);

  h += caja('Reparto',
    fila('Para ti', din(v.paraMi), (100 - num(a.socioPct)) + ' % de la ganancia', 'ok')
    + fila('Para la socia', din(v.paraSocia), num(a.socioPct) + ' % de la ganancia')
    + fila('Fondo de garantía', din(v.fondo), 'El ' + v.fondoPct + ' % de la venta'));

  h += '<button type="button" class="btn gris" id="btnCot" style="margin-top:4px">'
    + 'Ver la cotización del cliente</button>';

  $('p-dinero').innerHTML = h;
}

/* ═══════════════ PANTALLA · AJUSTES ═══════════════ */
function pintarAjustes(){
  const a = S.ajustes;

  if (S.rol === 'campo'){
    $('p-ajustes').innerHTML = caja('Este teléfono',
      campo('a_dispositivo','¿De quién es este teléfono?',
        'Para saber de qué aparato salen los avisos',
        txtInp('a_dispositivo', a.dispositivo, 'Yunior · teléfono'), true))
      + caja('Sobre la aplicación',
      fila('Light of Life Energy', 'LLEnergy', 'Versión 1')
      + fila('Funciona sin internet', 'Sí', 'Una vez abierta, se queda guardada en el teléfono', 'ok')
      + fila('Actualizaciones', 'Solas', 'Cuando hay una versión nueva se instala sola', 'ok'))
      + caja('Qué hacer si algo no cuadra',
        '<div class="titular info"><b>Nunca improvises en el techo</b>'
        + '<small>Si un número no te cuadra o el equipo no es el que dice la ficha, '
        + 'para y pregunta antes de conectar nada. Un inversor mal cableado no tiene arreglo.</small></div>');
    return;
  }

  let h = caja('Reglas del negocio',
    campo('a_minPct','Margen mínimo','Por debajo de esto la app te avisa. Medido sobre el precio de venta', numInp('a_minPct', a.minPct, 0, 60, 1))
    + campo('a_fondoPct','Fondo de garantía','Nunca menos del 3 %', numInp('a_fondoPct', a.fondoPct, 3, 30, 1))
    + campo('a_socioPct','Parte de la socia','El resto es tuyo', numInp('a_socioPct', a.socioPct, 0, 100, 5))
    + campo('a_garantiaMeses','Garantía que das','En meses, desde la puesta en marcha', numInp('a_garantiaMeses', a.garantiaMeses, 1, 120, 1))
    + campo('a_validezDias','Validez de la cotización','En días. Pasado ese plazo hay que rehacerla', numInp('a_validezDias', a.validezDias, 1, 90, 1))
    + campo('a_capital','Capital disponible','Lo que puso la socia. Con esto se calcula cuántos trabajos caben a la vez', numInp('a_capital', a.capital, 0, 200000, 100)),
    'El margen mínimo está medido sobre el <b>precio de venta</b>, que es como lo enseñaba la calculadora. Si lo querías sobre lo invertido, dímelo y lo cambio: son cifras distintas.');

  h += caja('Este teléfono',
    campo('a_dispositivo','¿De quién es este teléfono?',
      'Aparece en el registro de intentos de entrar en Oficina',
      txtInp('a_dispositivo', a.dispositivo, 'Marcos · teléfono'), true));

  h += caja('Candado de Oficina',
    (hayClave()
      ? fila('Clave puesta', 'Sí',
          'Quien abra la app entra en modo <b>Campo</b>. Para ver el dinero hace falta la clave. '
          + 'Al salir de Oficina vuelve a echarse el candado, y al cerrar la app también.', 'ok')
        + '<button type="button" class="btn gris" id="btnCambiarClave" style="margin-top:12px">Cambiar la clave</button>'
        + '<button type="button" class="btn peligro" id="btnQuitarClave" style="margin-top:8px">Quitar la clave</button>'
      : fila('Sin clave', 'Cualquiera entra',
          'Ahora mismo, quien tenga el enlace puede tocar <b>Oficina</b> y ver costes y márgenes. '
          + 'Ponle una clave antes de pasarle el enlace al instalador.', 'bad')
        + '<button type="button" class="btn" id="btnPonerClave" style="margin-top:12px">Poner una clave</button>'),
    'De la clave no se guarda la clave, se guarda su huella. Aun así, esto para a una persona '
    + 'normal, no a alguien que se ponga a hurgar a propósito en el navegador. Para lo que hace falta aquí, sobra.');

  const fecha = t => { const d = new Date(t);
    const p = n => String(n).padStart(2,'0');
    return p(d.getDate()) + '/' + p(d.getMonth()+1) + ' · ' + p(d.getHours()) + ':' + p(d.getMinutes()); };
  const ints = S.intentos || [];
  const fallidos = ints.filter(i => !i.ok).length;
  h += caja('Quién ha intentado entrar en Oficina',
    (ints.length
      ? (fallidos
          ? fila('<span class="pt bad"></span>Intentos con la clave equivocada', fallidos,
              'Si tú no fuiste, cambia la clave.', 'bad')
          : fila('<span class="pt ok"></span>Ningún intento fallido', ints.length + ' entradas',
              'Todas con la clave correcta.', 'ok'))
        + ints.slice(0,8).map(i => fila(
            '<span class="pt ' + (i.ok ? 'ok' : 'bad') + '"></span>' + esc(i.quien),
            fecha(i.cuando), i.ok ? 'Entró' : 'Clave equivocada', i.ok ? '' : 'bad')).join('')
      : fila('Todavía nada', '—', 'Aquí van a aparecer los intentos de entrar en Oficina desde este teléfono')),
    '<b>Esto solo ve lo que pasa en este teléfono.</b> Si alguien prueba a entrar desde el suyo, '
    + 'el intento se queda anotado allí, no aquí. Para que te llegue un aviso al correo hace falta '
    + 'conectar un servicio que mande los correos — dímelo y lo montamos.');

  h += caja('Tus datos',
    fila('Dónde están', 'En este teléfono', 'Los trabajos, los precios y los márgenes no salen de aquí. No se suben a ningún servidor', 'ok')
    + fila('Trabajos guardados', S.trabajos.length, '')
    + '<button type="button" class="btn gris" id="btnExportar" style="margin-top:12px">Guardar copia en un archivo</button>'
    + '<button type="button" class="btn gris" id="btnImportar" style="margin-top:8px">Recuperar desde un archivo</button>'
    + '<input type="file" id="fileImportar" accept="application/json" hidden>',
    'Haz una copia de vez en cuando. Si cambias de teléfono o se borra el navegador, es lo único que te devuelve los trabajos.');

  h += caja('Sobre la aplicación',
    fila('Light of Life Energy', 'LLEnergy ' + VERSION_APP, 'Si esta versión no coincide con la que te digo, dale al botón de abajo')
    + fila('Equipos en la lista',
        Object.keys(MODELOS).length + ' inversores · ' + Object.keys(BATS).length + ' baterías',
        'Sirve para comprobar de un vistazo si te llegó lo último', 'ok')
    + fila('Funciona sin internet', 'Sí', 'Una vez abierta, se queda guardada en el teléfono', 'ok')
    + '<button type="button" class="btn gris" id="btnActualizar" style="margin-top:12px">Buscar una versión nueva</button>'
    + '<div id="msgAct" style="font-size:13px;color:var(--gris);margin-top:9px;min-height:18px"></div>',
    'Normalmente se actualiza sola al abrirla. Este botón es para cuando quieras comprobarlo tú.');

  $('p-ajustes').innerHTML = h;
}

/* ═══════════════ pintar todo ═══════════════ */
let pantalla = 'trabajos';
function pintar(){
  const t = activo();
  $('nmTrabajo').textContent = t.nombre;
  $('rolCampo').setAttribute('aria-pressed', S.rol === 'campo');
  $('rolOficina').setAttribute('aria-pressed', S.rol === 'oficina');
  $('candado').hidden = puedeOficina();
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

/* ═══════════════ LA COTIZACIÓN DEL CLIENTE ═══════════════ */
let cotActual = null;

function abrirCot(t, aj){
  cotActual = { t, aj };
  $('cotTit').textContent = 'Cotización · ' + t.nombre;
  $('cotCuerpo').innerHTML = htmlCot(datosCot(t, aj));
  $('hojaCot').hidden = false;
  document.body.style.overflow = 'hidden';
  $('hojaCot').scrollTop = 0;
}
function cerrarCot(){ $('hojaCot').hidden = true; document.body.style.overflow = ''; cotActual = null; }

async function compartirCot(){
  if (!cotActual) return;
  const url = location.origin + location.pathname + '#c=' + empaquetarCot(cotActual.t, cotActual.aj);
  const d = datosCot(cotActual.t, cotActual.aj);
  const texto = 'Cotización para ' + cotActual.t.nombre + ' · Light of Life Energy'
    + '\n\nSistema de ' + co(d.kwInv) + ' kW con ' + co(Math.round(d.kWh*100)/100)
    + ' kWh de batería y ' + d.npan + ' paneles, instalado: ' + din(d.precio)
    + '\n\nAquí va el detalle completo:\n' + url;
  if (navigator.share){
    try { await navigator.share({ title:'Cotización · Light of Life Energy', text:texto }); return; } catch(e){}
  }
  try { await navigator.clipboard.writeText(texto);
    alert('Cotización copiada. Pégala en WhatsApp y mándasela.'); }
  catch(e){ prompt('Copia este enlace y mándaselo:', url); }
}

/* si la app se abre con una cotización dentro del enlace, se enseña y ya:
   el cliente no ve la app, ve su documento */
function mirarCotizacion(){
  const h = location.hash || '';
  if (!h.startsWith('#c=')) return false;
  const p = desempaquetarCot(h.slice(3));
  if (!p) return false;
  history.replaceState(null, '', location.pathname);
  document.querySelector('.top').hidden = true;
  document.querySelector('.nav').hidden = true;
  document.querySelector('main').hidden = true;
  abrirCot(p.t, p.aj);
  $('cotCerrar').hidden = true;
  $('cotCompartir').hidden = true;
  return true;
}

$('cotCerrar').addEventListener('click', cerrarCot);
$('cotCompartir').addEventListener('click', compartirCot);
$('cotImprimir').addEventListener('click', () => window.print());

/* ═══════════════ MANDARLE EL TRABAJO AL INSTALADOR ═══════════════
   El trabajo viaja dentro del propio enlace, no hay servidor por medio.
   Solo va la parte técnica y el precio del montaje: ni costes, ni margen,
   ni reparto. Aunque el instalador entre en Oficina, ahí no hay nada tuyo. */

function empaquetar(t){
  const p = { v:1, n:t.nombre, z:t.zona, s:t.sistema, vi:t.visita,
    mo: num(t.dinero.cobroMontaje) };
  // se comprime en base64 para que el enlace no sea eterno
  const txt = JSON.stringify(p);
  const bytes = new TextEncoder().encode(txt);
  let bin = ''; bytes.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

function desempaquetar(c){
  try {
    const b64 = c.replace(/-/g,'+').replace(/_/g,'/');
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, ch => ch.charCodeAt(0));
    const p = JSON.parse(new TextDecoder().decode(bytes));
    if (!p || p.v !== 1 || !p.s) return null;
    return p;
  } catch(e){ return null; }
}

function enlaceDe(t){
  const base = location.origin + location.pathname;
  return base + '#t=' + empaquetar(t);
}

async function enviarTrabajo(){
  const t = activo();
  const url = enlaceDe(t);
  const texto = 'Trabajo: ' + t.nombre + (t.zona ? ' · ' + t.zona : '')
    + '\n\nAbre este enlace y se te guarda en LLEnergy con el diseño, las '
    + 'protecciones y los materiales:\n' + url;
  if (navigator.share){
    try { await navigator.share({ title:'LLEnergy · ' + t.nombre, text:texto }); return; } catch(e){}
  }
  try { await navigator.clipboard.writeText(texto);
    alert('Enlace copiado. Pégalo en WhatsApp y mándaselo.'); }
  catch(e){ prompt('Copia este enlace y mándaselo por WhatsApp:', url); }
}

/* si la app se abre con un trabajo dentro del enlace, se ofrece guardarlo */
function mirarEnlace(){
  const h = location.hash || '';
  if (!h.startsWith('#t=')) return;
  const p = desempaquetar(h.slice(3));
  history.replaceState(null, '', location.pathname);
  if (!p) return alert('Ese enlace no se pudo leer. Pide que te lo manden otra vez entero.');
  if (!confirm('¿Guardar el trabajo «' + p.n + '»' + (p.z ? ' de ' + p.z : '') + '?')) return;
  const t = nuevoTrabajo(p.n, p.z);
  t.sistema = { ...SISTEMA, ...(p.s||{}) };
  t.visita  = { ...VISITA,  ...(p.vi||{}) };
  t.dinero  = { ...DINERO, cobroMontaje: p.mo || 0 };
  t.recibido = true;
  guardar();
}

/* ═══════════════ la ventana de la clave ═══════════════ */
let claveModo = 'entrar';   // 'entrar' | 'poner' | 'quitar'

function pedirClave(modo){
  claveModo = modo;
  const T = { entrar:['Clave de Oficina','Escribe tu clave para ver los costes, los precios y el reparto.'],
    poner:['Poner una clave','Elige un número de 4 a 8 cifras. Hace falta para entrar en Oficina desde cualquier teléfono.'],
    quitar:['Quitar la clave','Escribe la clave actual. Después, Oficina quedará abierta para quien tenga el enlace.'] }[modo];
  $('claveTit').textContent = T[0];
  $('claveTx').textContent = T[1];
  $('claveMsg').textContent = '';
  $('claveInp').value = '';
  $('pantClave').hidden = false;
  setTimeout(() => $('claveInp').focus(), 60);
}
function cerrarClave(){ $('pantClave').hidden = true; $('claveInp').value = ''; }

/* Cada vez que alguien prueba a entrar en Oficina queda anotado: cuándo, desde
   qué teléfono y si acertó. Se guardan los 30 últimos. Este registro vive en
   ESTE teléfono; el intento hecho desde otro aparato se queda en el suyo. */
function anotar(ok){
  S.intentos = S.intentos || [];
  S.intentos.unshift({ cuando: Date.now(), ok,
    quien: (S.ajustes.dispositivo || '').trim() || 'Sin nombre' });
  S.intentos = S.intentos.slice(0, 30);
  guardar();
}

async function confirmarClave(){
  const v = $('claveInp').value.trim();
  const msg = t => { $('claveMsg').textContent = t; };
  if (claveModo === 'poner'){
    if (v.length < 4) return msg('Pon al menos 4 cifras.');
    S.ajustes.claveHash = await huella(v);
    marcarAbierto(true); cerrarClave(); pintar();
    return;
  }
  const ok = (await huella(v)) === S.ajustes.claveHash;
  if (claveModo === 'entrar') anotar(ok);
  if (!ok) return msg('Esa no es.');
  if (claveModo === 'quitar'){ S.ajustes.claveHash = ''; marcarAbierto(true); }
  else { marcarAbierto(true); S.rol = 'oficina'; }
  cerrarClave(); pintar();
}

$('claveEntrar').addEventListener('click', confirmarClave);
$('claveCancelar').addEventListener('click', cerrarClave);
$('claveInp').addEventListener('keydown', e => { if (e.key === 'Enter') confirmarClave(); });
$('pantClave').addEventListener('click', e => { if (e.target.id === 'pantClave') cerrarClave(); });

/* ═══════════════ eventos ═══════════════ */
document.querySelectorAll('.nav button').forEach(b =>
  b.addEventListener('click', () => { pantalla = b.dataset.p; window.scrollTo(0,0); pintar(); }));

$('rolCampo').addEventListener('click', () => {
  S.rol = 'campo';
  if (hayClave()) marcarAbierto(false);   // salir de Oficina vuelve a echar el candado
  pintar();
});
$('rolOficina').addEventListener('click', () => {
  if (!puedeOficina()) return pedirClave('entrar');
  S.rol = 'oficina'; pintar();
});
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
  else if (ev.target.id === 't_tipo'){ t.tipo = ev.target.value; repinta(); }
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
  if (ev.target.id === 'btnActualizar'){
    const msg = t => { const e = $('msgAct'); if (e) e.textContent = t; };
    msg('Buscando…');
    (async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg){ msg('Esta copia no está instalada como app. Ábrela desde el enlace y añádela a la pantalla de inicio.'); return; }
        await reg.update();
        // se vacía lo guardado para que el próximo arranque lo traiga todo del servidor
        if (window.caches){ const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); }
        msg('Listo. Recargando con la versión nueva…');
        setTimeout(() => location.reload(), 900);
      } catch(e){ msg('No se pudo comprobar: ' + e.message); }
    })();
    return;
  }
  if (ev.target.id === 'btnArt'){
    const t = activo();
    const nom = $('v_nombre').value.trim();
    const cant = num($('v_cant').value), coste = num($('v_coste').value), precio = num($('v_precio').value);
    if (!nom){ alert('Ponle nombre al equipo.'); return; }
    if (cant <= 0){ alert('Pon cuántos son.'); return; }
    if (precio <= 0){ alert('Pon a cuánto lo vendes.'); return; }
    t.articulos = t.articulos || [];
    t.articulos.push({ nombre:nom, cant, coste, precio });
    guardar(); pintar();
    return;
  }
  const quitaArt = ev.target.closest('[data-quitaart]');
  if (quitaArt){
    const t = activo(), i = +quitaArt.dataset.quitaart;
    if (confirm('¿Quitar ese equipo de la venta?')){ t.articulos.splice(i,1); guardar(); pintar(); }
    return;
  }
  if (ev.target.id === 'btnCobro'){
    const t = activo();
    const imp = num($('c_importe').value);
    if (imp <= 0){ alert('Pon cuánto entró.'); return; }
    const moneda = $('c_moneda').value;
    const cambio = moneda === 'CUP' ? num($('c_cambio').value) : 0;
    if (moneda === 'CUP' && cambio <= 0){
      alert('Si el cobro fue en pesos hace falta el cambio de ese día, si no no se sabe cuántos dólares entraron.');
      return;
    }
    t.cobros = t.cobros || [];
    t.cobros.push({ importe: imp, moneda, cambio, quien: $('c_quien').value, cuando: Date.now() });
    guardar(); pintar();
    return;
  }
  const quita = ev.target.closest('[data-quita]');
  if (quita){
    const t = activo(), i = +quita.dataset.quita;
    if (confirm('¿Quitar ese cobro?')){ t.cobros.splice(i, 1); guardar(); pintar(); }
    return;
  }
  if (ev.target.id === 'btnCot'){ abrirCot(activo(), S.ajustes); return; }
  if (ev.target.id === 'btnEnviar'){ enviarTrabajo(); return; }
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
  if (ev.target.id === 'btnPonerClave' || ev.target.id === 'btnCambiarClave'){ pedirClave('poner'); return; }
  if (ev.target.id === 'btnQuitarClave'){ pedirClave('quitar'); return; }
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
if (!mirarCotizacion()){
  mirarEnlace();
  pintar();
}

/* que funcione sin internet: solo se activa si la app está en su propia dirección */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')){
  navigator.serviceWorker.register('sw.js').catch(() => { /* en vista previa no se puede, y no pasa nada */ });
}
