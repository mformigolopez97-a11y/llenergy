/* ═══════════════════════════════════════════════════════════════════════
   LLEnergy · Light of Life Energy
   Pantallas, trabajos y guardado.

   Los datos viven SOLO en este teléfono. Nada se sube a ningún sitio.
   ═══════════════════════════════════════════════════════════════════════ */

import * as M from './motor.js';
import { MODELOS, BATS, PRECIOS, APARATOS, CAMPOS_INV, CAMPOS_BAT } from './datos.js';
import { datosCot, htmlCot, empaquetarCot, desempaquetarCot } from './cotizacion.js';

const LS = 'llenergy-v1';
const VERSION_APP = 'v30';   // sube con cada publicación, junto a la de sw.js
const $ = id => document.getElementById(id);

/* Solo <main> se desplaza; la ventana ya no. Subir al principio se hace
   sobre el, no sobre window, o no sube nada. */
const arriba = () => { const m = document.querySelector('main'); if (m) m.scrollTop = 0;
  window.scrollTo(0, 0); };
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio',
  'agosto','septiembre','octubre','noviembre','diciembre'];

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const num = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const co  = x => String(x).replace('.', ',');
const miles = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const din = n => '$' + miles(n);

/* ─────────── estado ─────────── */
const SISTEMA = { pinv:6, vac:230, vbat:51.2, ah:100, abms:100, nbat:1, icar:100,
  npan:4, wpan:650, voc:46, isc:18, vmax:450, vmppt:60, vmpmax:360, nmppt:1, impp:28,
  dist:12, plargo:2.38, pancho:1.13, orient:'v', filas:1, techo:'plano',
  modeloInv:'', modeloBat:'' };   // vacío a propósito: hay que elegir, no heredar

// Un trabajo nuevo empieza en cero: los precios los pone Marcos, no vienen
// escritos en el programa. Así no hay ninguna cifra suya en el código.
const DINERO = { kit:0, ppan:0, prot:0, cab:0, estr:0, obra:0, trans:0, precio:0,
  cobroMontaje:0 };   // lo que el cliente paga por el montaje; es lo único de dinero
                      // que viaja al instalador

// Solo el trabajo de ejemplo lleva cifras, y son redondas y de muestra.
const DINERO_EJEMPLO = { kit:2500, ppan:180, prot:600, cab:180, estr:200, obra:300, trans:80,
  precio:5800, cobroMontaje:650 };

const VISITA = { cita:'', direccion:'', quienVa:'', comoLlegar:'',
  consumo:'', tipoTecho:'plano', orientacion:'sur', sombras:'no',
  neutro:'sin revisar', equiposCasa:'', pide:'', puede:'', extra:'', notas:'',
  aparatos:{}, objetivoKWh:0 };   // aparatos: {claveDelAparato: cuántos hay} · sale de la tabla APARATOS

const AJUSTES = { usdCup:705, cambioFecha:'', minPct:18, socioPct:30, fondoPct:3, capital:0,
  claveHash:'',      // de la clave solo se guarda su huella, nunca la clave
  dispositivo:'',    // de quién es este teléfono, para saber quién intentó entrar
  garantiaMeses:12, validezDias:15 };

/* Una instalación nueva arranca SIEMPRE en Campo. Para entrar en Oficina
   hay que poner una clave, aunque sea la primera vez. Antes arrancaba en
   Oficina, y por eso el teléfono del instalador entraba sin nada. */
let S = { rol:'campo', activo:null, ajustes:{...AJUSTES}, trabajos:[], intentos:[],
  soloCampo:false, abrirConf:'',
  /* Datos de equipo corregidos a mano, con el aparato delante. Van por clave de
     modelo y no por trabajo, porque son un hecho del equipo, no de la casa:
     una vez leída la etiqueta de un MUST 3048, vale para todos los montajes. */
  equipos:{} };   // los teléfonos que reciben un trabajo por enlace se quedan así para siempre

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
/* Solo se entra en Oficina si este teléfono tiene clave Y se ha abierto en
   esta sesión. Sin clave no se entra: hay que ponerla primero. */
const puedeOficina = () => !S.soloCampo && hayClave() && abierto;

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
  if (!puedeOficina()) S.rol = 'campo';
}
function guardar(){ try { localStorage.setItem(LS, JSON.stringify(S)); } catch(e){} }

function nuevoTrabajo(nombre, zona, ejemplo){
  const t = { id:'t'+Date.now()+Math.random().toString(36).slice(2,6),
    nombre: nombre || 'Trabajo nuevo', zona: zona || '', contacto:'',
    estado:'agendar', ejemplo: !!ejemplo,
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

/* la unidad va pegada al número: así no se confunde un voltio con un amperio */
const numInp = (id, v, min, max, paso, uni) =>
  '<div class="uni">'
  + '<input type="number" id="' + id + '" value="' + v + '" min="' + min + '" max="' + max
  + '" step="' + (paso || 1) + '" inputmode="decimal">'
  + (uni ? '<span>' + uni + '</span>' : '') + '</div>';

const txtInp = (id, v, ph) =>
  '<input type="text" id="' + id + '" value="' + esc(v) + '" placeholder="' + esc(ph||'') + '">';

const sel = (id, v, ops) => '<select id="' + id + '">' + ops.map(o =>
  '<option value="' + o[0] + '"' + (String(o[0]) === String(v) ? ' selected' : '') + '>' + o[1]
  + '</option>').join('') + '</select>';

/* Devuelve un equipo con sus datos corregidos a mano encima de los de la base,
   si es que alguien lo ha tenido delante y ha leido su etiqueta. Ese dato manda
   siempre sobre el catalogo: el catalogo puede ser de otra generacion del mismo
   modelo, y ya paso una vez con el MUST de 6 kW (145 V en catalogo, 245 V en la
   etiqueta del equipo real). */
function equipo(tabla, clave){
  const base = tabla[clave];
  if (!base) return null;
  const mio = S.equipos && S.equipos[clave];
  if (!mio || !Object.keys(mio).length) return base;
  return { ...base, ...mio, ok:true, confirmado:true };
}

/* Una nota de equipo. Siempre en rojo y siempre rotulada: aquí es donde
   está lo que no se puede pasar por alto. */
const nota = txt => txt
  ? '<div class="nota"><span class="et">Nota</span><span class="tp">' + txt + '</span></div>'
  : '';

/* La cuenta de dónde sale una cantidad. Va en monoespaciada y debajo del
   dato, para que se pueda seguir número a número. */
const cuenta = txt => txt ? '<span class="cuenta">' + txt + '</span>' : '';

/* Una fila de dato. La explicación va como hermana del título, no dentro:
   cuando el valor de la derecha es largo («130 A pide · 100 A deja») y no puede
   partirse, si la explicación estuviera dentro del título se quedaba en una
   columna de una palabra por línea. Así la explicación ocupa siempre el ancho
   completo por debajo, y el valor se baja solo a su propia línea si no cabe. */
const fila = (tx, vl, small, clase) =>
  '<div class="fila"><span class="tx">' + tx + '</span>'
  + '<span class="vl ' + (clase||'') + '">' + vl + '</span>'
  + (small ? '<span class="nt">' + small + '</span>' : '') + '</div>';

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
  const C = { 'sin cobrar':['agendar','Sin cobrar'], parcial:['aceptado', Math.round(r.pct) + ' %'], pagado:['montado','Pagado'] };
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

/* Las cinco fases por las que pasa un trabajo, en orden, con lo que toca
   hacer en cada una. Sirve para la tira de progreso y para decidir que se
   ensena en cada pantalla: Marcos pidio que cada estado abra lo suyo y no
   todo a la vez. */
const FASES = [
  { k:'agendar',  n:'Por visitar', q:'Poner día, hora y dirección, y mandárselo al técnico' },
  { k:'visita',   n:'Visitada',    q:'Levantar la casa: aparatos, techo, neutro y riesgos' },
  { k:'cotizado', n:'Cotizado',    q:'Elegir equipos, cerrar el precio y mandar la cotización' },
  { k:'aceptado', n:'Aceptado',    q:'Comprar, llevar el material y montar' },
  { k:'montado',  n:'Montado',     q:'Prueba de banco, garantía y mantenimiento' },
];
const faseDe = e => Math.max(0, FASES.findIndex(f => f.k === e));

/* La tira de progreso del trabajo abierto: donde esta y que toca ahora. */
function tiraFases(t){
  const i = faseDe(t.estado);
  return caja('En qué punto va este trabajo',
    '<div class="tira">'
    + FASES.map((f, j) => '<div class="fase' + (j < i ? ' hecha' : (j === i ? ' ahora' : ''))
        + '"><span class="pun"></span><span class="et">' + f.n + '</span></div>').join('')
    + '</div>'
    + '<div class="titular ' + (i === 4 ? '' : 'ahora') + '" style="margin-top:14px"><b>'
    + FASES[i].n + '</b><small>' + FASES[i].q + '.'
    + (i < 4 ? ' Cuando esté hecho, pasa el trabajo a <b>' + FASES[i+1].n
        + '</b> aquí abajo.' : ' Es la última fase.') + '</small></div>',
    'Cada fase abre lo suyo en las demás pantallas. Si cambias de trabajo arriba, '
    + 'todo lo que veas en Visita, Diseño y Dinero pasa a ser <b>de ese trabajo</b>.');
}

function pintarTrabajos(){
  const ETIQ = { agendar:'Por visitar', visita:'Visita', cotizado:'Cotizado',
    aceptado:'Aceptado', montado:'Montado' };
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
        [['agendar','Visita por hacer'],['visita','Visita hecha'],['cotizado','Cotizado'],
         ['aceptado','Aceptado'],['montado','Montado']]))
    + '<button type="button" class="btn" id="btnEnviar" style="margin-top:14px">Enviar al instalador</button>'
    + (S.trabajos.length > 1
        ? '<button type="button" class="btn peligro" id="btnBorrar" style="margin-top:9px">Borrar este trabajo</button>'
        : ''),
    'El enlace lleva el diseño, las protecciones, los materiales y <b>lo que se cobra por el montaje</b>. '
    + '<b>No lleva ni tus costes, ni tu margen, ni el reparto.</b> Se lo mandas por WhatsApp y al abrirlo '
    + 'se le guarda en su teléfono, listo para usar sin internet.');

  if ((t.tipo || 'montaje') !== 'venta') h += tiraFases(t);

  $('p-trabajos').innerHTML = h;
}

