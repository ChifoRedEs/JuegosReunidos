// Paneles de la Ruleta Millonaria: [pista, frase]. Las tildes se muestran pero no cuentan al pedir letras.
// Para añadir más, escribe nuevas líneas en la categoría que quieras (frases de 2 a 48 caracteres, solo letras, espacios y , . ¡! ¿?).
export const CATEGORIAS = {
  refran: 'Refrán',
  comida: 'Comida',
  lugar: 'Lugar',
  casa: 'En casa',
  accion: 'Acción',
  expresion: 'Expresión',
  animal: 'Animal',
  oficio: 'Oficio',
  cosa: 'Cosa',
  ocio: 'Tiempo libre',
};

const P = {
  refran: [
    'A quien madruga Dios le ayuda', 'Más vale tarde que nunca', 'En boca cerrada no entran moscas',
    'No hay mal que por bien no venga', 'Perro ladrador, poco mordedor', 'Al mal tiempo, buena cara',
    'Ojos que no ven, corazón que no siente', 'Quien mucho abarca poco aprieta', 'A caballo regalado no le mires el diente',
    'Más vale prevenir que curar', 'Cría cuervos y te sacarán los ojos', 'Dime con quién andas y te diré quién eres',
    'No por mucho madrugar amanece más temprano', 'Camarón que se duerme se lo lleva la corriente', 'El que la sigue la consigue',
  ],
  comida: [
    'Tortilla de patatas con cebolla', 'Paella de marisco', 'Churros con chocolate', 'Gazpacho andaluz', 'Pulpo a la gallega',
    'Croquetas de jamón', 'Cocido madrileño', 'Fabada asturiana', 'Pimientos de Padrón', 'Flan de huevo casero',
    'Arroz con leche', 'Bocadillo de calamares', 'Ensalada de tomate', 'Migas con uvas', 'Patatas bravas',
  ],
  lugar: [
    'La playa en pleno agosto', 'Estación de autobuses', 'Mercado de abastos', 'Biblioteca municipal', 'Plaza del pueblo',
    'Sala de espera del médico', 'Parque de atracciones', 'Aeropuerto internacional', 'Piscina municipal', 'Polideportivo del barrio',
    'Casa rural en la montaña', 'Faro junto al acantilado',
  ],
  casa: [
    'Mando a distancia del televisor', 'Lavavajillas lleno de platos', 'Cafetera italiana', 'Tendedero en la terraza',
    'Cajón de los calcetines', 'Microondas', 'Felpudo de la entrada', 'Lámpara de la mesita de noche', 'Tabla de planchar',
    'Cesto de la ropa sucia', 'Llaves colgadas en la entrada',
  ],
  accion: [
    'Hacer la compra del mes', 'Echarse la siesta en el sofá', 'Montar en bicicleta', 'Regar las plantas del balcón',
    'Buscar las llaves por toda la casa', 'Hacer cola en el supermercado', 'Tender la ropa al sol', 'Pasear al perro por la tarde',
    'Preparar la maleta de las vacaciones', 'Sacar la basura por la noche',
  ],
  expresion: [
    'Estar en las nubes', 'Tomar el pelo', 'Ser pan comido', 'Costar un ojo de la cara', 'Meter la pata',
    'Ponerse las pilas', 'Estar como una cabra', 'Dar gato por liebre', 'Echar una mano', 'Tirar la casa por la ventana',
    'Buscarle tres pies al gato', 'Estar hasta en la sopa',
  ],
  animal: [
    'Pingüino emperador', 'Caballito de mar', 'Lince ibérico', 'Oso polar', 'Tortuga marina', 'Águila real',
    'Pez payaso', 'Ballena azul', 'Camaleón', 'Murciélago', 'Hormiga obrera',
  ],
  oficio: [
    'Bombero forestal', 'Profesora de primaria', 'Mecánico de coches', 'Panadero madrugador', 'Enfermera de urgencias',
    'Cartero del barrio', 'Peluquera canina', 'Guía turístico', 'Socorrista de la piscina', 'Piloto de avión',
  ],
  cosa: [
    'Paraguas de colores', 'Gafas de sol', 'Cepillo de dientes eléctrico', 'Bolígrafo de cuatro colores', 'Mochila del colegio',
    'Reloj de pared', 'Cargador del móvil', 'Bufanda de lana', 'Linterna de bolsillo', 'Agenda de papel',
  ],
  ocio: [
    'Partida de cartas con los amigos', 'Ir al cine el domingo', 'Concierto al aire libre', 'Tarde de juegos de mesa',
    'Excursión a la montaña', 'Clase de baile', 'Rompecabezas de mil piezas', 'Barbacoa en el campo', 'Noche de karaoke',
    'Paseo en barca por el lago',
  ],
};

export const PANELES = Object.entries(P).flatMap(([cat, lista]) => lista.map(t => ({ c: cat, t })));
