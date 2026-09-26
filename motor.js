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

  return { filas, porFila, presMedio, presExtremo,
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

  return {
    enSerie: g.best.s, cadenas: cad, dist,
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
export function compatibilidad(d, inv, bat){
  const celdas = Math.max(1, Math.round(d.Vbat / 3.2));
  const r1 = x => Math.round(x * 10) / 10;
  const pub = !!(bat && bat.vcar && bat.vflo && bat.vmin);
  const vAbs = pub ? bat.vcar : r1(celdas * 3.55);
  const vFlo = pub ? bat.vflo : r1(celdas * 3.40);
  const vMin = pub ? bat.vmin : r1(celdas * 2.90);
  const vCel = r1(celdas * 3.65);
  const dod  = (bat && bat.dod) || 0.9;

  const filas = [];
  const add = (estado, tit, valor, nota) => filas.push({ estado, tit, valor, nota });

  // voltaje
  let vOK = true;
  if (inv && !inv.manual && inv.vnom){
    vOK = d.Vbat >= inv.vnom * 0.85 && d.Vbat <= inv.vnom * 1.25;
    add(vOK ? 'ok' : 'bad', 'Voltaje', d.Vbat + ' V ↔ ' + inv.vnom + ' V',
      vOK ? 'Encajan. Son ' + celdas + ' celdas de litio en serie.'
          : 'NO encajan. El inversor es de ' + inv.vnom + ' V y la batería de ' + d.Vbat + ' V.');
  } else {
    add('warn', 'Voltaje', d.Vbat + ' V',
      'El inversor está en modo manual: comprueba en su etiqueta que sea de la misma clase.');
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
        + (Pdesc < d.P ? ' En modo batería este inversor da ' + Pdesc + ' W, no ' + d.P + ' W.' : ''));

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
      : 'Bien, dentro de lo que admite la batería.');

  // tope de tensión
  if (inv && !inv.manual){
    if (inv.vtope){
      const ok = inv.vtope > vAbs + 1;
      add(ok ? 'ok' : 'warn', 'Tope de carga', inv.vtope + ' V corta · ' + vAbs + ' V carga',
        ok ? 'Hay hueco de sobra: la carga completa nunca dispara la protección.'
           : 'Va demasiado justo: puede cortarte la carga antes de tiempo.');
    } else {
      add('warn', 'Tope de carga', 'sin confirmar · ' + vAbs + ' V carga',
        'De este inversor no tengo el voltaje al que corta por sobretensión. '
        + 'Comprueba en su menú que la protección esté por encima de ' + vAbs + ' V.');
    }
  }

  // recarga y reserva
  const horas = d.kWp > 0 ? d.kWh / (d.kWp * 0.75) : 0;
  add('info', 'Recarga', (Math.round(horas*10)/10) + ' h de sol',
    'Llenar ' + r1(d.kWh) + ' kWh desde vacío con ' + r1(d.kWp)
    + ' kWp. En Santiago cuenta con 5 horas útiles al día.');

  const util = d.kWh * dod;
  add('info', 'Reserva útil', r1(util) + ' kWh',
    'Al ' + Math.round(dod*100) + ' % de descarga. Da unas ' + r1(util/0.5)
    + ' h con 500 W, o ' + r1(util/1.5) + ' h con 1,5 kW.');

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
    + 'El Clase T es el de siempre, pero en Cuba no se encuentra: abajo tienes los que sí sirven');
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

/* ═══════════════ 8 ter · QUÉ PONER SI NO HAY FUSIBLE CLASE T ═══════════════
   En Cuba el Clase T no se consigue. Lo que hay que buscar no es la marca
   ni el nombre: es el PODER DE CORTE en corriente continua. Un fusible o
   breaker de coche o de casa apaga bien 230 V alternos, donde la corriente
   pasa por cero cien veces por segundo y el arco se apaga solo. En continua
   la corriente nunca pasa por cero: el arco sigue ardiendo hasta que algo
   lo corta de verdad. Por eso el número que hay que exigir es en CC. */
export function sustitutosFusible(d){
  const kA = '≥ 10 kA';
  const V = Math.ceil(d.Vbat * 1.4 / 10) * 10;
  return [
    { n:'Breaker CC de varios polos, cableados en serie', bien:true, elegido:true,
      v:d.brkDC + ' A · ' + V + ' V CC · 35 USD',
      t:'<b>Este es el que se usa. Decidido, no es una opción más.</b> '
        + 'Los breakers de continua de 3 o 4 polos se cablean con <b>todos los polos en serie dentro del '
        + 'mismo circuito</b>: cada polo parte el arco y entre todos sí lo apagan. '
        + 'El de <b>125 A y 3 polos a 35 USD</b> es exactamente eso. '
        + 'Al pedirlo confirma dos cosas: el <b>poder de corte en corriente continua</b> y que el '
        + 'fabricante admite cablear los polos en serie.' },
    { n:'Fusible MRBF de borne', bien:true,
      v:d.fusT + ' A · 10 kA',
      t:'Se atornilla directo al borne positivo de la batería. Pensado para barcos y para litio, con poder '
        + 'de corte alto en continua hasta 58 V. Si aparece uno, es el sustituto más limpio del Clase T.' },
    { n:'Fusible NH (cuchilla industrial) con dato de CC', bien:true,
      v:d.fusT + ' A · ' + kA,
      t:'Los NH00 o NH1 con su base son comunes en material industrial y cortan muchísimo. '
        + '<b>Ojo:</b> casi todos vienen con el dato en alterna. Sirve solo si la ficha dice también '
        + 'el poder de corte <b>en corriente continua</b> a ' + V + ' V.' },
    { n:'Fusible ANL o MEGA', bien:false,
      v:d.fusT + ' A · 2–6 kA',
      t:'Baratos y fáciles de encontrar, pero <b>cortan mucho menos</b>. Valen para un sistema pequeño; '
        + 'con un banco de litio grande se pueden quedar cortos y abrirse hechos un arco.' },
    { n:'Breaker normal de casa', bien:false,
      v:'NO', color:'bad',
      t:'<b>Esto no.</b> Un magnetotérmico de alterna en un circuito de continua no apaga el arco: '
        + 'lo mantiene. Es de los errores que terminan en incendio.' },
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
  if (!String(v.consumo || '').trim())
    pon('Visita', 'Qué consume la casa',
      'Sin eso no se puede decir si el equipo le va a dar de verdad');
  if (v.neutro === 'sin revisar')
    pon('Visita', 'Estado del neutro',
      'Es la causa número uno de equipos quemados en Cuba');

  return L;
}