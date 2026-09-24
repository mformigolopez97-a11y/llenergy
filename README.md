# LLEnergy

Aplicación de trabajo de **Light of Life Energy** para instalaciones solares
residenciales con baterías.

Se instala en el teléfono y **funciona sin conexión**, que es como hace falta
usarla: en un techo, donde muchas veces no hay datos.

## Qué hace

- **Trabajos** — una ficha por cliente, de la visita a la garantía.
- **Visita al techo** — lo que hay que levantar en la casa antes de cotizar.
- **Diseño** — a partir del inversor, la batería y los paneles calcula cómo se
  conectan (en serie o en paralelo), qué protecciones lleva y de cuántos
  amperios, si la batería y el inversor son compatibles, los materiales de
  montaje y la inclinación de los paneles.
- **Dinero** — costes, precio y margen mínimo.

## Dónde viven los datos

**En el teléfono de quien la usa, y en ningún otro sitio.** Los trabajos, los
precios y los márgenes se guardan en el almacenamiento del navegador. No hay
servidor, no hay cuenta y no se sube nada a ninguna parte. Este repositorio
contiene solo el programa.

## Cómo está hecha

Sin librerías ni dependencias. Cinco archivos:

| Archivo | Qué es |
|---|---|
| `index.html` | La pantalla y los estilos |
| `motor.js` | Los cálculos. No toca la interfaz, así se puede probar aparte |
| `datos.js` | Fichas de inversores y baterías |
| `app.js` | Pantallas, trabajos y guardado |
| `sw.js` | Lo que permite abrirla sin conexión y actualizarla sola |

## Sobre los datos técnicos

Los modelos de la lista llevan una marca de confianza: solo se dan por
verificados los que salen de una ficha del fabricante que se pudo abrir y
leer. El resto avisa de qué número concreto está sin confirmar.

**Todos los datos se pueden escribir a mano**: la lista es una comodidad, no
una obligación. Antes de montar nada, los valores buenos son los de la
etiqueta del equipo que se tiene delante.

## Actualizaciones

No hay que desinstalar ni volver a instalar. Al publicar una versión nueva, el
teléfono se la trae solo la próxima vez que tenga señal y la aplica en el
siguiente arranque. Los trabajos guardados no se tocan.
