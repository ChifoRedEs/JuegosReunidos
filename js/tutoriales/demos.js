// Demostraciones animadas («Así se juega») que se insertan como 2.º paso de los tutoriales. Cada una: { h: texto previo, marcos: [[escena, explicación], …] }
import { cartaEs as E, cartaFr as F, ficha, fila } from '../core/tutorial.js';
import { escena as HE } from '../games/puenteshashi/mini.js';
const R = (l, h) => `<div class="tt-esc"><small>${l}</small>${h}</div>`;
const M = (...r) => r.join('');
const mesa = h => R('Mesa', fila(h));
const mano = (h, l = 'Tu mano') => R(l, fila(h));
export const DEMOS = {};
const c = (n, p) => E(n, p), fr = (n, p) => F(n, p);

DEMOS.hijoputa = { h: '<p>Mira una mini-partida: te voy enseñando cada jugada.</p>', marcos: [
  [M(mesa(c(4, 'copas')), mano(c(4, 'espadas') + c(7, 'copas') + c(2, 'bastos') + c(10, 'oros'))), 'Empiezas. La última carta de la mesa es el <b>4 de copas</b>.'],
  [M(mesa(c(4, 'copas') + c(7, 'copas')), mano(c(4, 'espadas') + c(2, 'bastos') + c(10, 'oros'))), 'Juegas el <b>7 de copas</b>: mismo <b>palo</b>. (También valía el 4 de espadas: mismo <b>número</b>.)'],
  [M(mesa(c(7, 'copas') + c(2, 'copas')), mano(c(4, 'espadas') + c(2, 'bastos') + c(10, 'oros'))), 'Un rival tira un <b>2 de copas</b>: te toca <b>robar 2 y perder el turno</b>… salvo que tengas otro 2.'],
  [M(mesa(c(2, 'copas') + c(2, 'bastos')), mano(c(4, 'espadas') + c(10, 'oros'))), 'Tienes el <b>2 de bastos</b>: lo encadenas y el siguiente jugador roba <b>4</b>.'],
  [M(mesa(c(2, 'bastos') + c(10, 'espadas')), mano(c(4, 'espadas'))), 'La <b>sota</b> es comodín: la tiras y eliges palo. Te queda <b>una carta</b>…'],
  [M(R('¡Importante!', '<span class="grande">🗣️ ¡Hijoputa!</span>'), mano(c(4, 'espadas'))), 'Con una sola carta tienes que pulsar <b>¡Hijoputa!</b>. Si se te olvida y te pillan, robas 5. Gana quien se queda sin cartas.'],
] };
DEMOS.cinquillo = { h: '<p>Así avanzan las filas de la mesa:</p>', marcos: [
  [M(mesa(c(5, 'oros')), mano(c(6, 'oros') + c(4, 'oros') + c(5, 'copas') + c(12, 'bastos'))), 'Empieza quien tiene el <b>5 de oros</b>. Los demás colocan sus cartas junto a él.'],
  [M(mesa(c(5, 'oros') + c(6, 'oros')), mano(c(4, 'oros') + c(5, 'copas') + c(12, 'bastos'))), 'El <b>6 de oros</b> sigue la fila hacia arriba.'],
  [M(mesa(c(4, 'oros') + c(5, 'oros') + c(6, 'oros')), mano(c(5, 'copas') + c(12, 'bastos'))), 'El <b>4 de oros</b> la hace crecer hacia abajo.'],
  [M(R('Oros', fila(c(4, 'oros') + c(5, 'oros') + c(6, 'oros'))) + R('Copas', fila(c(5, 'copas'))), mano(c(12, 'bastos'))), 'El <b>5 de copas</b> abre una fila nueva. Solo se abre con un 5.'],
  [M(mano(c(12, 'bastos')), '<span class="grande">⏭ Pasas</span>'), 'El rey de bastos aún no se puede poner (no hay 5 de bastos). Si no puedes jugar, <b>pasas</b>. Quien se queda sin cartas gana la mano.'],
] };
DEMOS.chinchon = { h: '<p>Una mano de ejemplo hasta cerrar:</p>', marcos: [
  [mano(c(6, 'oros') + c(6, 'copas') + c(6, 'espadas') + c(3, 'bastos') + c(4, 'bastos') + c(1, 'copas') + c(12, 'oros')), 'Recibes 7 cartas. Ya tienes un <b>trío</b> de seises y dos cartas de una posible escalera.'],
  [M(mano(c(6, 'oros') + c(6, 'copas') + c(6, 'espadas') + c(3, 'bastos') + c(4, 'bastos') + c(1, 'copas') + c(12, 'oros')), R('Robas', fila(c(5, 'bastos')))), 'Robas del mazo el <b>5 de bastos</b>: ¡completa la escalera 3-4-5!'],
  [M(mano(c(6, 'oros') + c(6, 'copas') + c(6, 'espadas') + c(3, 'bastos') + c(4, 'bastos') + c(5, 'bastos') + c(1, 'copas') + c(12, 'oros')), '<small>Debes tirar una</small>'), 'Ahora tienes 8 cartas: tiras la <b>más alta suelta</b> (el rey, 10 puntos).'],
  [mano(c(6, 'oros') + c(6, 'copas') + c(6, 'espadas') + c(3, 'bastos') + c(4, 'bastos') + c(5, 'bastos') + c(1, 'copas'), 'Te queda 1 suelta (el as = 1 punto)'), 'Puedes <b>cerrar</b> si lo sueltas está dentro del límite. Si cierras con todo combinado ganas <b>−10</b>. Los rivales suman sus cartas sueltas.'],
] };
DEMOS.continental = { h: '<p>Un turno de la ronda de «dos tríos»:</p>', marcos: [
  [mano(fr(9, 'picas') + fr(9, 'corazones') + fr(4, 'treboles') + fr(4, 'diamantes') + fr(13, 'picas') + fr(2, 'corazones') + fr(7, 'diamantes')), 'Ronda 1: contrato <b>dos tríos</b>. Tienes ya dos parejas (9 y 4).'],
  [M(mesa(fr(4, 'picas')), mano(fr(9, 'picas') + fr(9, 'corazones') + fr(4, 'treboles') + fr(4, 'diamantes') + fr(13, 'picas') + fr(2, 'corazones') + fr(7, 'diamantes'))), 'El descarte es un <b>4 de picas</b>: lo robas para formar el trío de cuatros.'],
  [M(mano(fr(9, 'picas') + fr(9, 'corazones') + '<span style="width:10px"></span>' + fr(4, 'treboles') + fr(4, 'diamantes') + fr(4, 'picas') + fr(13, 'picas') + fr(2, 'corazones') + fr(7, 'diamantes'), 'Tras robar')), 'Te falta un tercer 9 para el otro trío…'],
  [M(mano(fr(9, 'picas') + fr(9, 'corazones') + fr(9, 'diamantes') + '<span style="width:10px"></span>' + fr(4, 'treboles') + fr(4, 'diamantes') + fr(4, 'picas'), 'Cumples el contrato: 🔽 Bajarse')), 'Con el 9 de diamantes tienes <b>dos tríos</b>: pulsas <b>Bajarse</b>. Después descartas y, a partir del turno siguiente, puedes colocar cartas sueltas.'],
] };
DEMOS.rummy = { h: '<p>Jugadas típicas con las fichas:</p>', marcos: [
  [mano(ficha(7, 'rojo') + ficha(7, 'azul') + ficha(7, 'negro') + ficha(10, 'naranja') + ficha(11, 'naranja') + ficha(12, 'naranja') + ficha(3, 'rojo'), 'Tu atril'), 'Tienes un <b>grupo</b> (7 rojo, azul y negro) y una <b>escalera</b> (10-11-12 naranja).'],
  [M(R('Primera bajada: 7+7+7 = 21', fila(ficha(7, 'rojo') + ficha(7, 'azul') + ficha(7, 'negro'))) + R('10+11+12 = 33', fila(ficha(10, 'naranja') + ficha(11, 'naranja') + ficha(12, 'naranja')))), 'Para bajar por primera vez tus fichas deben sumar <b>30 o más</b> (aquí 21 + 33 = 54 ✔).'],
  [M(R('Mesa', fila(ficha(10, 'naranja') + ficha(11, 'naranja') + ficha(12, 'naranja'))), mano(ficha(13, 'naranja') + ficha(3, 'rojo'))), 'Después puedes <b>añadir</b> fichas a la mesa: el 13 naranja alarga la escalera.'],
  [M(R('Mesa', fila(ficha(10, 'naranja') + ficha(11, 'naranja') + ficha(12, 'naranja') + ficha(13, 'naranja'))), mano(ficha(3, 'rojo'))), 'Si no puedes jugar, robas. Gana quien se quede sin fichas. El 13 no enlaza con el 1.'],
] };
DEMOS.brisca = { h: '<p>Una baza completa:</p>', marcos: [
  [M(R('Triunfo (bajo el mazo)', fila(c(5, 'copas'))), mano(c(1, 'bastos') + c(3, 'copas') + c(6, 'oros'))), 'El triunfo es <b>copas</b>. Tienes 3 cartas.'],
  [M(mesa(c(12, 'oros')), mano(c(1, 'bastos') + c(3, 'copas') + c(6, 'oros'))), 'Un rival sale con el <b>Rey de oros</b> (4 puntos). No es obligatorio servir.'],
  [M(mesa(c(12, 'oros') + c(3, 'copas')), mano(c(1, 'bastos') + c(6, 'oros'))), 'Matas con el <b>3 de copas</b>: es triunfo y le gana a cualquier carta de otro palo.'],
  [M(R('Te llevas la baza', '<span class="grande">4 + 10 = 14 puntos</span>'), mano(c(1, 'bastos') + c(6, 'oros'))), 'El 3 vale 10 y el rey 4. Robas primero y sales tú. En total hay 120 puntos: con 2 jugadores, ¡gana quien pase de 60!'],
] };
DEMOS.corazones = { h: '<p>Una baza de ejemplo:</p>', marcos: [
  [mano(fr(2, 'treboles') + fr(9, 'treboles') + fr(5, 'corazones') + fr(12, 'picas') + fr(13, 'diamantes'), 'Tu mano (extracto)'), 'Empieza quien tiene el <b>2 de tréboles</b>.'],
  [M(mesa(fr(2, 'treboles') + fr(7, 'treboles') + fr(11, 'treboles')), mano(fr(9, 'treboles') + fr(5, 'corazones') + fr(12, 'picas'))), 'Hay que <b>servir del palo</b>: tréboles. Te toca tirar el 9 de tréboles (o más bajo).'],
  [M(mesa(fr(2, 'treboles') + fr(7, 'treboles') + fr(11, 'treboles') + fr(9, 'treboles')), '<small>Se lleva la baza: la J de tréboles (la más alta)</small>'), 'Se la lleva el que tiró la carta <b>más alta del palo</b> de salida. No hay triunfo.'],
  [M(R('Puntos que evitas', fila(fr(5, 'corazones') + fr(12, 'picas')) + '<small>♥ = 1 punto · Dama de picas = 13</small>')), 'Cada corazón vale 1 y la <b>dama de picas</b> 13. Gana quien tenga <b>menos</b> puntos. ¡Ojo con llevártelos!'],
] };
DEMOS.blackjack = { h: '<p>Una ronda:</p>', marcos: [
  [M(R('Banca', fila(fr(10, 'picas') + '<span class="tt-c">🂠</span>')), R('Tú: 11', fila(fr(5, 'corazones') + fr(6, 'treboles')))), 'Repartes: tienes 5 + 6 = <b>11</b>. La banca enseña un 10.'],
  [M(R('Banca', fila(fr(10, 'picas') + '<span class="tt-c">🂠</span>')), R('Tú: 21', fila(fr(5, 'corazones') + fr(6, 'treboles') + fr(10, 'diamantes')))), '<b>Pides carta</b> y sale un 10: ¡21!'],
  [M(R('Banca: 17', fila(fr(10, 'picas') + fr(7, 'treboles'))), R('Tú: 21', fila(fr(5, 'corazones') + fr(6, 'treboles') + fr(10, 'diamantes')))), 'Te <b>plantas</b>. La banca destapa y se planta con 17.'],
  [M(R('Resultado', '<span class="grande">🎉 Ganas</span>'), '<small>Un blackjack (As + figura) pagaría 3 a 2</small>'), '21 gana a 17. Si te pasas de 21 pierdes en el acto. Con 2 cartas iguales podrías <b>dividir</b>.'],
] };
DEMOS.klondike = { h: '<p>Cómo se mueven las cartas:</p>', marcos: [
  [R('Columna', fila(fr(7, 'corazones')) + '<small>y en tu mano de juego:</small>' + fila(fr(6, 'picas'))), 'Quieres poner el <b>6 de picas</b> sobre el <b>7 de corazones</b>.'],
  [R('Columna', '<div class="tt-fila" style="flex-direction:column;gap:0">' + fr(7, 'corazones') + fr(6, 'picas') + '</div>'), 'Vale: número inmediatamente inferior y <b>color alterno</b>. Arrastra o toca la carta.'],
  [R('Bases', fila(fr(1, 'corazones') + fr(1, 'picas') + '<span class="tt-c">·</span><span class="tt-c">·</span>')), 'Cuando sale un As, sube a una <b>base</b>; luego el 2, 3… del mismo palo.'],
  [R('Mazo', '<span class="grande">🂠 → 🂡</span>'), 'Toca el mazo para robar. Un rey puede ocupar una columna vacía. Objetivo: todas las cartas en las bases.'],
] };
DEMOS.spider = { h: '<p>Así se forman las series:</p>', marcos: [
  [R('Columna', fila(fr(10, 'diamantes')) + fila(fr(9, 'corazones'))), 'El 9 se puede poner sobre el 10 sea del palo que sea…'],
  [R('Grupo', fila(fr(10, 'picas') + fr(9, 'picas') + fr(8, 'picas'))), '…pero solo se mueven grupos <b>del mismo palo</b> y en orden.'],
  [R('Serie completa', fila(fr(13, 'picas') + '…' + fr(2, 'picas') + fr(1, 'picas'))), 'Al completar de K a A del mismo palo, la serie sale sola de la mesa.'],
  [R('Mazo', '<span class="grande">🂠 ×5 repartos</span>'), 'Con el mazo repartes una carta nueva a cada columna, pero ninguna columna puede estar vacía.'],
] };
DEMOS.cartablanca = { h: '<p>Un movimiento tipo:</p>', marcos: [
  [R('Casillas libres', '<span class="grande">⬜ ⬜ ⬜ ⬜</span>'), 'Tienes 4 casillas libres para guardar cartas un momento.'],
  [R('Quieres mover 6♠', fila(fr(6, 'picas')) + '<small>sobre un 7♥, pero tapa el 4♦:</small>' + fila(fr(4, 'diamantes'))), 'El 4♦ estorba encima del 7.'],
  [R('El 4♦ a una casilla libre', '<span class="grande">⬜ 4♦ ⬜ ⬜</span>'), 'Aparcas el 4♦ en una casilla libre.'],
  [R('Hecho', fila(fr(7, 'corazones') + fr(6, 'picas'))), 'Ya puedes poner el 6♠ sobre el 7♥. Después sacas el 4♦ de la casilla. Las cartas que ya no sirven suben solas a las bases.'],
] };
DEMOS.holdem = { h: '<p>Una mano completa:</p>', marcos: [
  [mano(fr(1, 'corazones') + fr(13, 'corazones'), 'Tus 2 cartas'), 'Recibes <b>A♥ K♥</b>. Hay una ronda de apuestas: pasar, igualar, subir o retirarte.'],
  [M(mesa(fr(1, 'picas') + fr(7, 'treboles') + fr(2, 'corazones')), mano(fr(1, 'corazones') + fr(13, 'corazones'))), '<b>Flop</b>: tres cartas comunes. Con el otro As ya tienes <b>pareja de ases</b>.'],
  [M(mesa(fr(1, 'picas') + fr(7, 'treboles') + fr(2, 'corazones') + fr(9, 'corazones')), mano(fr(1, 'corazones') + fr(13, 'corazones'))), '<b>Turn</b>: cuarta carta. Más apuestas.'],
  [M(mesa(fr(1, 'picas') + fr(7, 'treboles') + fr(2, 'corazones') + fr(9, 'corazones') + fr(5, 'corazones')), mano(fr(1, 'corazones') + fr(13, 'corazones'))), '<b>River</b>: quinta común. Con tus corazones y el 9, el 2 y el 5, ¡<b>color</b>!'],
  [R('Enseñáis cartas', '<span class="grande">🏆 Gana la mejor mano de 5</span>'), 'Gana la mejor combinación de 5 con las tuyas y las comunes. Si todos se retiran menos uno, se lleva el bote sin enseñar.'],
] };
DEMOS.pokercubierto = { h: '<p>Las dos rondas:</p>', marcos: [
  [mano(fr(11, 'picas') + fr(11, 'diamantes') + fr(4, 'treboles') + fr(9, 'corazones') + fr(2, 'diamantes'), 'Tus 5 cartas tapadas'), 'Pones la entrada y recibes 5 cartas. Tienes <b>pareja de jotas</b>.'],
  [R('Primera apuesta', '<span class="grande">💰 Abres</span>'), 'Con «jotas o mejor», puedes abrir porque tienes pareja de jotas.'],
  [M(mano(fr(11, 'picas') + fr(11, 'diamantes'), 'Te quedas'), R('Descartas 3 y robas', fila(fr(11, 'corazones') + fr(6, 'picas') + fr(6, 'treboles')))), '<b>Descarte</b>: cambias 3 cartas. ¡Entra otra jota y una pareja de seises: <b>full</b>!'],
  [R('Segunda apuesta y enseñar', '<span class="grande">🏆 Gana la mejor mano</span>'), 'Segunda ronda de apuestas y, si quedan dos o más, se enseñan las cartas.'],
] };
DEMOS.domino = { h: '<p>Colocando fichas:</p>', marcos: [
  [R('Cadena', '<span class="grande">[6│6]</span>') + mano('<span class="tt-ficha">6│2</span><span class="tt-ficha">3│4</span><span class="tt-ficha">5│1</span>'), 'Sale el <b>doble más alto</b>: [6│6]. Los extremos son 6 y 6.'],
  [R('Cadena', '<span class="grande">[6│6][6│2]</span>'), 'Pones la 6│2: encaja por el 6. El extremo nuevo es el <b>2</b>.'],
  [R('Cadena', '<span class="grande">[6│6][6│2][2│3]</span>') + '<small>(tu 3│4 aún no)</small>', 'Un rival pone 2│3. Ahora el extremo es el <b>3</b>: puedes poner tu 3│4.'],
  [R('Cadena', '<span class="grande">… [2│3][3│4]</span>'), 'Gana quien se queda sin fichas (o menos puntos si se cierra el juego).'],
] };

