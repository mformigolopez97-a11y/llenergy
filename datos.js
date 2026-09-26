/* ═══════════════════════════════════════════════════════════════
   LLEnergy · BASE DE EQUIPOS
   Trasladada tal cual desde la calculadora, sin retocar ni un número.

   REGLA: solo lleva ok:true lo que salga de una ficha del fabricante que
   se haya podido abrir y leer. Todo lo demás va con aviso, porque un
   número inventado aquí termina en un equipo quemado.

   Los datos se pueden escribir siempre a mano: esta lista es una
   comodidad, no una obligación.
   ═══════════════════════════════════════════════════════════════ */

export const BATS={
 'manual':{n:'— Otro / meter los datos a mano —',manual:true},
 'fintera-5':{n:'Fintra HZR-100-16S · 5,12 kWh · 51,2 V',v:51.2,ah:100,ides:100,icar:50,ok:false,ficha:'',
   nota:'<b>La marca es Fintra</b> (no Fintera), y el modelo de caja es <b>HZR-100-16S</b>. De la caja y el manual salen confirmados: 51,2 V · 100 Ah · 5.120 Wh · 16 celdas · montaje en pared. <b>Los amperios del BMS no están en la foto</b>, pero el formato 16S de 100 Ah está muy estandarizado: casi todos los fabricantes lo sacan con <b>100 A de descarga (1C) y 50 A de carga (0,5C)</b>, corte de carga a 58,4 V y corte de descarga a 40 V. Esos son los números que hay puestos. Aun así <b>confírmalos en el manual que viene dentro de la caja</b> antes de poner esta batería con un inversor grande: con 100 A de descarga, un inversor de 6 kW no le saca su potencia.'},
 'todo-15360':{n:'InfiniSolar INF20-48300PRO · 15,36 kWh · 51,2 V',v:51.2,ah:300,ides:200,icar:200,ok:true,ficha:'',
   nota:'<b>Datos leídos de la etiqueta del equipo</b>, no estimados: 51,2 V · 300 Ah · 15.360 Wh · <b>200 A de carga y 200 A de descarga</b>. A 200 A y 51,2 V puede soltar más de 10 kW, así que le sobra para un inversor de 6 kW. <b>Cuidado con la temperatura:</b> solo carga entre 0 y 45 °C y descarga entre −10 y 45 °C. En un cuarto cerrado sin ventilación pasa de 45 °C y <b>deja de cargar sola</b>: ponla en sitio fresco y aireado, nunca pegada al techo ni al sol.'},
 'pylontech-us5000':{n:'Pylontech US5000C · 4,8 kWh · 48 V',v:48,ah:100,ides:80,icar:80,dod:0.95,
   vcar:53.5,vflo:52.5,vmin:43.5,ok:true,
   ficha:'https://www.energysynt.com/index.php/file/2022/08/FL065-Rev.001-ENG-Batt-US5000.pdf',
   nota:'Ficha del fabricante. Es de <b>48 V de verdad</b> (15 celdas), no de 51,2 V: se carga a <b>52,5–53,5 V</b> y nunca a 56,8 V. 80 A es a la vez la corriente recomendada y la máxima continua, entre 10 y 40 °C. Descarga hasta el 95 %, o sea 4,56 kWh útiles. Comunica por CAN y RS485.'},
 'gen-51-100':{n:'Genérica 51,2 V · 100 Ah (5,12 kWh)',v:51.2,ah:100,ides:100,icar:50,ok:false,ficha:'',
   nota:'Plantilla del formato más común de rack. Los amperios son los típicos, no los de tu batería concreta: <b>léelos en la etiqueta y corrígelos</b>.'},
 'gen-51-200':{n:'Genérica 51,2 V · 200 Ah (10,24 kWh)',v:51.2,ah:200,ides:200,icar:100,ok:false,ficha:'',
   nota:'Plantilla. Confirma los amperios del BMS en la etiqueta.'},
 'gen-51-280':{n:'Genérica 51,2 V · 280 Ah (14,3 kWh)',v:51.2,ah:280,ides:200,icar:100,ok:false,ficha:'',
   nota:'Plantilla. Confirma los amperios del BMS en la etiqueta.'},
 'ecoworthy-cubix100':{n:'ECO-WORTHY Cubix100 · 5,12 kWh · 51,2 V',v:51.2,ah:100,ides:100,icar:100,dod:0.8,ok:false,
   ficha:'https://www.eco-worthy.com/products/eco-worthy-51-2v-100ah-lifepo4-lithium-battery-5-12kwh-capacity-server-rack-battery',
   nota:'Formato rack de 3U, 16 celdas, 5,12 kWh. BMS de 100 A de carga y de descarga. Certificada UL 1973 y UL 9540A, 6.000 ciclos al 80 % de descarga y 10 años de garantía; admite hasta 32 en paralelo. He dejado la reserva al <b>80 %</b>, que es la profundidad sobre la que el fabricante mide esos ciclos. Datos de la ficha comercial de ECO-WORTHY: <b>no pude abrir el manual técnico</b> para confirmar los voltajes exactos de carga, así que los de abajo salen del número de celdas.'},
 'ecoworthy-50':{n:'ECO-WORTHY 48 V · 50 Ah apilable (2,56 kWh)',v:51.2,ah:50,ides:100,icar:50,dod:0.8,ok:false,
   ficha:'https://www.eco-worthy.com/products/eco-worthy-48v-50ah-stackable-lifepo4-battery',
   nota:'La pequeña apilable: 2,56 kWh por módulo, hasta 32 en paralelo (76,8 kWh). Aguanta descarga a 2C, o sea unos 100 A de punta en 50 Ah. Útil para el cliente que arranca chico y quiere ir sumando módulos sin cambiar nada. Datos de la ficha comercial.'},
 'ecoworthy-314':{n:'ECO-WORTHY PowerMega 314 · 16,07 kWh · 51,2 V',v:51.2,ah:314,ides:200,icar:200,dod:0.8,ok:false,
   ficha:'https://www.eco-worthy.com/products/eco-worthy-48v-314ah-lifepo4-battery-solar-battery-backup-for-home-wall-mount',
   nota:'La grande de pared: 314 Ah, 16,07 kWh, BMS de 200 A con balanceo activo, hasta 15 en paralelo. Alternativa de fabricante identificable y con garantía escrita frente a los todo-en-uno sin marca. Datos de la ficha comercial.'},
 'gen-24-100':{n:'Batería inteligente 25,6 V · 2,56 kWh (100 Ah)',v:25.6,ah:100,ides:100,icar:50,ok:false,ficha:'',
   nota:'La de «2,5 kWh». Es de <b>8 celdas</b>, así que va con inversores de <b>24 V</b> (como el MUST PV33-3024 TLV), <b>nunca con uno de 48 V</b>. Las que llaman «inteligentes» traen pantalla o bluetooth para ver el estado, pero eso no cambia los amperios: <b>los del BMS hay que leerlos en la etiqueta</b>. He puesto 100 A de descarga y 50 A de carga como plantilla, no son dato de fabricante.'},
 'gen-24-200':{n:'Batería inteligente 25,6 V · 5,12 kWh (200 Ah)',v:25.6,ah:200,ides:200,icar:100,ok:false,ficha:'',
   nota:'La misma de 8 celdas pero del doble. Con un inversor de 3 kW a 24 V hace falta este tamaño o dos de 100 Ah en paralelo, porque una sola de 100 Ah no da la corriente. Amperios de plantilla: confírmalos en la etiqueta.'},
};

