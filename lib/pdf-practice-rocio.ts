import type { SeedActivity } from "./seed";

/** Practice adapted from the two supplied Rocío worksheets; no learner results. */
type Exercise = {
  number: number;
  title: string;
  skillId: string;
  objective: string;
  instructions: string;
  answer: string;
  type?: SeedActivity["type"];
  options?: string[];
  hints: string[];
  duration?: number;
  supportMode?: SeedActivity["supportMode"];
};

function exercise(prefix: "RL" | "RM", entry: Exercise): SeedActivity {
  const type = entry.type || "open";
  const closed = ["text", "choice", "numeric", "fraction"].includes(type);
  const checkMethod = closed
    ? "Corrección automática de la respuesta indicada. Los pasos y las justificaciones se revisan en clase."
    : "Revisión docente del razonamiento, la escritura y las correcciones; se admiten respuestas equivalentes bien justificadas.";
  const code = `${prefix}-${String(entry.number).padStart(2, "0")}`;
  return {
    id: code.toLowerCase(), title: `${code} · ${entry.title}`, subject: prefix === "RL" ? "Lengua" : "Matemáticas",
    skillId: entry.skillId, objective: entry.objective, instructions: entry.instructions,
    level: "6.º de Primaria", duration: entry.duration || (closed ? 4 : 10), type,
    supportMode: entry.supportMode || "independent", materials: prefix === "RL" ? "Cuaderno, lápiz y teclado con tildes." : "Cuaderno y lápiz; sin calculadora.",
    checkMethod, check: checkMethod, answer: entry.answer, hints: entry.hints,
    suggestedStudentIds: ["rocio"], status: "Disponible",
    ...(type === "text" ? { autoCheck: true } : {}), ...(entry.options ? { options: entry.options } : {}),
  };
}

