// Bancos de palabra + definición del Crucigrama (palabras en MAYÚSCULAS, sin tildes ni Ñ, de 4 a 11 letras).
// Formato de cada línea: PALABRA|definición. Para ampliar un tema, añade líneas (sin repetir palabras).
const T = (nombre, icono, txt) => ({ nombre, icono, entradas: txt.trim().split('\n').map(l => { const [p, d] = l.split('|'); return [p.trim(), d.trim()]; }) });
export const BANCOS = {
  animales: T('Animales', '🦁', `
LEON|Rey de la selva, de melena dorada
ELEFANTE|El mamífero terrestre más grande, con trompa
JIRAFA|Animal de cuello larguísimo
DELFIN|Mamífero marino muy inteligente que parece sonreír
TORTUGA|Reptil lento con caparazón
PINGUINO|Ave que no vuela y camina como con frac
CANGURO|Marsupial australiano que lleva a su cría en una bolsa
BALLENA|El animal más grande del océano
SERPIENTE|Reptil sin patas que se arrastra
MARIPOSA|Insecto de alas coloridas que antes fue oruga
HORMIGA|Insecto trabajador que vive en colonias
TIBURON|Pez depredador de aleta dorsal inconfundible
CABALLO|Animal que se monta y relincha
CONEJO|Animal de largas orejas que salta y come zanahorias
GALLINA|Ave de corral que pone huevos
CEBRA|Parecida a un caballo, con rayas blancas y negras
AGUILA|Ave rapaz de vista agudísima
LOBO|Cánido salvaje que aúlla a la luna
ZORRO|Animal astuto de cola espesa
BUHO|Ave nocturna de grandes ojos
RINOCERONTE|Gran animal con un cuerno sobre el hocico
COCODRILO|Reptil de mandíbulas potentes que vive en ríos
GORILA|El primate más grande
CAMELLO|Animal del desierto con dos jorobas
MURCIELAGO|Mamífero volador nocturno
LIBELULA|Insecto de largas alas transparentes que vuela junto al agua
PULPO|Molusco de ocho tentáculos
OVEJA|Animal que da lana
FLAMENCO|Ave rosada que descansa sobre una pata
KOALA|Marsupial australiano que duerme en los eucaliptos
PANDA|Oso blanco y negro que come bambú
`),
  geografia: T('Geografía', '🌍', `
FRANCIA|País de la Torre Eiffel
ITALIA|País con forma de bota
PORTUGAL|País vecino de España por el oeste
MEXICO|País de los mariachis y los tacos
BRASIL|Mayor país de Sudamérica
ARGENTINA|País del tango y la Patagonia
EGIPTO|País de las pirámides
JAPON|País del sol naciente
CHINA|País con la Gran Muralla
CANADA|País de la hoja de arce
AUSTRALIA|Isla-continente de los canguros
AMAZONAS|Río más caudaloso del mundo
NILO|Río africano que cruza Egipto
DANUBIO|Río europeo que atraviesa Viena y Budapest
ALPES|Cordillera europea de picos nevados
HIMALAYA|Cordillera donde está el Everest
SAHARA|El mayor desierto cálido del mundo
PACIFICO|El océano más grande
ATLANTICO|Océano que separa Europa de América
MADRID|Capital de España
LISBOA|Capital de Portugal
PARIS|Capital de Francia
ROMA|Capital de Italia
BERLIN|Capital de Alemania
LONDRES|Capital del Reino Unido
LIMA|Capital de Perú
BOGOTA|Capital de Colombia
SANTIAGO|Capital de Chile
EVEREST|La montaña más alta del planeta
GROENLANDIA|La isla más grande del mundo
ISLANDIA|Isla de volcanes y géiseres
TOKIO|Capital de Japón
ATENAS|Capital de Grecia
CUBA|La isla más grande del Caribe
`),
  cocina: T('Cocina', '🍳', `
PAELLA|Plato de arroz típico de Valencia
TORTILLA|Plato de huevo y patata
GAZPACHO|Sopa fría de tomate
CROQUETA|Bolita frita de bechamel
LENTEJAS|Legumbre que se cocina en potaje
ARROZ|Cereal base de la paella
CHOCOLATE|Dulce hecho con cacao
QUESO|Alimento hecho con leche cuajada
JAMON|Producto curado del cerdo
TOMATE|Fruto rojo de la ensalada
AGUACATE|Fruto verde del guacamole
CUCHARA|Cubierto para tomar sopa
TENEDOR|Cubierto de púas
CUCHILLO|Cubierto para cortar
SARTEN|Utensilio plano para freír
CAZUELA|Recipiente de barro para guisar
HORNO|Electrodoméstico para asar
NEVERA|Mantiene los alimentos fríos
BATIDORA|Aparato que mezcla y tritura
TOSTADA|Pan dorado en la tostadora
CHURROS|Se mojan en chocolate caliente
EMPANADA|Masa rellena cocida al horno
MACARRONES|Pasta corta y hueca
ESPAGUETI|Pasta larga y fina
PIZZA|Plato italiano de masa, tomate y queso
HELADO|Postre frío que se toma en cucurucho
MIEL|La producen las abejas
ACEITE|Líquido dorado que se saca de la aceituna
VINAGRE|Aliño ácido que se hace con vino
ENSALADA|Plato frío de verduras
SOPA|Plato líquido que se toma con cuchara
TARTA|Dulce grande para celebrar un cumpleaños
`),
  deportes: T('Deportes', '⚽', `
FUTBOL|Deporte con porterías y balón
TENIS|Se juega con raqueta y red
BALONCESTO|Hay que encestar en un aro
NATACION|Deporte que se practica en la piscina
CICLISMO|Deporte de pedales y carretera
ATLETISMO|Carreras, saltos y lanzamientos
BOXEO|Combate con guantes
GOLF|Se juega con palos y hoyos
RUGBY|Deporte de balón ovalado
VOLEIBOL|Deporte de red en el que el balón no puede tocar el suelo
BALONMANO|Se juega con las manos y porterías
ESQUI|Deporte de nieve con dos tablas
JUDO|Arte marcial japonés de llaves
KARATE|Arte marcial de golpes de mano y pie
PADEL|Parecido al tenis, con paredes
SURF|Deporte sobre las olas
HOCKEY|Se juega con palo y disco o bola
BEISBOL|Deporte del bate y el guante
GIMNASIA|Ejercicios de agilidad y flexibilidad
ESGRIMA|Deporte de espada o florete
PORTERO|El que defiende la portería
ARBITRO|Hace cumplir las reglas del partido
MARATON|Carrera de 42 kilómetros
OLIMPIADAS|Juegos que se celebran cada cuatro años
MEDALLA|Premio que se cuelga al ganador
PODIO|Donde suben los tres primeros
PISCINA|Lugar donde se nada
ESTADIO|Recinto grande para ver partidos
CANCHA|Terreno de juego de baloncesto o tenis
REMO|Deporte con palas en el agua
TRIATLON|Natación, ciclismo y carrera
`),
  ciencia: T('Ciencia y espacio', '🚀', `
PLANETA|Cuerpo que gira alrededor de una estrella
ESTRELLA|Astro que brilla con luz propia
GALAXIA|Enorme conjunto de estrellas
COMETA|Astro con larga cola de hielo
COHETE|Vehículo que viaja al espacio
SATELITE|La Luna lo es de la Tierra
ORBITA|Camino que sigue un astro
MARTE|El planeta rojo
VENUS|Planeta muy brillante, el más cercano a la Tierra
JUPITER|El mayor planeta del sistema solar
SATURNO|Planeta de los anillos
NEPTUNO|Planeta azul y lejano
MERCURIO|El planeta más cercano al Sol
LUNA|Nuestro satélite natural
ECLIPSE|Un astro tapa la luz de otro
TELESCOPIO|Instrumento para mirar las estrellas
GRAVEDAD|Fuerza que nos mantiene en el suelo
ATOMO|Partícula mínima de un elemento
OXIGENO|Gas que respiramos
HIDROGENO|El elemento más ligero
ENERGIA|Capacidad de producir trabajo
CELULA|Unidad básica de los seres vivos
VOLCAN|Montaña que expulsa lava
MICROSCOPIO|Sirve para ver lo muy pequeño
ELECTRON|Partícula con carga negativa
MOLECULA|Unión de átomos
FOSIL|Resto de un ser vivo antiguo en la roca
CLIMA|Condiciones del tiempo en una región
TERREMOTO|Temblor fuerte de la tierra
ROBOT|Máquina programada para hacer tareas
ASTRONAUTA|Persona que viaja al espacio
PROTON|Partícula con carga positiva en el núcleo
`),
  cultura: T('Arte y cultura', '🎨', `
QUIJOTE|Hidalgo de La Mancha que luchaba contra molinos
CERVANTES|Autor del Quijote
PICASSO|Pintor del Guernica
VELAZQUEZ|Pintor de Las Meninas
GOYA|Pintor aragonés de las majas
DALI|Pintor surrealista de los relojes blandos
PIANO|Instrumento de teclas blancas y negras
GUITARRA|Instrumento de seis cuerdas
VIOLIN|Instrumento de cuerda que se toca con arco
TAMBOR|Instrumento de percusión que se golpea
FLAUTA|Instrumento de viento que se sopla
ORQUESTA|Gran conjunto de músicos
OPERA|Obra de teatro cantada
BALLET|Danza clásica sobre puntas
TEATRO|Lugar donde actúan los actores
CINE|Arte de las películas
POEMA|Texto escrito en verso
NOVELA|Narración larga de ficción
LIBRO|Conjunto de hojas encuadernadas para leer
BIBLIOTECA|Lugar para leer y pedir libros prestados
MUSEO|Edificio donde se exponen obras de arte
ESCULTURA|Obra de arte tallada o modelada
PINTURA|Arte de dar color sobre un lienzo
LIENZO|Tela sobre la que se pinta
PALETA|Tablilla donde el pintor mezcla colores
MELODIA|Sucesión de notas que forman una canción
CANCION|Letra y música para cantar
ACTOR|Interpreta un papel
DIRECTOR|Dirige una película o una orquesta
FESTIVAL|Gran celebración de música o cine
CARNAVAL|Fiesta de disfraces y comparsas
MOSAICO|Dibujo hecho con piedrecitas de colores
`),
  naturaleza: T('Naturaleza', '🌿', `
BOSQUE|Lugar con muchos árboles
SELVA|Bosque tropical muy denso
DESIERTO|Lugar seco y arenoso
CASCADA|Agua que cae desde lo alto
PLAYA|Orilla de arena junto al mar
VALLE|Terreno hundido entre montañas
COLINA|Elevación suave del terreno
PRADERA|Terreno llano cubierto de hierba
ARROYO|Río pequeño
CUEVA|Cavidad natural en la roca
GLACIAR|Gran masa de hielo en la montaña
OASIS|Lugar con agua y palmeras en el desierto
PANTANO|Terreno cubierto de agua y barro
SIERRA|Cadena de montañas
TORMENTA|Lluvia con truenos y relámpagos
RELAMPAGO|Luz brillante del cielo antes del trueno
ARCOIRIS|Franja de colores tras la lluvia
NUBE|Vapor de agua que flota en el cielo
VIENTO|Aire en movimiento
HURACAN|Tormenta tropical con vientos fortísimos
PRIMAVERA|Estación de las flores
VERANO|Estación más calurosa
INVIERNO|Estación más fría
ROSA|Flor con espinas
GIRASOL|Flor que sigue al sol
TULIPAN|Flor holandesa de colores
PALMERA|Árbol de dátiles y playas
ROBLE|Árbol de bellotas
PINO|Árbol de piñas y agujas
HELECHO|Planta de hojas en forma de pluma
SETA|Hongo con sombrero
MUSGO|Planta verde que crece sobre las piedras
`),
};