export const MODELOS={
 'manual':{n:'— Otro / meter los datos a mano —',manual:true},
 'must-6048-eco':{n:'MUST PV18-6048 ECO · 6 kW',kw:6,vnom:48,icar:100,vflot:54.8,vtope:60,pbat:5500,vac:'230',vmax:450,vmin:60,vmpmax:360,nmppt:1,impp:28,ok:true,
   ficha:'https://solarwarehousesa.com/products/must-6kw-6000w-hybrid-inverter-48v-pv18-6048-eco',
   nota:'Ficha oficial de MUST (catálogo PV1800 ECO). Admite hasta 450 V en circuito abierto, pero el MPPT solo regula entre 60 y 360 V. Carga máxima 100 A (solar o red). En modo batería da 5.500 W, no 6.000. Flotación 54,8 V y corte por sobretensión a 60 V. Habla con baterías de litio por CAN.'},
 'must-proii-6k':{n:'MUST PV1800 PRO II · 6 kW',kw:6,vnom:48,icar:100,vflot:54.8,vtope:60,pbat:5500,vac:'230',vmax:500,vmin:120,vmpmax:430,nmppt:1,impp:28,ok:false,
   ficha:'https://www.mustpower.com/',
   nota:'MPPT de 120 a 430 V según el fabricante. Confirma el tope de Voc en la etiqueta del equipo.'},
 'must-proii-4k':{n:'MUST PV1800 PRO II · 4 kW',kw:4,vnom:48,icar:100,vflot:54.8,vtope:60,pbat:3500,vac:'230',vmax:500,vmin:90,vmpmax:430,nmppt:1,impp:22,ok:false,
   ficha:'https://www.mustpower.com/',nota:'MPPT de 90 a 430 V. Confirma en la etiqueta.'},
 'must-5048':{n:'MUST PV18-5048 · 5 kW',kw:5,vnom:48,icar:100,vflot:54.8,vtope:60,pbat:4500,vac:'230',vmax:450,vmin:60,vmpmax:360,nmppt:1,impp:22,ok:false,
   ficha:'https://www.mustpower.com/',nota:'Misma familia que el 6048. Confirma los números en la etiqueta.'},
 'sako-sunon-145':{n:'SAKO Sunon Pro 5,5 kW · versión 145 V',kw:5.5,vnom:48,icar:100,vflot:0,vtope:0,pbat:5500,vac:'230',vmax:145,vmin:60,vmpmax:145,nmppt:1,impp:60,ok:true,
   ficha:'https://sakopower.com/product-sunon-pro-series-5kw-off-solar-inverter',
   nota:'CUIDADO: tope de 145 V. Con paneles de 46 V solo caben DOS en serie. Si le metes 6 en serie lo destruyes al primer amanecer.'},
 'sako-sunon-450':{n:'SAKO Sunon Pro / Sunpolo · versión 450 V',kw:5,vnom:48,icar:100,vflot:0,vtope:0,pbat:5000,vac:'230',vmax:450,vmin:90,vmpmax:430,nmppt:1,impp:22,ok:true,
   ficha:'https://sakopower.com/solar-inverter',
   nota:'La versión de entrada alta. SAKO vende las dos: comprueba en la etiqueta si tu equipo es de 145 V o de 450 V antes de cablear nada.'},
 'growatt-5000es':{n:'Growatt SPF 5000 ES · 5 kW',kw:5,vnom:48,icar:80,vflot:0,vtope:0,pbat:5000,vac:'230',vmax:450,vmin:120,vmpmax:430,nmppt:1,impp:18,ok:true,
   ficha:'https://lifetide.co.za/data-sheets/Growatt%20SPF%205000%20ES%20Data%20Sheet.pdf',
   nota:'Ficha verificada: 450 V máximo de entrada FV y 5000 W de campo solar.'},
 'growatt-6000t':{n:'Growatt SPF 6000T · 6 kW split-phase',kw:6,vnom:48,icar:80,vflot:0,vtope:0,pbat:6000,vac:'240',vmax:450,vmin:120,vmpmax:430,nmppt:2,impp:18,ok:false,
   ficha:'https://us.growatt.com/products/spf-3500-5000-us',
   nota:'Salida split-phase 120/240 V, que encaja bien con el bifásico cubano. Confirma en la etiqueta.'},
 /* ---- iXCEED ----
    Datos leídos de la etiqueta de la caja, no de catálogo. */
 'ixceed-62k':{n:'iXCEED 6.2K48-D120 · 6,2 kW · bifásico',kw:6.2,vnom:48,icar:100,
   vflot:0,vtope:0,pbat:6200,vac:'240',vmax:500,vmin:120,vmpmax:450,nmppt:1,impp:18,ok:true,ficha:'',
   nota:'<b>Etiqueta del equipo, no catálogo.</b> Modelo 6.2K48-D120-IP21, bifásico (115/230 V, 50/60 Hz automático). Paneles: hasta <b>500 V</b> en circuito abierto, MPPT de <b>120 a 450 V</b>, <b>18 A</b> máximos de entrada y hasta <b>7.200 W</b> de campo solar — le cabe más panel que su propia potencia, que es bueno para los días nublados. Batería de 48 V: carga <b>100 A</b> desde el sol y <b>60 A</b> desde la red, y <b>descarga hasta 135 A</b>. A 48 V eso son unos 6,5 kW: sí da sus 6,2 kW. Salida 27 A. Aguanta de −10 a 50 °C.'},

 /* ---- MUST de fase dividida (serie PV3300 TLV) ----
    Datos de la ficha oficial de MUST, hoja "Low Frequency Split Phase
    Solar Inverter · PV3300 TLV Series (1KW-6KW)". Son de baja frecuencia,
    con transformador: arrancan motores mucho mejor que los de alta. */
 'must-tlv-3024':{trae:['brkAC'],n:'MUST PV33-3024 TLV · 3 kW · bifásico · batería 24 V',kw:3,vnom:24,icar:80,
   vflot:27,vtope:0,vac:'240',vmax:145,vmin:30,vmpmax:130,nmppt:1,impp:25,pvmax:2500,acarga:40,arranque:9000,ok:false,
   ficha:'https://www.mustpower.com/product/pv3300-tlv-3kw-6kw/',
   nota:'<b>OJO: estos números salen de un catálogo de MUST, y la etiqueta del equipo de 6 kW dice otra cosa</b> (245 V y MPPT de 60 a 230, en vez de 145 y 30-130). Son dos generaciones del mismo producto. <b>Lee la etiqueta de tu unidad antes de cablear.</b> Según el catálogo: sale en <b>fase dividida</b> (HOT1 + neutro + HOT2), o sea 110/120 V y 220/240 V a la vez: es la topología de la red cubana. Frecuencia ajustable a 60 Hz. <b>Ojo con los paneles: solo aguanta 145 V en circuito abierto</b> y el MPPT regula de 30 a 130 V, así que con paneles de 46 V caben <b>dos en serie, no más</b>. Campo solar máximo 2.500 W, carga 80 A. Arranque de motor 9.000 VA, que es mucho para 3 kW: es de baja frecuencia, con transformador. La corriente máxima de entrada FV no viene en la ficha; he puesto 25 A por el campo máximo, compruébalo.'},
 'must-tlv-3048':{trae:['brkAC'],n:'MUST PV33-3048 TLV · 3 kW · bifásico · batería 48 V',kw:3,vnom:48,icar:80,
   vflot:54,vtope:0,vac:'240',vmax:145,vmin:60,vmpmax:130,nmppt:1,impp:25,pvmax:5000,acarga:20,arranque:9000,ok:false,
   ficha:'https://www.mustpower.com/product/pv3300-tlv-3kw-6kw/',
   nota:'El mismo de 3 kW pero con batería de <b>48 V</b> en vez de 24 V. Con 48 V el inversor tira la mitad de corriente de la batería, así que el BMS sufre mucho menos. Mismos límites de paneles: 145 V máximo y MPPT de 60 a 130 V.'},
 'must-tlv-6048':{trae:['brkAC'],n:'MUST PV33-6048 TLV · 6 kW · bifásico · batería 48 V',kw:6,vnom:48,icar:80,
   vflot:54,vtope:0,pbat:6000,vac:'240',vmax:245,vmin:60,vmpmax:230,nmppt:1,impp:25,pvmax:5000,acarga:40,arranque:18000,ok:true,
   ficha:'https://www.mustpower.com/product/pv3300-tlv-3kw-6kw/',
   nota:'<b>Etiqueta del equipo.</b> Salida bifásica <b>120/240 V</b> a 50/60 Hz, 25 A. Entrada CC de batería <b>147 A</b>. Paneles: <b>245 V</b> máximos en circuito abierto y MPPT de <b>60 a 230 V</b> — con paneles de 46 V caben <b>cuatro en serie</b>. Carga solar 80 A y desde la red 40 A. <b>Ojo: trabaja solo entre 0 y 40 °C</b>, que es un rango estrecho para un cuarto caluroso en Santiago; ponlo donde corra el aire.'},
 'must-tlv-5048':{trae:['brkAC'],n:'MUST PV33-5048 TLV · 5 kW · bifásico · batería 48 V',kw:5,vnom:48,icar:80,
   vflot:54,vtope:0,vac:'240',vmax:145,vmin:60,vmpmax:130,nmppt:1,impp:30,pvmax:5000,acarga:35,arranque:15000,ok:false,
   ficha:'https://www.mustpower.com/product/pv3300-tlv-3kw-6kw/',
   nota:'Ficha oficial. Campo solar 5.000 W, arranque 15.000 VA. <b>Mismo tope de 145 V en los paneles</b>: dos en serie con paneles de 46 V.'},
 'must-tlv-1024':{trae:['brkAC'],n:'MUST PV33-1024 TLV · 1 kW · bifásico · batería 24 V',kw:1,vnom:24,icar:60,
   vflot:27,vtope:0,vac:'240',vmax:100,vmin:16,vmpmax:95,nmppt:1,impp:15,ok:true,
   ficha:'https://www.mustpower.com/product/pv3300-tlv-3kw-6kw/',
   nota:'<b>Este modelo no aparece en la ficha actual de MUST</b>, solo en una anterior: puede estar descatalogado o llamarse ya de otra forma. Según esa ficha vieja, <b>solo 100 V en circuito abierto</b> y MPPT de 16 a 95 V: con paneles de 46 V cabe <b>uno solo en serie</b>. Campo solar 1.250 W. Para una casa muy básica o un cuarto.'},

 /* ---- PowMr ---- */
 'powmr-62k-450':{n:'PowMr POW-HVM6.2K · 6,2 kW · ventana 60–450 V',kw:6.2,vnom:48,icar:120,vflot:0,vtope:0,pbat:6200,
   vac:'230',vmax:450,vmin:60,vmpmax:430,nmppt:1,impp:27,ok:false,
   ficha:'https://powmr.com/products/all-in-one-inverter-charger-for-parallel-6200w-220vac-48vdc',
   nota:'<b>PowMr vende el mismo «6,2 kW» con varias ventanas de MPPT distintas</b> según el sufijo (-K, -M, -N, -E, -LIP, -PRO): unas regulan de 60 a 450 V y otras de 90 a 500 V. Esta es la de 60–450 V. Salida 220–230 V, controlador MPPT de 120 A, corriente máxima de entrada FV 27 A. <b>Datos de tienda, no de ficha del fabricante</b> (su web me bloqueó el acceso): antes de cablear, lee la etiqueta lateral y comprueba la ventana de tu unidad.'},
 'powmr-62k-500':{n:'PowMr POW-HVM6.2M / -N · 6,2 kW · ventana 90–500 V',kw:6.2,vnom:48,icar:120,vflot:0,vtope:0,pbat:6200,
   vac:'230',vmax:500,vmin:90,vmpmax:480,nmppt:1,impp:27,ok:false,
   ficha:'https://www.solar-stack.com/en/inverter/powmr/pow-hvm6-2m-48v-n',
   nota:'La variante de entrada alta: hasta 500 V en circuito abierto y MPPT de 90 a 500 V. Mismo cuerpo y mismo nombre comercial que la de 60–450 V. <b>Equivocarse de variante destroza el inversor al primer amanecer frío</b>, igual que pasa con las dos SAKO. Datos de tienda, no de ficha oficial.'},
 'powmr-6500':{n:'PowMr 6,5 kW híbrido (POW-HVM6.5K)',kw:6.5,vnom:48,icar:100,vflot:0,vtope:0,pbat:6500,
   vac:'230',vmax:500,vmin:120,vmpmax:450,nmppt:1,impp:22,ok:false,
   ficha:'https://eu.powmr.com/products/hybrid-inverter-charger-6500w-220vac-48vdc',
   nota:'No conseguí abrir la ficha oficial (su servidor rechaza el acceso automático). Los números son de catálogo de tienda: <b>métele los de la etiqueta a mano antes de dimensionar</b>.'},

 /* ---- SUMRY (ojo: se escribe SUMRY, no SUMRI) ---- */
 'sumry-sp-62':{n:'SUMRY SP 6,2 kW · 48 V',kw:6.2,vnom:48,icar:110,vflot:0,vtope:0,pbat:6200,
   vac:'230',vmax:450,vmin:55,vmpmax:430,nmppt:1,impp:22,ok:false,
   ficha:'https://manuals.plus/category/sumry',
   nota:'Serie SP, la que más se ve. MPPT de 55 a 450 V, tope de 450 V en circuito abierto, controlador solar de 110 A y campo solar máximo de 6 kW. <b>La corriente máxima de entrada FV no la pude confirmar</b>: he puesto 22 A, que es lo normal en esta clase, pero compruébalo. El fabricante no publica ficha abierta; los datos son del manual de usuario indexado.'},
 'sumry-sp-42':{n:'SUMRY SP 4,2 kW · 48 V',kw:4.2,vnom:48,icar:80,vflot:0,vtope:0,pbat:4200,
   vac:'230',vmax:450,vmin:55,vmpmax:430,nmppt:1,impp:18,ok:false,
   ficha:'https://manuals.plus/category/sumry',
   nota:'Misma familia que el de 6,2 kW, con campo solar más pequeño. Carga solar 60–80 A según la versión. Datos del manual de usuario, no de ficha oficial: confirma en la etiqueta.'},
 'sumry-102':{n:'SUMRY 10,2 kW · 48 V · doble MPPT',kw:10.2,vnom:48,icar:160,vflot:0,vtope:0,pbat:10200,
   vac:'230',vmax:500,vmin:90,vmpmax:480,nmppt:2,impp:22,ok:false,
   ficha:'https://manuals.plus/category/sumry',
   nota:'El grande de SUMRY: dos MPPT independientes, hasta 500 V de entrada y 160 A de carga. Para casas con aire acondicionado o taller. Datos de catálogo, no de ficha oficial.'},

 /* ---- ECO-WORTHY (salida bifásica 120/240 V, igual que la red cubana) ---- */
 'ecoworthy-6k':{n:'ECO-WORTHY 6 kW · bifásico 120/240 V',kw:6,vnom:48,icar:120,vflot:0,vtope:0,pbat:6000,
   vac:'240',vmax:500,vmin:125,vmpmax:425,nmppt:1,impp:27,ok:false,
   ficha:'https://www.eco-worthy.com/products/eco-worthy-6kw-solar-off-grid-split-phase-aio-inverter-48vdc-to-240vac-9kw-500v-pv-input',
   nota:'<b>Sale en 120/240 V bifásico, que es exactamente la topología de la red cubana</b> — encaja mejor que un europeo de 230 V. Campo solar hasta 9 kW, 500 V en circuito abierto, MPPT de 125 a 425 V, carga solar 120 A, pico 12 kW, hasta 6 en paralelo. Datos de la ficha comercial del fabricante; no pude abrir el manual técnico para confirmar la corriente de entrada FV (he puesto 27 A).'},
 'ecoworthy-5k':{n:'ECO-WORTHY 5 kW · 48 V',kw:5,vnom:48,icar:80,vflot:0,vtope:0,pbat:5000,
   vac:'120',vmax:500,vmin:120,vmpmax:450,nmppt:1,impp:22,ok:false,
   ficha:'https://www.eco-worthy.com/products/5000w-solar-hybrid-inverter-charger-48v-dc-to-120v-240v-ac-split-phase-power-inverter',
   nota:'Campo solar 5.500 W, entrada de 120 a 500 V, carga solar 80 A, pico 10 kW. <b>Cuidado con la salida:</b> el título oficial dice 120 V y algunas tiendas lo anuncian como bifásico 120/240. Son cosas distintas y cambian todo el cableado de la casa: <b>confírmalo antes de comprarlo</b>.'},
 'ecoworthy-10k':{n:'ECO-WORTHY 10 kW · bifásico · doble MPPT',kw:10,vnom:48,icar:200,vflot:0,vtope:0,pbat:10000,
   vac:'240',vmax:500,vmin:120,vmpmax:450,nmppt:2,impp:27,ok:false,
   ficha:'https://www.eco-worthy.com/products/eco-worthy-10000w-solar-off-grid-inverter-charger-48v-dc-to-240v-ac-split-phase-power-inverter',
   nota:'Dos MPPT de 5.500 W cada uno (11 kW de paneles en total) y hasta 200 A de carga de batería. Salida bifásica 120/240 V. Datos de la ficha comercial.'},
};