const lengua: Exercise[] = [
  {
    number: 1, title: "Tildes 1", skillId: "r-tildes", objective: "Separar en sílabas, localizar la tónica y justificar las tildes.",
    instructions: "Escribe correctamente estas palabras: album, miercoles, dificil, examen, tambien y raiz. Separa cada una en sílabas, señala la tónica y clasifícala como aguda, llana o esdrújula. Explica por qué lleva o no lleva tilde.",
    answer: "Ál-bum: llana terminada en m, lleva tilde. Miér-co-les: esdrújula, lleva tilde. Di-fí-cil: llana terminada en l, lleva tilde. E-xa-men: llana terminada en n, sin tilde. Tam-bién: aguda terminada en n, lleva tilde y contiene diptongo. Ra-íz: aguda; lleva tilde por el hiato con í tónica junto a a, aunque termine en z.",
    hints: ["Pronuncia cada palabra antes de decidir dónde va la tilde.", "Raíz tiene una cerrada tónica junto a una abierta: revisa la regla del hiato."],
  },
  {
    number: 2, title: "Tildes 2", skillId: "r-tildes", objective: "Aplicar las reglas generales y reconocer dos hiatos.",
    instructions: "Corrige las palabras cuando sea necesario: azucar, imagen, compas (instrumento de dibujo), baul, oceano, lapiz, camion, examen, dificil y heroe. Separa en sílabas, marca la tónica y justifica las tildes y su ausencia.",
    answer: "A-zú-car: llana en r, con tilde. I-ma-gen: llana en n, sin tilde. Com-pás: aguda en s, con tilde. Ba-úl: aguda, con tilde por el hiato con ú tónica. O-cé-a-no: esdrújula y con hiato e-a. Lá-piz: llana en z, con tilde. Ca-mión: aguda en n, con tilde; ió forma diptongo. E-xa-men: llana en n, sin tilde. Di-fí-cil: llana en l, con tilde. Hé-ro-e: esdrújula y con hiato o-e.",
    hints: ["No todas las palabras de la lista necesitan una tilde.", "Baúl no se justifica con la regla general de las agudas: explica qué pasa con sus vocales."], duration: 12,
  },
  {
    number: 3, title: "Sílaba tónica", skillId: "r-tonica", type: "choice", objective: "Localizar la sílaba tónica de una palabra llana.",
    instructions: "Pronuncia azúcar. ¿Qué sílaba suena con mayor intensidad? Elige una opción.",
    answer: "zú", options: ["a", "zú", "car"], hints: ["Separa la palabra: a-zú-car.", "Busca la sílaba que mantiene el acento al decir la palabra de forma natural."],
  },
  {
    number: 4, title: "Clasificar palabras", skillId: "r-tildes", type: "choice", objective: "Clasificar una palabra a partir de la posición de su tónica.",
    instructions: "La palabra océano se separa o-cé-a-no. ¿Cómo se clasifica según su sílaba tónica?",
    answer: "Esdrújula", options: ["Aguda", "Llana", "Esdrújula"], hints: ["Cuenta las sílabas desde el final.", "Cé ocupa la antepenúltima posición."],
  },
  {
    number: 5, title: "Tilde en llana", skillId: "r-tildes", type: "text", objective: "Escribir una llana terminada en una consonante distinta de n o s.",
    instructions: "Completa: «Encontré un _____ de fotos». Escribe solo album con la tilde que necesita. Después explica la regla en clase.",
    answer: "álbum", hints: ["La tónica está en la primera sílaba: ál-bum.", "Es llana y termina en m."],
  },
  {
    number: 6, title: "Tilde e hiato", skillId: "r-hiatos", type: "text", objective: "Aplicar la tilde en una vocal cerrada tónica que forma hiato.",
    instructions: "Corrige baul. Escribe solo la palabra correcta, conservando la tilde que indica el hiato.",
    answer: "baúl", hints: ["Se pronuncia en dos sílabas: ba-ul.", "La u tónica junto a la a forma hiato y debe llevar tilde."],
  },
  {
    number: 7, title: "Tilde en esdrújula", skillId: "r-tildes", type: "text", objective: "Acentuar una esdrújula que también contiene un hiato.",
    instructions: "Corrige heroe. Escribe solo la palabra correcta. Al revisarla en el cuaderno, separa sus tres sílabas.",
    answer: "héroe", hints: ["La o y la e pertenecen a sílabas distintas.", "La primera sílaba es la tónica y ocupa la antepenúltima posición."],
  },
  {
    number: 8, title: "Tilde en aguda", skillId: "r-tildes", type: "text", objective: "Acentuar una palabra aguda terminada en s.",
    instructions: "Completa: «Trae el _____ para dibujar la circunferencia». Escribe solo compas con su tilde.",
    answer: "compás", hints: ["La tónica es la última sílaba: com-pas.", "Las agudas terminadas en vocal, n o s llevan tilde."],
  },
  {
    number: 9, title: "Compuestas unidas", skillId: "r-ortografia", objective: "Formar palabras compuestas y acentuar el resultado completo.",
    instructions: "Forma una sola palabra con cada pareja y coloca las tildes necesarias: balón + cesto; para + caídas; rompe + cabezas; cien + pies; décimo + séptimo; punta + pie; guarda + bosques; abre + latas. Explica la acentuación de cuatro respuestas.",
    answer: "Baloncesto, paracaídas, rompecabezas, ciempiés, decimoséptimo, puntapié, guardabosques y abrelatas. Baloncesto es llana terminada en vocal y pierde la tilde de balón. Paracaídas conserva un hiato con í tónica. Ciempiés y puntapié son agudas terminadas en s y vocal. Decimoséptimo es esdrújula. En las compuestas unidas se aplica la acentuación a la palabra resultante.",
    hints: ["Una compuesta unida se acentúa como una palabra completa.", "No copies automáticamente las tildes de sus componentes: compara balón con baloncesto."],
  },
  {
    number: 10, title: "Balón y cesto", skillId: "r-ortografia", type: "text", objective: "Revisar la acentuación de una compuesta unida.",
    instructions: "Une balón + cesto en una sola palabra. Escribe solo la palabra resultante con su acentuación correcta.",
    answer: "baloncesto", hints: ["La tónica de la nueva palabra está en ces.", "La palabra resultante es llana terminada en vocal."],
  },
  {
    number: 11, title: "Para y caídas", skillId: "r-hiatos", type: "text", objective: "Conservar el hiato al formar una palabra compuesta.",
    instructions: "Forma una sola palabra con para + caídas. Escribe únicamente la palabra correcta.",
    answer: "paracaídas", hints: ["Pronuncia pa-ra-ca-í-das.", "La í tónica junto a una vocal abierta forma hiato."],
  },
  {
    number: 12, title: "Cien y pies", skillId: "r-ortografia", type: "text", objective: "Formar y acentuar una compuesta aguda.",
    instructions: "Une cien + pies para nombrar al animal. Escribe solo la palabra correcta, con su tilde y su ortografía.",
    answer: "ciempiés", hints: ["Antes de p se escribe m.", "La palabra resultante es aguda terminada en s."],
  },
  {
    number: 13, title: "Punta y pie", skillId: "r-ortografia", type: "text", objective: "Acentuar una compuesta que termina en vocal.",
    instructions: "Forma una sola palabra con punta + pie para expresar un golpe dado con el pie. Escribe solo la palabra correcta.",
    answer: "puntapié", hints: ["La sílaba tónica está al final de la palabra nueva.", "Las agudas terminadas en vocal llevan tilde."],
  },
  {
    number: 14, title: "Compuestas con guion", skillId: "r-ortografia", objective: "Conservar la acentuación de cada componente en palabras con guion.",
    instructions: "Une con guion y añade las tildes necesarias: teorico + practico (examen); historico + artistico (edificio); fisico + quimico (experimento); cientifico + tecnico (trabajo); infantil + juvenil (libros); español + ingles (diccionario). Explica por qué unas respuestas llevan dos tildes y otras una o ninguna.",
    answer: "Teórico-práctico, histórico-artístico, físico-químico, científico-técnico, infantil-juvenil y español-inglés. En las compuestas con guion cada componente conserva la acentuación que le corresponde por separado. Las cuatro primeras parejas tienen componentes esdrújulos; infantil y juvenil son agudas en l, sin tilde; español es aguda en l, sin tilde, e inglés es aguda en s, con tilde.",
    hints: ["Analiza cada componente por separado.", "El guion no hace que se pierdan las tildes de teórico o de práctico."], duration: 12,
  },
  {
    number: 15, title: "La regla del guion", skillId: "r-ortografia", type: "choice", objective: "Distinguir la regla de las compuestas con guion.",
    instructions: "¿Qué explicación es correcta para las tildes de teórico-práctico?",
    answer: "Cada componente conserva su acentuación.", options: ["Cada componente conserva su acentuación.", "Solo el segundo componente puede llevar tilde.", "Todas las compuestas con guion llevan dos tildes.", "El guion elimina las tildes."],
    hints: ["Piensa cómo se escriben teórico y práctico cuando aparecen separados.", "Compara con infantil-juvenil: el guion por sí mismo no añade tildes."],
  },
  {
    number: 16, title: "Adverbios en -mente", skillId: "r-ortografia", objective: "Formar adverbios en -mente y explicar las tildes que conservan.",
    instructions: "Forma los adverbios en -mente a partir de hábil, rápida, tranquila, fácil, alegre, lenta, última y cómoda. Explica cuáles conservan tilde y por qué.",
    answer: "Hábilmente, rápidamente, tranquilamente, fácilmente, alegremente, lentamente, últimamente y cómodamente. Conservan tilde los adverbios cuyo adjetivo de origen ya la lleva: hábil, rápida, fácil, última y cómoda. Tranquila, alegre y lenta no llevan tilde y sus adverbios tampoco.",
    hints: ["Observa primero la escritura del adjetivo de origen.", "Los adverbios en -mente conservan la tilde del adjetivo, si la tenía."],
  },
  {
    number: 17, title: "Fácil + -mente", skillId: "r-ortografia", type: "text", objective: "Conservar la tilde de fácil al formar un adverbio.",
    instructions: "Forma el adverbio terminado en -mente que procede de fácil. Escribe solo el adverbio.",
    answer: "fácilmente", hints: ["El adjetivo fácil ya lleva tilde.", "La tilde se conserva en la misma vocal al añadir -mente."],
  },
  {
    number: 18, title: "Rápida + -mente", skillId: "r-ortografia", type: "text", objective: "Evitar tildes añadidas al formar un adverbio en -mente.",
    instructions: "Corrige rápidámente. Escribe solo el adverbio correcto que procede de rápida.",
    answer: "rápidamente", hints: ["Conserva la tilde que ya tenía rápida.", "Añadir -mente no añade una segunda tilde."],
  },
  {
    number: 19, title: "Alegre + -mente", skillId: "r-ortografia", type: "text", objective: "Escribir un adverbio cuyo adjetivo de origen no lleva tilde.",
    instructions: "Corrige alegrémente. Escribe solo el adverbio correcto que procede de alegre.",
    answer: "alegremente", hints: ["Comprueba si alegre lleva tilde.", "El adverbio en -mente conserva la acentuación escrita del adjetivo de origen."],
  },
  {
    number: 20, title: "Prefijos y significado", skillId: "r-ortografia", objective: "Identificar prefijos y explicar el cambio de significado.",
    instructions: "Señala el prefijo y la palabra de base en reescribir, desatar, precalentar, reutilizar, deshacer y reordenar. Explica qué aporta cada prefijo y escribe una oración con dos de las palabras.",
    answer: "Re-escribir: escribir de nuevo. Des-atar: realizar la acción contraria a atar. Pre-calentar: calentar antes. Re-utilizar: utilizar de nuevo. Des-hacer: realizar la acción contraria a hacer. Re-ordenar: ordenar de nuevo. Los prefijos aparecen delante de la base. Aceptar oraciones que mantengan estos significados.",
    hints: ["Localiza qué parte aparece antes de una palabra que ya conoces.", "Re- puede indicar repetición; pre-, anterioridad; des-, una acción contraria."],
  },
  {
    number: 21, title: "Palabras con sufijo", skillId: "r-ortografia", objective: "Formar palabras con sufijos y usarlas con sentido.",
    instructions: "Forma una palabra para cada definición: a) persona que toca el violín, con -ista; b) diminutivo de cuaderno, con -ito; c) tienda que vende libros, con -ería. Señala el sufijo de cada respuesta y escribe una oración con cada una.",
    answer: "Violinista: violín + -ista; cuadernito: cuaderno + -ito; librería: libro + -ería. Los sufijos se añaden después de la base; puede cambiar la terminación de la palabra de base. Librería lleva tilde por el hiato con í tónica. Aceptar oraciones correctas y con significado.",
    hints: ["No basta con nombrar la palabra: señala la parte final añadida.", "Al formar una derivada puede cambiar la vocal final de la palabra de base."],
  },
  {
    number: 22, title: "Formar palabras 1", skillId: "r-ortografia", type: "choice", objective: "Reconocer una palabra formada por composición.",
    instructions: "¿Cómo se ha formado sacapuntas?",
    answer: "Compuesta", options: ["Compuesta", "Derivada con prefijo", "Derivada con sufijo"], hints: ["Busca dos componentes con significado.", "Relaciona saca con sacar y puntas con las puntas de los lápices."],
  },
  {
    number: 23, title: "Formar palabras 2", skillId: "r-ortografia", type: "choice", objective: "Distinguir derivación con prefijo y composición.",
    instructions: "¿Cómo se ha formado desorden a partir de orden?",
    answer: "Derivada con prefijo", options: ["Compuesta", "Derivada con prefijo", "Derivada con sufijo"], hints: ["La parte añadida está delante de orden.", "Des- modifica el significado de la palabra de base."],
  },
  {
    number: 24, title: "Singular y plural", skillId: "r-tildes", objective: "Revisar los cambios de acentuación al formar el plural.",
    instructions: "Escribe el plural de imagen, joven, examen, volumen, orden, origen, balcón y canción. Clasifica cada singular y su plural según la sílaba tónica y explica los cambios de tilde.",
    answer: "Imagen → imágenes; joven → jóvenes; examen → exámenes; volumen → volúmenes; orden → órdenes; origen → orígenes: los singulares son llanos terminados en n y no llevan tilde; los plurales son esdrújulos y llevan tilde. Balcón → balcones y canción → canciones: los singulares son agudos en n y llevan tilde; los plurales son llanos en s y no la llevan.",
    hints: ["Vuelve a contar las sílabas después de formar cada plural.", "No copies la tilde del singular: comprueba la posición de la tónica en la palabra nueva."], duration: 12,
  },
  {
    number: 25, title: "Plural de imagen", skillId: "r-tildes", type: "text", objective: "Acentuar un plural esdrújulo.",
    instructions: "Escribe solo el plural de imagen, con la tilde que necesita.", answer: "imágenes",
    hints: ["Al añadir -es, la tónica queda en la antepenúltima sílaba.", "Las esdrújulas llevan tilde."],
  },
  {
    number: 26, title: "Plural de examen", skillId: "r-tildes", type: "text", objective: "Diferenciar la acentuación de examen y exámenes.",
    instructions: "Escribe solo el plural de examen, con su acentuación correcta.", answer: "exámenes",
    hints: ["Separa el plural en cuatro sílabas: e-xa-me-nes.", "La sílaba xa es tónica y ocupa la antepenúltima posición."],
  },
  {
    number: 27, title: "Diptongos e hiatos", skillId: "r-hiatos", objective: "Analizar las vocales sin confundir tilde e hiato.",
    instructions: "Separa en sílabas aire, ciudad, poeta, María, maíz, cuento, teatro, raíz, canción y río. Señala la tónica e indica si hay diptongo o hiato. Explica por qué canción lleva tilde aunque contiene un diptongo y poeta no la lleva aunque tiene un hiato.",
    answer: "Ai-re, ciu-dad, cuen-to y can-ción contienen diptongo. Po-e-ta, Ma-rí-a, ma-íz, te-a-tro, ra-íz y rí-o contienen hiato. María, maíz, raíz y río llevan tilde por la cerrada tónica junto a una abierta. Canción lleva tilde por ser aguda terminada en n; la vocal tónica de ió es la abierta ó. Poeta es llana en vocal y no lleva tilde. Las tónicas son ai, dad, e, rí, íz, cuen, a, íz, ción y rí, respectivamente.",
    hints: ["Dos abiertas se separan; una cerrada tónica junto a una abierta también forma hiato.", "La tilde de canción responde a la regla de las agudas, no a que haya hiato."], duration: 12,
  },
  {
    number: 28, title: "El hiato de río", skillId: "r-hiatos", type: "choice", objective: "Justificar la tilde de una cerrada tónica junto a una abierta.",
    instructions: "¿Por qué río lleva tilde?",
    answer: "La í tónica forma hiato con la o.", options: ["La í tónica forma hiato con la o.", "Todas las palabras con dos vocales llevan tilde.", "La i y la o son dos vocales abiertas.", "Porque es una palabra aguda terminada en vocal."],
    hints: ["Separa rí-o: son dos sílabas.", "La i es una vocal cerrada y en esta palabra es tónica."],
  },
  {
    number: 29, title: "Tilde y contexto 1", skillId: "r-tildes", type: "text", objective: "Elegir una forma según el significado y conservar su acento.",
    instructions: "Completa: «El _____ aplaudió al terminar la función». Elige entre público, publico y publicó. Escribe solo la palabra que falta.",
    answer: "público", hints: ["La palabra nombra a las personas que observan la función.", "No se está contando la acción de publicar."],
  },
  {
    number: 30, title: "Tilde y contexto 2", skillId: "r-tildes", type: "text", objective: "Identificar una acción pasada mediante el contexto.",
    instructions: "Completa: «Ayer, Inés _____ una noticia en la web del colegio». Elige entre público, publico y publicó. Escribe solo la palabra que falta.",
    answer: "publicó", hints: ["Ayer sitúa la acción en el pasado.", "La forma que buscas lleva el acento en la última sílaba."],
  },
  {
    number: 31, title: "Corrige el texto", skillId: "r-ortografia", objective: "Revisar un texto y justificar cambios de ortografía.",
    instructions: "Copia el texto corrigiendo lo necesario: «El miercoles, Ines encontro un sacapuntas y un album en la biblioteca. Despues los guardo rapidamente y decidio releer su historia favorita». Explica cinco correcciones. Después localiza una palabra compuesta y otra con prefijo.",
    answer: "El miércoles, Inés encontró un sacapuntas y un álbum en la biblioteca. Después los guardó rápidamente y decidió releer su historia favorita. Miércoles y rápidamente llevan las tildes de la esdrújula y del adjetivo rápida, respectivamente; Inés, encontró, después, guardó y decidió son agudas acabadas en s o vocal; álbum es llana terminada en m. Compuesta: sacapuntas. Con prefijo: releer (re- + leer). Se añade el punto final.",
    hints: ["Algunas palabras están bien: conserva sacapuntas, biblioteca y favorita.", "Distingue rápidamente, que conserva la tilde de rápida, de releer, que tiene un prefijo."], duration: 12,
  },
  {
    number: 32, title: "Palabras en un texto", skillId: "r-lectura", objective: "Localizar en contexto composición, derivación y acentuación.",
    instructions: "Lee este texto, que ya está bien escrito:\n«El miércoles, Rocío visitó un museo sobre la prehistoria. La profesora pidió reorganizar los grupos y deshacer una fila. Una violinista presentó un taller teórico-práctico. Después aprendieron a reutilizar cartón para construir una casita. Rocío guardó el paraguas y el sacapuntas en la mochila. Al salir visitaron una librería y saludaron a una florista. El monitor explicó tranquilamente cómo revisar el trabajo junto al río».\nEncuentra: a) 3 palabras con prefijo y su base; b) 2 con sufijo, sin contar -mente; c) 2 compuestas unidas y 1 con guion; d) 1 aguda con tilde, 1 llana con tilde y 1 esdrújula; e) el adverbio en -mente y su adjetivo de origen.",
    answer: "Prefijos posibles: pre-historia, re-organizar, des-hacer, re-utilizar. Sufijos posibles: violinista (-ista, de violín), casita (-ita, de casa), librería (-ería, de libro) y florista (-ista, de flor). Compuestas unidas: paraguas y sacapuntas; con guion: teórico-práctico. Agudas con tilde posibles: visitó, pidió, presentó, después, cartón, guardó, explicó. Llanas con tilde: Rocío y río, por hiato; también librería, por hiato. Esdrújula: miércoles; teórico y práctico conservan sus tildes en la compuesta con guion. Adverbio: tranquilamente, de tranquila, sin tilde.",
    hints: ["Busca primero palabras que empiecen por re-, des- o pre-.", "Para los sufijos, comprueba la palabra de base; no cuentes el plural ni las terminaciones de los verbos."], duration: 15,
  },
  {
    number: 33, title: "Escribe una excursión", skillId: "r-escritura", objective: "Aplicar composición, derivación y tildes en un texto propio.",
    instructions: "Escribe 5 o 6 oraciones sobre una excursión. Incluye una compuesta unida, una compuesta con guion, una palabra con prefijo, otra con sufijo, una aguda con tilde y una esdrújula. Señala las palabras elegidas e indica qué requisito cumple cada una. Revisa el texto antes de guardarlo.",
    answer: "No hay texto único. Comprobar coherencia, puntuación y los seis requisitos. Ejemplos válidos: paraguas o sacapuntas (compuestas unidas); teórico-práctico (con guion); reorganizar o reutilizar (prefijo); casita o florista (sufijo); visitó o después (aguda con tilde); miércoles o música (esdrújula). Una palabra puede cumplir más de un requisito si lo explica correctamente.",
    hints: ["Elige las palabras que usarás antes de redactar y escribe una historia que tenga sentido.", "Después de escribir, revisa cada requisito por separado y comprueba las tildes."], duration: 15,
  },
  {
    number: 34, title: "Revisa las reglas", skillId: "r-ortografia", objective: "Corregir explicaciones falsas mediante reglas y ejemplos.",
    instructions: "Corrige estas explicaciones y añade un ejemplo a cada una: a) «Baloncesto lleva tilde porque balón la lleva»; b) «Todos los adverbios en -mente llevan tilde»; c) «Una palabra llana nunca lleva tilde»; d) «En las compuestas con guion solo el segundo componente puede llevar tilde»; e) «Los prefijos se añaden al final de la palabra».",
    answer: "a) Las compuestas unidas se acentúan como una palabra completa: baloncesto es llana terminada en vocal y no lleva tilde. b) -Mente conserva la tilde del adjetivo si la tenía: fácilmente, pero alegremente. c) Las llanas normalmente llevan tilde si no terminan en vocal, n o s: lápiz; también hay tildes por hiato como río. d) Cada componente de una compuesta con guion conserva su acentuación: teórico-práctico. e) Los prefijos se añaden delante de la base: releer; los sufijos, detrás: florista.",
    hints: ["Una explicación correcta debe indicar la regla, no solo dar la palabra bien escrita.", "Compara fácilmente con alegremente y baloncesto con teórico-práctico."], duration: 12, supportMode: "teacher",
  },
];

