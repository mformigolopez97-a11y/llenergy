/* ═══════════════════════════════════════════════════════════════════════
   LLEnergy · MOTOR DE CÁLCULO
   Light of Life Energy

   Aquí no se toca la pantalla. Todas las funciones reciben un objeto con
   los datos del sistema y devuelven números y filas. Así el mismo motor
   sirve para la vista del instalador, la de oficina y la del cliente, y
   se puede probar sin abrir el navegador.
   ═══════════════════════════════════════════════════════════════════════ */

/* ---------- tamaños comerciales ---------- */
export const STD_BRK_DC = [40,63,80,100,125,160,200,250,315,400,500];
export const STD_FUSE_T = [100,125,150,175,200,225,250,300,350,400,500];
export const STD_BRK_AC = [10,16,20,25,32,40,50,63,80,100,125];
export const STD_DIF    = [25,40,63,80,100,125];
export const STD_FUS_FV = [10,15,20,25,30];

export const CABLES = [
  [2.5,20,'14 AWG'],[4,27,'12 AWG'],[6,35,'10 AWG'],[10,48,'8 AWG'],
  [16,65,'6 AWG'],[25,85,'4 AWG'],[35,105,'2 AWG'],[50,130,'1/0 AWG'],
  [70,165,'2/0 AWG'],[95,200,'3/0 AWG'],[120,235,'4/0 AWG'],[150,270,'300 kcmil'],
];

const sig = (v, lista) => lista.find(x => x >= v) || lista[lista.length - 1];
const cablePara = a => { const c = CABLES.find(x => x[1] >= a) || CABLES[CABLES.length-1];
  return c[0] + ' mm² (' + c[2] + ')'; };

/* Santiago de Cuba y El Cobre están a unos 20° de latitud norte.
   Esos dos factores corrigen la ficha del panel, que viene medida a 25 °C. */
export const K_FRIO  = 1.05;  // mínima de ~15 °C: la tensión sube
export const K_CALOR = 0.84;  // célula a ~65 °C en el techo: la tensión baja
export const LATITUD = 20;    // grados norte

/* ═══════════════ 1 · CÓMO SE CONECTAN LOS PANELES ═══════════════ */
export function configurar(e){
  const N = Math.max(1, e.npan|0);
  const Voc = e.voc, Isc = e.isc;
  const Vmax = e.vmax, Vmin = e.vmppt, Vmpmax = e.vmpmax;
  const nM = Math.max(1, e.nmppt|0), Im = e.impp;
  const Vmp = Voc * 0.83;

  const maxSerie = Math.max(1, Math.floor(Vmax / (Voc * K_FRIO)));
  const minSerie = Math.max(1, Math.ceil(Vmin / (Vmp * K_CALOR)));

  const ops = [];
  for (let s = 1; s <= N; s++){
    if (N % s !== 0) continue;
    const cadenas = N / s;
    const Vfrio = Voc * s * K_FRIO;
    const Vcalor = Vmp * s * K_CALOR;
    const porMppt = Math.ceil(cadenas / nM);
    const Impptreal = Isc * porMppt;
    const Vnom = Vmp * s;
    const okV = s <= maxSerie, okMppt = s >= minSerie;
    const okI = Impptreal <= Im, okVmp = Vnom <= Vmpmax;
    ops.push({ s, cadenas, Vfrio, Vcalor, Vnom, porMppt, Impptreal,
      Itot: Isc * cadenas, okV, okMppt, okI, okVmp,
      valido: okV && okMppt && okI && okVmp });
  }
  // se prefiere siempre más paneles en serie: menos corriente y cable más fino
  const validas = ops.filter(o => o.valido).sort((a,b) => b.s - a.s);

  // Si no cuadra ninguna, hay que decir POR QUÉ: con paneles distintos el
  // motivo cambia, y la solución también.
  const razones = [];
  if (!validas.length && ops.length){
    if (!ops.some(o => o.okV))
      razones.push('todas pasan de los <b>' + Vmax + ' V</b> que aguanta el inversor');
    if (!ops.some(o => o.okMppt))
      razones.push('ninguna llega a los <b>' + Vmin + ' V</b> que necesita el MPPT para arrancar');
    if (!ops.some(o => o.okI))
      razones.push('la corriente pasa de los <b>' + Im + ' A por MPPT</b>: hay demasiadas cadenas en paralelo');
    if (!ops.some(o => o.okVmp))
      razones.push('la tensión de trabajo pasa del máximo del MPPT (<b>' + Vmpmax + ' V</b>)');
    if (!razones.length)
      razones.push('no hay forma de repartir <b>' + N + '</b> paneles en grupos iguales que cuadren');
  }
  // cantidades de panel que sí funcionarían con este mismo inversor
  const sugerencias = [];
  for (let s = minSerie; s <= maxSerie; s++){
    for (let c = 1; c <= 4; c++){
      if (Isc * Math.ceil(c / nM) <= Im && Vmp * s <= Vmpmax) sugerencias.push(s * c);
    }
  }
  const prueba = [...new Set(sugerencias)].sort((a,b) => Math.abs(a-N) - Math.abs(b-N)).slice(0,4).sort((a,b)=>a-b);

  return { N, Voc, Isc, Vmp, Vmax, Vmin, nM, Im, maxSerie, minSerie,
    ops, validas, razones, prueba, best: validas[0] || null };
}

/* ═══════════════ 2 · DIMENSIONADO ELÉCTRICO ═══════════════ */
export function dimensionar(e){
  const P = e.pinv * 1000, Vac = e.vac, Vbat = e.vbat, Ah = e.ah;
  const nbat = Math.max(1, e.nbat|0);
  const AhTot = Ah * nbat;
  const kWh = Vbat * AhTot / 1000;
  const kWp = e.npan * e.wpan / 1000;
  const cfg = configurar(e);

  // lado de la batería
  const Ibat = P / (Vbat * 0.88);
  const IbatDim = Ibat * 1.25;
  const brkDC = sig(IbatDim, STD_BRK_DC);
  const fusT  = sig(IbatDim * 1.05, STD_FUSE_T);
  const cabBat = cablePara(IbatDim);

  // lado de alterna
  const Iac = P / Vac, IacDim = Iac * 1.25;
  const brkAC = sig(IacDim, STD_BRK_AC);
  const dif   = sig(brkAC, STD_DIF);
  const cabAC = cablePara(IacDim);

  // lado fotovoltaico
  const strings = cfg.best ? cfg.best.cadenas : Math.max(1, e.npan);
  const serie   = cfg.best ? cfg.best.s : 1;
  const Vstring = cfg.best ? cfg.best.Vfrio : e.voc * serie * K_FRIO;
  const Ifv = e.isc * strings * 1.25;
  const cabFV = Ifv <= 27 ? '4 mm² (12 AWG)' : '6 mm² (10 AWG)';
  const fusiblesStr = strings >= 3;
  const fusStrA = fusiblesStr ? sig(e.isc * 1.56, STD_FUS_FV) : 0;

  // límites del BMS: en paralelo se suman
  const IbmsUno = e.abms > 0 ? e.abms : Ah;
  const Ibms = IbmsUno * nbat;
  const Pbms = Vbat * Ibms * 0.95;

  return { P, Vac, Vbat, Ah, AhTot, nbat, kWh, kWp, npan: e.npan, Wpan: e.wpan,
    serie, strings, Ibat, IbatDim, brkDC, fusT, cabBat,
    Iac, IacDim, brkAC, dif, cabAC,
    Voc: cfg.Voc, Isc: cfg.Isc, Vstring, Ifv, cabFV, fusiblesStr, fusStrA,
    IbmsUno, Ibms, Pbms, Icar: e.icar, cfg };
}