/* ═══════════════════════════════════════════════════════════════
   PRECIOS DE REFERENCIA EN CUBA
   Pasados por Marcos el 2026-09-25, de proveedor y de tienda.
   Son precios de COMPRA, no de venta.

   No son eternos: en Cuba se mueven. Por eso cada uno lleva fecha,
   y la app los usa solo como punto de partida editable.
   ═══════════════════════════════════════════════════════════════ */
export const PRECIOS = {
  fecha: '25 de septiembre de 2026',
  cambio: 705,          // CUP por 1 USD ese día
  piezas: {
    varillaTierra:   { n:'Varilla de tierra',                  usd:60, de:'Infinity Energy' },
    brkDC125:        { n:'Breaker CC 125 A · 3 polos',         usd:35, de:'Infinity Energy' },
    cajaBreakers:    { n:'Caja de breakers · 12 posiciones',   usd:30, de:'Infinity Energy' },
    protVoltaje:     { n:'Protector de voltaje digital',       usd:30, de:'Infinity Energy' },
    extintor:        { n:'Heat Aerosol · extintor de tablero', usd:30, de:'Infinity Energy' },
    brkDC63:         { n:'Breaker CC 63 A',                    usd:25, de:'Infinity Energy' },
    spd:             { n:'SPD · sobretensiones, riel DIN',     usd:25, de:'Infinity Energy' },
    contactor:       { n:'Contactor modular 63 A · 4 polos',   usd:60, de:'Infinity Energy' },
    terminal35:      { n:'Terminal de batería SC-35',          usd:2,  de:'AGH Holguín' },
    terminal50:      { n:'Terminal de batería SC-50',          usd:3,  de:'AGH Holguín' },
    derrameAgua:     { n:'Derrame de agua para panel',         usd:2,  de:'AGH Holguín' },
  },
  /* los cables FV ya vienen con sus MC4 puestos */
  cableFV: [[1,20],[3,38],[6,50],[10,85]],   // metros, USD · AGH Holguín
  packs: {
    proteccion: { n:'Pack de protección eléctrica', usd:125, de:'Infinity Energy',
      lleva:['SPD','Breaker CC 63 A','Heat Aerosol','Breaker CC 125 A 3P','Protector de voltaje 120 V 63 A'],
      falta:['Diferencial de 30 mA','Fusible Clase T','Varilla de tierra','Caja de breakers'] },
    brequera36: { n:'Brequera llena cableada · inversor de 3 a 6 kW', usd:200, de:'AGH Holguín',
      lleva:['15 piezas montadas y cableadas','PV IN','DC OUT','BAT','INPUT AC','OUTPUT AC','2 protectores de voltaje'],
      falta:['Por confirmar: SPD, diferencial de 30 mA y fusible Clase T'] },
    brequera1012: { n:'Brequera llena · inversor de 10 a 12 kW', usd:322, de:'AGH Holguín',
      lleva:['Montada y cableada','Modificable según el sistema'],
      falta:['Por confirmar: SPD, diferencial de 30 mA y fusible Clase T'] },
  },
};