const matematicas: Exercise[] = [
  {
    number: 1, title: "Operaciones 1", skillId: "r-potencias", type: "numeric", objective: "Calcular potencias antes de sumar.",
    instructions: "Calcula 3^2 + 2^3 sin calculadora. Escribe los pasos en el cuaderno y responde aquí solo con el resultado.", answer: "17",
    hints: ["3^2 significa 3 × 3 y 2^3 significa 2 × 2 × 2.", "Calcula primero las dos potencias y suma sus resultados."],
  },
  {
    number: 2, title: "Operaciones 2", skillId: "r-potencias", type: "numeric", objective: "Respetar el orden de potencias, raíces y multiplicaciones.",
    instructions: "Calcula 5 × 2^3 − √64 sin calculadora. Anota los pasos en el cuaderno y responde solo con el resultado.", answer: "32",
    hints: ["Primero calcula 2^3 y √64.", "Después realiza la multiplicación y, al final, la resta."],
  },
  {
    number: 3, title: "Operaciones 3", skillId: "r-potencias10", type: "numeric", objective: "Combinar potencias de 10 con multiplicación y resta.",
    instructions: "Calcula 10^3 − 3 × 10^2. Escribe los pasos en el cuaderno y responde solo con el resultado numérico.", answer: "700",
    hints: ["10^3 es 1000 y 10^2 es 100.", "La multiplicación se hace antes que la resta."],
  },
  {
    number: 4, title: "Operaciones 4", skillId: "r-raices", type: "numeric", objective: "Resolver una raíz y una suma dentro de un paréntesis.",
    instructions: "Calcula (√81 + 1)^2. Resuelve el paréntesis antes de elevar al cuadrado. Responde solo con el resultado.", answer: "100",
    hints: ["Busca qué número multiplicado por sí mismo da 81.", "Después suma 1 y eleva al cuadrado el resultado completo del paréntesis."],
  },
  {
    number: 5, title: "Número desconocido 1", skillId: "r-potencias", type: "numeric", objective: "Encontrar un número natural a partir de su cuadrado.",
    instructions: "Encuentra el número natural n que cumple n^2 = 81. Escribe solo el valor de n y compruébalo en el cuaderno.", answer: "9",
    hints: ["n × n debe dar 81.", "Se pide un número natural, no un número negativo."],
  },
  {
    number: 6, title: "Número desconocido 2", skillId: "r-raices", type: "numeric", objective: "Relacionar una raíz cuadrada con el cuadrado de su resultado.",
    instructions: "Encuentra n en √n = 8. Escribe solo el valor de n y comprueba que su raíz cuadrada es 8.", answer: "64",
    hints: ["Busca el número cuyo cuadrado tiene 8 como raíz.", "Calcula 8 × 8."],
  },
  {
    number: 7, title: "Exponente que falta 1", skillId: "r-potencias10", type: "numeric", objective: "Relacionar el exponente de 10 con una cantidad natural.",
    instructions: "Completa 10^n = 10000. Escribe solo el exponente n.", answer: "4",
    hints: ["Escribe 10000 como un producto de factores iguales a 10.", "El exponente cuenta cuántos factores 10 se multiplican."],
  },
  {
    number: 8, title: "Exponente que falta 2", skillId: "r-potencias10", type: "numeric", objective: "Separar un coeficiente y una potencia de 10.",
    instructions: "Completa 6 × 10^n = 6000. Escribe solo el exponente n.", answer: "3",
    hints: ["Primero divide 6000 entre 6.", "Escribe el resultado de esa división como una potencia de 10."],
  },
  {
    number: 9, title: "Reconstruye el número", skillId: "r-potencias10", type: "numeric", objective: "Reconstruir una cantidad a partir de su valor posicional.",
    instructions: "¿Qué número representa 7 × 10^2 + 4 × 10^4 + 9? Calcula cada término y responde sin separador de miles.", answer: "40709",
    hints: ["Ordena las posiciones: decenas de millar, millares, centenas, decenas y unidades.", "Las posiciones que no aparecen en la expresión tienen cifra 0."],
  },
  {
    number: 10, title: "Cifra que falta 1", skillId: "r-potencias10", type: "numeric", objective: "Encontrar una cifra a partir de una descomposición decimal.",
    instructions: "Encuentra la cifra n: 5 × 10^4 + n × 10^3 + 6 × 10^2 + 8 = 53608. Responde solo con n.", answer: "3",
    hints: ["n indica cuántos millares hay.", "Observa la cifra de los millares en 53608."],
  },
  {
    number: 11, title: "Descomposición decimal", skillId: "r-potencias10", objective: "Descomponer una cantidad usando potencias de 10.",
    instructions: "Descompón 70406 utilizando potencias de 10. Explica qué posiciones tienen cifra 0 y por qué puedes omitir esos términos en la suma.",
    answer: "70406 = 7 × 10^4 + 4 × 10^2 + 6. Los millares y las decenas tienen cifra 0; sus términos serían 0 × 10^3 y 0 × 10, que no cambian la suma. También es válida la descomposición que los incluya expresamente.",
    hints: ["Relaciona cada cifra con el valor de su posición.", "Comprueba tu suma para asegurarte de que no has cambiado el orden de las cifras."], duration: 7,
  },
  {
    number: 12, title: "Compara potencias", skillId: "r-potencias", objective: "Comparar potencias sin confundir la base con el exponente.",
    instructions: "Compara 3^4 y 4^3. ¿Cuál es mayor y cuánto mayor es? Escribe los productos que representa cada potencia y explica el resultado.",
    answer: "3^4 = 3 × 3 × 3 × 3 = 81 y 4^3 = 4 × 4 × 4 = 64. Es mayor 3^4; la diferencia es 81 − 64 = 17. Intercambiar la base y el exponente no conserva necesariamente el resultado.",
    hints: ["No decidas mirando solo qué base es mayor.", "Calcula ambas potencias y resta el resultado menor del mayor."], duration: 7,
  },
  {
    number: 13, title: "Doble de un cuadrado", skillId: "r-potencias", type: "choice", objective: "Interpretar un coeficiente que multiplica una potencia.",
    instructions: "Compara 7^2 y 2 × 7^2. ¿Qué relación hay entre los resultados?",
    answer: "2 × 7^2 es el doble de 7^2.", options: ["2 × 7^2 es el doble de 7^2.", "Son iguales.", "2 × 7^2 es 2 unidades mayor.", "7^2 es el doble de 2 × 7^2."],
    hints: ["La potencia 7^2 tiene el mismo valor en ambas expresiones.", "En la segunda expresión, ese valor se multiplica por 2."],
  },
  {
    number: 14, title: "Fichas del juego 1", skillId: "r-potencias", type: "numeric", objective: "Interpretar grupos de grupos como una potencia sencilla.",
    instructions: "Preparan 3 cajas, cada una con 3 bolsas de 3 fichas. ¿Cuántas fichas hay inicialmente? Escribe la potencia en el cuaderno y responde aquí solo con el número de fichas.", answer: "27",
    hints: ["Primero calcula cuántas fichas contiene una caja.", "La cantidad total se puede escribir como 3^3."],
  },
  {
    number: 15, title: "Fichas del juego 2", skillId: "r-problemas", type: "numeric", objective: "Resolver un problema que combina agrupaciones y una suma.",
    instructions: "Hay 3 cajas, cada una con 3 bolsas de 3 fichas. Después añaden 22 fichas sueltas. ¿Cuántas fichas hay en total? Responde solo con el número.", answer: "49",
    hints: ["Calcula primero las fichas que hay en las cajas.", "Las 22 fichas se añaden después: no forman parte de las bolsas."],
  },
  {
    number: 16, title: "Fichas del juego 3", skillId: "r-raices", type: "numeric", objective: "Usar una raíz cuadrada exacta para organizar fichas.",
    instructions: "Colocan 49 fichas formando un cuadrado completo, con igual número de filas y columnas. ¿Cuántas fichas hay en cada fila? Responde solo con ese número.", answer: "7",
    hints: ["Busca dos factores iguales cuyo producto sea 49.", "Puedes escribir el cálculo como √49."],
  },
  {
    number: 17, title: "Las pegatinas", skillId: "r-problemas", objective: "Resolver un problema de numeración con varias operaciones.",
    instructions: "Una librería recibe 4 cajas de 1000 pegatinas. Regala 6 paquetes de 100 y después vende 1250 pegatinas. a) Expresa la cantidad inicial utilizando una potencia de 10. b) ¿Cuántas pegatinas regala? c) ¿Cuántas quedan? Escribe las cuentas y las unidades.",
    answer: "a) 4 × 10^3 = 4000 pegatinas. b) 6 × 100 = 600 pegatinas regaladas. c) 4000 − 600 − 1250 = 2150 pegatinas. Las regaladas y las vendidas se restan de la cantidad inicial.",
    hints: ["1000 se puede escribir como 10^3.", "Distingue las dos salidas de pegatinas: primero el regalo y después la venta."], duration: 10,
  },
  {
    number: 18, title: "El mosaico", skillId: "r-problemas", objective: "Combinar una raíz exacta con el coste total y el cambio.",
    instructions: "Un mosaico tiene 81 baldosas, con igual número de filas y columnas. Cada baldosa cuesta 2 € y el transporte cuesta 12 €. a) ¿Cuántas baldosas hay en cada fila? b) ¿Cuánto cuesta todo? c) Si pagan con 180 €, ¿cuánto les devuelven? Escribe las cuentas y las unidades.",
    answer: "a) √81 = 9 baldosas por fila. b) 81 × 2 + 12 = 162 + 12 = 174 €. c) 180 − 174 = 6 € de cambio. El precio de las baldosas se calcula con las 81 unidades, no con las 9 de una sola fila.",
    hints: ["La raíz cuadrada sirve para encontrar las baldosas de una fila.", "Para el coste, usa todas las baldosas y añade una sola vez el transporte."], duration: 10,
  },
  {
    number: 19, title: "Otro cuadrado", skillId: "r-problemas", objective: "Aplicar potencias y raíces en una variante del problema de agrupaciones.",
    instructions: "Hay 4 cajas, cada una con 4 bolsas de 4 fichas. Añaden 17 fichas y colocan el total formando un cuadrado completo. a) Escribe como potencia la cantidad inicial y calcúlala. b) ¿Cuántas fichas hay al final? c) ¿Cuántas hay en cada fila del cuadrado?",
    answer: "a) 4^3 = 64 fichas. b) 64 + 17 = 81 fichas. c) √81 = 9 fichas por fila. Comprobar: 9 × 9 = 81.",
    hints: ["El 4 aparece en los tres niveles de agrupación: cajas, bolsas y fichas.", "Calcula primero el total y busca después su raíz cuadrada."], duration: 10,
  },
  {
    number: 20, title: "Cifra que falta 2", skillId: "r-potencias10", type: "numeric", objective: "Encontrar la cifra de las decenas en una descomposición decimal.",
    instructions: "Encuentra la cifra n: 4 × 10^3 + 7 × 10^2 + n × 10 + 6 = 4756. Escribe solo el valor de n.", answer: "5",
    hints: ["El término n × 10 indica las decenas.", "Comprueba que 4000 + 700 + n × 10 + 6 da 4756."],
  },
];

export const rocioPdfActivities: SeedActivity[] = [
  ...lengua.map(entry => exercise("RL", entry)),
  ...matematicas.map(entry => exercise("RM", entry)),
];