/* ═══════════════ 3 · INCLINACIÓN Y ORIENTACIÓN EN CUBA ═══════════════ */
export function inclinacion(e){
  const plano = e.techo === 'plano';
  const filas = Math.max(1, e.filas|0);
  const vert = e.orient === 'v';
  const largo = vert ? e.plargo : e.pancho;   // lo que mide el panel en el sentido de la pendiente

  // En techo plano se elige 15°: a 20° (la latitud) se saca algo más de sol al año,
  // pero se agarra más viento y hace falta más acero. Nunca por debajo de 10°,
  // porque la lluvia deja de arrastrar el polvo.
  const grados = plano ? 15 : null;
  const rad = g => g * Math.PI / 180;

  const alto = plano ? largo * Math.sin(rad(grados)) : 0;
  const base = plano ? largo * Math.cos(rad(grados)) : largo;

  // Separación entre filas para que una no le dé sombra a la siguiente.
  // Se calcula con el sol más bajo del año al mediodía: a 20° de latitud,
  // en el solsticio de invierno el sol está a unos 46° sobre el horizonte.
  const solInvierno = 90 - LATITUD - 23.5;
  const separacion = (plano && filas > 1)
    ? Math.ceil(alto / Math.tan(rad(solInvierno)) * 100) / 100
    : 0;

  return { plano, grados, alto: Math.round(alto*100)/100, base: Math.round(base*100)/100,
    separacion, filas, solInvierno: Math.round(solInvierno) };
}

/* ═══════════════ 4 · SUJECIÓN Y ESTRUCTURA ═══════════════ */
export function montaje(e){
  const inc = inclinacion(e);
  const filas = Math.max(1, e.filas|0);
  const porFila = Math.ceil(e.npan / filas);
  const vert = e.orient === 'v';
  const anchoUtil = vert ? e.pancho : e.plargo;  // lo que ocupa cada panel a lo largo del riel
  const largoUtil = vert ? e.plargo : e.pancho;

  const presMedio  = 2 * Math.max(0, porFila - 1) * filas;
  const presExtremo = 4 * filas;
  const rielPorFila = porFila * anchoUtil + 0.2;
  const metrosRiel = 2 * filas * rielPorFila;
  const apoyos = (Math.ceil(rielPorFila / 1.7) + 1) * filas;

  // Cada triángulo lleva base + vertical + hipotenusa. Ahora sale del ángulo
  // de verdad, no de un factor a ojo.
  const rad = g => g * Math.PI / 180;
  const perimTriangulo = inc.plano
    ? largoUtil * (Math.cos(rad(inc.grados)) + Math.sin(rad(inc.grados)) + 1)
    : 0.2;
  const metrosApoyo = apoyos * perimTriangulo;
  const metrosPerfil = Math.ceil((metrosRiel + metrosApoyo) * 1.1);

  const fondo = inc.plano ? inc.base : largoUtil;
  const superficie = Math.round(porFila * anchoUtil * (fondo * filas + inc.separacion * (filas - 1)) * 10) / 10;

  const r1m = v => (Math.round(v*10)/10).toString().replace('.', ',');
  const cuentas = {
    presMedio: porFila <= 1
      ? 'Con un solo panel por fila no hay presillas intermedias'
      : '2 rieles × (' + porFila + ' paneles por fila − 1) × ' + filas + ' fila'
        + (filas === 1 ? '' : 's') + ' = ' + presMedio + '. Cada intermedia pisa dos paneles vecinos',
    presExtremo: '4 por fila (dos rieles × dos extremos) × ' + filas + ' fila'
      + (filas === 1 ? '' : 's') + ' = ' + presExtremo,
    riel: porFila + ' paneles × ' + String(Math.round(anchoUtil*100)/100).replace('.', ',') + ' m de '
      + (vert ? 'ancho' : 'largo') + ' + 0,2 m de holgura = ' + r1m(rielPorFila)
      + ' m por riel × 2 rieles × ' + filas + ' fila' + (filas === 1 ? '' : 's')
      + ' = ' + r1m(metrosRiel) + ' m',
    apoyos: 'Un apoyo cada 1,7 m de riel, más uno de cierre: (' + r1m(rielPorFila)
      + ' ÷ 1,7 redondeado arriba + 1) × ' + filas + ' = ' + apoyos,
    perfil: r1m(metrosRiel) + ' m de riel + ' + r1m(metrosApoyo)
      + ' m de triángulos, × 1,1 por los cortes = ' + metrosPerfil + ' m',
  };

  return { filas, porFila, presMedio, presExtremo, cuentas,
    tornillos: presMedio + presExtremo,
    apoyos, metrosRiel: Math.round(metrosRiel*10)/10,
    metrosApoyo: Math.round(metrosApoyo*10)/10, metrosPerfil,
    superficie, inc, vert };
}

/* ═══════════════ 5 · MATERIAL DE CONEXIÓN ═══════════════ */
export function conexion(d, e){
  const g = d.cfg;
  if (!g.best) return null;
  const dist = Math.max(2, e.dist);
  const cad = g.best.cadenas;
  const metros = Math.ceil((dist * 2 * cad * 1.15) / 5) * 5;

  /* De dónde sale cada cantidad, con los números de verdad. Marcos preguntó
     literalmente «cómo sabes que son 12 metros», y tenía razón en preguntarlo:
     una cifra que no se puede rastrear no se puede defender delante de un
     cliente ni corregir cuando está mal. Ojo con una distinción importante:
     la distancia es un dato MEDIDO por él en el techo, no calculado. */
  const dec = v => (Math.round(v * 10) / 10).toString().replace('.', ',');
  const cuentas = {
    cable: dist + ' m medidos en la casa × 2 (baja y sube) × ' + cad + ' cadena'
      + (cad === 1 ? '' : 's') + ' × 1,15 de margen = ' + dec(dist*2*cad*1.15)
      + ' m, redondeado a ' + metros + ' m porque el cable se vende de 5 en 5',
    mc4: cad + ' cadena' + (cad === 1 ? '' : 's') + ' × 2 extremos + 2 pares de repuesto = '
      + (cad*2+2) + ' pares',
    prensa: 'Dos por cadena, uno de entrada y otro de salida: ' + cad + ' × 2 = '
      + Math.max(2, cad*2) + (cad*2 < 2 ? ' (mínimo 2)' : ''),
    corrugado: dist + ' m × 1,2 por las curvas = ' + dec(dist*1.2)
      + ' m, redondeado a ' + (Math.ceil(dist*1.2/5)*5) + ' m',
    bridas: e.npan + ' paneles × 10 bridas cada uno = ' + (e.npan*10)
      + ', redondeado a ' + (Math.ceil(e.npan*10/25)*25) + ' porque vienen en bolsas de 25',
  };

  return {
    enSerie: g.best.s, cadenas: cad, dist, cuentas,
    metrosCable: metros,
    paresMC4: cad * 2 + 2,
    conectorY: cad === 1 ? 'no' : (cad === 2 ? 'si' : 'prohibido'),
    tapas: 4,
    prensa: Math.max(2, cad * 2),
    corrugado: Math.ceil(dist * 1.2 / 5) * 5,
    bridas: Math.ceil(e.npan * 10 / 25) * 25,
    cabFV: d.cabFV,
  };
}

/* ═══════════════ 6 · COMPATIBILIDAD BATERÍA ↔ INVERSOR ═══════════════ */
/* Cada aviso de compatibilidad lleva, ademas de si esta bien o mal, QUE CUESTA
   arreglarlo. No es lo mismo bajar un numero en el menu del inversor, que es
   gratis y son dos minutos, que tener que comprar otra bateria. Marcos pidio
   esta separacion porque delante del cliente cambia por completo la
   conversacion: una es un ajuste y la otra es dinero. */
export const ARREGLOS = {
  nada:   { et:'Bien',                   ord:3,
    q:'No hay nada que hacer aquí.' },
  menu:   { et:'Se arregla en el menú',  ord:1,
    q:'Se corrige cambiando un ajuste del inversor. No cuesta dinero y son dos minutos, '
      + 'pero hay que hacerlo <b>antes de dejar la casa</b>: si se olvida, el sistema trabaja mal '
      + 'desde el primer día y nadie se entera hasta que algo falla.' },
  equipo: { et:'Hay que cambiar equipo', ord:0,
    q:'Esto no se arregla con un ajuste: falta hardware o el que hay no sirve. '
      + '<b>Cambia el precio de la cotización</b>, así que se decide antes de dar un número.' },
  saber:  { et:'Falta un dato',          ord:2,
    q:'No es un fallo: es que ese dato no se sabe todavía. Hasta confirmarlo no se puede dar '
      + 'por bueno el cálculo que depende de él.' },
};

