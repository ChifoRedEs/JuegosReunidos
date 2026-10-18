// Banco de palabras de El Rosco: por letra, «PALABRA|definición». Si la línea empieza por «*», la palabra no empieza
// por esa letra sino que la CONTIENE. Varias respuestas válidas se separan con «/» (se muestra la primera).
// Para ampliarlo, añade líneas a la letra que quieras (las tildes se ignoran al comprobar la respuesta).
const B = {
  A: `ABEJA|Insecto que vive en colmenas y fabrica miel
ÁRBOL|Planta de tronco leñoso que se ramifica a cierta altura del suelo
AGUJA|Barrita de metal con punta y un ojo por donde pasa el hilo para coser
ALMOHADA|Cojín sobre el que se apoya la cabeza para dormir
ANILLO|Aro, normalmente de metal precioso, que se lleva en un dedo
ARAÑA|Animal de ocho patas que teje telas para cazar insectos
AVIÓN|Vehículo con alas y motor que vuela transportando personas o mercancías
AJEDREZ|Juego de tablero con reyes, damas, alfiles, caballos, torres y peones
ACEITUNA|Fruto del olivo, del que se obtiene el aceite
ABANICO|Instrumento plegable que se agita para darse aire
AZAFATA|Persona que atiende a los pasajeros en un avión
ALFOMBRA|Tejido grueso con que se cubre el suelo de una habitación
AMBULANCIA|Vehículo que traslada enfermos y heridos al hospital
ARCOÍRIS|Arco de colores que aparece en el cielo cuando llueve con sol
AGUACATE|Fruto verde de pulpa cremosa con el que se hace el guacamole
ATLETA|Persona que practica deportes como correr, saltar o lanzar`,
  B: `BALLENA|El animal más grande del planeta: un mamífero marino
BIBLIOTECA|Lugar donde se guardan y prestan libros
BOTELLA|Recipiente de cuello estrecho para guardar líquidos
BRÚJULA|Instrumento con una aguja imantada que señala el norte
BUFANDA|Prenda larga que se enrolla al cuello para protegerse del frío
BARCO|Embarcación grande que navega por el mar
BIGOTE|Pelo que crece encima del labio superior
BOMBERO|Profesional que apaga incendios
BOSQUE|Terreno extenso poblado de árboles
BALCÓN|Ventana abierta hasta el suelo con una barandilla que sobresale de la fachada
BICICLETA|Vehículo de dos ruedas que se mueve con pedales
BÚHO|Ave nocturna de ojos grandes que gira mucho la cabeza
BOTA|Calzado que cubre el pie y parte de la pierna
BRAZO|Parte del cuerpo que va del hombro a la mano
BELLOTA|Fruto de la encina y del roble
BOLÍGRAFO|Instrumento para escribir con una bolita de metal en la punta`,
  C: `CARACOL|Molusco que lleva su concha en espiral a cuestas
CEBOLLA|Hortaliza de capas que hace llorar al cortarla
CANGURO|Marsupial australiano que se desplaza a saltos
CASTILLO|Edificio fortificado con murallas y torres
COHETE|Vehículo que viaja al espacio impulsado por la expulsión de gases
CUCHARA|Cubierto con forma de pala pequeña para tomar sopa
CEREZA|Fruta pequeña, roja y redonda con hueso y un rabito largo
CALENDARIO|Registro de los días, semanas y meses del año
CAMELLO|Animal del desierto con dos jorobas
CORAZÓN|Órgano que bombea la sangre por el cuerpo
CEBRA|Animal africano con rayas blancas y negras
CHOCOLATE|Dulce que se elabora con cacao y azúcar
COCODRILO|Reptil grande de río con enormes mandíbulas
CAMIÓN|Vehículo grande para transportar mercancías
CUEVA|Cavidad natural en la roca o bajo tierra
CORONA|Aro que llevan en la cabeza los reyes`,
  D: `DELFÍN|Mamífero marino muy inteligente que vive en grupos
DIENTE|Pieza dura de la boca que sirve para morder y masticar
DICCIONARIO|Libro que recoge y explica las palabras de una lengua por orden alfabético
DADO|Cubo con puntos del 1 al 6 en sus caras que se usa en juegos de azar
DESIERTO|Lugar con muy poca lluvia y casi sin vegetación
DOMINGO|Día de la semana que sigue al sábado
DRAGÓN|Animal fabuloso con alas que echa fuego por la boca
DUCHA|Chorro de agua que cae desde arriba para lavarse
DINOSAURIO|Reptil prehistórico que se extinguió hace unos 66 millones de años
DIAMANTE|Piedra preciosa, el mineral natural más duro
DEDO|Cada una de las cinco partes en que terminan la mano y el pie
DENTISTA|Médico que cuida los dientes
DESPERTADOR|Reloj que suena para que dejes de dormir
DOCENA|Conjunto de doce unidades
DUENDE|Ser fantástico y travieso de los cuentos
DESAYUNO|Primera comida del día`,
  E: `ELEFANTE|Mamífero terrestre de gran tamaño, con trompa y colmillos de marfil
ESCALERA|Serie de peldaños para subir o bajar
ESPEJO|Superficie de cristal que refleja las imágenes
ESTRELLA|Astro con luz propia, como el Sol
ENFERMERA|Profesional sanitaria que cuida a los pacientes
ESCOBA|Utensilio con un palo largo para barrer
ECLIPSE|Ocultación de un astro por la interposición de otro
ESQUÍ|Deporte que consiste en deslizarse por la nieve con dos tablas
ERIZO|Pequeño mamífero cubierto de púas
ESPONJA|Objeto poroso que absorbe el agua y se usa para lavar
ESQUELETO|Conjunto de huesos del cuerpo
EMPANADA|Masa rellena cocida al horno o frita
ENANO|Persona muy pequeña de los cuentos, como los siete de Blancanieves
ESTATUA|Escultura que representa a una persona o un animal
ESPADA|Arma blanca de hoja larga y afilada
ENCINA|Árbol de hoja perenne cuyo fruto es la bellota`,
  F: `FARO|Torre con una luz potente que orienta a los barcos de noche
FRESA|Fruta roja y pequeña con semillas por fuera
FLAMENCO|Ave rosada de patas largas que suele apoyarse en una sola; también un baile andaluz
FANTASMA|Espíritu de un difunto que, según las leyendas, se aparece a los vivos
FUENTE|Construcción por la que sale agua en plazas y jardines
FÚTBOL|Deporte de once contra once en el que se juega con los pies
FOCA|Mamífero marino que descansa en el hielo y las rocas de la costa
FRIGORÍFICO|Electrodoméstico que conserva fríos los alimentos/NEVERA
FLECHA|Varilla con punta que se dispara con un arco
FÓSIL|Resto de un ser vivo antiguo conservado en la roca
FARMACIA|Tienda donde se venden medicamentos
FLAUTA|Instrumento de viento con agujeros que se tapan con los dedos
FUEGO|Llamas y calor que produce algo al arder
FAMILIA|Grupo formado por padres, hijos y otros parientes
FRIJOL|Legumbre también llamada judía o alubia en España
FORTALEZA|Edificio fortificado para defenderse`,
  G: `GATO|Felino doméstico que maúlla
GUITARRA|Instrumento musical de seis cuerdas que se toca con los dedos
GLOBO|Bolsa de goma que se infla con aire o gas
GIRASOL|Planta de flor amarilla que se orienta hacia el sol
GALLETA|Dulce pequeño y crujiente hecho con harina horneada
GORILA|El primate más grande que existe
GRANIZO|Precipitación de bolitas de hielo
GAFAS|Lentes con montura que corrigen la vista o protegen del sol
GUANTE|Prenda que cubre la mano y cada uno de los dedos
GEMELO|Hermano nacido en el mismo parto que otro
GALLINA|Ave de corral que pone huevos
GARAJE|Lugar donde se guarda el coche
GLACIAR|Gran masa de hielo que avanza lentamente por las montañas
GOTA|Pequeña porción redondeada de un líquido
GRILLO|Insecto que canta de noche frotando las alas
GEOGRAFÍA|Ciencia que estudia la superficie de la Tierra`,
  H: `HORMIGA|Insecto pequeño que vive en colonias muy organizadas
HELADO|Postre dulce y congelado
HOSPITAL|Lugar donde se atiende a los enfermos
HUEVO|Lo ponen las gallinas y de él nace un pollito
HIPOPÓTAMO|Gran mamífero africano que pasa el día en el agua
HAMACA|Red o lona colgada por los extremos para tumbarse
HIELO|Agua en estado sólido
HUMO|Gas que se desprende de lo que se quema
HÉLICE|Pieza de palas giratorias que impulsa barcos y avionetas
HOJA|Parte verde y plana de las plantas
HELICÓPTERO|Aeronave que vuela con hélices sobre el techo
HUERTO|Terreno donde se cultivan verduras y frutas
HURACÁN|Viento muy fuerte que gira en círculos
HERMANO|Hijo de tus mismos padres
HARINA|Polvo que se obtiene al moler el trigo
HÁMSTER|Pequeño roedor que se tiene como mascota`,
  I: `IGLÚ|Casa en forma de cúpula hecha con bloques de nieve
ISLA|Porción de tierra rodeada de agua por todas partes
IMÁN|Objeto que atrae el hierro
INVIERNO|Estación más fría del año
IGUANA|Reptil de América con una cresta en el lomo
IDIOMA|Lengua propia de un pueblo o de un país
INSECTO|Animal pequeño con seis patas, como la mosca o la abeja
IGLESIA|Templo cristiano
INVENTO|Cosa nueva creada por alguien que no existía antes
INCENDIO|Fuego grande que destruye lo que no debería quemarse
IMPRESORA|Máquina que pasa a papel lo que hay en el ordenador
INVITADO|Persona a la que se llama a una fiesta o celebración
ISLOTE|Isla pequeña y deshabitada
INGENIERO|Profesional que diseña máquinas, puentes o edificios
ÍNDICE|Dedo que sirve para señalar
IDEA|Pensamiento o plan que se te ocurre`,
  J: `JIRAFA|El animal más alto, de cuello larguísimo
JABÓN|Producto que, con agua, se usa para lavar
JARDÍN|Terreno donde se cultivan plantas y flores de adorno
JAMÓN|Pata trasera del cerdo curada con sal
JUGUETE|Objeto con el que juegan los niños
JAULA|Caja con barrotes para encerrar animales
JINETE|Persona que monta a caballo
JUEVES|Día de la semana entre el miércoles y el viernes
JARRA|Recipiente con asa y boca ancha para servir líquidos
JOYA|Adorno de metal precioso o piedras preciosas
JUDO|Arte marcial japonés en el que se derriba al rival
JERSEY|Prenda de punto que abriga el tronco y los brazos
JABALÍ|Cerdo salvaje del bosque con colmillos
JUEZ|Persona que dicta sentencia en un juicio
JUNIO|Sexto mes del año
JAZMÍN|Planta de flores blancas muy olorosas`,
  L: `LÁPIZ|Barrita de madera con una mina de grafito para escribir o dibujar
LEÓN|Gran felino africano; el macho tiene melena
LIMÓN|Fruto cítrico amarillo de sabor muy ácido
LUNA|Satélite natural de la Tierra
LIBRO|Conjunto de hojas impresas y encuadernadas
LLAVE|Objeto que abre y cierra cerraduras
LORO|Ave de colores que puede imitar la voz humana
LECHUGA|Hortaliza de hojas verdes que se come en ensalada
LOBO|Animal salvaje parecido a un perro grande que aúlla
LÁMPARA|Aparato que da luz
LAGO|Gran masa de agua dulce rodeada de tierra
LADRILLO|Pieza de barro cocido para construir paredes
LECHE|Líquido blanco que producen las vacas y otras hembras mamíferas
LIBÉLULA|Insecto de cuerpo largo y cuatro alas transparentes
LÁGRIMA|Gota que sale de los ojos al llorar
LUNES|Primer día de la semana`,
  M: `MARIPOSA|Insecto con alas grandes y de colores que antes fue oruga
MANZANA|Fruta redonda, roja, verde o amarilla, de un árbol frutal muy común
MONTAÑA|Gran elevación natural del terreno
MÚSICA|Arte de combinar los sonidos de forma agradable
MURCIÉLAGO|Único mamífero capaz de volar, activo de noche
MAPA|Representación dibujada de un territorio
MARTILLO|Herramienta para clavar clavos
MEDUSA|Animal marino gelatinoso que puede picar
MOCHILA|Bolsa que se lleva colgada a la espalda
MILLONARIO|Persona que tiene mucho dinero
MAGO|Persona que hace trucos de magia
MAÍZ|Cereal de granos amarillos con el que se hacen palomitas
MEDICINA|Sustancia que se toma para curar una enfermedad
MOSQUITO|Insecto pequeño que pica y zumba
MUSEO|Edificio donde se exponen obras de arte u objetos de valor
MARTES|Segundo día de la semana`,
  N: `NARANJA|Fruta cítrica de color anaranjado muy rica en vitamina C
NUBE|Masa de gotitas de agua suspendida en el cielo
NIEVE|Agua helada que cae del cielo en copos blancos
NARIZ|Parte de la cara por la que respiramos y olemos
NAVIDAD|Fiesta cristiana que celebra el nacimiento de Jesús
NIDO|Lugar que construyen las aves para poner los huevos
NOVELA|Obra literaria en prosa que cuenta una historia larga
NÚMERO|Signo o palabra que expresa una cantidad
NUEZ|Fruto seco de cáscara dura y arrugada
NAVAJA|Cuchillo cuya hoja se dobla y se guarda en el mango
NAVE|Vehículo que viaja por el espacio
NUTRIA|Mamífero que nada en los ríos y usa piedras como herramienta
NEVERA|Electrodoméstico que mantiene fríos los alimentos
NOCHE|Tiempo en que no hay luz del sol
NOVIEMBRE|Undécimo mes del año
NÚCLEO|Parte central de una célula o de un átomo`,
  Ñ: `ÑU|Antílope africano de cuernos curvados que migra en grandes manadas
*ARAÑA|Animal de ocho patas que teje telas
*MONTAÑA|Gran elevación natural del terreno
*NIÑO|Persona de corta edad
*PIÑA|Fruta tropical con corona de hojas y piel con escamas
*CASTAÑA|Fruto seco que se come asado en otoño
*SUEÑO|Lo que imaginamos mientras dormimos
*BAÑERA|Recipiente grande donde uno se baña
*OTOÑO|Estación del año en la que caen las hojas de los árboles
*PEÑASCO|Roca grande y elevada
*CABAÑA|Casa pequeña y sencilla, a menudo de madera, en el campo o la montaña
*MAÑANA|Parte del día que va desde que amanece hasta el mediodía
*ESPAÑA|País cuya capital es Madrid
*PEQUEÑO|De poco tamaño
*CIGÜEÑA|Ave grande de patas largas que anida en campanarios
*LEÑA|Trozos de madera para hacer fuego`,
  O: `OSO|Mamífero grande y peludo que hiberna en invierno
OREJA|Parte exterior del oído
OVEJA|Animal que da lana
OLA|Onda que se forma en la superficie del mar
ORQUESTA|Grupo grande de músicos que tocan juntos
OCÉANO|Gran masa de agua salada que cubre buena parte de la Tierra
OLIVO|Árbol que da aceitunas
OJO|Órgano de la vista
ORUGA|Larva de la mariposa
OMBLIGO|Cicatriz redonda que queda en la barriga al cortar el cordón umbilical
OLLA|Recipiente redondo y hondo para cocinar
ORO|Metal precioso de color amarillo
ORDENADOR|Máquina electrónica que procesa información
OTOÑO|Estación del año en la que se caen las hojas de los árboles
OCHO|Número que va después del siete
OASIS|Lugar con agua y vegetación en medio del desierto`,
  P: `PIRATA|Ladrón que asalta barcos en el mar
PARAGUAS|Utensilio que nos protege de la lluvia
PINGÜINO|Ave que no vuela, camina erguida y nada muy bien
PLÁTANO|Fruta alargada y amarilla que se pela con la mano
PAYASO|Artista del circo que hace reír con su maquillaje y su nariz roja
PIZARRA|Superficie donde se escribe con tiza en las aulas
PERRO|Animal doméstico que ladra
PIRÁMIDE|Monumento egipcio de base cuadrada y caras triangulares
PALOMITAS|Granos de maíz que revientan con el calor y se comen en el cine
PULPO|Molusco de ocho tentáculos
PANADERÍA|Tienda donde se hace y vende pan
PELOTA|Bola que se usa para jugar
PEINE|Utensilio con púas para ordenar el pelo
PRIMAVERA|Estación del año en que florecen las plantas
PUENTE|Construcción para cruzar por encima de un río o un camino
PATO|Ave acuática de pico ancho que hace «cuac»`,
  Q: `QUESO|Alimento elaborado con leche cuajada
QUIRÓFANO|Sala del hospital donde se hacen operaciones
QUIOSCO|Pequeña caseta donde se venden periódicos y revistas/KIOSCO
QUINCE|Número que va después del catorce
QUIJOTE|Caballero andante creado por Cervantes
*ESQUIMAL|Habitante de las regiones heladas del Ártico
*MÁQUINA|Conjunto de piezas que realiza un trabajo
*PARQUE|Terreno con árboles y jardines para pasear
*TANQUE|Depósito grande de líquidos; también, vehículo militar con cañón
*BOSQUE|Terreno extenso poblado de árboles
QUÍMICA|Ciencia que estudia las sustancias y sus transformaciones
QUETZAL|Ave de plumas verdes, símbolo de Guatemala
QUINIELA|Apuesta en la que se adivinan los resultados de partidos de fútbol
*RAQUETA|Pala con cuerdas que se usa en el tenis
*MANTEQUILLA|Grasa de la leche que se unta en el pan
*ETIQUETA|Papel pegado a un producto con su precio o información`,
  R: `RATÓN|Pequeño roedor; también el aparato con el que se maneja el ordenador
RELOJ|Aparato que mide y marca la hora
ROSA|Flor con espinas en el tallo, símbolo del amor
RAYO|Descarga eléctrica que se produce en una tormenta
REY|Monarca de un reino
RINOCERONTE|Gran mamífero con uno o dos cuernos sobre la nariz
ROBOT|Máquina programable que realiza tareas de forma automática
RÍO|Corriente de agua que desemboca en el mar o en otro río
RANA|Anfibio que salta y croa
RUEDA|Pieza circular que gira sobre un eje
REGALO|Cosa que se da a alguien sin pedir nada a cambio
REMO|Pala larga para mover una barca
RESPIRAR|Tomar y expulsar el aire de los pulmones
RADIO|Aparato que recibe emisiones de sonido a distancia
RAÍZ|Parte de la planta que crece bajo tierra
RECETA|Instrucciones para preparar un plato de cocina`,
  S: `SERPIENTE|Reptil sin patas que se desplaza reptando
SANDÍA|Fruta grande, verde por fuera y roja por dentro
SOL|Estrella que da luz y calor a la Tierra
SILLA|Asiento con respaldo para una persona
SIRENA|Ser fabuloso mitad mujer y mitad pez; también la alarma de las ambulancias
SOMBRERO|Prenda para cubrir la cabeza que tiene ala
SUBMARINO|Barco que puede navegar bajo el agua
SEMÁFORO|Aparato con luces que regula el tráfico
SELLO|Estampita que se pega en las cartas para enviarlas
SARTÉN|Recipiente de cocina, ancho y poco profundo, para freír
SALCHICHA|Embutido alargado que se come en los perritos calientes
SEMANA|Periodo de siete días
SETA|Hongo con forma de sombrero
SIERRA|Herramienta con dientes para cortar madera
SÁBADO|Sexto día de la semana
SOFÁ|Asiento cómodo y mullido para varias personas`,
  T: `TIBURÓN|Pez marino depredador con varias filas de dientes
TORTUGA|Reptil lento protegido por un caparazón
TELÉFONO|Aparato para hablar con alguien que está lejos
TOMATE|Fruto rojo que se usa en ensaladas y salsas
TREN|Vehículo de vagones que circula por vías
TIGRE|Gran felino de pelaje naranja con rayas negras
TIJERAS|Herramienta de dos hojas para cortar papel o tela
TORMENTA|Tiempo con lluvia fuerte, truenos y relámpagos
TELESCOPIO|Instrumento para observar objetos lejanos, como las estrellas
TRUENO|Ruido fuerte que sigue al rayo en una tormenta
TAMBOR|Instrumento de percusión que se toca con palillos
TECLADO|Conjunto de teclas de un ordenador o de un piano
TORRE|Edificio mucho más alto que ancho
TRIGO|Cereal con el que se hace la harina del pan
TRUFA|Hongo subterráneo muy apreciado en cocina
TOALLA|Tela que se usa para secarse`,
  U: `UVA|Fruto del que se hace el vino; en Nochevieja se toman doce
UNICORNIO|Caballo fabuloso con un cuerno en la frente
UNIVERSO|Conjunto de todo lo que existe: estrellas, planetas, galaxias…
UÑA|Parte dura que protege la punta de los dedos
UNIVERSIDAD|Centro donde se hacen estudios superiores
URRACA|Pájaro blanco y negro de cola larga al que le atraen los objetos brillantes
UNIFORME|Ropa igual que llevan los miembros de un colegio, un equipo o un cuerpo
ÚTIL|Que sirve para algo
URNA|Caja en la que se depositan los votos
UMBRAL|Parte inferior de la puerta, el escalón de la entrada
UÑAS|Láminas duras que crecen en la punta de los dedos
UTENSILIO|Objeto que sirve para hacer una tarea, sobre todo en la cocina
ÚLTIMO|Que va detrás de todos los demás
URANO|Séptimo planeta del sistema solar
USUARIO|Persona que utiliza un servicio o un aparato
UBRE|Parte de la vaca de donde sale la leche`,
  V: `VACA|Animal que da leche y muge
VENTANA|Abertura en la pared, con cristales, para que entre luz y aire
VOLCÁN|Montaña que puede expulsar lava, gases y cenizas
VIOLÍN|Instrumento de cuerda que se toca con un arco
VERANO|Estación más calurosa del año
VAMPIRO|Ser de las leyendas que chupa la sangre y teme la luz del sol
VELA|Cilindro de cera con mecha que da luz; también la tela que impulsa un barco
VIENTO|Aire en movimiento
VASO|Recipiente para beber
VIERNES|Día de la semana anterior al sábado
VETERINARIO|Médico de los animales
VIOLETA|Color morado claro y flor del mismo nombre
VOLANTE|Rueda con la que se dirige un coche
VERDURA|Hortaliza de hojas verdes, como la acelga o la espinaca
VUELO|Viaje en avión
VALLE|Terreno llano entre montañas`,
  X: `XILÓFONO|Instrumento de percusión de láminas que se golpean con baquetas
*TAXI|Coche con conductor que se alquila para llevarnos a un sitio
*EXAMEN|Prueba para comprobar lo que alguien sabe
*BOXEO|Deporte de combate con guantes
*OXÍGENO|Gas del aire que necesitamos para respirar
*EXPLORADOR|Persona que viaja a lugares desconocidos para descubrirlos
*SAXOFÓN|Instrumento de viento de metal muy usado en el jazz
*TEXTO|Conjunto de palabras escritas
*ÉXITO|Resultado muy bueno de algo que se intenta
*MÉXICO|País cuya capital es Ciudad de México
*EXTINTOR|Aparato con el que se apagan incendios pequeños
*TÓXICO|Que es venenoso o dañino
*SEXTO|Que ocupa el lugar número seis
*AUXILIO|Ayuda que se pide en caso de peligro
*EXTRANJERO|Persona de otro país
*EXPRIMIDOR|Utensilio para sacar el zumo de las naranjas`,
  Y: `YOGUR|Alimento cremoso hecho con leche fermentada
YATE|Barco de recreo, normalmente de lujo
YEGUA|Hembra del caballo
YEMA|Parte amarilla del huevo
YUNQUE|Bloque de hierro sobre el que el herrero golpea el metal
*PLAYA|Orilla del mar cubierta de arena
*RAYO|Descarga eléctrica que se produce en una tormenta
*AYER|El día anterior a hoy
*PAYASO|Artista de circo que hace reír
*JOYA|Adorno de metal precioso o piedras preciosas
YOGA|Disciplina de posturas y respiración nacida en la India
YESO|Material blanco con el que se inmoviliza un hueso roto
*RAYA|Línea o pez plano con forma de rombo
*MAYO|Quinto mes del año
*ARROYO|Río pequeño de poco caudal
*PLAYERA|Zapatilla ligera de lona`,
  Z: `ZAPATO|Calzado que cubre el pie
ZANAHORIA|Raíz naranja que se come y gusta mucho a los conejos
ZORRO|Animal astuto de cola larga y peluda
ZOOLÓGICO|Lugar donde se pueden ver animales de muchas partes del mundo/ZOO
ZUMO|Líquido que se extrae de las frutas exprimiéndolas
ZAFIRO|Piedra preciosa de color azul intenso
*PEZ|Animal que vive en el agua y respira por branquias
*LÁPIZ|Barrita de madera con mina para escribir
*AZÚCAR|Sustancia dulce que se obtiene de la caña o la remolacha
*TIZA|Barrita blanca para escribir en la pizarra
ZAPATILLA|Calzado deportivo o para estar en casa
ZARZAMORA|Fruto negro y silvestre parecido a la frambuesa
ZODIACO|Franja del cielo con las doce constelaciones de los horóscopos
*CABEZA|Parte del cuerpo donde están los ojos y la boca
*TAZA|Recipiente con asa para tomar café o té
*CERVEZA|Bebida alcohólica hecha con cebada y lúpulo`,
};

export const LETRAS = 'ABCDEFGHIJLMNÑOPQRSTUVXYZ'.split('');
export const BANCO = Object.fromEntries(Object.entries(B).map(([L, txt]) => [L, txt.trim().split('\n').map(l => {
  const contiene = l.startsWith('*'), [p, d] = (contiene ? l.slice(1) : l).split('|');
  const resp = p.split('/').map(x => x.trim());
  return { tipo: contiene ? 'contiene' : 'empieza', resp, def: d.trim() };
})]));