/* ═══════════════ PANTALLA · VISITA ═══════════════ */
function pintarVisita(){
  const t = activo(), v = t.visita;
  const porVisitar = t.estado === 'agendar';

  /* La cita solo se ensena mientras la visita esta POR HACER. En cuanto esta
     hecha no pinta nada pedir dia y hora otra vez: se queda una linea con lo
     que paso y ya. Es lo que pidio Marcos, y tiene razon: una pantalla llena
     de campos que ya no se van a tocar solo estorba para encontrar lo que si. */
  let h = '';
  if (!porVisitar){
    const cuando = (v.cita || '').trim();
    const fecha = cuando ? new Date(cuando) : null;
    const dicho = fecha && !isNaN(fecha)
      ? fecha.getDate() + ' de ' + MESES[fecha.getMonth()]
        + ', ' + String(fecha.getHours()).padStart(2,'0') + ':'
        + String(fecha.getMinutes()).padStart(2,'0')
      : 'sin fecha apuntada';
    h += caja('La visita ya está hecha',
      fila('Cuándo se fue', dicho, (v.quienVa || '').trim() ? 'Fue ' + esc(v.quienVa) : '', 'ok')
      + ((v.direccion || '').trim()
          ? fila('Dónde', '—', esc(v.direccion).split(String.fromCharCode(10)).join(' · ')) : '')
      + '<button type="button" class="btn ghost" id="btnVolverAgendar" style="margin-top:12px">'
      + 'Cambiar la fecha o volver a agendar</button>',
      'Lo de abajo es lo que se levantó en la casa. Si hay que volver a visitar, '
      + 'pulsa el botón y el trabajo vuelve a <b>Por visitar</b>.');
  }
  if (porVisitar) h += caja('Agendar la visita',
    (porVisitar && !(v.cita || '').trim()
      ? '<div class="titular rojo"><b>Esta visita no tiene fecha</b><small>'
        + 'Sin fecha y sin dirección el técnico no sabe a qué casa ir. '
        + 'Ponlas antes de mandarle el trabajo.</small></div>' : '')
    + campo('v_cita','Día y hora','',
        '<input type="datetime-local" id="v_cita" value="' + esc(v.cita) + '">')
    + campo('v_quienVa','Quién va','',txtInp('v_quienVa', v.quienVa, 'Nombre del técnico'))
    + campo('v_direccion','Dirección exacta','Calle, número, entre qué calles',
        '<textarea id="v_direccion" placeholder="Calle Maceo 214, entre Martí y Céspedes, El Cobre">' + esc(v.direccion) + '</textarea>', true)
    + campo('v_comoLlegar','Cómo llegar','Referencias, a quién preguntar, si hay perro',
        '<textarea id="v_comoLlegar" placeholder="Casa de dos plantas frente a la bodega. Preguntar por Yuneisy.">' + esc(v.comoLlegar) + '</textarea>', true),
    porVisitar
      ? 'Cuando el técnico haya ido, cambia el estado del trabajo a <b>Visita hecha</b> en la '
        + 'pantalla de Trabajos. Hasta entonces sale en la lista como <b>Por visitar</b>.'
      : 'La visita ya está hecha. Estos datos se quedan aquí por si hay que volver.');

  h += caja('Lo que hay que mirar en la casa',
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

  h += caja('Estado de la instalación de la casa',
    campo('v_equiposCasa','Qué encontraste','Un ventilador sin aceite o un motor que arranca mal puede quemar el inversor, y eso no lo cubre la garantía',
      '<textarea id="v_equiposCasa" placeholder="Motor de la bomba hace ruido, ventilador de techo sin aceite...">' + esc(v.equiposCasa) + '</textarea>', true)
    + campo('v_extra','Trabajo eléctrico previo a cotizar aparte','Balanceo de carga, cambio de cables, tablero nuevo',
      '<textarea id="v_extra" placeholder="Hay que balancear la carga entre las dos fases...">' + esc(v.extra) + '</textarea>', true),
    '<b>Todo lo que no cumpla se le dice al cliente y queda por escrito.</b> Si decide montar igual, queda bajo su propio riesgo, y si después una avería la provoca un aparato de la casa, responde él.');

  /* El orden importa: primero se cuenta lo que hay, luego sale el kit, y
     solo al final los riesgos, porque muchos de ellos salen de lo contado. */
  h += bloqueAparatos(t);
  h += bloqueKit(t);
  h += bloqueRiesgos(t);

  h += caja('Lo que pide la casa y lo que puede pagar',
    campo('v_pide','Lo que la casa necesita de verdad','',txtInp('v_pide', v.pide, '6 kW y 10 kWh'), true)
    + campo('v_puede','Lo que el cliente puede pagar ahora','',txtInp('v_puede', v.puede, '5 kW y 5 kWh'), true)
    + campo('v_notas','Notas','',
      '<textarea id="v_notas" placeholder="Lo que haga falta recordar">' + esc(v.notas) + '</textarea>', true),
    'Si no son la misma cifra, eso es una venta de ampliación dentro de un año. Déjalo apuntado.');

  $('p-visita').innerHTML = h;
}

/* ═══════════════ PRUEBA DE BANCO ═══════════════
   La recorre el instalador con el sistema montado y antes de irse. Cada
   punto trae el número que se espera, sacado del cálculo de este sistema,
   para que compare en vez de adivinar. Hasta que no esté entera y firmada,
   el trabajo no se puede marcar como montado. */
function bloqueBanco(t, d, c){
  const b = M.pruebaBanco(d, c);
  const hecho = t.banco || {};
  const n = Object.keys(hecho).filter(k => hecho[k] === true).length;
  const completo = n >= b.total;
  const firmado = !!(t.bancoFirma || '').trim();

  let cuerpo = '<div class="titular ' + (completo && firmado ? '' : 'info') + '"><b>'
    + (completo && firmado ? 'Sistema probado y firmado'
       : completo ? 'Falta firmar' : n + ' de ' + b.total + ' comprobados')
    + '</b><small>'
    + (completo && firmado
        ? 'Los ' + b.total + ' puntos comprobados y firmado por <b>' + esc(t.bancoFirma)
          + '</b>. Ya se puede marcar el trabajo como montado.'
        : 'Desde que el sistema está montado, <b>la avería la pagamos nosotros</b>, no el proveedor. '
          + 'Casi todo lo que se rompe el primer mes se habría visto en esta lista: un borne flojo, '
          + 'un límite de carga sin poner, una cadena con la polaridad cambiada, un neutro que nadie midió.')
    + '</small></div>';

  b.grupos.forEach(g => {
    cuerpo += '<div class="sep">' + g.g + '</div>';
    g.items.forEach(it => {
      const si = hecho[it.k] === true;
      cuerpo += '<label class="chk' + (si ? ' si' : '') + '" for="bc_' + it.k + '">'
        + '<input type="checkbox" id="bc_' + it.k + '"' + (si ? ' checked' : '') + '>'
        + '<span class="d"><span class="n">' + esc(it.n) + '</span>'
        + '<span class="esp">Se espera: ' + esc(it.esp) + '</span>'
        + '<span class="q">' + it.q + '</span></span></label>';
    });
  });

  cuerpo += '<div class="sep">Firma</div>'
    + campo('t_bancoFirma','Quién hizo la prueba',
        'El nombre de quien la recorrió punto por punto',
        txtInp('t_bancoFirma', t.bancoFirma || '', 'Nombre del instalador'), true)
    + campo('t_bancoFecha','Cuándo','',
        '<input type="date" id="t_bancoFecha" value="' + esc(t.bancoFecha || '') + '">');

  return caja('Prueba de banco <span class="cont' + (completo ? ' ok' : '') + '">'
      + n + '/' + b.total + '</span>', cuerpo,
    'Se recorre <b>con el sistema montado y antes de irte de la casa</b>. Cada punto trae el '
    + 'número que tiene que dar, sacado del cálculo de este sistema en concreto. '
    + 'Si uno no cuadra, se arregla ahí mismo: volver cuesta un viaje a El Cobre.');
}

/* ═══════════════ CONFIRMAR LOS DATOS DE UN EQUIPO ═══════════════
   Para cuando Marcos tiene el aparato delante. Lo que meta aquí sustituye al
   catálogo para siempre y en todos los trabajos, porque es un hecho del
   equipo, no de la casa. Los campos vienen rellenos con lo que dice la base,
   para que se vea qué hay que comprobar y no haya que teclearlo todo. */
const idc = (clave, campo) => 'eqc~' + clave + '~' + campo;

/* Cuando cambian los datos de un equipo, hay que volcarlos al trabajo abierto:
   si no, la pantalla ensena el dato corregido pero el calculo sigue usando el
   viejo, que es la peor de las dos situaciones posibles. */
function volcarEquipos(t){
  if (!t) return;
  const I = equipo(MODELOS, t.sistema.modeloInv);
  if (I && !I.manual){
    t.sistema.pinv = I.kw; t.sistema.vac = I.vac; t.sistema.vmax = I.vmax;
    t.sistema.vmppt = I.vmin; t.sistema.vmpmax = I.vmpmax;
    t.sistema.nmppt = I.nmppt; t.sistema.impp = I.impp;
    if (I.icar) t.sistema.icar = I.icar;
  }
  const B = equipo(BATS, t.sistema.modeloBat);
  if (B && !B.manual){
    t.sistema.vbat = B.v; t.sistema.ah = B.ah; t.sistema.abms = B.ides;
  }
  guardar();
}

function bloqueConfirmar(clave, eq, campos, qué){
  if (!clave || !eq || eq.manual) return '';
  const guard = (S.equipos && S.equipos[clave]) || {};
  const tocados = Object.keys(guard).length;
  const abierto = !eq.ok || tocados > 0 || S.abrirConf === clave;

  const filas = campos.map(c => {
    const puesto = guard[c.k] !== undefined;
    const valor = puesto ? guard[c.k] : (eq[c.k] !== undefined && eq[c.k] !== 0 ? eq[c.k] : '');
    return '<div class="conf' + (puesto ? ' puesto' : '') + '">'
      + '<label for="' + idc(clave, c.k) + '">' + esc(c.n)
      + '<span class="et">En la etiqueta: ' + esc(c.et) + '</span>'
      + '<small>' + c.ay + '</small></label>'
      + '<div class="uni"><input type="number" id="' + idc(clave, c.k) + '" value="' + valor + '"'
      + ' min="' + c.min + '" max="' + c.max + '" step="' + c.paso + '"'
      + ' inputmode="decimal" placeholder="—"><span>' + c.u + '</span></div></div>';
  }).join('');

  return caja('Confirmar los datos ' + qué
      + (tocados ? ' <span class="cont ok">' + tocados + '</span>' : ''),
    '<div class="titular ' + (eq.confirmado ? '' : (eq.ok ? 'info' : 'rojo')) + '"><b>'
    + (eq.confirmado ? 'Confirmado por ti'
       : eq.ok ? 'Datos de ficha verificada' : 'Datos sin confirmar')
    + '</b><small>'
    + (eq.confirmado
        ? 'Has corregido <b>' + tocados + (tocados === 1 ? ' dato</b> de este equipo con él delante. '
            : ' datos</b> de este equipo con él delante. ')
          + 'Lo que pusiste manda sobre el catálogo, en este trabajo y en todos los demás.'
       : eq.ok
        ? 'Estos números salen de una ficha que se leyó de verdad, no de memoria. Aun así, '
          + '<b>si tienes el equipo delante, comprueba la etiqueta</b>: un mismo modelo puede '
          + 'tener dos generaciones con números distintos.'
        : '<b>Estos números salen de un catálogo que puede no ser el de tu equipo.</b> '
          + 'Ya pasó con el MUST de 6 kW: el catálogo decía 145 V de entrada de paneles y la '
          + 'etiqueta del equipo real decía 245 V. Con paneles de 46 V, eso es la diferencia '
          + 'entre poner dos en serie o poner cuatro.')
    + '</small></div>'
    + (abierto ? filas
       : '<button type="button" class="btn ghost" data-abrirconf="' + clave + '">Corregir estos datos a mano</button>')
    + (tocados
        ? '<button type="button" class="btn peligro" data-olvidarconf="' + clave + '" style="margin-top:12px">'
          + 'Olvidar mis correcciones y volver al catálogo</button>' : ''),
    abierto
      ? 'Lee la etiqueta del equipo, no el anuncio de la tienda ni la caja. Lo que dejes en blanco '
        + 'sigue saliendo del catálogo. <b>Esto se guarda para siempre y vale para todos los '
        + 'trabajos</b>, así que hazlo una vez y bien.'
      : 'Si alguna vez tienes este equipo delante y la etiqueta dice otra cosa, cámbialo aquí.');
}

/* ═══════════════ PROBLEMAS DE ALTO RIESGO ═══════════════
   Esta caja se llena sola con lo que el técnico anotó. Lo rojo no se monta
   hasta resolverlo, o el cliente firma que lo asume y que la garantía no
   lo cubre. Esa firma es lo que separa una avería cubierta de una pelea. */
function bloqueRiesgos(t){
  const v = t.visita;
  const R = M.riesgos(v, v.aparatos, APARATOS);
  const orden = { alto:0, medio:1, info:2 };
  R.sort((x, y) => orden[x.nivel] - orden[y.nivel]);
  const altos = R.filter(r => r.nivel === 'alto');
  const cl = M.clausulaRiesgo(R);

  if (!R.length)
    return caja('Problemas de alto riesgo',
      '<div class="titular"><b>Nada pendiente</b><small>'
      + 'Con lo que has anotado no queda ningún punto que impida montar. '
      + 'Esta caja se llena sola en cuanto marques el neutro, la orientación, las sombras '
      + 'o un aparato en mal estado.</small></div>');

  let h = caja('Problemas de alto riesgo',
    '<div class="titular ' + (altos.length ? 'rojo' : 'info') + '"><b>'
    + (altos.length
        ? altos.length + (altos.length === 1 ? ' punto que hay que resolver' : ' puntos que hay que resolver')
        : 'Nada que impida montar')
    + '</b><small>'
    + (altos.length
        ? 'Lo de abajo en rojo <b>no se monta hasta resolverlo</b>. Si el cliente decide montar '
          + 'igual, firma la cláusula del final y esos puntos quedan fuera de garantía.'
        : 'Hay avisos, pero ninguno impide montar. Léelos igual: son lo que explica el precio.')
    + '</small></div>'
    + R.map(r => '<div class="riesgo ' + r.nivel + '">'
        + '<div class="q"><span class="niv">'
        + (r.nivel === 'alto' ? 'No montar así' : r.nivel === 'medio' ? 'Avisar' : 'Producción')
        + '</span>' + esc(r.qué) + '</div>'
        + '<div class="tp">' + r.txt + '</div>'
        + '<div class="sol"><span class="et">Qué se hace</span>' + r.arregla + '</div></div>').join(''),
    'Esto no sale de una lista genérica: sale de lo que marcaste en el neutro, la orientación, '
    + 'las sombras, los aparatos que contaste y lo que escribiste a mano.');

  if (cl)
    h += caja('Lo que firma el cliente',
      '<div class="clausula">' + cl.texto + '</div>'
      + fila('Puntos que asume el cliente', cl.n + (cl.n === 1 ? ' punto' : ' puntos'),
          cl.puntos.join(' · '), 'bad'),
      '<b>Esto se imprime, se firma y se guarda antes de subir al techo.</b> Tu proveedor solo '
      + 'responde si un equipo llega malo de fábrica; desde que está montado, la avería la pagas '
      + 'tú. Sin esta firma, una avería causada por el neutro de la casa te la vas a comer entera.');

  return h;
}

/* ═══════════════ CONTAR LOS APARATOS DE LA CASA ═══════════════
   El técnico cuenta lo que ve y de ahí sale el kit. Los vatios que salen
   al lado de cada nombre son el valor estándar del aparato, no medido en
   esta casa: si el técnico mide con pinza, su número manda. */
function bloqueAparatos(t){
  const sel = t.visita.aparatos || {};
  const grupos = {};
  Object.entries(APARATOS).forEach(([k, a]) => { (grupos[a.g] = grupos[a.g] || []).push([k, a]); });
  const total = Object.values(sel).reduce((s, n) => s + (+n || 0), 0);

  let cuerpo = '';
  Object.entries(grupos).forEach(([g, lista]) => {
    const cuenta = lista.reduce((s, [k]) => s + (+sel[k] || 0), 0);
    cuerpo += '<details class="grupo"' + (cuenta ? ' open' : '') + '><summary>' + g
      + '<span class="' + (cuenta ? 'si' : '') + '">'
      + (cuenta ? cuenta : 'ninguno') + '</span></summary><div class="aps">';
    lista.forEach(([k, a]) => {
      const n = +sel[k] || 0;
      cuerpo += '<div class="ap' + (n ? ' hay' : '') + '">'
        + '<label for="ap_' + k + '">' + esc(a.n) + '<small>' + a.w + ' W'
        + (a.arr > 1 ? ' · arranca a ' + Math.round(a.w * a.arr) + ' W' : '')
        + ' · ' + String(a.h).replace('.', ',') + ' h al día'
        + (a.es ? ' · <b>imprescindible</b>' : '') + '</small></label>'
        + '<input type="number" id="ap_' + k + '" value="' + (n || '') + '"'
        + ' min="0" max="60" step="1" inputmode="numeric" placeholder="0"></div>';
    });
    cuerpo += '</div></details>';
  });

  return caja('Los aparatos que hay en la casa'
    + (total ? ' <span class="cont">' + total + '</span>' : ''), cuerpo,
    'Los vatios de al lado son <b>el valor estándar del aparato</b>, no medido en esta casa. '
    + 'Si mides con la pinza amperimétrica y te da otro número, el tuyo manda: apúntalo en las notas. '
    + 'Cuenta también lo que el cliente piensa comprar este año, no solo lo que ya tiene.');
}

/* ═══════════════ EL KIT QUE PIDE LA CASA ═══════════════
   Sale de lo contado arriba. Dos cifras a propósito: la casa completa y
   solo lo imprescindible, porque en Cuba casi nadie compra el completo de
   entrada y perder la venta por precio es peor que vender el chico. */
function bloqueKit(t){
  const k = M.kitDeAparatos(t.visita.aparatos, APARATOS, num(t.sistema.wpan));
  if (!k.hayAlgo)
    return caja('Qué kit pide esta casa',
      '<div class="titular info"><b>Cuenta los aparatos primero</b><small>'
      + 'En cuanto pongas cuántos hay de cada cosa, aquí sale el inversor, la batería y '
      + 'los paneles que hacen falta, con la cuenta de cómo salieron.</small></div>');

  const T = k.todo, E = k.esencial;
  const n0 = v => Math.round(v).toLocaleString('es-ES');
  const d1 = v => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');

  /* Las dos ofertas, una debajo de otra y con el mismo formato, para que se
     comparen de un vistazo delante del cliente. */
  const opcion = (et, x, sub, clase) =>
    '<div class="op ' + (clase || '') + '"><span class="et">' + et + '</span>'
    + '<b>' + x.kwInv + ' kW · ' + String(x.kWhBat).replace('.', ',') + ' kWh</b>'
    + '<span class="sub">' + x.npan + ' panel' + (x.npan === 1 ? '' : 'es')
    + ' de ' + x.wpan + ' W · ' + d1(x.kWp) + ' kWp en el techo<br>' + sub + '</span></div>';

  let h = caja('Qué kit pide esta casa',
    '<div class="opciones">'
    + opcion('La casa completa', T.k, 'Todo lo que contaste, funcionando a la vez.', 'principal')
    + (E ? opcion('Solo lo imprescindible', E.k,
        'Nevera, luces, ventiladores, tele, router, cargadores, olla, lavadora de dos tinas y '
        + 'bomba de agua. Es lo que de verdad compra la mayoría de los clientes.') : '')
    + '</div>'
    + '<button type="button" class="btn" id="btnUsarKit" style="margin-top:14px">'
    + 'Pasar ' + T.k.kwInv + ' kW y ' + T.k.npan + ' paneles a Diseño</button>',
    'Al pulsar el botón se rellenan la potencia del inversor y el número de paneles en Diseño, '
    + 'y se apunta la batería objetivo. <b>El inversor y la batería concretos los eliges tú</b>: '
    + 'la aplicación no elige marca por su cuenta.');

  h += caja('De dónde salen esas cifras',
    fila('Gasta al día', d1(T.c.kWhDia) + ' kWh',
      'Suma de vatios por horas de cada aparato. Esto es lo que dimensiona los paneles.')
    + fila('De eso, sin sol', d1(T.c.kWhNoche) + ' kWh',
      'Solo las horas de noche. Dividido entre 0,90 (a una batería de litio no se le saca el '
      + 'último 10 %) y entre 0,95 (lo que pierde el inversor), pide ' + d1(T.k.batNec) + ' kWh.')
    + fila('Siempre encendido', n0(T.c.contin) + ' W',
      'Nevera, luces, ventiladores, tele, router: lo que no se apaga.')
    + fila('Pico', n0(T.c.picoW) + ' W',
      'Lo de arriba más los dos aparatos puntuales más grandes'
      + (T.c.dosMayores.length ? ' (' + T.c.dosMayores.map(x => esc(x.n)).join(' y ') + ')' : '')
      + '. No se suma todo porque nadie plancha mientras usa el microondas. '
      + 'Con 25 % de margen pide ' + d1(T.k.invNec) + ' kW.')
    + fila('Arranque', n0(T.c.arranqueW) + ' W',
      'El pico más el tirón de ' + esc(T.c.quienTira || 'el peor motor')
      + ' al encender. Dura un segundo y es la causa número uno de que un inversor se trabe.',
      T.c.arranqueW > T.k.kwInv * 2000 ? 'bad' : 'ok')
    + fila('Paneles', T.k.npan + ' de ' + T.k.wpan + ' W',
      d1(T.c.kWhDia) + ' kWh entre ' + M.SOL_HORAS + ' horas de sol pleno en Santiago de Cuba y '
      + Math.round(M.SOL_PERDIDAS * 100) + ' % de rendimiento: pide ' + d1(T.k.kWpNec) + ' kWp.'));

  if (k.avisos.length){
    const orden = { alto:0, medio:1, info:2 };
    const av = k.avisos.slice().sort((x, y) => orden[x.nivel] - orden[y.nivel]);
    h += caja('Lo que hay que decirle al cliente',
      av.map(a => '<div class="av ' + a.nivel + '"><span class="q">' + esc(a.qué) + '</span>'
        + '<span class="tp">' + a.txt + '</span></div>').join(''),
      'Lo de arriba en rojo se resuelve antes de montar o queda por escrito que el cliente '
      + 'decidió montar igual. Lo demás es argumento de venta: son las cosas que el cliente '
      + 'no sabe y que explican el precio.');
  }

  if (k.detalle.length){
    const top = k.detalle.slice(0, 8);
    h += caja('Qué se lleva la corriente',
      top.map(x => fila((x.cant > 1 ? x.cant + ' × ' : '') + esc(x.n),
        d1(x.kWhDia) + ' kWh',
        Math.round(x.kWhDia / T.c.kWhDia * 100) + ' % del gasto del día · ' + n0(x.w) + ' W',
        x.kWhDia / T.c.kWhDia > 0.3 ? 'warn' : '')).join(''),
      k.detalle.length > 8 ? 'Los ' + (k.detalle.length - 8) + ' aparatos que faltan gastan menos '
        + 'que estos.' : 'Ordenado por lo que gasta cada uno al día. El de arriba es por donde '
        + 'hay que empezar si hay que recortar.');
  }
  return h;
}

/* ═══════════════ PANTALLA · DISEÑO ═══════════════ */
function pintarDiseno(){
  const t = activo(), s = t.sistema, e = sistemaDe(t);
  const d = M.dimensionar(e);
  const inv = equipo(MODELOS, s.modeloInv) || MODELOS.manual;
  const bat = equipo(BATS, s.modeloBat) || BATS.manual;

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
  const selMarcas = (id, valor, tabla, vacio) => {
    const g = grupos(tabla);
    let o = '<option value=""' + (valor ? '' : ' selected') + '>' + vacio + '</option>';
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
      selMarcas('s_modeloInv', s.modeloInv, MODELOS, '— elige el inversor —'), true)
    + (inv.ficha ? '<div class="fila"><span class="tx">Ficha del fabricante</span>'
        + '<a class="vl" href="'+inv.ficha+'" target="_blank" rel="noopener">Abrir</a></div>' : '')
    + nota(inv.nota)
    + campo('s_modeloBat','<b>Batería</b>','',selMarcas('s_modeloBat', s.modeloBat, BATS, '— elige la batería —'), true)
    + (bat.ficha ? '<div class="fila"><span class="tx">Ficha de la batería</span>'
        + '<a class="vl" href="'+bat.ficha+'" target="_blank" rel="noopener">Abrir</a></div>' : '')
    + nota(bat.nota));

  h += bloqueConfirmar(s.modeloInv, inv, CAMPOS_INV, 'del inversor');
  h += bloqueConfirmar(s.modeloBat, bat, CAMPOS_BAT, 'de la batería');

  /* Sin inversor y sin batería no hay nada que calcular. Antes salía todo el
     resto de la pantalla con números sacados de valores por defecto, que es
     peor que no enseñar nada: parecen cálculos de verdad y no lo son. */
  if (!s.modeloInv || !s.modeloBat){
    const falta = !s.modeloInv && !s.modeloBat ? 'el inversor y la batería'
      : (!s.modeloInv ? 'el inversor' : 'la batería');
    h += caja('Lo que falta para poder calcular',
      '<div class="titular info"><b>Elige ' + falta + '</b><small>'
      + 'Hasta que no estén elegidos los dos, aquí abajo no sale nada, y es a propósito: '
      + 'los números del sistema, los paneles en serie, las protecciones y los materiales '
      + '<b>dependen del equipo concreto</b>. Enseñarlos con valores por defecto sería peor '
      + 'que no enseñarlos, porque parecen cálculos de verdad y no lo son.</small></div>'
      + '<div class="pasos">'
      + '<div class="paso' + (s.modeloInv ? ' listo' : '') + '"><span class="pt '
      + (s.modeloInv ? 'ok' : 'warn') + '"></span>Inversor'
      + (s.modeloInv ? '<b>' + esc(inv.n.split(' · ')[0]) + '</b>' : '<b>sin elegir</b>') + '</div>'
      + '<div class="paso' + (s.modeloBat ? ' listo' : '') + '"><span class="pt '
      + (s.modeloBat ? 'ok' : 'warn') + '"></span>Batería'
      + (s.modeloBat ? '<b>' + esc(bat.n.split(' · ')[0]) + '</b>' : '<b>sin elegir</b>') + '</div>'
      + '</div>',
      'Si aún no sabes qué equipo va a llevar la casa, cuenta los aparatos en la pantalla de '
      + '<b>Visita</b>: de ahí sale la potencia y los kWh que hacen falta, y con eso ya sabes '
      + 'qué buscar.');
    $('p-diseno').innerHTML = h;
    return;
  }

  h += caja('Números del sistema',
    campo('s_pinv','Potencia del inversor','En kW', numInp('s_pinv', s.pinv, 1, 30, 0.1, 'kW'))
    + campo('s_vac','Salida del inversor','', sel('s_vac', s.vac,
        [[110,'110 V'],[120,'120 V'],[220,'220 V'],[230,'230 V'],[240,'240 V bifásico']]))
    + campo('s_vbat','Voltaje de la batería','Las de litio de «48 V» son 51,2 V reales', numInp('s_vbat', s.vbat, 10, 60, 0.1, 'V'))
    + campo('s_ah','Capacidad','En amperios-hora', numInp('s_ah', s.ah, 10, 2000, 10, 'Ah'))
    + campo('s_abms','Corriente del BMS','De la etiqueta. Si no la tienes, pon los mismos Ah', numInp('s_abms', s.abms, 10, 1000, 10, 'A'))
    + campo('s_nbat','Baterías en paralelo','', numInp('s_nbat', s.nbat, 1, 12, 1, 'uds'))
    + campo('s_icar','Carga máxima del inversor','Amperios que le mete a la batería', numInp('s_icar', s.icar, 5, 300, 5, 'A'))
    + campo('s_kwh','Energía de la batería','', '<div class="calc">' + d.kWh.toFixed(2).replace('.',',')
        + ' kWh</div>')
    + campo('s_npan','Número de paneles','', numInp('s_npan', s.npan, 1, 40, 1, 'uds'))
    + campo('s_wpan','Vatios de cada panel','', numInp('s_wpan', s.wpan, 100, 800, 10, 'W'))
    + campo('s_kwp','Campo solar','', '<div class="calc">' + d.kWp.toFixed(2).replace('.',',') + ' kWp</div>'));

  h += caja('Ficha del panel y límites del inversor',
    campo('s_voc','Voc del panel','Tensión en circuito abierto, detrás del panel', numInp('s_voc', s.voc, 10, 90, 0.1, 'V'))
    + campo('s_isc','Isc del panel','Corriente de cortocircuito', numInp('s_isc', s.isc, 1, 30, 0.1, 'A'))
    + campo('s_vmax','Tensión máxima FV','La que NO se puede pasar nunca', numInp('s_vmax', s.vmax, 60, 1500, 10, 'V'))
    + campo('s_vmppt','Mínimo del MPPT','Por debajo no arranca', numInp('s_vmppt', s.vmppt, 20, 400, 5, 'V'))
    + campo('s_vmpmax','Máximo del MPPT','', numInp('s_vmpmax', s.vmpmax, 60, 1000, 10, 'V'))
    + campo('s_nmppt','Cuántos MPPT','', numInp('s_nmppt', s.nmppt, 1, 4, 1, 'uds'))
    + campo('s_impp','Corriente máxima por MPPT','', numInp('s_impp', s.impp, 5, 60, 1, 'A')));

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
  /* Cada fila dice también QUÉ CUESTA arreglarla, que es lo que de verdad
     cambia la conversación: un ajuste del menú es gratis; cambiar un equipo
     es dinero y hay que decidirlo antes de dar un precio. */
  const porArreglar = c.filas.filter(f => f.arreglo && f.arreglo !== 'nada');
  const peor = porArreglar.length
    ? porArreglar.reduce((a, b) => M.ARREGLOS[a.arreglo].ord <= M.ARREGLOS[b.arreglo].ord ? a : b).arreglo
    : null;

  h += caja('¿Se llevan bien la batería y el inversor?',
    (peor
      ? '<div class="titular ' + (peor === 'equipo' ? 'rojo' : 'info') + '"><b>'
        + M.ARREGLOS[peor].et + '</b><small>' + M.ARREGLOS[peor].q + '</small></div>'
      : '<div class="titular"><b>Encajan</b><small>No hay nada que ajustar ni que cambiar: '
        + 'el inversor y la batería trabajan dentro de sus límites.</small></div>')
    + c.filas.map(f => fila('<span class="pt ' + f.estado + '"></span>' + f.tit
      + (f.arreglo && f.arreglo !== 'nada'
          ? '<span class="arreglo ' + f.arreglo + '">' + M.ARREGLOS[f.arreglo].et + '</span>' : ''),
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
  // solo lo que hay que comprar: lo que ya viene estorba en la lista de compra
  lista.filter(p => !p.viene).forEach(p => {
    if (p.grupo !== ult){ prot += '<div class="sep">' + p.grupo + '</div>'; ult = p.grupo; }
    prot += fila((p.comprobar ? '<span class="pt warn"></span>' : '') + p.pieza, p.valor,
      p.comprobar
        ? p.nota + ' · <b>Mira el equipo antes de comprarlo</b>: hay inversores que lo traen en el lateral'
        : p.nota,
      p.comprobar ? 'warn' : '');
  });
  if (yaVienen)
    prot += '<div class="yatrae"><b>Estas ya vienen en el inversor, no se compran:</b> '
      + lista.filter(p => p.viene).map(p => p.pieza).join(' · ') + '</div>';
  h += caja('Protecciones que hay que montar', prot,
    'Calculado al 125 % de la corriente de trabajo. Si un valor cae entre dos tamaños comerciales, se coge <b>el inmediatamente superior</b>.'
    + (porMirar ? ' · <b>Las marcadas en ámbar</b> son las que algunos inversores traen de fábrica y otros no: míralo en el equipo antes de comprarlas.' : ''));

  /* El corte de cortocircuito de la batería: qué es, dónde va y qué se pone. */
  h += caja('El corte de cortocircuito de la batería',
    '<div class="titular"><b>Qué es esta pieza</b>'
    + '<small>Va <b>a menos de medio metro del borne positivo de la batería</b>, antes que ninguna '
    + 'otra cosa. <b>No protege al inversor: protege el cable</b> que va de la batería al inversor. '
    + 'Si ese cable se pela y toca el chasis, una batería de litio de ' + co(d.Vbat) + ' V suelta '
    + 'miles de amperios en un instante y el cable se pone al rojo antes de que nadie llegue.</small></div>'
    + '<div class="titular info"><b>Por qué no vale cualquiera</b>'
    + '<small>En alterna la corriente pasa por cero cien veces por segundo y el arco se apaga solo en '
    + 'ese cruce. <b>En continua nunca pasa por cero</b>: el arco sigue ardiendo hasta que algo lo corta '
    + 'de verdad. Por eso el número que hay que exigir no son los amperios, sino el <b>poder de corte '
    + 'en corriente continua</b>: <b>≥ 10 kA a ' + Math.ceil(d.Vbat * 1.4 / 10) * 10 + ' V CC</b>. '
    + 'Si la ficha solo da el dato en alterna, <b>no vale</b>.</small></div>'
    + M.sustitutosFusible(d).map(s => fila(
        '<span class="pt ' + (s.bien ? 'ok' : (s.color === 'bad' ? 'bad' : 'warn')) + '"></span>'
        + s.n + (s.elegido ? ' <span class="elegido">El que se pone</span>' : '')
        + '<span class="donde">' + s.donde + '</span>',
        s.v, s.t, s.bien ? 'ok' : (s.color === 'bad' ? 'bad' : 'warn'))).join(''),
    'Lo de arriba no son cinco opciones para elegir: <b>la primera está decidida</b>. Las demás están '
    + 'para reconocerlas si aparecen delante y para saber cuáles hay que rechazar. '
    + 'Y sí, el BMS de la batería también corta por cortocircuito, y en un equipo bueno corta rápido: '
    + 'pero <b>esta pieza protege el tramo entre el borne y el BMS</b>, y protege también el día que el '
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
  h += caja('Lo que este inversor ya trae por dentro (informativo)',
    M.internas(inv).map(([t, n]) => fila('<span class="pt ok"></span>' + t, 'SÍ', n, 'ok')).join(''),
    '<b>Cuidado con esto:</b> la electrónica del inversor protege <b>al inversor</b>. '
    + 'No protege el cable, ni la casa, ni a las personas. Por eso siguen haciendo falta las de arriba, '
    + 'salvo las que aparezcan marcadas como «ya viene».');

  /* La prueba de banco sale cuando el trabajo ya está aceptado: antes no hay
     nada que probar, y después es lo último que se hace en la casa. */
  if (t.estado === 'aceptado' || t.estado === 'montado')
    h += bloqueBanco(t, d, c);

  /* --- materiales --- */
  const mo = M.montaje(e), cx = M.conexion(d, e);
  let mat = '';
  if (cx){
    mat += '<div class="sep">Conexión</div>'
      + fila('Cable solar rojo', cx.metrosCable + ' m',
          cx.cabFV + ' · baja del panel al inversor y vuelve' + cuenta(cx.cuentas.cable))
      + fila('Cable solar negro', cx.metrosCable + ' m', 'El mismo metraje que el rojo')
      + fila('Pares de conectores MC4', cx.paresMC4 + ' pares',
          'Los que unen panel con panel' + cuenta(cx.cuentas.mc4))
      + fila('Conectores Y de derivación',
          cx.conectorY === 'si' ? '1 par' : (cx.conectorY === 'prohibido' ? 'NO USAR' : 'No hacen falta'),
          cx.conectorY === 'si' ? 'Unen las 2 cadenas en una bajada'
          : cx.conectorY === 'prohibido' ? '<b>Con ' + cx.cadenas + ' cadenas hacen falta fusibles, y los conectores Y los saltan.</b> Únelas dentro de la caja CC'
          : 'Con una sola cadena va directo a la caja',
          cx.conectorY === 'prohibido' ? 'bad' : '')
      + fila('Prensaestopas', cx.prensa + ' uds.',
          'Para que la caja siga estanca por donde entra el cable' + cuenta(cx.cuentas.prensa))
      + fila('Tubo corrugado', cx.corrugado + ' m',
          'Protege el cable del sol y de los roedores' + cuenta(cx.cuentas.corrugado))
      + fila('Bridas resistentes a UV', cx.bridas + ' uds.',
          'Negras de exterior; las blancas se parten en un año' + cuenta(cx.cuentas.bridas));
  }
  mat += '<div class="sep">Sujeción</div>'
    + fila('Presillas intermedias', mo.presMedio + ' uds.',
        'Las de forma de <b>T</b>: cada una pisa dos paneles vecinos' + cuenta(mo.cuentas.presMedio))
    + fila('Presillas de extremo', mo.presExtremo + ' uds.',
        'Las de forma de <b>L</b>: cierran cada riel. <b>No son intercambiables</b>'
        + cuenta(mo.cuentas.presExtremo))
    + fila('Tornillos T y tuercas', mo.tornillos + ' juegos',
        'Uno por presilla' + cuenta(mo.presMedio + ' intermedias + ' + mo.presExtremo
          + ' de extremo = ' + mo.tornillos + ' juegos'))
    + fila('Perfil o ángulo de acero', mo.metrosPerfil + ' m',
        co(mo.metrosRiel) + ' m de rieles + ' + co(mo.metrosApoyo) + ' m de '
        + (inc.plano ? 'triángulos a ' + inc.grados + '°' : 'pies de anclaje')
        + cuenta(mo.cuentas.riel) + cuenta(mo.cuentas.perfil))
    + fila('Apoyos al techo', mo.apoyos + ' uds.',
        'Cada uno con 2 anclajes al techo' + cuenta(mo.cuentas.apoyos))
    + fila('Superficie que ocupa', co(mo.superficie) + ' m²',
        mo.porFila + ' por fila' + (mo.filas>1 ? ' × ' + mo.filas + ' filas' : '') + '. Mídelo antes de prometer nada', 'info');

  h += caja('Materiales que hay que llevar',
    campo('s_dist','Distancia del techo al inversor',
        '<b>Este es el único dato que no se calcula: lo mides tú con la cinta.</b> '
        + 'De él sale todo el metraje de cable y de corrugado, así que si está mal medido, '
        + 'está mal todo lo que hay debajo',
        numInp('s_dist', s.dist, 2, 80, 1, 'm'))
    + campo('s_filas','Número de filas','', numInp('s_filas', s.filas, 1, 8, 1, ''))
    + campo('s_techo','Tipo de techo','Cambia mucho el metraje de perfil', sel('s_techo', s.techo,
        [['plano','Plano (hay que hacer triángulos)'],['incl','Inclinado (rieles pegados)']]))
    + campo('s_orient','Cómo se montan','', sel('s_orient', s.orient, [['v','Vertical'],['h','Horizontal']]))
    + campo('s_plargo','Largo del panel','En metros', numInp('s_plargo', s.plargo, 0.8, 3, 0.01, 'm'))
    + campo('s_pancho','Ancho del panel','En metros', numInp('s_pancho', s.pancho, 0.5, 1.5, 0.01, 'm'))
    + mat,
    'Debajo de cada cantidad está <b>la cuenta de la que sale</b>, para poder comprobarla y '
    + 'corregirla. '
    + '<b>Los paneles ya vienen con su cable y su MC4 de fábrica:</b> para conectarlos en serie no hace falta nada, se enchufa uno con el siguiente. Las presillas aprietan solo donde el fabricante marca el marco, nunca sobre el cristal.');

  /* --- lo que se cobra por el montaje: lo ve también el instalador --- */
  const cobro = num(t.dinero.cobroMontaje);
  if (cobro > 0)
    h += caja('Lo que se cobra por este montaje',
      '<div class="titular"><b>' + din(cobro) + '</b>'
      + '<small>Es lo acordado con el cliente <b>solo por el montaje</b>. '
      + 'Si el cliente pregunta por otra cosa, que hable con la oficina.</small></div>');

  /* --- lo que todavía falta por llenar --- */
  {
    const pend = M.faltan(t);
    if (pend.length)
      h += caja('Te falta por llenar',
        pend.map(f => fila('<span class="pt warn"></span>' + f.qué, f.donde, f.porqué, 'warn')).join(''),
        'Mientras falte algo de esto, los números de abajo pueden estar mal. '
        + '<b>No compres nada hasta tenerlo completo.</b>');
  }

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
    $('p-ajustes').innerHTML =
      (S.soloCampo
        ? caja('Este teléfono es de campo',
            '<div class="titular info"><b>Solo trabajo de campo</b>'
            + '<small>Este teléfono recibió un trabajo por enlace, así que se quedó configurado para el '
            + 'techo: equipos, protecciones y materiales. <b>Los costes y el reparto no se ven desde aquí</b>, '
            + 'y no es un fallo.</small></div>')
        : '')
      + caja('Este teléfono',
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
  $('rolOficina').hidden = S.soloCampo;
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
  /* Van tambien los datos de equipo confirmados a mano, pero SOLO los de los
     dos equipos de este trabajo: el telefono del instalador no tiene por que
     recibir el catalogo entero corregido, y el enlace no puede crecer sin
     limite. Sin esto, el instalador calcularia con los numeros del catalogo
     mientras Marcos calcula con los de la etiqueta, y saldrian cosas distintas. */
  const eq = {};
  [t.sistema.modeloInv, t.sistema.modeloBat].forEach(k => {
    const c = S.equipos && S.equipos[k];
    if (k && c && Object.keys(c).length) eq[k] = c;
  });
  const p = { v:1, n:t.nombre, z:t.zona, s:t.sistema, vi:t.visita,
    mo: num(t.dinero.cobroMontaje) };
  if (Object.keys(eq).length) p.eq = eq;
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
  // quien recibe un trabajo por enlace es el instalador: ese teléfono
  // se queda en Campo para siempre, sin botón de Oficina
  S.soloCampo = true;
  S.rol = 'campo';
  const t = nuevoTrabajo(p.n, p.z);
  t.sistema = { ...SISTEMA, ...(p.s||{}) };
  t.visita  = { ...VISITA,  ...(p.vi||{}) };
  t.dinero  = { ...DINERO, cobroMontaje: p.mo || 0 };
  t.recibido = true;
  /* Los datos de equipo que Marcos confirmo con el aparato delante viajan con
     el trabajo, para que el instalador calcule con los mismos numeros. */
  if (p.eq){
    S.equipos = S.equipos || {};
    Object.entries(p.eq).forEach(([k, v]) => { S.equipos[k] = { ...(S.equipos[k]||{}), ...v }; });
  }
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
    marcarAbierto(true);
    S.rol = 'oficina';   // quien acaba de poner la clave entra directo
    cerrarClave(); pintar();
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
/* Antes de cambiar de pantalla se comprueba si falta algo de lo que la de
   ahora tenía que dejar resuelto. No bloquea: avisa y deja decidir. */
let avisado = {};
function irA(destino){
  const t = activo();
  const pend = M.faltan(t).filter(f =>
    (pantalla === 'visita' && f.donde === 'Visita') ||
    (pantalla === 'diseno' && (f.donde === 'Diseño' || f.donde === 'Materiales')));
  const clave = pantalla + '|' + pend.map(f => f.qué).join(',');
  if (pend.length && !avisado[clave]){
    avisado[clave] = true;
    $('faltaLista').innerHTML = pend.map(f =>
      '<div class="falta-i"><em>' + f.donde + '</em><b>' + f.qué + '</b><span>' + f.porqué + '</span></div>').join('');
    $('pantFalta').hidden = false;
    $('pantFalta').dataset.destino = destino;
    return;
  }
  pantalla = destino; pintar(); arriba();
}

document.querySelectorAll('.nav button').forEach(b =>
  b.addEventListener('click', () => irA(b.dataset.p)));

$('faltaVolver').addEventListener('click', () => { $('pantFalta').hidden = true; });
$('faltaSeguir').addEventListener('click', () => {
  const d = $('pantFalta').dataset.destino;
  $('pantFalta').hidden = true;
  pantalla = d; pintar(); arriba();
});
$('pantFalta').addEventListener('click', ev => {
  if (ev.target.id === 'pantFalta') $('pantFalta').hidden = true;
});

$('rolCampo').addEventListener('click', () => {
  S.rol = 'campo';
  if (hayClave()) marcarAbierto(false);   // salir de Oficina vuelve a echar el candado
  pintar();
});
$('rolOficina').addEventListener('click', () => {
  if (S.soloCampo){
    alert('Este teléfono está configurado solo para trabajo de campo.\n\n'
      + 'Los costes y el reparto no se ven desde aquí.');
    return;
  }
  if (!hayClave()) return pedirClave('poner');   // primera vez: hay que crearla
  if (!abierto) return pedirClave('entrar');
  S.rol = 'oficina'; pintar();
});
$('btnCambiar').addEventListener('click', () => { pantalla = 'trabajos'; pintar(); arriba(); });

/* un solo oyente para todo: los campos se llaman igual que el dato que guardan */
document.addEventListener('input', ev => {
  const id = ev.target.id; if (!id) return;
  const t = activo();
  const destino = { s:'sistema', m:'dinero', v:'visita', t:null, a:'ajustes' }[id[0]];
  const clave = id.slice(2);
  if (id.startsWith('s_') && t.sistema[clave] !== undefined){ t.sistema[clave] = ev.target.value; repinta(); }
  else if (id.startsWith('m_') && t.dinero[clave] !== undefined){ t.dinero[clave] = ev.target.value; repinta(); }
  else if (id.startsWith('v_') && t.visita[clave] !== undefined){
    /* Repinta, no solo guarda: el estado del neutro, las sombras y lo que se
       escribe a mano alimentan la caja de «problemas de alto riesgo», que si
       no se repinta se queda mostrando algo que ya no es verdad. */
    t.visita[clave] = ev.target.value; repinta();
  }
  else if (id.startsWith('bc_')){
    const k = id.slice(3);
    t.banco = t.banco || {};
    if (ev.target.checked) t.banco[k] = true; else delete t.banco[k];
    repinta();
  }
  else if (id.startsWith('eqc~')){
    /* Un dato de equipo leido de la etiqueta. Vacio = vuelve al catalogo. */
    const [, clave, campo] = id.split('~');
    if (!clave || !campo) return;
    S.equipos = S.equipos || {};
    const g = S.equipos[clave] = S.equipos[clave] || {};
    const v = ev.target.value.trim();
    if (v === '') delete g[campo]; else g[campo] = num(v);
    if (!Object.keys(g).length) delete S.equipos[clave];
    /* si el equipo esta elegido en este trabajo, sus numeros se vuelcan al sistema */
    volcarEquipos(activo());
    repinta();
  }
  else if (id.startsWith('ap_')){
    /* cuántos hay de un aparato. Un 0 o un campo vacío lo borra del conteo,
       para que no se quede un cero suelto ensuciando la cuenta. */
    const k = id.slice(3);
    if (!APARATOS[k]) return;
    t.visita.aparatos = t.visita.aparatos || {};
    const n = Math.max(0, Math.floor(num(ev.target.value)));
    if (n > 0) t.visita.aparatos[k] = n; else delete t.visita.aparatos[k];
    repinta();
  }
  else if (id.startsWith('a_') && S.ajustes[clave] !== undefined){ S.ajustes[clave] = ev.target.value; repinta(); }
  else if (id.startsWith('t_')){ t[clave] = ev.target.value;
    if (clave === 'bancoFirma' || clave === 'bancoFecha'){ guardar(); repinta(); return; } if (clave==='nombre') $('nmTrabajo').textContent = ev.target.value; guardar(); }
});

/* al elegir un modelo se rellenan sus datos */
document.addEventListener('change', ev => {
  const t = activo();
  if (ev.target.id === 's_modeloInv'){
    const I = equipo(MODELOS, ev.target.value);
    if (!ev.target.value){ t.sistema.modeloInv = ''; repinta(); return; }
    t.sistema.modeloInv = ev.target.value;
    if (I && !I.manual){
      t.sistema.pinv = I.kw; t.sistema.vac = I.vac; t.sistema.vmax = I.vmax;
      t.sistema.vmppt = I.vmin; t.sistema.vmpmax = I.vmpmax;
      t.sistema.nmppt = I.nmppt; t.sistema.impp = I.impp;
      if (I.icar) t.sistema.icar = I.icar;
    }
    repinta();
  } else if (ev.target.id === 's_modeloBat'){
    const B = equipo(BATS, ev.target.value);
    if (!ev.target.value){ t.sistema.modeloBat = ''; repinta(); return; }
    t.sistema.modeloBat = ev.target.value;
    if (B && !B.manual){ t.sistema.vbat = B.v; t.sistema.ah = B.ah; t.sistema.abms = B.ides; }
    repinta();
  } else if (ev.target.id === 't_estado'){
    /* No se marca un trabajo como montado sin la prueba de banco entera y
       firmada. Es lo unico que separa un montaje entregado de un montaje que
       se sabe que funciona, y la averia a partir de aqui la pagamos nosotros. */
    if (ev.target.value === 'montado' && t.estado !== 'montado'){
      const e2 = sistemaDe(t), d2 = M.dimensionar(e2);
      const b = M.pruebaBanco(d2, M.compatibilidad(d2,
        equipo(MODELOS, t.sistema.modeloInv) || MODELOS.manual,
        equipo(BATS, t.sistema.modeloBat) || BATS.manual));
      const n = Object.keys(t.banco || {}).filter(k => t.banco[k] === true).length;
      const falta = b.total - n;
      if (falta > 0 || !(t.bancoFirma || '').trim()){
        alert(falta > 0
          ? 'Todavía faltan ' + falta + ' puntos de la prueba de banco.\n\n'
            + 'Está en la pantalla de Diseño, abajo. Recórrela antes de dar el montaje por hecho.'
          : 'La prueba de banco está completa pero sin firmar.\n\n'
            + 'Pon quién la hizo, abajo en la pantalla de Diseño.');
        ev.target.value = t.estado; return;
      }
    }
    t.estado = ev.target.value; repinta();
  }
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
  if (ir){ S.activo = ir.dataset.ir; avisado = {}; pintar(); return; }
  if (ev.target.id === 'btnNuevo'){ nuevoTrabajo(); pintar(); arriba(); return; }
  if (ev.target.id === 'btnVolverAgendar'){
    const t = activo(); t.estado = 'agendar'; guardar(); pintar(); arriba(); return;
  }
  const abrirC = ev.target.closest('[data-abrirconf]');
  if (abrirC){ S.abrirConf = abrirC.dataset.abrirconf; guardar(); repinta(); return; }

  const olvC = ev.target.closest('[data-olvidarconf]');
  if (olvC){
    const cl = olvC.dataset.olvidarconf;
    if (!confirm('Se borran tus correcciones de este equipo y vuelven los datos del catálogo. '
      + 'Esto afecta a todos los trabajos, no solo a este.')) return;
    delete S.equipos[cl];
    if (S.abrirConf === cl) S.abrirConf = '';
    volcarEquipos(activo()); repinta(); return;
  }
  if (ev.target.id === 'btnUsarKit'){
    /* Pasa a Diseño SOLO la potencia del inversor y el número de paneles, más
       la batería objetivo apuntada. No elige marca ni modelo: Marcos pidió
       expresamente que la aplicación nunca sugiera un equipo por su cuenta. */
    const t = activo();
    const k = M.kitDeAparatos(t.visita.aparatos, APARATOS, num(t.sistema.wpan));
    if (!k.hayAlgo) return;
    t.sistema.pinv = k.todo.k.kwInv;
    t.sistema.npan = k.todo.k.npan;
    t.visita.objetivoKWh = k.todo.k.kWhBat;
    t.visita.pide = k.todo.k.kwInv + ' kW · '
      + String(k.todo.k.kWhBat).replace('.', ',') + ' kWh · ' + k.todo.k.npan + ' paneles';
    guardar();
    pantalla = 'diseno'; pintar(); arriba();
    return;
  }
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

/* Mientras se escribe, fuera la barra de abajo: el teclado la empuja hacia
   arriba y se monta encima de los botones, que es justo lo que le pasaba a
   Marcos al intentar borrar un trabajo. */
const escribible = el => el && /^(INPUT|TEXTAREA)$/.test(el.tagName)
  && !/^(button|checkbox|radio|submit)$/.test(el.type || '');
document.addEventListener('focusin', ev => {
  if (escribible(ev.target)) document.body.classList.add('escribiendo');
});
document.addEventListener('focusout', () => {
  setTimeout(() => {
    if (!escribible(document.activeElement)) document.body.classList.remove('escribiendo');
  }, 60);
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