export function compatibilidad(d, inv, bat){
  const celdas = Math.max(1, Math.round(d.Vbat / 3.2));
  const r1 = x => Math.round(x * 10) / 10;
  const n1 = x => String(Math.round(x * 10) / 10).replace('.', ',');
  const pub = !!(bat && bat.vcar && bat.vflo && bat.vmin);
  const vAbs = pub ? bat.vcar : r1(celdas * 3.55);
  const vFlo = pub ? bat.vflo : r1(celdas * 3.40);
  const vMin = pub ? bat.vmin : r1(celdas * 2.90);
  const vCel = r1(celdas * 3.65);
  const dod  = (bat && bat.dod) || 0.9;

  const filas = [];
  const add = (estado, tit, valor, nota, arreglo) =>
    filas.push({ estado, tit, valor, nota, arreglo: arreglo || (estado === 'bad' ? 'equipo' : 'nada') });

  // voltaje
  let vOK = true;
  if (inv && !inv.manual && inv.vnom){
    vOK = d.Vbat >= inv.vnom * 0.85 && d.Vbat <= inv.vnom * 1.25;
    add(vOK ? 'ok' : 'bad', 'Voltaje', n1(d.Vbat) + ' V ↔ ' + n1(inv.vnom) + ' V',
      vOK ? 'Encajan. Son ' + celdas + ' celdas de litio en serie.'
          : 'NO encajan. El inversor es de ' + n1(inv.vnom) + ' V y la batería de ' + n1(d.Vbat) + ' V. '
            + 'Esto no tiene arreglo por menú ni por cableado: o cambia la batería o cambia el inversor.',
      vOK ? 'nada' : 'equipo');
  } else {
    add('warn', 'Voltaje', n1(d.Vbat) + ' V',
      'El inversor está en modo manual: comprueba en su etiqueta que sea de la misma clase.',
      'saber');
  }

  if (!vOK){
    add('bad','Lo demás','no se puede calcular',
      'Hasta que el voltaje no encaje, el resto de números no significan nada.');
    return { filas, celdas, vAbs, vFlo, vMin, vCel, dod, vOK, limiteCarga: 0 };
  }

  // descarga
  const Pdesc = (inv && !inv.manual && inv.pbat) ? inv.pbat : d.P;
  const Ipide = Pdesc / (d.Vbat * 0.90);
  const estD = Ipide > d.Ibms ? 'bad' : (Ipide > d.Ibms * 0.85 ? 'warn' : 'ok');
  add(estD, 'Descarga', Math.round(Ipide) + ' A pide · ' + d.Ibms + ' A deja',
    estD === 'bad'
      ? 'El BMS corta antes de que el inversor llegue a su potencia. Harían falta '
        + Math.ceil(Ipide / d.IbmsUno) + ' baterías en paralelo.'
      : estD === 'warn'
      ? 'Funciona, pero sin colchón. Con la batería por debajo del 40 % puede cortar.'
      : 'Sobra margen para los arranques de motor.'
        + (Pdesc < d.P ? ' En modo batería este inversor da ' + Pdesc + ' W, no ' + d.P + ' W.' : ''),
    estD === 'ok' ? 'nada' : 'equipo');

  // carga
  const c05 = Math.round(d.AhTot * 0.5);
  const icarBms = ((bat && !bat.manual && bat.icar) ? bat.icar : d.IbmsUno) * d.nbat;
  const conFicha = !!(bat && bat.ok && bat.icar);
  const techo = conFicha ? icarBms : Math.min(icarBms, c05);
  const limiteCarga = Math.min(d.Icar, techo);
  const estC = d.Icar > icarBms ? 'bad' : (d.Icar > techo ? 'warn' : 'ok');
  add(estC, 'Carga', d.Icar + ' A empuja · ' + limiteCarga + ' A recomendado',
    estC === 'bad'
      ? 'El inversor puede meterle más corriente de la que el BMS admite (' + icarBms
        + ' A). Baja el límite de carga a ' + limiteCarga + ' A en el menú.'
      : estC === 'warn'
      ? 'Cabe, pero pasa de medio C y acorta la vida de las celdas. Ponlo en ' + limiteCarga + ' A.'
      : 'Bien, dentro de lo que admite la batería.',
    estC === 'ok' ? 'nada' : 'menu');

  // tope de tensión
  if (inv && !inv.manual){
    if (inv.vtope){
      const ok = inv.vtope > vAbs + 1;
      add(ok ? 'ok' : 'warn', 'Tope de carga', n1(inv.vtope) + ' V corta · ' + n1(vAbs) + ' V carga',
        ok ? 'Hay hueco de sobra: la carga completa nunca dispara la protección.'
           : 'Va demasiado justo: puede cortarte la carga antes de tiempo. Sube el corte por '
             + 'sobretensión en el menú del inversor, o baja el voltaje de absorción de la batería.',
        ok ? 'nada' : 'menu');
    } else {
      add('warn', 'Tope de carga', 'sin confirmar · ' + n1(vAbs) + ' V carga',
        'De este inversor no tengo el voltaje al que corta por sobretensión. '
        + 'Comprueba en su menú que la protección esté por encima de ' + n1(vAbs) + ' V.',
        'saber');
    }
  }

  /* Las dos fases. Un inversor bifasico da 120 V entre cada fase y el neutro
     y 240 V entre las dos, pero SU POTENCIA SE REPARTE: cada fase da como
     mucho la mitad. En Cuba hay casas cableadas enteras a 110 V donde todo
     cuelga de una sola fase, y entonces el inversor se apaga a media potencia
     aunque le sobre capacidad. Es de los fallos que parecen avería y no lo son. */
  if (d.Vac >= 200){
    const porFase = Math.round(d.P / 2);
    add('info', 'Las dos fases', porFase + ' W por fase',
      'Este inversor da <b>120 V</b> entre cada fase y el neutro, y <b>240 V</b> entre las dos. '
      + 'Los ' + d.P + ' W completos solo salen con la carga repartida: <b>cada fase entrega '
      + porFase + ' W como mucho</b>, que son los ' + Math.round(d.Iac) + ' A del breaker. '
      + 'Si la casa está cableada entera a 110 V y todo cuelga de una sola fase, <b>el inversor '
      + 'se apaga a media potencia</b> aunque le sobre capacidad, y parece una avería sin serlo. '
      + 'Mide el consumo de cada fase en el tablero y reparte los circuitos antes de irte.',
      'saber');
  } else {
    add('info', 'Una sola fase', d.P + ' W a ' + d.Vac + ' V',
      'Salida de una sola fase: toda la potencia sale por el mismo par de cables, así que el '
      + 'breaker va dimensionado a los ' + Math.round(d.Iac) + ' A completos. No hay nada que '
      + 'repartir, pero tampoco se pueden alimentar cargas de 220 V.', 'nada');
  }

  // recarga y reserva
  const horas = d.kWp > 0 ? d.kWh / (d.kWp * 0.75) : 0;
  add('info', 'Recarga', n1(horas) + ' h de sol',
    'Llenar ' + n1(d.kWh) + ' kWh desde vacío con ' + n1(d.kWp)
    + ' kWp. En Santiago cuenta con 5 horas útiles al día.', 'nada');

  const util = d.kWh * dod;
  add('info', 'Reserva útil', n1(util) + ' kWh',
    'Al ' + Math.round(dod*100) + ' % de descarga. Da unas ' + n1(util/0.5)
    + ' h con 500 W, o ' + n1(util/1.5) + ' h con 1,5 kW.', 'nada');

  return { filas, celdas, vAbs, vFlo, vMin, vCel, dod, vOK, limiteCarga };
}