/* ═══════════════════════════════════════════════════════════════════════
   APARATOS DE UNA CASA CUBANA

   Sirve para deducir qué kit pide la casa a partir de lo que el técnico
   encuentra en la visita, en vez de adivinarlo.

   ─── De dónde salen estos números ───
   Son los VALORES ESTÁNDAR del aparato, no medidos en la casa del cliente:
   la placa del fabricante, o el consumo típico del formato cuando la placa
   ya no se lee. Marcos los pidió así a propósito, porque lleva cuatro años
   fuera de Cuba y no tiene medidas propias. Cada uno se puede corregir a
   mano en la pantalla, y si el técnico mide con una pinza amperimétrica,
   ese número manda sobre este.

   ─── Qué significa cada campo ───
   g   grupo, solo para ordenar la lista
   n   nombre como se le dice en Cuba
   w   vatios de marcha, ya en régimen
   arr veces que esos vatios se multiplican en el arranque (los motores)
   h   horas al día que anda, en una casa normal
   hn  de esas horas, las que caen sin sol: esto es lo que dimensiona la
       batería, no el consumo del día entero
   p   true = puntual: no anda todo el tiempo, se usa a ratos
   es  true = entra en el paquete de lo imprescindible, que es lo que de
       verdad compra la mayoría de los clientes cubanos
   av  aviso que hay que leer antes de cotizar con ese aparato dentro
   ═══════════════════════════════════════════════════════════════════════ */