DEMOS.mus = { h: '<p>Una mano de ejemplo, lance a lance:</p>', marcos: [
  [mano(c(12, 'oros') + c(12, 'copas') + c(4, 'bastos') + c(4, 'espadas'), 'Tus 4 cartas'), 'Repartidas las cartas, se pregunta: <b>¿mus?</b> Con esta mano (dos reyes y dos cuatros) dices <b>«no hay mus»</b> y se juega.'],
  [R('Grande', '<span class="grande">👑 Rey, Caballo, Sota…</span>'), '<b>Grande</b>: gana quien tiene las cartas más altas. Aquí pasas o envidas según lo que creas que tienen los rivales.'],
  [R('Chica', '<span class="grande">1️⃣ As, 2, 4…</span>'), '<b>Chica</b>: lo contrario, gana quien tiene las cartas más bajas.'],
  [R('Pares', '<span class="grande">K K + 4 4 = duples ✨</span>'), '<b>Pares</b>: dos parejas son <b>duples</b> (3 puntos): una gran jugada.'],
  [R('Juego', '<span class="grande">10+10+4+4 = 28 → punto</span>'), '<b>Juego</b>: suma de cartas (figuras 10). Con 31 o más hay juego; con 28 se juega al <b>punto</b>, y el más cercano a 30 gana.'],
  [R('Apuestas', '<span class="grande">pasar · envidar · quiero · no quiero · órdago</span>'), 'En cada lance se apuesta; si la apuesta no se acepta se lleva 1 tanto quien envidó. El <b>órdago</b> se lo juega todo.'],
] };
DEMOS.magnateurbano = { h: '<p>Un turno típico:</p>', marcos: [
  [R('Tiras los dados', '<span class="grande">🎲🎲 → 7</span>'), 'Tiras los dados y mueves tu ficha por el tablero.'],
  [R('Casilla libre', '<span class="grande">🏢 Solar · 160M</span>'), 'Caes en un <b>solar libre</b>: puedes comprarlo. Si no, sale a <b>subasta</b>.'],
  [R('Sector completo', '<span class="grande">🏢🏢🏢 → oficinas 🏬</span>'), 'Con todo un sector, construyes <b>oficinas</b> (hasta 4) y luego una <b>sede central</b>: la renta se dispara.'],
  [R('Casilla ajena', '<span class="grande">💸 Pagas renta</span>'), 'Si caes en una propiedad ajena, pagas la <b>renta</b> al dueño.'],
  [R('Vuelta', '<span class="grande">💰 Ronda de Inversión +220M</span>'), 'Cada vuelta cobras la Ronda de Inversión. Si te quedas sin dinero puedes hipotecar o hacer 🤝 tratos; si no, <b>quiebras</b>.'],
] };
DEMOS.hotel = { h: '<p>Un turno típico:</p>', marcos: [
  [R('Tiras', '<span class="grande">🎲 → avanzas</span>'), 'Empiezas con 18.000. Tiras el dado y avanzas.'],
  [R('Solar en venta', '<span class="grande">🏷️ Se vende</span>'), 'Si caes en un <b>solar en venta</b>, puedes comprarlo (o se subasta).'],
  [R('Permiso', '<span class="grande">📋 Licencia de obras 🎲</span>'), 'Para construir necesitas <b>licencia de obras</b>: se tira el dado de permiso.'],
  [R('Hotel', '<span class="grande">🏨 + 🏊 instalaciones</span>'), 'Construyes tu hotel y le añades instalaciones que suben la estancia.'],
  [R('Estancia', '<span class="grande">💸 Pagas al dueño</span>'), 'Si caes en el hotel de otro, pagas la <b>estancia</b>. Al pasar por Caja cobras 3.000.'],
] };
DEMOS.bingolive = { h: '<p>Cómo se usa en una sala:</p>', marcos: [
  [R('Configurar partida', '<span class="grande">⚙️ apodos · voz · premios</span>'), 'Antes de empezar, en ⚙️ pones los apodos, la voz y los premios.'],
  [R('Sacar bola', '<span class="grande">🎱 47</span>'), 'Pulsas 🎱 <b>Sacar bola</b>: sale un número y se anuncia en voz alta.'],
  [R('Panel', '<span class="grande">1 2 3 … 47 … 90</span>'), 'El panel va marcando los números ya cantados.'],
  [R('Alguien grita', '<span class="grande">🙋 ¡Línea!</span>'), 'Cuando alguien canta línea o bingo, abres 🔍 <b>Comprobar cartón</b> y marcas sus números: 5 para una línea, 15 para bingo.'],
] };
DEMOS.bingomobile = { h: '<p>Una partida:</p>', marcos: [
  [R('Tu cartón (3 filas × 9)', '<span class="grande">▢ 12 ▢ ▢ 34 ▢ 56 ▢ 78</span>'), 'Compras tu cartón; el bote sale de las apuestas.'],
  [R('Bola cantada', '<span class="grande">🎱 34</span>'), 'Sale el <b>34</b>: lo tienes, lo marcas (o se marca solo en modo automático).'],
  [R('Fila completa', '<span class="grande">✅✅✅✅✅</span>'), 'Cuando completas las 5 casillas de una fila pulsas 🙋 <b>¡Línea!</b>'],
  [R('Cartón lleno', '<span class="grande">🏆 ¡Bingo!</span>'), 'Con los 15 números pulsas 🏆 <b>¡Bingo!</b> y te llevas el premio. ¡Cuidado: los rivales cantan solos unos segundos después!'],
] };
DEMOS.ruletamillonaria = { h: '<p>Un turno:</p>', marcos: [
  [R('Panel', '<span class="grande">_ _ _ _ _   _ _ _ _</span>'), 'Hay una frase oculta y una pista sobre su tema.'],
  [R('Giras', '<span class="grande">🎡 300</span>'), 'Giras la ruleta: cae en <b>300</b>.'],
  [R('Dices consonante', '<span class="grande">T → _ T _ _ _  T _ _ _</span>'), 'Dices la <b>T</b>: aparece 2 veces y ganas 300 × 2 = 600. Sigues jugando.'],
  [R('Compras vocal', '<span class="grande">🅰️ cuesta dinero de la ronda</span>'), 'Puedes comprar una vocal con el dinero de la ronda.'],
  [R('Resuelves', '<span class="grande">🧩 Escribes la frase</span>'), 'Cuando la sepas, pulsas <b>Resolver</b>. Si fallas, pasa el turno; si caes en Quiebra, pierdes el dinero.'],
] };
DEMOS.quecaratienes = { h: '<p>Una partida:</p>', marcos: [
  [R('Tablero', '<span class="grande">😀😎👩‍🦰🧔👵👨‍🦲<br>🙂😄👱‍♀️🧑‍🦱🤓👩</span>'), 'Cada uno elige en secreto una cara del tablero.'],
  [R('Preguntas', '<span class="grande">❓ ¿Lleva gafas?</span>'), 'En tu turno preguntas por un rasgo. La app responde sí o no.'],
  [R('Tumbas', '<span class="grande">😀😎👩‍🦰<br>🙂 ⬇️⬇️ ⬇️</span>'), 'Con la respuesta <b>tumbas</b> las caras que ya no pueden ser.'],
  [R('Arriesgas', '<span class="grande">🎯 ¡Es el de la barba!</span>'), 'Cuando quedan pocas, <b>arriesgas</b>: si aciertas ganas, y si fallas pierdes (o el turno).'],
] };
DEMOS.juegodelaoca = { h: '<p>Un turno:</p>', marcos: [
  [R('Casilla 3', '<span class="grande">🎲 sacas 2 → casilla 5 🦢</span>'), 'Sacas un 2 y caes en una <b>oca</b>.'],
  [R('De oca a oca', '<span class="grande">5 🦢 → 9 🦢</span>'), '«De oca a oca y tiro porque me toca»: saltas a la siguiente oca.'],
  [R('Tiras otra vez', '<span class="grande">🎲 sacas 4 → casilla 13</span>'), 'Vuelves a tirar.'],
  [R('Peligros', '<span class="grande">🏨 19 · 🕳️ 31 · 🌀 42 · 💀 58</span>'), 'Cuidado con posada, pozo, laberinto y muerte. Se gana llegando <b>justo</b> a la casilla 63.'],
] };
DEMOS.elrosco = { h: '<p>Una vuelta:</p>', marcos: [
  [R('Letra A', '<span class="grande">🅰️ «Empieza por A»</span>'), 'Te dan una definición para cada letra: «Empieza por…» o «Contiene…».'],
  [R('Respondes', '<span class="grande">⌨️ ABEJA ✔</span>'), 'Escribes la respuesta con el teclado emergente y pulsas ✔: la letra se pone <b>verde</b>.'],
  [R('Fallas', '<span class="grande">❌ La letra se pone roja</span>'), 'Si fallas, se marca en rojo (y en el duelo pasa el turno).'],
  [R('Paso la Cabra', '<span class="grande">⏩ Vuelves luego</span>'), 'Si no la sabes, <b>Paso la Cabra</b>: la letra queda pendiente para la siguiente vuelta. El reloj corre solo en tu turno.'],
] };
DEMOS.encadenadas = { h: '<p>Así crece la cadena:</p>', marcos: [
  [R('Empieza', '<span class="grande">ca·<b>sa</b></span>'), 'La cadena empieza con una palabra. La última sílaba es <b>sa</b>.'],
  [R('Sigues', '<span class="grande">ca·sa → <b>sa</b>·po</span>'), 'Escribes <b>sapo</b>, que empieza por «sa». Ahora hay que seguir con <b>po</b>.'],
  [R('Sigues', '<span class="grande">… sa·po → <b>po</b>·llo</span>'), 'Sigue <b>pollo</b>. No se pueden repetir palabras.'],
  [R('No sabes', '<span class="grande">🏳️ No sé → pierdes una vida</span>'), 'Si no se te ocurre nada o se acaba el tiempo, pierdes una vida ❤️ y empieza una cadena nueva.'],
] };
DEMOS.numerosyletras = { h: '<p>Una ronda de cada:</p>', marcos: [
  [R('Letras', fila(['C', 'A', 'S', 'A', 'R', 'T', 'O', 'L', 'E'].map(x => `<span class="tt-ficha">${x}</span>`).join(''))), 'Eliges vocales y consonantes hasta tener <b>9 letras</b>.'],
  [R('Tu palabra', '<span class="grande">CASA ✔ · CASTOR ✔ · ESCOLTA ✔ (7 letras)</span>'), 'Formas la palabra más larga que puedas (cada letra, una vez). Cada letra, un punto.'],
  [R('Cifras', '<span class="grande">3 · 4 · 10 · 25 → 🎯 113</span>'), 'En cifras tienes unos números y un objetivo.'],
  [R('Cuenta', '<span class="grande">25 × 4 + 10 + 3 = 113 ✔</span>'), 'Combinas con + − × ÷ (sin negativos, divisiones exactas). Exacto = 10 puntos, cerca = menos.'],
] };
DEMOS.palabrascruzadas = { h: '<p>Un turno:</p>', marcos: [
  [R('Tablero', '<span class="grande">·&nbsp;·&nbsp;·&nbsp;★&nbsp;·&nbsp;·&nbsp;·</span>'), 'La primera palabra pasa por la <b>★</b> del centro.'],
  [R('Tu atril', fila(['C', 'A', 'S', 'A', 'L', 'E', 'O'].map(x => `<span class="tt-ficha">${x}</span>`).join(''))), 'Tienes 7 fichas. Piensas en una palabra con ellas.'],
  [R('Pones', '<span class="grande">C·A·S·A</span>'), 'Pones <b>CASA</b> en línea (horizontal o vertical). Se cuentan los puntos de las letras y los premios 2L/3L/2P/3P.'],
  [R('Cruzas', '<span class="grande">↓ SOL cruza la S</span>'), 'En los turnos siguientes cruzas palabras con las ya puestas. Con las 7 fichas de golpe, +50.'],
] };
DEMOS.triviaquesitos = { h: '<p>Un turno:</p>', marcos: [
  [R('Tiras', '<span class="grande">🎲 → 4 casillas</span>'), 'Tiras y mueves.'],
  [R('Categoría', '<span class="grande">🟣 Ciencia</span>'), 'El color de la casilla marca la <b>categoría</b>.'],
  [R('Pregunta', '<span class="grande">«Gas que respiramos…»<br>A) Oxígeno B) …</span>'), 'Te dan una definición: eliges el término correcto.'],
  [R('Acierto', '<span class="grande">✅ Vuelves a tirar · 🧀 quesito</span>'), 'Acertar: vuelves a tirar y, en casilla de quesito, ganas ese <b>quesito</b>. Con todos, ¡ronda final!'],
] };
DEMOS.partxis = { h: '<p>Una jugada:</p>', marcos: [
  [R('Casa', '<span class="grande">🏠 🔴🔴🔴🔴</span>'), 'Las 4 fichas empiezan en casa.'],
  [R('Sacas con 5', '<span class="grande">🎲 5 → 🔴 sale</span>'), 'Con un <b>5</b> sacas una ficha (es obligatorio si puedes).'],
  [R('Comes', '<span class="grande">🔴 💥 🟡 → +20</span>'), 'Si caes en una casilla con ficha rival (y no es seguro), la comes y avanzas <b>20</b> extra.'],
  [R('Meta', '<span class="grande">🏁 número exacto</span>'), 'A la meta se entra con el número exacto. Gana quien mete antes sus 4 fichas.'],
] };
DEMOS.crucigramas = { h: '<p>Cómo se resuelve:</p>', marcos: [
  [R('Tablero', '<span class="grande">1→ _ _ _ _<br>↓ _</span>'), 'Cada número es el inicio de una palabra (horizontal o vertical).'],
  [R('Pista', '<span class="grande">1 Horizontal: «Animal que ladra»</span>'), 'Lees la pista y escribes la respuesta con el teclado emergente.'],
  [R('Respuesta', '<span class="grande">P E R R O</span>'), 'Las letras se colocan en las casillas.'],
  [R('Cruces', '<span class="grande">La R sirve para la vertical</span>'), 'Cada letra ayuda a la palabra que la cruza. ✔ Comprobar marca los errores.'],
] };
DEMOS.serpiente = { h: '<p>Esto es lo que verás:</p>', marcos: [
  [R('Tablero', '<span class="grande">🟩🟩🟩➡️&nbsp;&nbsp;🍎</span>'), 'La serpiente avanza sola; tú solo eliges la dirección.'],
  [R('Giras', '<span class="grande">🟩🟩<br>&nbsp;&nbsp;🟩⬇️</span>'), 'Desliza el dedo (o usa la cruceta/flechas) para girar.'],
  [R('Comes', '<span class="grande">🟩🟩🟩🟩 +1 🍎</span>'), 'Al comer una manzana creces y sumas puntos. Cada 7, aparece una ⭐ de 5×.'],
  [R('Choque', '<span class="grande">💥 contra ti o un muro</span>'), 'Si chocas contra tu cuerpo o un muro, fin de la partida.'],
] };
DEMOS.vuelaalto = { h: '<p>Así se vuela:</p>', marcos: [
  [R('Pulsas', '<span class="grande">👆 mantener → ⬆️</span>'), 'Mantienes pulsado y el personaje <b>sube</b>.'],
  [R('Sueltas', '<span class="grande">✋ soltar → ⬇️</span>'), 'Sueltas y <b>baja</b>.'],
  [R('Puerta', '<span class="grande">🟩 hueco 🟩 → +10</span>'), 'Pasa por el hueco entre los obstáculos: cada puerta suma 10.'],
  [R('Monedas', '<span class="grande">🪙 +25</span>'), 'Recoge monedas para ganar estrellas.'],
] };
DEMOS.quantix = { h: '<p>Una jugada:</p>', marcos: [
  [R('Panel', '<span class="grande">⬛⬛⬛⬛<br>⬛⬛⬛⬛</span>'), 'Una imagen oculta tras un panel oscuro. Objetivo: descubrir un porcentaje.'],
  [R('Arrastras', '<span class="grande">👆→ ▭ crece</span>'), 'Pulsas junto a una zona descubierta y desliza: crece un cuadrado.'],
  [R('Jefe', '<span class="grande">👾 ¡si lo toca, pierdes una vida!</span>'), 'Mientras crece, un jefe puede tocarlo.'],
  [R('Descubres', '<span class="grande">▭ → 🖼️</span>'), 'Sueltas: la zona se descubre. Repite hasta llegar al objetivo.'],
] };
DEMOS.bloques = { h: '<p>Una línea:</p>', marcos: [
  [R('Cae', '<span class="grande">🟦<br>🟦🟦</span>'), 'Una pieza cae. Muévela y gírala.'],
  [R('Encaja', '<span class="grande">⬛⬛⬛🟦⬛⬛</span>'), 'Encaja para llenar una fila horizontal.'],
  [R('Línea', '<span class="grande">⬛⬛⬛⬛⬛⬛ ✨</span>'), 'Las filas completas desaparecen y puntúan. 4 a la vez: ¡cuádruple!'],
  [R('Reserva', '<span class="grande">📦 guarda una pieza</span>'), 'Puedes guardar la pieza en la reserva, una vez por pieza.'],
] };
DEMOS.catapulta = { h: '<p>Un disparo:</p>', marcos: [
  [R('Apuntas', '<span class="grande">◜ arrastra el punto</span>'), 'En el cuarto de círculo eliges ángulo y fuerza.'],
  [R('Lanzas', '<span class="grande">🚀 ➜ ➜ ➜</span>'), 'Pulsas 🚀 <b>Lanzar</b>: sigue la línea de puntos.'],
  [R('Habilidad', '<span class="grande">✨ en pleno vuelo</span>'), 'En el aire pulsas ✨ y tu proyectil usa su habilidad.'],
  [R('Resultado', '<span class="grande">💥 estructuras caen</span>'), 'Derriba todo con los proyectiles que tengas; los que sobren dan puntos.'],
] };
DEMOS.rompeladrillos = { h: '<p>Así se juega:</p>', marcos: [
  [R('Pala', '<span class="grande">🟦🟦🟦🟦🟦<br>🟨🟨🟨🟨🟨<br>⚪<br>▬▬▬</span>'), 'Mueves la pala abajo para que la bola rebote.'],
  [R('Rompes', '<span class="grande">⚪ → 🧱 💥</span>'), 'La bola rompe ladrillos. Algunos aguantan 2 o 3 golpes.'],
  [R('Cápsula', '<span class="grande">A · M · L · Z · F · +</span>'), 'Algunos ladrillos sueltan cápsulas con ventajas.'],
  [R('Vida', '<span class="grande">❤️❤️❤️</span>'), 'Si la bola cae, pierdes una vida.'],
] };
DEMOS.airhockey = { h: '<p>Una jugada:</p>', marcos: [
  [R('Mesa', '<span class="grande">⬜⬜⬜ (portería rival)<br>🔴 mazo ⚫ disco</span>'), 'Tu mazo es el rojo (abajo).'],
  [R('Golpeas', '<span class="grande">🔴 ➜ ⚫ ➜</span>'), 'Arrastra el mazo hacia el disco: más rápido = más fuerte.'],
  [R('Rebote', '<span class="grande">⚫ ↗ banda ↘</span>'), 'El disco rebota en las bandas.'],
  [R('Gol', '<span class="grande">🥅 ¡GOL!</span>'), 'Gana quien llegue antes a los goles elegidos.'],
] };
DEMOS.billar = { h: '<p>Un tiro:</p>', marcos: [
  [R('Apuntas', '<span class="grande">⚪ ·····➜ 🔴</span>'), 'Tocas la mesa para apuntar con la blanca.'],
  [R('Fuerza y efecto', '<span class="grande">⚙️ fuerza · ◉ efecto</span>'), 'Eliges fuerza y dónde golpeas la blanca (alto, bajo, lateral).'],
  [R('Tiras', '<span class="grande">🎱 Tirar</span>'), 'Pulsas 🎱 <b>Tirar</b>.'],
  [R('Resultado', '<span class="grande">🔴 ➜ 🕳️ sigues · ⚪ 🕳️ falta</span>'), 'Si metes una bola tuya sigues; si metes la blanca, falta y el rival tiene bola en mano.'],
] };
DEMOS.guerraorugas = { h: '<p>Un turno:</p>', marcos: [
  [R('Te mueves', '<span class="grande">🪱 ◀ ▶ ⤴️</span>'), 'Mueves tu gusano por el terreno.'],
  [R('Apuntas', '<span class="grande">🎯 ▲ ▼</span>'), 'Eliges arma y apuntas con ▲ ▼. El viento influye.'],
  [R('Disparas', '<span class="grande">🚀 💥</span>'), 'Mantienes FUEGO para dar potencia y sueltas.'],
  [R('Te pones a salvo', '<span class="grande">🏃 unos segundos</span>'), 'Después de atacar, te mueves a un sitio seguro y pasa el turno.'],
] };

const HI = [[0, 0, 2], [0, 2, 3], [2, 0, 2], [2, 2, 3]];
DEMOS.puenteshashi = { h: '<p>Mira cómo se resuelve un archipiélago pequeño, paso a paso.</p>', marcos: [
  [HE(HI), 'Cuatro islas. El número de cada una dice cuántos <b>puentes</b> salen de ella.'],
  [HE(HI, [[0, 1, 1]], { sel: 0 }), 'Tocas una isla y luego otra en línea recta: se tiende un <b>puente</b>.'],
  [HE(HI, [[0, 1, 1], [1, 3, 2]]), 'Tocando otra vez, el puente se <b>dobla</b>. Entre dos islas caben como mucho 2.'],
  [HE(HI, [[0, 1, 1], [1, 3, 2], [0, 2, 1]]), 'Cuando una isla llega a su número se pone <b>verde</b>: ya está completa.'],
  [HE(HI, [[0, 1, 1], [1, 3, 2], [0, 2, 1], [2, 3, 1]]), '¡Todas completas y unidas en una sola red! Los puentes nunca se cruzan: <b>resuelto</b>.'],
] };