/* ═══════════════ 7 · PROTECCIONES ═══════════════ */
export function protecciones(d, inv){
  const vSPDac = d.Vac <= 130 ? '150–175 V' : '275 V';
  const vDC = Math.ceil(d.Vstring / 50) * 50;
  const trae = (inv && inv.trae) || [];        // lo que ESE inversor ya lleva dentro
  const sabido = !!(inv && !inv.manual && inv.trae);   // ¿está comprobado en su ficha?
  const L = [];
  const add = (grupo, clave, pieza, valor, nota) => L.push({
    grupo, clave, pieza, valor, nota,
    viene: trae.includes(clave),
    // si no hay ficha del inversor, lo que podría venir de fábrica se marca para mirar
    comprobar: !sabido && ['brkAC','seccPV','brkDC'].includes(clave) });

  add('Batería','brkDC','Breaker CC de batería', d.brkDC + ' A · 125 V CC',
    'MCCB de corriente continua, 2 polos. El inversor tira ' + Math.round(d.Ibat) + ' A a plena carga');
  add('Batería','fusT','Corte de cortocircuito de batería', d.fusT + ' A · ≥ 10 kA en CC',
    'Va pegado al borne positivo. <b>Lo que importa no son los amperios, es el poder de corte en corriente '
    + 'continua</b>: pide <b>≥ 10 kA a ' + Math.ceil(d.Vbat * 1.4 / 10) * 10 + ' V CC</b>. '
    + 'Más abajo está qué pieza es, dónde va exactamente y cuál se pone');
  add('Batería','cabBat','Cable de batería', d.cabBat,
    'Dos tramos, positivo y negativo, con terminales de ojal crimpados');

  add('Paneles','seccPV','Seccionador CC', sig(d.Ifv, [16,25,32,40,63]) + ' A · ' + vDC + ' V CC',
    'Rotativo de carga, 2 polos. Específico de continua');
  add('Paneles','spdDC','SPD de continua', 'Tipo 2 · ' + vDC + ' V CC',
    'Protege la entrada del MPPT de los rayos cercanos');
  if (d.fusiblesStr)
    add('Paneles','fusStr','Fusibles de cadena', d.fusStrA + ' A · ' + d.strings + ' pares',
      'Con ' + d.strings + ' cadenas en paralelo son obligatorios: uno por polo y por cadena');
  add('Paneles','cabFV','Cable solar', d.cabFV, 'H1Z2Z2-K o PV-1F, resistente al sol. Rojo y negro');

  add('Alterna','brkAC','Breaker AC bipolar', d.brkAC + ' A · curva C',
    '2 polos. A ' + d.Vac + ' V el inversor tira ' + Math.round(d.Iac) + ' A');
  add('Alterna','dif','Interruptor diferencial', d.dif + ' A / 30 mA · Tipo A',
    'Los ' + d.dif + ' A son la corriente que deja pasar; los 30 mA son la fuga con la que salta. '
    + 'Los dos hacen falta y miden cosas distintas. <b>Ningún inversor lo trae</b>');
  add('Alterna','spdAC','SPD de alterna', 'Tipo 2 · ' + vSPDac + ' · 20–40 kA',
    'La tensión depende de la red: ' + vSPDac + ' para una red de ' + d.Vac + ' V');
  add('Alterna','cabAC','Cable de salida', d.cabAC, 'Del inversor al tablero de cargas respaldadas');

  add('Tierra','cabTierra','Cable de tierra', d.Ifv > 40 ? '10 mm² (8 AWG)' : '6 mm² (10 AWG)',
    'Sube de sección cuando la corriente del campo pasa de 40 A');
  add('Tierra','termMarco','Terminales de marco', d.npan + ' unidades', 'Uno por panel, al marco de aluminio');
  add('Tierra','varilla','Varilla y abrazadera', '1 juego', 'Varilla de cobre, abrazadera y barra equipotencial');

  return L;
}

/* ═══════════════ 8 ter · EL CORTE DE CORTOCIRCUITO DE LA BATERÍA ═══════════════

   Qué es y dónde va: es la pieza que se atornilla o se monta <b>a menos de
   medio metro del borne positivo de la batería</b>, antes que ninguna otra
   cosa. No protege al inversor: protege <b>el cable</b> que va de la batería
   al inversor. Si ese cable se pela y toca el chasis, una batería de litio
   de 48 V puede soltar varios miles de amperios en un instante, y el cable
   se pone al rojo antes de que nadie llegue a nada.

   Por qué no vale cualquier cosa: en corriente alterna la corriente pasa por
   cero cien veces por segundo, y el arco que se forma al abrir el contacto se
   apaga solo en ese cruce. En corriente continua <b>la corriente nunca pasa
   por cero</b>: el arco sigue ardiendo hasta que algo lo corta de verdad. Por
   eso el número que hay que exigir no son los amperios, sino el <b>poder de
   corte en corriente continua</b>, que es cuánta corriente es capaz de
   apagar sin quedarse soldado ni convertirse en un soplete.

   La lista de abajo no son cinco opciones para elegir: <b>la primera está
   decidida</b>. Las demás están para que se reconozcan si aparecen delante,
   y para saber cuáles hay que rechazar. */
export function sustitutosFusible(d){
  const kA = '≥ 10 kA';
  const V = Math.ceil(d.Vbat * 1.4 / 10) * 10;
  return [
    { n:'Breaker CC de varios polos, cableados en serie', bien:true, elegido:true,
      donde:'Entre el borne positivo de la batería y el inversor',
      v:d.brkDC + ' A · ' + V + ' V CC · 35 USD',
      t:'<b>Este es el que se pone. Está decidido, no es una opción más.</b> '
        + 'Es un interruptor de corriente continua de 3 o 4 polos, y el truco está en cómo '
        + 'se cablea: <b>todos los polos van en serie dentro del mismo circuito</b>, uno detrás '
        + 'de otro, no uno por cable. Así cada polo parte el arco en un trozo y entre los tres '
        + 'lo apagan. El de <b>125 A y 3 polos a 35 USD</b> es exactamente esto. '
        + 'Al pedirlo confirma dos cosas: el <b>poder de corte en corriente continua</b> y que el '
        + 'fabricante admite cablear los polos en serie.' },
    { n:'Fusible MRBF de borne', bien:true,
      donde:'Atornillado directamente al borne de la batería',
      v:d.fusT + ' A · 10 kA',
      t:'Un fusible con forma de terminal, que se atornilla encima del propio borne positivo. '
        + 'Está pensado para barcos y para litio, y corta bien en continua hasta 58 V. '
        + 'Es la pieza más limpia de todas porque no hay ni un centímetro de cable sin proteger, '
        + 'pero hay que encontrarla.' },
    { n:'Fusible NH de cuchilla, con su base', bien:true,
      donde:'En la caja de continua, entre la batería y el inversor',
      v:d.fusT + ' A · ' + kA,
      t:'El fusible industrial de toda la vida: una cuchilla gruesa que entra en una base de '
        + 'porcelana. Corta muchísimo y se consigue en material eléctrico industrial. '
        + '<b>El cuidado está en la ficha:</b> casi todos traen el poder de corte en alterna, que '
        + 'es mucho mayor. Solo sirve si dice también el número <b>en corriente continua</b> a '
        + V + ' V.' },
    { n:'Fusible ANL o MEGA', bien:false,
      donde:'En un portafusibles, cerca de la batería',
      v:d.fusT + ' A · 2–6 kA',
      t:'Son los de coche y de equipos de sonido: baratos y fáciles de encontrar. El problema es '
        + 'que <b>cortan mucho menos</b>. En un sistema chico aguantan; con un banco de litio grande '
        + 'se pueden quedar cortos, y un fusible que no llega a cortar se abre hecho un arco y '
        + 'sigue conduciendo.' },
    { n:'Breaker normal de casa', bien:false,
      donde:'En ningún sitio de este sistema',
      v:'NO', color:'bad',
      t:'<b>Esto no.</b> Un magnetotérmico de alterna puesto en un circuito de continua no apaga '
        + 'el arco: lo mantiene ardiendo dentro de su propia carcasa de plástico. Es de los '
        + 'errores que terminan en incendio, y es fácil de cometer porque por fuera son iguales.' },
  ];
}