export const APARATOS = {
  /* ── Frío: es el gasto que nunca para ── */
  nevera:      {g:'Frío', n:'Nevera de 7 a 10 pies', w:150, arr:4, h:8, hn:4, es:true,
    av:'El compresor arranca tirando unas <b>4 veces</b> su consumo de marcha. Un inversor justo de potencia se apaga en ese tirón aunque le sobre capacidad el resto del día.'},
  neveraInv:   {g:'Frío', n:'Nevera moderna inverter', w:90, arr:2, h:9, hn:4.5, es:true},
  freezer:     {g:'Frío', n:'Freezer / congelador de casa', w:200, arr:4, h:8, hn:4},
  exhibidora:  {g:'Frío', n:'Nevera exhibidora o vitrina (negocio)', w:350, arr:4, h:12, hn:6,
    av:'Una exhibidora se lleva sola unos <b>4 kWh al día</b> y no se puede apagar de noche. Si el cliente tiene un negocio, este aparato manda en el tamaño de la batería.'},

  /* ── Climatización ── */
  aire9:       {g:'Climatización', n:'Aire de 9.000 BTU · inverter', w:750, arr:2, h:8, hn:8},
  aire12inv:   {g:'Climatización', n:'Aire de 12.000 BTU · inverter', w:1000, arr:2, h:8, hn:8},
  aire12:      {g:'Climatización', n:'Aire de 12.000 BTU · corriente (no inverter)', w:1400, arr:4, h:8, hn:8,
    av:'Un aire que no es inverter arranca tirando <b>cuatro veces</b> su consumo y anda a todo o nada. En un sistema solar cuesta casi el doble que uno inverter. Cambiar el aire suele salir más barato que agrandar el inversor y la batería.'},
  aire18:      {g:'Climatización', n:'Aire de 18.000 BTU', w:1700, arr:3, h:8, hn:8},
  ventTecho:   {g:'Climatización', n:'Ventilador de techo', w:60, arr:1, h:10, hn:8, es:true},
  ventPie:     {g:'Climatización', n:'Ventilador de pie o de mesa', w:55, arr:2, h:10, hn:8, es:true},
  extractor:   {g:'Climatización', n:'Extractor de baño o cocina', w:40, arr:2, h:1, hn:0.5, p:true},

  /* ── Agua: en Cuba la bomba no es un lujo, es como entra el agua ── */
  bomba05:     {g:'Agua', n:'Bomba de agua de 1/2 HP', w:550, arr:5, h:1, hn:0, p:true, es:true,
    av:'La bomba es el arranque más bruto de la casa: <b>cinco veces</b> su consumo durante un segundo. El inversor se dimensiona por ese tirón, no por su consumo.'},
  bomba1:      {g:'Agua', n:'Bomba de agua de 1 HP', w:900, arr:5, h:1, hn:0, p:true},
  bombaPozo:   {g:'Agua', n:'Bomba sumergible de pozo · 1,5 HP', w:1300, arr:4, h:1.5, hn:0, p:true},
  ducha:       {g:'Agua', n:'Ducha eléctrica / calentador de paso', w:4000, arr:1, h:0.7, hn:0.4, p:true,
    av:'<b>Esto solo ya pide un inversor de 5 o 6 kW</b> aunque el resto de la casa quepa en 3 kW, y se lleva 2,8 kWh al día. Lo barato es sacarla del sistema solar y dejarla en la red, o cambiarla por una de gas. Dilo antes de cotizar, no después.'},
  termo:       {g:'Agua', n:'Termo eléctrico de tanque', w:1500, arr:1, h:2, hn:0.5, p:true},

  /* ── Cocina: los módulos de la Revolución Energética están en toda casa ── */
  ollaArroz:   {g:'Cocina', n:'Olla arrocera (olla reina)', w:700, arr:1, h:1, hn:0.5, p:true, es:true},
  ollaPresion: {g:'Cocina', n:'Olla de presión eléctrica', w:900, arr:1, h:0.8, hn:0.4, p:true},
  ollaMulti:   {g:'Cocina', n:'Olla multipropósito', w:1000, arr:1, h:1, hn:0.5, p:true},
  hornilla:    {g:'Cocina', n:'Hornilla eléctrica de resistencia', w:1000, arr:1, h:1.5, hn:0.7, p:true},
  induccion:   {g:'Cocina', n:'Hornilla de inducción', w:1800, arr:1, h:1, hn:0.5, p:true,
    av:'Gasta menos por comida que la de resistencia, pero tira <b>1.800 W de golpe</b>. Si se enciende justo cuando arranca la nevera, el inversor tiene que aguantar las dos cosas a la vez.'},
  microondas:  {g:'Cocina', n:'Microondas', w:1200, arr:1, h:0.3, hn:0.2, p:true},
  hornoElec:   {g:'Cocina', n:'Horno eléctrico', w:1500, arr:1, h:0.5, hn:0.3, p:true},
  cafetera:    {g:'Cocina', n:'Cafetera eléctrica', w:600, arr:1, h:0.3, hn:0, p:true},
  batidora:    {g:'Cocina', n:'Batidora', w:350, arr:2, h:0.2, hn:0.1, p:true},

  /* ── La casa ── */
  led:         {g:'Casa', n:'Bombillo LED', w:9, arr:1, h:5, hn:5, es:true},
  ahorrador:   {g:'Casa', n:'Bombillo ahorrador viejo (CFL)', w:20, arr:1, h:5, hn:5,
    av:'Cambiar los ahorradores viejos por LED cuesta poco y baja el consumo de luz a menos de la mitad. Es la forma más barata de que la casa quepa en un kit más chico.'},
  tv32:        {g:'Casa', n:'Televisor LED de 32 pulgadas', w:50, arr:1, h:5, hn:4, es:true},
  tv55:        {g:'Casa', n:'Televisor LED de 55 pulgadas', w:110, arr:1, h:5, hn:4},
  router:      {g:'Casa', n:'Router de Nauta Hogar', w:12, arr:1, h:24, hn:12, es:true},
  cargadores:  {g:'Casa', n:'Cargadores de teléfono (todos)', w:10, arr:1, h:4, hn:3, es:true},
  laptop:      {g:'Casa', n:'Computadora portátil', w:65, arr:1, h:4, hn:2},
  pcMesa:      {g:'Casa', n:'Computadora de mesa', w:200, arr:1, h:4, hn:2},
  plancha:     {g:'Casa', n:'Plancha', w:1000, arr:1, h:0.5, hn:0.2, p:true},
  lavAuto:     {g:'Casa', n:'Lavadora automática', w:500, arr:3, h:1, hn:0, p:true},
  lavDosTinas: {g:'Casa', n:'Lavadora de dos tinas (semiautomática)', w:350, arr:3, h:1, hn:0, p:true, es:true},
  coser:       {g:'Casa', n:'Máquina de coser', w:100, arr:2, h:1, hn:0.3, p:true},
  secadora:    {g:'Casa', n:'Secadora de pelo', w:1500, arr:1, h:0.2, hn:0.1, p:true},
  porton:      {g:'Casa', n:'Motor de portón', w:550, arr:4, h:0.1, hn:0.05, p:true},

  /* ── Negocio en la casa: cambia el sistema por completo ── */
  congBiz:     {g:'Negocio', n:'Congelador horizontal grande', w:300, arr:4, h:10, hn:5},
  hornoPizza:  {g:'Negocio', n:'Horno de pizza eléctrico', w:2500, arr:1, h:3, hn:2, p:true,
    av:'<b>2.500 W durante tres horas son 7,5 kWh</b>, casi el doble de lo que gasta una casa entera. Un negocio de comida no cabe en un kit doméstico: cotízalo aparte.'},
  batidosBiz:  {g:'Negocio', n:'Máquina de batidos o helado', w:600, arr:3, h:2, hn:1, p:true},
  compresor:   {g:'Negocio', n:'Compresor de aire pequeño', w:1100, arr:5, h:1, hn:0, p:true},
  soldadora:   {g:'Negocio', n:'Soldadora eléctrica pequeña', w:3500, arr:2, h:0.5, hn:0, p:true,
    av:'<b>No la pongas en el sistema solar.</b> Tira 3.500 W a golpes y con picos del doble: apaga el inversor y con el tiempo lo mata. Va en la red, con su propio breaker.'},
};