/* ═══════════════ 8 bis · LO QUE EL INVERSOR YA LLEVA DENTRO ═══════════════
   Todo híbrido trae protecciones electrónicas. La trampa es creer que
   sustituyen a las físicas: no lo hacen. La electrónica del inversor
   protege AL INVERSOR. No protege el cable, ni la casa, ni a las personas. */
export function internas(inv){
  const L = [
    ['Controlador de carga MPPT', 'Por eso no hace falta regulador aparte. Esto sí te lo ahorras.'],
    ['Protección de sobrecarga', 'Se apaga solo si le pides más potencia de la que da.'],
    ['Corte por cortocircuito en la salida', 'Electrónico. <b>No sustituye al breaker</b>: el breaker protege el cable, no el inversor.'],
    ['Corte por descarga profunda', 'Apaga antes de dejar la batería seca. <b>No sustituye al fusible Clase T</b>, que es lo que corta un cortocircuito de litio.'],
    ['Protección de sobretemperatura', 'Baja potencia o se para si se calienta.'],
  ];
  if (inv && !inv.manual && (inv.trae || []).includes('brkAC'))
    L.unshift(['Breaker físico en la salida',
      '<b>Este modelo sí lo trae de fábrica</b>, viene en su ficha. No compres otro para la salida del inversor.']);
  return L;
}

/* ═══════════════ 8 · COMPROBACIONES DEL DISEÑO ═══════════════ */
export function comprobaciones(d){
  const ck = [];
  const ratio = d.kWh > 0 ? d.kWp / d.kWh : 0;
  if (ratio < 0.25)
    ck.push({ e:'bad', t:'Faltan paneles para recargar esa batería',
      n:'Con ' + d.kWp.toFixed(1) + ' kWp no llenas ' + d.kWh.toFixed(1)
        + ' kWh en un día. Harían falta al menos ' + Math.ceil(d.kWh*0.3*1000/d.Wpan) + ' paneles.' });
  else if (ratio > 0.75)
    ck.push({ e:'warn', t:'Sobran paneles para esa batería',
      n:'Llenas la batería muy rápido y desperdicias sol. O subes la batería o quitas paneles.' });
  else
    ck.push({ e:'ok', t:'Paneles y batería equilibrados',
      n:d.kWp.toFixed(1) + ' kWp para ' + d.kWh.toFixed(1) + ' kWh: se llena en un día normal.' });

  if (!d.cfg.best)
    ck.push({ e:'bad', t:'No hay forma válida de conectar los paneles',
      n:'Con este panel y este inversor caben entre ' + d.cfg.minSerie + ' y '
        + d.cfg.maxSerie + ' paneles en serie.' });

  if (d.Vac >= 220 && d.Vac <= 240)
    ck.push({ e:'info', t:'Red bifásica cubana',
      n:'110 V entre fase y neutro y 220 V entre fases, a 60 Hz. Comprueba que el inversor '
        + 'sea de 60 Hz: uno europeo de 50 Hz estropea los motores de neveras y bombas.' });

  return ck;
}

/* ═══════════════ 9 · DINERO ═══════════════ */
export function negocio(c){
  const equipo = c.kit + c.npan * c.ppan;
  const materiales = c.prot + c.cab + c.estr;
  const manoObra = c.obra + c.trans;
  const coste = equipo + materiales + manoObra;
  const fondoPct = Math.max(3, c.fondoPct);
  const fondo = c.precio * fondoPct / 100;
  const ganancia = c.precio - coste - fondo;
  const pctVenta = c.precio > 0 ? ganancia / c.precio * 100 : 0;
  const pctInversion = coste > 0 ? ganancia / coste * 100 : 0;

  // precio mínimo para no bajar del margen que se quiere defender
  const den = 1 - fondoPct/100 - c.minPct/100;
  const precioMin = den > 0 ? coste / den : 0;

  return { equipo, materiales, manoObra, coste, fondo, fondoPct, ganancia,
    pctVenta, pctInversion, precioMin,
    paraMi: ganancia * (100 - c.socioPct) / 100,
    paraSocia: ganancia * c.socioPct / 100 };
}

/* ═══════════════ 10 · COBROS ═══════════════
   Al cliente se le cotiza siempre en dólares. Puede pagar en dólares o en
   pesos al cambio del día, así que cada cobro guarda su propio cambio y de
   ahí sale cuánto entró de verdad en dólares.

   La regla de la casa: en pesos se cobra exactamente lo que hay que gastar
   en pesos (estructura y mano de obra), porque el peso sobrante no sale
   del país. */
export function resumenCobros(cobros, precio, gastoEnCup){
  const L = cobros || [];
  let usd = 0, cup = 0, sinCambio = 0;

  L.forEach(c => {
    const imp = +c.importe || 0;
    if (c.moneda === 'CUP'){
      cup += imp;
      const r = +c.cambio || 0;
      if (r > 0) usd += imp / r; else sinCambio++;
    } else {
      usd += imp;
    }
  });

  const cobrado = Math.round(usd);
  const falta = Math.max(0, Math.round((+precio || 0) - cobrado));
  const pct = precio > 0 ? Math.min(100, cobrado / precio * 100) : 0;

  return { n: L.length, cobrado, cup, falta, pct, sinCambio,
    estado: !L.length ? 'sin cobrar' : (falta <= 0 ? 'pagado' : 'parcial'),
    // cuánto conviene cobrar en cada moneda
    planCup: Math.round(+gastoEnCup || 0),
    planUsd: Math.round(Math.max(0, (+precio || 0) - (+gastoEnCup || 0))) };
}

/* ═══════════════ 11 · VENTA DE EQUIPOS SUELTOS ═══════════════
   Hay clientes que no quieren montaje: solo el inversor, solo los paneles,
   o el inversor y las baterías porque no les alcanza para paneles.

   Aquí el margen no es del sistema, es de cada artículo. Y como no hay
   instalación, tampoco hay mano de obra ni estructura que descontar. */
export function negocioVenta(articulos, fondoPct, minPct, socioPct){
  const L = (articulos || []).filter(a => a && +a.cant > 0);

  let coste = 0, venta = 0;
  const items = L.map(a => {
    const c = (+a.coste || 0) * (+a.cant || 0);
    const v = (+a.precio || 0) * (+a.cant || 0);
    coste += c; venta += v;
    const g = v - c;
    return { ...a, costeTotal:c, ventaTotal:v, ganancia:g,
      pct: v > 0 ? g / v * 100 : 0,
      // precio mínimo por unidad para no bajar del margen que se defiende
      minUnidad: (1 - (minPct||0)/100) > 0 ? (+a.coste || 0) / (1 - (minPct||0)/100) : 0 };
  });

  const fp = Math.max(0, +fondoPct || 0);
  const fondo = venta * fp / 100;
  const ganancia = venta - coste - fondo;
  const pctVenta = venta > 0 ? ganancia / venta * 100 : 0;
  const pctInversion = coste > 0 ? ganancia / coste * 100 : 0;
  const den = 1 - fp/100 - (+minPct || 0)/100;
  const ventaMin = den > 0 ? coste / den : 0;

  return { items, coste, venta, fondo, fondoPct:fp, ganancia, pctVenta, pctInversion,
    ventaMin,
    paraMi: ganancia * (100 - (+socioPct || 0)) / 100,
    paraSocia: ganancia * (+socioPct || 0) / 100 };
}

/* ═══════════════ 12 · EL NEGOCIO ENTERO ═══════════════
   Cruza todos los trabajos para responder a lo que de verdad importa:
   cuánto capital está atrapado, cuánto falta por cobrar y cuánto se ha
   ganado. Un trabajo suelto no contesta a eso. */
export function panel(trabajos, aj){
  const A = trabajos || [];
  const minPct = +aj.minPct || 0, fondoPct = +aj.fondoPct || 0, socioPct = +aj.socioPct || 0;

  let coste = 0, vendido = 0, cobrado = 0, porCobrar = 0, ganancia = 0, fondo = 0;
  let atrapado = 0;   // lo que ya pusiste y todavía no te han devuelto
  const estados = { visita:0, cotizado:0, aceptado:0, montado:0 };

  A.forEach(t => {
    estados[t.estado] = (estados[t.estado] || 0) + 1;
    const esVenta = (t.tipo || 'montaje') === 'venta';

    let c, v;
    if (esVenta){
      const r = negocioVenta(t.articulos, fondoPct, minPct, socioPct);
      c = r.coste; v = r.venta; ganancia += r.ganancia; fondo += r.fondo;
    } else {
      const m = t.dinero || {};
      const r = negocio({ kit:+m.kit||0, npan:+(t.sistema||{}).npan||0, ppan:+m.ppan||0,
        prot:+m.prot||0, cab:+m.cab||0, estr:+m.estr||0, obra:+m.obra||0, trans:+m.trans||0,
        precio:+m.precio||0, fondoPct, minPct, socioPct });
      c = r.coste; v = r.precio !== undefined ? +m.precio||0 : 0; v = +m.precio||0;
      ganancia += r.ganancia; fondo += r.fondo;
    }

    const rc = resumenCobros(t.cobros, v, 0);
    coste += c; vendido += v; cobrado += rc.cobrado; porCobrar += rc.falta;

    // el capital sigue fuera mientras el trabajo no esté cobrado del todo
    if (rc.falta > 0) atrapado += Math.max(0, c - rc.cobrado);
  });

  const capital = +aj.capital || 0;
  const libre = Math.max(0, capital - atrapado);
  const costeMedio = A.length ? coste / A.length : 0;
  const cabenMas = costeMedio > 0 ? Math.floor(libre / costeMedio) : 0;

  return { n:A.length, estados, coste, vendido, cobrado, porCobrar,
    ganancia, fondo, atrapado, capital, libre, costeMedio, cabenMas,
    paraMi: ganancia * (100 - socioPct) / 100,
    paraSocia: ganancia * socioPct / 100,
    margen: vendido > 0 ? ganancia / vendido * 100 : 0 };
}


/* ═══════════════ 13 · QUÉ DATOS FALTAN ═══════════════
   Un dato que falta en el diseño no se nota hasta que estás en el techo
   con el equipo comprado. Por eso la app avisa antes de dejar pasar. */
export function faltan(t){
  const s = t.sistema || {}, L = [];
  const pon = (donde, qué, porqué) => L.push({ donde, qué, porqué });

  if (!s.modeloInv)
    pon('Diseño', 'Elegir el inversor',
      'Sin él no se sabe cuánta tensión aguantan los paneles ni qué protecciones lleva');
  if (!s.modeloBat)
    pon('Diseño', 'Elegir la batería',
      'Sin ella no se puede comprobar si el BMS aguanta lo que pide el inversor');
  if (!(+s.abms > 0))
    pon('Diseño', 'Los amperios del BMS',
      'Es el número que decide si el sistema entrega su potencia o se apaga solo');
  if (!(+s.voc > 0) || !(+s.isc > 0))
    pon('Diseño', 'Voc e Isc del panel',
      'Vienen detrás del panel. Sin ellos no se sabe cuántos caben en serie');
  if (!(+s.vmax > 0))
    pon('Diseño', 'Tensión máxima de entrada del inversor',
      'Es el límite que si se pasa destroza el equipo al primer amanecer frío');
  if (!(+s.npan > 0))
    pon('Diseño', 'Cuántos paneles', 'De ahí sale todo el cálculo del campo solar');
  if (!(+s.dist > 0))
    pon('Materiales', 'Distancia del techo al inversor',
      'Hay que medirla en la casa. De ahí salen los metros de cable');

  const v = t.visita || {};

  /* Si la visita todavía no se ha hecho, lo que falta no son datos técnicos:
     es saber a qué casa va el técnico y cuándo. Sin eso el trabajo no se le
     puede mandar. */
  if (t.estado === 'agendar'){
    if (!String(v.cita || '').trim())
      pon('Visita', 'Día y hora de la visita',
        'Sin fecha, el trabajo que le mandes al técnico no le dice cuándo ir');
    if (!String(v.direccion || '').trim())
      pon('Visita', 'Dirección de la casa',
        'El nombre y la zona no bastan para encontrar una casa en El Cobre');
  }

  if (!String(v.consumo || '').trim())
    pon('Visita', 'Qué consume la casa',
      'Sin eso no se puede decir si el equipo le va a dar de verdad');
  if (v.neutro === 'sin revisar')
    pon('Visita', 'Estado del neutro',
      'Es la causa número uno de equipos quemados en Cuba');

  return L;
}
/* ═══════════════ 12 · QUÉ KIT PIDE LA CASA ═══════════════

   Entra lo que el técnico contó en la visita y sale el kit que hace falta.
   Esto sustituye al «yo creo que con 5 kW le basta».

   ─── Las tres cuentas, y por qué se hacen así ───

   1 · LO QUE GASTA AL DÍA · suma de vatios por horas. Esto dimensiona los
       PANELES, porque son los que tienen que reponer ese gasto.

   2 · EL PICO · lo más que puede estar encendido a la vez. No es la suma
       de todo: nadie plancha mientras usa el microondas y la hornilla. Se
       suma todo lo que anda seguido (nevera, luces, ventiladores, tele) y
       se le añaden LOS DOS APARATOS PUNTUALES MÁS GRANDES, que es lo que
       de verdad pasa: alguien cocina mientras la bomba llena el tanque.
       Esto dimensiona el INVERSOR.

   3 · EL ARRANQUE · el pico de arriba, más el tirón del peor motor al
       encender. Una bomba de media pluma tira cinco veces su consumo
       durante un segundo. Esto decide si el inversor elegido aguanta o se
       apaga, y es la causa número uno de «el inversor se traba».

   4 · LA BATERÍA · solo las horas sin sol, que es para lo que sirve. Se
       divide entre 0,90 porque a una batería de litio no se le saca el
       último 10 %, y entre 0,95 por lo que pierde el inversor al convertir.

   ─── Y la cuenta que importa para vender ───
   Sale DOS VECES: la casa completa, y solo lo imprescindible. En Cuba casi
   nadie compra la casa completa de entrada; compra lo imprescindible y
   amplía. Tener los dos números delante es lo que permite ofrecer algo en
   vez de perder el cliente por precio.
   ═══════════════════════════════════════════════════════════════════════ */

export const INV_STD = [3, 5, 6, 8, 10, 12];                    // kW que se consiguen
export const BAT_STD = [2.56, 5.12, 7.68, 10.24, 15.36, 20.48]; // kWh de litio
export const SOL_HORAS = 5;      // horas de sol pleno al día en Santiago de Cuba
export const SOL_PERDIDAS = 0.75; // lo que se pierde por calor, polvo y cables
export const DOD = 0.90;         // lo que se le saca de verdad a una batería de litio
export const REND_INV = 0.95;    // lo que pierde el inversor al convertir

/* Una pasada de cuentas sobre un conjunto de aparatos ya elegido. */
function cuentaDe(items){
  let kWhDia = 0, kWhNoche = 0, contin = 0;
  const puntuales = [];
  let peorTiron = 0, quienTira = '';

  items.forEach(it => {
    const { a, n } = it;
    const w = a.w * n;
    kWhDia   += a.w * n * a.h  / 1000;
    kWhNoche += a.w * n * (a.hn || 0) / 1000;
    if (a.p) puntuales.push({ w, n: a.n }); else contin += w;

    /* El tirón: arranca UNO y los demás del mismo tipo ya andan. Dos neveras
       no arrancan en el mismo instante; suponer que sí infla el inversor. */
    const tiron = a.w * ((a.arr || 1) - 1);
    if (tiron > peorTiron) { peorTiron = tiron; quienTira = a.n; }
  });

  puntuales.sort((x, y) => y.w - x.w);
  const dosMayores = puntuales.slice(0, 2);
  const picoW = contin + dosMayores.reduce((s, x) => s + x.w, 0);
  const arranqueW = picoW + peorTiron;

  return { kWhDia, kWhNoche, contin, picoW, arranqueW, peorTiron, quienTira,
    puntuales, dosMayores };
}

const arriba = (v, lista) => lista.find(x => x >= v) || lista[lista.length - 1];

/* De la cuenta al kit: inversor, batería y paneles. */
function kitDe(c, wpan){
  const invNec = c.picoW * 1.25 / 1000;          // 25 % de margen sobre el pico
  const kwInv  = arriba(invNec, INV_STD);
  const batNec = c.kWhNoche / DOD / REND_INV;
  const kWhBat = arriba(batNec, BAT_STD);
  const kWpNec = c.kWhDia / (SOL_HORAS * SOL_PERDIDAS);
  const W = wpan > 0 ? wpan : 585;               // el panel que más se ve en Cuba
  const npan  = Math.max(1, Math.ceil(kWpNec * 1000 / W));
  return { invNec, kwInv, batNec, kWhBat, kWpNec, npan, wpan: W,
    kWp: npan * W / 1000 };
}

/* ─── La función que usa la pantalla ───
   sel   = { claveDelAparato: cuántos hay }
   TABLA = la tabla APARATOS, que se pasa de fuera para que este motor siga
           sin depender de nada.
   wpan  = vatios del panel que se va a usar; si no se sabe, pone 585 W.   */
export function kitDeAparatos(sel, TABLA, wpan){
  const items = [], esenc = [];
  Object.entries(sel || {}).forEach(([k, n]) => {
    const a = TABLA[k]; const c = Math.max(0, Math.floor(+n || 0));
    if (!a || c < 1) return;
    items.push({ a, n: c, k });
    if (a.es) esenc.push({ a, n: c, k });
  });

  if (!items.length)
    return { hayAlgo:false, nAparatos:0, avisos:[], detalle:[] };

  const cTodo = cuentaDe(items),  kTodo = kitDe(cTodo, wpan);
  const cEse  = esenc.length ? cuentaDe(esenc) : null;
  const kEse  = cEse ? kitDe(cEse, wpan) : null;

  /* ─── Avisos ─── */
  const avisos = [];
  const pon = (nivel, qué, txt) => avisos.push({ nivel, qué, txt });

  // 1 · el aviso propio de cada aparato, tal como está escrito en la tabla
  items.forEach(it => { if (it.a.av) pon('medio', it.a.n, it.a.av); });

  // 2 · ¿aguanta el arranque el inversor que sale?
  //     Un híbrido decente da el doble de su potencia un par de segundos.
  const tope = kTodo.kwInv * 1000 * 2;
  if (cTodo.arranqueW > tope){
    const sube = arriba(cTodo.arranqueW / 2 / 1000, INV_STD);
    pon('alto', 'El arranque no cabe',
      'Con todo andando y <b>' + it0(cTodo.quienTira) + '</b> arrancando se juntan <b>'
      + Math.round(cTodo.arranqueW) + ' W</b> durante un segundo. Un inversor de '
      + kTodo.kwInv + ' kW aguanta unos ' + tope + ' W en ese instante, así que se apagaría. '
      + 'O subes a <b>' + sube + ' kW</b>, o el arranque de ese motor se separa del resto '
      + '(arrancador suave, o que no coincida con la hora de cocinar).');
  }

  // 3 · la batería que pide no existe: no se puede redondear hacia abajo en silencio
  const batTope = BAT_STD[BAT_STD.length - 1];
  if (kTodo.batNec > batTope)
    pon('alto', 'La batería que pide no existe',
      'Las horas sin sol piden <b>' + dec1(kTodo.batNec) + ' kWh</b> de batería y el banco más '
      + 'grande de la lista es de <b>' + conComa(batTope) + ' kWh</b>. El número que sale arriba '
      + 'es ese tope, <b>no lo que la casa necesita</b>: con él el cliente se queda sin corriente '
      + 'antes de amanecer. Hay que poner dos bancos en paralelo, o quitar del solar lo que gasta '
      + 'de noche (el aire es casi siempre el culpable) y decírselo por escrito.');

  // 4 · lo que se sale de la lista de equipos que se consiguen
  if (cTodo.picoW * 1.25 / 1000 > INV_STD[INV_STD.length - 1])
    pon('alto', 'Se pasa de lo que hay',
      'Esta casa pide más de <b>' + INV_STD[INV_STD.length - 1] + ' kW</b>, que es el inversor '
      + 'más grande de la lista. Hay que repartirla en dos sistemas, o dejar los aparatos '
      + 'más brutos fuera del solar y en la red.');

  // 5 · todo de día: la batería es respaldo, no el motor del sistema
  if (cTodo.kWhNoche < cTodo.kWhDia * 0.15)
    pon('info', 'Casi todo el gasto es de día',
      'Solo <b>' + dec1(cTodo.kWhNoche) + ' kWh</b> de los ' + dec1(cTodo.kWhDia)
      + ' caen sin sol. La batería que sale es chica a propósito: aquí manda el panel, '
      + 'no la batería. Si el cliente quiere aguantar un apagón largo de noche, '
      + 'eso es una decisión suya y se cotiza aparte.');

  // 6 · la venta de ampliación
  if (kEse && (kEse.kwInv < kTodo.kwInv || kEse.kWhBat < kTodo.kWhBat))
    pon('info', 'Hay dos ofertas aquí',
      'Lo imprescindible cabe en <b>' + kEse.kwInv + ' kW y ' + conComa(kEse.kWhBat) + ' kWh</b>; '
      + 'la casa completa pide <b>' + kTodo.kwInv + ' kW y ' + conComa(kTodo.kWhBat) + ' kWh</b>. '
      + 'Si el cliente no llega al completo, véndele el chico <b>dejando el sitio hecho para '
      + 'ampliar</b>: espacio en el techo, brequera con posiciones libres y un inversor que '
      + 'admita más batería. La ampliación es la segunda venta.');

  return { hayAlgo:true, nAparatos: items.length,
    todo:{ c:cTodo, k:kTodo }, esencial: kEse ? { c:cEse, k:kEse } : null,
    avisos,
    detalle: items.map(it => ({ n: it.a.n, g: it.a.g, cant: it.n, es: !!it.a.es,
      w: it.a.w * it.n, kWhDia: it.a.w * it.n * it.a.h / 1000 }))
      .sort((x, y) => y.kWhDia - x.kWhDia) };
}

const it0 = s => s || 'el motor más grande';
const dec1 = v => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');
const conComa = v => String(v).replace('.', ',');

/* ═══════════════ 13 · PROBLEMAS DE ALTO RIESGO ═══════════════

   Sale solo de lo que el técnico anotó en la visita. No es una lista de
   buenas prácticas: es lo que, si no se resuelve antes de montar, acaba en
   un equipo quemado y en una discusión sobre quién paga.

   Por qué existe esta pantalla: el proveedor de Marcos solo responde si un
   equipo llega malo. Desde el momento en que está montado, la avería la
   paga Light of Life Energy. Así que todo lo que la casa aporte al riesgo
   tiene que quedar escrito y firmado ANTES, no discutido después.

   Tres niveles, y cada uno tiene una consecuencia distinta:
   alto  → no se monta hasta resolverlo, o el cliente firma que asume ese
           punto y la garantía no lo cubre
   medio → se puede montar, pero se cotiza aparte o se avisa por escrito
   info  → afecta a lo que produce el sistema; el cliente tiene que saberlo
           para que no reclame después por una producción que nadie prometió
   ═══════════════════════════════════════════════════════════════════════ */
export function riesgos(v, sel, TABLA){
  const L = [];
  const pon = (nivel, qué, txt, arregla) => L.push({ nivel, qué, txt, arregla });

  /* ── El neutro. En Cuba es la causa número uno de equipos quemados ── */
  if (v.neutro === 'malo')
    pon('alto', 'El neutro está malo',
      'Un neutro en mal estado hace que la tensión de las dos fases se descompense: una sube '
      + 'a 140 V y la otra baja a 90 V. Eso quema el inversor, y también la nevera y el aire '
      + 'del cliente. <b>No es un defecto del equipo que montamos, pero lo mata igual.</b>',
      'Cambiar el neutro desde el poste o desde el metro contador antes de montar nada. '
      + 'Se cotiza aparte y va en la cotización como partida propia.');
  else if (v.neutro === 'dudoso')
    pon('alto', 'El neutro está flojo o con verdín',
      'Un neutro flojo funciona hoy y falla dentro de tres meses, normalmente de noche y con '
      + 'todo encendido. El verdín es resistencia: calienta, y donde calienta acaba abriendo.',
      'Apretar y limpiar todas las conexiones de neutro, del metro contador al tablero. '
      + 'Si al apretar el cable se deshace, se cambia. Media hora de trabajo que evita '
      + 'la reclamación más cara que existe.');
  else if (v.neutro === 'sin revisar')
    pon('alto', 'El neutro no se ha revisado',
      'Sin haber mirado el neutro no se puede dar por bueno un montaje. Es el único punto '
      + 'de esta lista que <b>no se puede dejar para después</b>.',
      'Mide entre neutro y tierra con la casa cargada: si pasa de 3 V, hay problema. '
      + 'Mira también las dos fases contra neutro: tienen que darte parecido.');

  /* ── El techo: esto no es un riesgo de avería, es de producción ── */
  if (v.orientacion === 'norte')
    pon('alto', 'El techo mira al norte',
      'En Cuba, un techo orientado al norte produce alrededor de <b>un 25 % menos</b> que uno '
      + 'al sur. Si se monta así sin decirlo, el cliente va a reclamar una producción que '
      + 'nadie le prometió, y va a tener razón en quejarse.',
      'Monta con estructura orientada al sur aunque el techo mire al norte, o busca otra '
      + 'faldón. Si no hay manera, ponlo por escrito en la cotización con el número: '
      + 'un 25 % menos de producción.');
  else if (v.orientacion === 'este' || v.orientacion === 'oeste')
    pon('medio', 'El techo mira al ' + v.orientacion,
      'Un techo al este o al oeste produce entre un 10 y un 15 % menos que al sur, y la '
      + 'producción se concentra en media jornada en vez de repartirse.',
      'Con estructura inclinada hacia el sur se recupera casi todo. Súmalo al presupuesto '
      + 'de estructura y explícale por qué vale más.');

  if (v.sombras === 'todo')
    pon('alto', 'Hay sombra buena parte del día',
      'Una sombra sobre un solo panel arrastra a toda la cadena: si están en serie, el panel '
      + 'tapado manda sobre los demás. Con sombra media jornada el sistema puede producir '
      + '<b>la mitad</b> de lo que dice la ficha.',
      'Primero, quitar la sombra si se puede (podar el árbol, mover el tanque). Si no se '
      + 'puede, reparte los paneles en dos cadenas de modo que la sombra caiga solo en una, '
      + 'o usa optimizadores. Y baja la producción prometida en la cotización.');
  else if (v.sombras === 'manana' || v.sombras === 'tarde')
    pon('medio', 'Hay sombra por la ' + (v.sombras === 'manana' ? 'mañana' : 'tarde'),
      'Se pierden las primeras o las últimas horas de sol. No es grave, pero cuenta: son '
      + 'entre un 10 y un 20 % del día.',
      'Coloca los paneles en la parte del techo que se libera antes, y agrupa en la misma '
      + 'cadena los que se tapan a la vez.');

  /* ── Aparatos de la casa que ponen en riesgo lo que montamos ── */
  Object.entries(sel || {}).forEach(([k, n]) => {
    const a = TABLA[k]; if (!a || !(+n > 0)) return;
    if (k === 'soldadora')
      pon('alto', 'Hay una soldadora en la casa',
        'Una soldadora tira la corriente a golpes, con picos del doble de su consumo. El '
        + 'inversor se apaga cada vez, y esos apagones repetidos acaban con la etapa de '
        + 'salida. <b>Si se quema por esto, no es un defecto de fábrica.</b>',
        'La soldadora se queda en la red, con su propio breaker, fuera del inversor. Queda '
        + 'por escrito que conectarla al sistema anula la garantía.');
    if (k === 'ducha')
      pon('alto', 'Hay ducha eléctrica',
        'Una ducha de paso tira <b>4.000 W</b> de golpe. Sola ya obliga a un inversor de 5 o '
        + '6 kW aunque el resto de la casa quepa en 3 kW, y encarece el sistema completo.',
        'Lo barato es dejar la ducha en la red y fuera del solar, o cambiarla por una de gas. '
        + 'Decide esto ANTES de cotizar: cambiarlo después es rehacer el presupuesto.');
    if (k === 'aire12' || k === 'aire18')
      pon('medio', 'Hay aire que no es inverter',
        'Un aire de arranque directo tira cuatro veces su consumo al encender y trabaja a todo '
        + 'o nada. Obliga a un inversor y una batería más grandes que un aire inverter del '
        + 'mismo frío.',
        'Haz la cuenta de las dos cosas y enséñasela: cambiar el aire suele salir más barato '
        + 'que la diferencia de inversor y batería, y además le baja la factura.');
    if (k === 'hornoPizza' || k === 'compresor' || k === 'exhibidora')
      pon('medio', 'Hay un negocio en la casa',
        'Un negocio no es una casa con un aparato más: son cargas que no se pueden apagar y '
        + 'que se llevan la batería de noche. El sistema tiene que dimensionarse por el '
        + 'negocio, no por la vivienda.',
        'Cotiza el negocio como un sistema aparte, o deja escrito qué se apaga cuando falta '
        + 'la red. Si no se define, el cliente va a reclamar que se le apagó el congelador.');
  });

  /* ── Lo que el técnico escribió con sus palabras ── */
  if ((v.equiposCasa || '').trim())
    pon('alto', 'El técnico encontró aparatos en mal estado',
      'Lo anotado en la visita: <i>' + String(v.equiposCasa).replace(/[<>]/g, '') + '</i>. '
      + 'Un motor que arranca mal o un ventilador sin aceite tira picos de corriente que '
      + 'el inversor tiene que aguantar todos los días.',
      'Se arregla antes de montar, o queda firmado que el cliente decidió montar con esos '
      + 'aparatos tal como están y que la garantía no cubre lo que provoquen.');

  if ((v.extra || '').trim())
    pon('medio', 'Hace falta trabajo eléctrico previo',
      'Lo anotado en la visita: <i>' + String(v.extra).replace(/[<>]/g, '') + '</i>.',
      'Esto va en la cotización como partida aparte, con su precio. Si se regala, se come '
      + 'el margen del montaje y el cliente no valora lo que le hiciste.');

  if (v.tipoTecho === 'inclinado' || v.tipoTecho === 'mixto')
    pon('info', 'El techo no es plano',
      'En un techo inclinado los paneles van pegados al agua del techo, así que la '
      + 'inclinación la manda el techo y no se puede elegir. Hay que comprobar que el agua '
      + 'cae hacia el sur y que la estructura aguanta.',
      'Mide la inclinación real del techo y apúntala en Diseño. Si el agua no va al sur, '
      + 'vuelve a la fila de la orientación de esta misma lista.');

  return L;
}

/* El texto que firma el cliente cuando decide montar con puntos sin
   resolver. No es letra pequeña: es lo que separa una avería cubierta de
   una discusión. Se arma con los puntos altos que quedaron abiertos. */
export function clausulaRiesgo(lista){
  const altos = (lista || []).filter(r => r.nivel === 'alto');
  if (!altos.length) return null;
  return { n: altos.length, puntos: altos.map(r => r.qué),
    texto: 'El cliente ha sido informado por escrito, antes del montaje, de los siguientes '
      + 'puntos de su instalación: ' + altos.map(r => r.qué.toLowerCase()).join('; ') + '. '
      + 'El cliente decide proceder con el montaje sin resolverlos y asume el riesgo. '
      + 'La garantía de Light of Life Energy no cubre las averías que tengan su origen en '
      + 'estos puntos. El resto de la garantía se mantiene íntegra.' };
}
