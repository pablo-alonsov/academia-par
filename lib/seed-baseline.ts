/** Legacy planned-content defaults before the curriculum update. Server-only reconciliation reference; never learner results. */
export const legacySeedBaseline = {
  "students": [
    {
      "id": "rocio",
      "name": "Rocío",
      "level": "6.º de Primaria",
      "color": "violet",
      "avatar": "R",
      "priorities": [
        "Ortografía y acentuación",
        "Comprensión lectora",
        "Expresión escrita"
      ],
      "nextStep": "Revisar lo que está trabajando en el colegio y elegir una primera comprobación breve."
    },
    {
      "id": "alejandra",
      "name": "Alejandra",
      "level": "2.º de ESO",
      "color": "blue",
      "avatar": "A",
      "priorities": [
        "Matemáticas: conocimientos previos",
        "Física y química: significado y unidades",
        "Sintaxis según el método de su profesora"
      ],
      "nextStep": "Confirmar el contenido actual del colegio y comprobar conocimientos previos sin dar por supuesto su nivel."
    }
  ],
  "subjects": [
    {
      "id": "lengua",
      "name": "Lengua",
      "color": "violet"
    },
    {
      "id": "matematicas",
      "name": "Matemáticas",
      "color": "blue"
    },
    {
      "id": "fyq",
      "name": "Física y química",
      "color": "teal"
    },
    {
      "id": "ingles",
      "name": "Inglés",
      "color": "amber"
    },
    {
      "id": "tecnologia",
      "name": "Tecnología",
      "color": "slate"
    },
    {
      "id": "otras",
      "name": "Otras materias",
      "color": "slate"
    }
  ],
  "skills": [
    {
      "id": "r-tonica",
      "studentId": "rocio",
      "subject": "Lengua",
      "title": "Localizar la sílaba tónica",
      "state": "Por empezar",
      "reviewNeeded": false,
      "lastCheck": null,
      "observation": "",
      "evidence": "",
      "nextStep": "Pronunciar seis palabras y explicar qué sílaba suena con mayor intensidad."
    },
    {
      "id": "r-tildes",
      "studentId": "rocio",
      "subject": "Lengua",
      "title": "Clasificar palabras y aplicar las reglas de acentuación",
      "state": "Por empezar",
      "reviewNeeded": false,
      "lastCheck": null,
      "observation": "",
      "evidence": "",
      "nextStep": "Comprobar primero la sílaba tónica y después justificar cada tilde.",
      "explanation": "Agudas: sílaba tónica final; llevan tilde si terminan en vocal, n o s. Llanas: penúltima sílaba tónica; llevan tilde si no terminan en vocal, n o s. Esdrújulas: antepenúltima sílaba tónica; llevan tilde siempre. Estos ejemplos trabajan las reglas generales; hay casos particulares que se introducirán cuando hagan falta."
    },
    {
      "id": "r-hiatos",
      "studentId": "rocio",
      "subject": "Lengua",
      "title": "Distinguir diptongos e hiatos",
      "state": "Por empezar",
      "reviewNeeded": false,
      "lastCheck": null,
      "observation": "",
      "evidence": "",
      "nextStep": "Comparar aire, poeta y Rocío, separando sus sílabas y explicando las vocales.",
      "explanation": "Las vocales abiertas son a, e, o; las cerradas son i, u. En un diptongo dos vocales pertenecen a una sílaba: una abierta con una cerrada átona, o dos cerradas distintas. En un hiato pertenecen a sílabas diferentes: dos abiertas, dos vocales iguales, o una cerrada tónica junto a una abierta. En este último caso, la cerrada lleva tilde. Ro-cí-o es llana y lleva tilde por el hiato con í tónica. Po-e-ta tiene hiato y no lleva tilde; tam-bién tiene diptongo y sí lleva tilde."
    },
    {
      "id": "r-ortografia",
      "studentId": "rocio",
      "subject": "Lengua",
      "title": "Revisar un dictado y explicar las correcciones",
      "state": "Por empezar",
      "reviewNeeded": false,
      "lastCheck": null,
      "observation": "",
      "evidence": "",
      "nextStep": "Preparar un dictado breve y una colección personal de palabras a revisar."
    },
    {
      "id": "r-lectura",
      "studentId": "rocio",
      "subject": "Lengua",
      "title": "Comprender una lectura y justificar inferencias",
      "state": "Por empezar",
      "reviewNeeded": false,
      "lastCheck": null,
      "observation": "",
      "evidence": "",
      "nextStep": "Elegir una lectura y distinguir información literal de una deducción."
    },
    {
      "id": "r-resumen",
      "studentId": "rocio",
      "subject": "Lengua",
      "title": "Resumir una lectura con palabras propias",
      "state": "Por empezar",
      "reviewNeeded": false,
      "lastCheck": null,
      "observation": "",
      "evidence": "",
      "nextStep": "Identificar la idea principal y escribir un resumen breve."
    },
    {
      "id": "r-escritura",
      "studentId": "rocio",
      "subject": "Lengua",
      "title": "Escribir y revisar un texto con sentido",
      "state": "Por empezar",
      "reviewNeeded": false,
      "lastCheck": null,
      "observation": "",
      "evidence": "",
      "nextStep": "Conservar una primera versión y revisar claridad, orden y ortografía."
    },
    {
      "id": "r-fracciones",
      "studentId": "rocio",
      "subject": "Matemáticas",
      "title": "Interpretar una fracción de una cantidad",
      "state": "Por empezar",
      "reviewNeeded": false,
      "lastCheck": null,
      "observation": "",
      "evidence": "",
      "nextStep": "Representar un tercio de 24 antes de calcular."
    },
    {
      "id": "r-problemas",
      "studentId": "rocio",
      "subject": "Matemáticas",
      "title": "Resolver problemas de la vida cotidiana",
      "state": "Por empezar",
      "reviewNeeded": false,
      "lastCheck": null,
      "observation": "",
      "evidence": "",
      "nextStep": "Elegir un problema de compras, recetas, medidas u horarios y explicar el procedimiento."
    },
    {
      "id": "r-ingles",
      "studentId": "rocio",
      "subject": "Inglés",
      "title": "Usar el inglés en situaciones cotidianas",
      "state": "Por empezar",
      "reviewNeeded": false,
      "lastCheck": null,
      "observation": "",
      "evidence": "",
      "nextStep": "Confirmar el contenido del colegio y probar una conversación breve."
    },
    {
      "id": "a-fracciones",
      "studentId": "alejandra",
      "subject": "Matemáticas",
      "title": "Interpretar y simplificar fracciones equivalentes",
      "state": "Por empezar",
      "reviewNeeded": false,
      "lastCheck": null,
      "observation": "",
      "evidence": "",
      "nextStep": "Comprobar equivalencias y simplificación antes de introducir operaciones nuevas."
    },
    {
      "id": "a-suma-fracciones",
      "studentId": "alejandra",
      "subject": "Matemáticas",
      "title": "Sumar y restar fracciones con distinto denominador",
      "state": "Por empezar",
      "reviewNeeded": false,
      "lastCheck": null,
      "observation": "",
      "evidence": "",
      "nextStep": "Explicar un ejemplo, resolver otro con ayuda y proponer una variante autónoma."
    },
    {
      "id": "a-operaciones",
      "studentId": "alejandra",
      "subject": "Matemáticas",
      "title": "Multiplicar, dividir y combinar fracciones",
      "state": "Por empezar",
      "reviewNeeded": false,
      "lastCheck": null,
      "observation": "",
      "evidence": "",
      "nextStep": "Recuperar equivalencias y comprobar la prioridad de las operaciones."
    },
    {
      "id": "a-problemas",
      "studentId": "alejandra",
      "subject": "Matemáticas",
      "title": "Resolver problemas con fracciones por pasos",
      "state": "Por empezar",
      "reviewNeeded": false,
      "lastCheck": null,
      "observation": "",
      "evidence": "",
      "nextStep": "Distinguir una fracción del total de una fracción de lo que queda."
    },
    {
      "id": "a-ecuaciones",
      "studentId": "alejandra",
      "subject": "Matemáticas",
      "title": "Resolver ecuaciones con paréntesis",
      "state": "Por empezar",
      "reviewNeeded": false,
      "lastCheck": null,
      "observation": "",
      "evidence": "",
      "nextStep": "Confirmar si está trabajando ecuaciones y comprobar la distributiva antes de avanzar."
    },
    {
      "id": "a-masa-volumen",
      "studentId": "alejandra",
      "subject": "Física y química",
      "title": "Distinguir masa y volumen",
      "state": "Por empezar",
      "reviewNeeded": false,
      "lastCheck": null,
      "observation": "",
      "evidence": "",
      "nextStep": "Propuesta inicial: confirmar el tema del colegio y describir objetos sin empezar por fórmulas."
    },
    {
      "id": "a-unidades",
      "studentId": "alejandra",
      "subject": "Física y química",
      "title": "Interpretar unidades y sus equivalencias",
      "state": "Por empezar",
      "reviewNeeded": false,
      "lastCheck": null,
      "observation": "",
      "evidence": "",
      "nextStep": "Relacionar kg y g; L y mL; mL y cm³ usando representaciones.",
      "explanation": "1 kg = 1000 g. 1 L = 1000 mL. 1 mL = 1 cm³. Masa y volumen son magnitudes diferentes: no hay una conversión universal de gramos a mililitros."
    },
    {
      "id": "a-densidad",
      "studentId": "alejandra",
      "subject": "Física y química",
      "title": "Razonar con masa, volumen y densidad",
      "state": "Por empezar",
      "reviewNeeded": false,
      "lastCheck": null,
      "observation": "",
      "evidence": "",
      "nextStep": "Propuesta inicial pendiente de confirmar: comparar materiales y después introducir d = m/V.",
      "explanation": "La densidad relaciona la masa con el volumen: d = m/V. Para un mismo material en las mismas condiciones, m = d · V y V = m/d. Escribe datos con unidades, qué buscas, razonamiento y cálculo, y respuesta con unidades."
    },
    {
      "id": "a-sintaxis",
      "studentId": "alejandra",
      "subject": "Lengua",
      "title": "Analizar y justificar funciones sintácticas",
      "state": "Por empezar",
      "reviewNeeded": false,
      "lastCheck": null,
      "observation": "",
      "evidence": "",
      "nextStep": "Recoger primero las etiquetas y los procedimientos que utiliza su profesora."
    },
    {
      "id": "a-ingles",
      "studentId": "alejandra",
      "subject": "Inglés",
      "title": "Aplicar el inglés del colegio en contexto",
      "state": "Por empezar",
      "reviewNeeded": false,
      "lastCheck": null,
      "observation": "",
      "evidence": "",
      "nextStep": "Comprobar su nivel real y seleccionar un contenido del colegio."
    }
  ],
  "activities": [
    {
      "id": "r-silaba-seis",
      "title": "La sílaba que manda",
      "objective": "Localizar la sílaba tónica al pronunciar palabras.",
      "subject": "Lengua",
      "skillId": "r-tonica",
      "duration": 8,
      "type": "open",
      "instructions": "Pronuncia camiseta, reloj, papel, ventana, lápiz y teléfono. Separa cada palabra en sílabas, rodea la que suena con más fuerza y explica cómo la has localizado.",
      "materials": "Papel y lápiz, o el cuadro de respuesta.",
      "checkMethod": "Revisión docente de la separación y de la explicación oral o escrita.",
      "answer": "ca-mi-SE-ta; re-LOJ; pa-PEL; ven-TA-na; LÁ-piz; te-LÉ-fo-no.",
      "hints": [
        "Pronuncia cada palabra de forma natural, sin mirar si tiene tilde.",
        "Compara las sílabas: ¿cuál destacas al decir la palabra?",
        "En ventana, la sílaba tónica es ta. Busca la de las demás palabras."
      ],
      "level": "6.º de Primaria",
      "suggestedStudentIds": [
        "rocio"
      ],
      "check": "Revisión docente de la separación y de la explicación oral o escrita.",
      "status": "Disponible"
    },
    {
      "id": "r-tonica-telefono",
      "title": "Una palabra, una sílaba tónica",
      "objective": "Reconocer la sílaba tónica de teléfono.",
      "subject": "Lengua",
      "skillId": "r-tonica",
      "duration": 3,
      "type": "choice",
      "instructions": "¿Cuál es la sílaba tónica de teléfono? Pronuncia la palabra antes de elegir.",
      "materials": "Ninguno.",
      "checkMethod": "Corrección automática de la elección; explicar el motivo en clase.",
      "answer": "lé",
      "options": [
        "te",
        "lé",
        "fo",
        "no"
      ],
      "hints": [
        "Separa: te-lé-fo-no.",
        "La sílaba tónica coincide aquí con la que lleva tilde."
      ],
      "level": "6.º de Primaria",
      "suggestedStudentIds": [
        "rocio"
      ],
      "check": "Corrección automática de la elección; explicar el motivo en clase.",
      "status": "Disponible"
    },
    {
      "id": "r-detective-tildes",
      "title": "Detective de tildes",
      "objective": "Clasificar agudas, llanas y esdrújulas y justificar sus tildes.",
      "subject": "Lengua",
      "skillId": "r-tildes",
      "duration": 12,
      "type": "open",
      "instructions": "Clasifica café, reloj, lápiz, árbol, joven, música, teléfono y compás. Marca la sílaba tónica y justifica por qué cada palabra lleva o no lleva tilde. No basta con decir «porque suena así».",
      "materials": "Tres columnas en papel o una respuesta organizada.",
      "checkMethod": "Revisión docente de clasificación y justificaciones; separar un acierto de una explicación autónoma.",
      "answer": "Agudas: café (vocal), reloj (j; sin tilde), compás (s). Llanas: lápiz (z), árbol (l), joven (n; sin tilde). Esdrújulas: música y teléfono; siempre llevan tilde.",
      "hints": [
        "Localiza primero la sílaba tónica; no clasifiques mirando solo la tilde.",
        "Aguda: última; llana: penúltima; esdrújula: antepenúltima.",
        "Las agudas llevan tilde al terminar en vocal, n o s; las llanas, cuando no terminan así."
      ],
      "level": "6.º de Primaria",
      "suggestedStudentIds": [
        "rocio"
      ],
      "check": "Revisión docente de clasificación y justificaciones; separar un acierto de una explicación autónoma.",
      "status": "Disponible"
    },
    {
      "id": "r-hiatos-diptongos",
      "title": "Vocales juntas, ¿sílabas juntas?",
      "objective": "Distinguir diptongos e hiatos sin asociar automáticamente tilde e hiato.",
      "subject": "Lengua",
      "skillId": "r-hiatos",
      "duration": 15,
      "type": "open",
      "instructions": "Separa en sílabas aire, tierra, ciudad, también, poeta, país, río y Rocío. Señala las vocales abiertas (a, e, o) y cerradas (i, u), decide si hay diptongo o hiato y justifica las tildes. Explica por qué también puede llevar tilde y contener diptongo, y por qué poeta tiene hiato sin tilde.",
      "materials": "Dos colores y papel, si ayuda.",
      "checkMethod": "Revisión docente de separación, vocales y razonamiento; no autocorregir pronunciaciones mediante coincidencia de texto.",
      "answer": "ai-re, tie-rra, ciu-dad y tam-bién: diptongos. po-e-ta, pa-ís, rí-o y Ro-cí-o: hiatos. También es aguda acabada en n. Poeta es llana acabada en vocal; sin tilde. País, río y Rocío llevan tilde en la cerrada tónica junto a una abierta. Rocío es llana.",
      "hints": [
        "Dos vocales pueden estar juntas en la palabra y pertenecer a sílabas distintas.",
        "Dos abiertas forman hiato. Una cerrada tónica junto a una abierta también forma hiato y lleva tilde en la cerrada.",
        "En también, la vocal tónica del grupo ié es la abierta e: el grupo forma diptongo."
      ],
      "level": "6.º de Primaria",
      "suggestedStudentIds": [
        "rocio"
      ],
      "check": "Revisión docente de separación, vocales y razonamiento; no autocorregir pronunciaciones mediante coincidencia de texto.",
      "status": "Disponible"
    },
    {
      "id": "r-rocio-tilde",
      "title": "Tu nombre, bien explicado",
      "objective": "Conservar la tilde al escribir un nombre con hiato.",
      "subject": "Lengua",
      "skillId": "r-hiatos",
      "duration": 3,
      "type": "text",
      "autoCheck": true,
      "instructions": "Completa con la escritura correcta del nombre: Ro-cí-o. Escribe solo el nombre, con su mayúscula y su tilde.",
      "materials": "Teclado con tildes.",
      "checkMethod": "Coincidencia de texto conservando tildes. Explicar después el hiato con í tónica.",
      "answer": "Rocío",
      "hints": [
        "La i es tónica y está junto a la vocal abierta o.",
        "La cerrada tónica de este hiato lleva tilde: í."
      ],
      "level": "6.º de Primaria",
      "suggestedStudentIds": [
        "rocio"
      ],
      "check": "Coincidencia de texto conservando tildes. Explicar después el hiato con í tónica.",
      "status": "Disponible"
    },
    {
      "id": "r-dictado",
      "title": "Un paseo junto al río",
      "objective": "Escribir un dictado breve, revisar y justificar correcciones.",
      "subject": "Lengua",
      "skillId": "r-ortografia",
      "duration": 15,
      "type": "paper",
      "instructions": "Escucha el dictado que leerá tu profesor. Escribe una primera versión; después revisa con otro color y explica tres decisiones ortográficas. Conserva el original y la versión revisada, o adjunta una foto de ambos. Añade a tu colección personal las palabras que necesites practicar.",
      "materials": "Cuaderno, lápiz y otro color. El texto del dictado está en la solución docente.",
      "checkMethod": "Revisión docente del original, de los cambios y de las explicaciones; una corrección con ayuda no equivale a dominio autónomo.",
      "answer": "María caminó hasta el río con su lápiz y un cuaderno. Se sentó bajo un árbol y escribió una poesía. Después dibujó el paisaje mientras escuchaba música.",
      "hints": [
        "En la primera escucha, atiende al sentido completo.",
        "En la revisión, busca mayúsculas, puntos y sílabas tónicas.",
        "Revisa especialmente río, lápiz, árbol, poesía y música; explica la razón de cada tilde."
      ],
      "level": "6.º de Primaria",
      "suggestedStudentIds": [
        "rocio"
      ],
      "check": "Revisión docente del original, de los cambios y de las explicaciones; una corrección con ayuda no equivale a dominio autónomo.",
      "status": "Disponible"
    },
    {
      "id": "r-comprension-dictado",
      "title": "Leer, deducir y resumir",
      "objective": "Responder preguntas literales, justificar inferencias y resumir.",
      "subject": "Lengua",
      "skillId": "r-lectura",
      "duration": 12,
      "type": "open",
      "instructions": "María caminó hasta el río con su lápiz y un cuaderno. Se sentó bajo un árbol y escribió una poesía. Después dibujó el paisaje mientras escuchaba música.\n\n1. ¿Qué llevó María? 2. ¿Dónde se sentó? 3. ¿Qué hizo después de escribir? 4. ¿Por qué pudo elegir un árbol para sentarse? Propón una posibilidad y explica que es una inferencia, no algo que el texto afirme. 5. Resume lo que ocurre en dos o tres frases con tus palabras.",
      "materials": "El texto y el cuadro de respuesta.",
      "checkMethod": "Revisión docente: separar datos explícitos, inferencia razonable y resumen; no usar coincidencia exacta.",
      "answer": "Llevó su lápiz y un cuaderno. Se sentó bajo un árbol. Después dibujó el paisaje. La razón de elegir el árbol no se afirma: aceptar hipótesis justificadas y diferenciadas de los datos. Resumen propio que conserve acciones principales sin inventar hechos.",
      "hints": [
        "Busca primero las respuestas que aparecen expresamente en el texto.",
        "Para la cuarta pregunta, empieza «Pienso que podría... porque...».",
        "Un resumen conserva lo principal y evita copiar cada detalle."
      ],
      "level": "6.º de Primaria",
      "suggestedStudentIds": [
        "rocio"
      ],
      "check": "Revisión docente: separar datos explícitos, inferencia razonable y resumen; no usar coincidencia exacta.",
      "status": "Disponible"
    },
    {
      "id": "r-antes-ahora",
      "title": "Mi texto, una versión mejor",
      "objective": "Revisar un texto conservando la primera versión.",
      "subject": "Lengua",
      "skillId": "r-escritura",
      "duration": 18,
      "type": "open",
      "instructions": "Elige: una noticia breve, un relato, una reseña o instrucciones. Escribe de seis a ocho líneas. Copia tu primera versión en «Original». Relee buscando orden, frases claras y ortografía, y escribe «Versión revisada». Termina explicando dos cambios que mejoren el texto.",
      "materials": "Una idea propia o un tema acordado en clase.",
      "checkMethod": "Revisión docente de ambas versiones y de la justificación de los cambios.",
      "hints": [
        "Antes de escribir, decide para quién escribes y qué quieres contar.",
        "Lee en voz alta: ¿se entiende el orden?, ¿falta alguna información?",
        "Revisa primero el sentido y las frases; después, puntuación y ortografía."
      ],
      "level": "6.º de Primaria",
      "suggestedStudentIds": [
        "rocio"
      ],
      "check": "Revisión docente de ambas versiones y de la justificación de los cambios.",
      "status": "Disponible"
    },
    {
      "id": "r-cuaderno-tercio",
      "title": "Las páginas de mi cuaderno",
      "objective": "Interpretar un tercio de una cantidad y lo que queda.",
      "subject": "Matemáticas",
      "skillId": "r-fracciones",
      "duration": 10,
      "type": "open",
      "instructions": "Un cuaderno tiene 24 páginas y utilizas un tercio. ¿Cuántas páginas utilizas? ¿Cuántas quedan? ¿Qué fracción del total queda? Dibuja una representación y explica tus operaciones.",
      "materials": "Papel para representar las 24 páginas.",
      "checkMethod": "Revisión docente del procedimiento, las cantidades y la fracción restante.",
      "answer": "24 ÷ 3 = 8 páginas utilizadas. 24 − 8 = 16 páginas restantes. Quedan 2/3 del total (también 16/24).",
      "hints": [
        "Un tercio significa repartir el total en tres partes iguales y tomar una.",
        "Divide 24 entre 3 y después resta las páginas utilizadas.",
        "Si has utilizado una de las tres partes iguales, quedan dos de esas partes."
      ],
      "level": "6.º de Primaria",
      "suggestedStudentIds": [
        "rocio"
      ],
      "check": "Revisión docente del procedimiento, las cantidades y la fracción restante.",
      "status": "Disponible"
    },
    {
      "id": "r-receta",
      "title": "Una receta para compartir",
      "objective": "Resolver un problema cotidiano y explicar el procedimiento.",
      "subject": "Matemáticas",
      "skillId": "r-problemas",
      "duration": 10,
      "type": "open",
      "instructions": "Para una receta de cuatro personas se necesitan 200 g de arroz y 600 mL de caldo. ¿Qué cantidades usarías para dos personas? Explica por qué cambias ambas cantidades de la misma forma y conserva sus unidades.",
      "materials": "Papel; una receta real si se prefiere adaptar.",
      "checkMethod": "Revisión docente del razonamiento proporcional y las unidades.",
      "answer": "Para dos personas: 100 g de arroz y 300 mL de caldo; se divide cada cantidad entre dos.",
      "hints": [
        "Dos personas son la mitad de cuatro.",
        "Haz el mismo cambio en las dos cantidades."
      ],
      "level": "6.º de Primaria",
      "suggestedStudentIds": [
        "rocio"
      ],
      "check": "Revisión docente del razonamiento proporcional y las unidades.",
      "status": "Disponible"
    },
    {
      "id": "a-ecuacion-parentesis",
      "title": "Desmontar un paréntesis",
      "objective": "Comprobar la distributiva y resolver una ecuación por pasos.",
      "subject": "Matemáticas",
      "skillId": "a-ecuaciones",
      "duration": 12,
      "type": "open",
      "instructions": "Propuesta pendiente de confirmar con lo que dais en el colegio. Resuelve 3(x + 2) = 18. Explica cada paso y comprueba la solución sustituyendo x en la ecuación original. Después localiza el error en 3(x + 2) = 3x + 2.",
      "materials": "Papel o cuadro de respuesta.",
      "checkMethod": "Revisión docente del procedimiento, el error detectado y la comprobación.",
      "answer": "3x + 6 = 18; 3x = 12; x = 4. Comprobación: 3(4 + 2) = 18. La distributiva multiplica por 3 a los dos términos del paréntesis.",
      "hints": [
        "El 3 multiplica a todo lo que hay dentro del paréntesis.",
        "Primero puedes dividir ambos miembros entre 3: x + 2 = 6.",
        "Comprueba la solución en la expresión original, incluyendo los paréntesis."
      ],
      "level": "2.º de ESO · adaptar al nivel real",
      "suggestedStudentIds": [
        "alejandra"
      ],
      "check": "Revisión docente del procedimiento, el error detectado y la comprobación.",
      "status": "Disponible"
    },
    {
      "id": "a-frac-simplificar",
      "title": "Simplificar 18/24",
      "objective": "Practicar fracciones y explicar cómo se comprueba el resultado.",
      "subject": "Matemáticas",
      "skillId": "a-fracciones",
      "duration": 5,
      "type": "fraction",
      "answer": "3/4",
      "instructions": "18/24. Calcula y escribe el resultado como fracción. Se aceptan fracciones equivalentes; en clase explicaremos la simplificación y el procedimiento.",
      "materials": "Papel para el procedimiento; respuesta en el cuadro.",
      "checkMethod": "Corrección automática de equivalencia de fracciones; el procedimiento se revisa por separado en clase.",
      "hints": [
        "Busca un divisor común del numerador y del denominador.",
        "18 y 24 se pueden dividir entre 6."
      ],
      "level": "2.º de ESO · adaptar al nivel real",
      "suggestedStudentIds": [
        "alejandra"
      ],
      "check": "Corrección automática de equivalencia de fracciones; el procedimiento se revisa por separado en clase.",
      "status": "Disponible"
    },
    {
      "id": "a-frac-equivalente",
      "title": "Una fracción equivalente",
      "objective": "Practicar fracciones y explicar cómo se comprueba el resultado.",
      "subject": "Matemáticas",
      "skillId": "a-fracciones",
      "duration": 5,
      "type": "numeric",
      "answer": "12",
      "instructions": "Completa 3/5 = □/20. Escribe solo el numerador que falta.",
      "materials": "Papel para el procedimiento; respuesta en el cuadro.",
      "checkMethod": "Corrección automática de la respuesta cerrada; no cambia el estado de la habilidad.",
      "hints": [
        "¿Por cuánto se multiplica 5 para obtener 20?",
        "Multiplica también el numerador por 4."
      ],
      "level": "2.º de ESO · adaptar al nivel real",
      "suggestedStudentIds": [
        "alejandra"
      ],
      "check": "Corrección automática de la respuesta cerrada; no cambia el estado de la habilidad.",
      "status": "Disponible"
    },
    {
      "id": "a-frac-comparar",
      "title": "Comparar 7/12 y 2/3",
      "objective": "Practicar fracciones y explicar cómo se comprueba el resultado.",
      "subject": "Matemáticas",
      "skillId": "a-fracciones",
      "duration": 5,
      "type": "choice",
      "answer": "2/3",
      "options": [
        "7/12",
        "2/3",
        "Son iguales"
      ],
      "instructions": "¿Cuál es mayor: 7/12 o 2/3?",
      "materials": "Papel para el procedimiento; respuesta en el cuadro.",
      "checkMethod": "Corrección automática de la respuesta cerrada; no cambia el estado de la habilidad.",
      "hints": [
        "Escribe las dos fracciones con el mismo denominador.",
        "2/3 = 8/12."
      ],
      "level": "2.º de ESO · adaptar al nivel real",
      "suggestedStudentIds": [
        "alejandra"
      ],
      "check": "Corrección automática de la respuesta cerrada; no cambia el estado de la habilidad.",
      "status": "Disponible"
    },
    {
      "id": "a-frac-suma-1",
      "title": "Un tercio más un cuarto",
      "objective": "Practicar fracciones y explicar cómo se comprueba el resultado.",
      "subject": "Matemáticas",
      "skillId": "a-suma-fracciones",
      "duration": 5,
      "type": "fraction",
      "answer": "7/12",
      "instructions": "1/3 + 1/4. Calcula y escribe el resultado como fracción. Se aceptan fracciones equivalentes; en clase explicaremos la simplificación y el procedimiento.",
      "materials": "Papel para el procedimiento; respuesta en el cuadro.",
      "checkMethod": "Corrección automática de equivalencia de fracciones; el procedimiento se revisa por separado en clase.",
      "hints": [
        "Busca un denominador común: 12 sirve.",
        "1/3 = 4/12 y 1/4 = 3/12."
      ],
      "level": "2.º de ESO · adaptar al nivel real",
      "suggestedStudentIds": [
        "alejandra"
      ],
      "check": "Corrección automática de equivalencia de fracciones; el procedimiento se revisa por separado en clase.",
      "status": "Disponible"
    },
    {
      "id": "a-frac-suma-2",
      "title": "Sumar sextos y cuartos",
      "objective": "Practicar fracciones y explicar cómo se comprueba el resultado.",
      "subject": "Matemáticas",
      "skillId": "a-suma-fracciones",
      "duration": 5,
      "type": "fraction",
      "answer": "19/12",
      "instructions": "5/6 + 3/4. Calcula y escribe el resultado como fracción. Se aceptan fracciones equivalentes; en clase explicaremos la simplificación y el procedimiento.",
      "materials": "Papel para el procedimiento; respuesta en el cuadro.",
      "checkMethod": "Corrección automática de equivalencia de fracciones; el procedimiento se revisa por separado en clase.",
      "hints": [
        "Usa denominador 12.",
        "5/6 = 10/12; 3/4 = 9/12. Una suma puede ser mayor que 1."
      ],
      "level": "2.º de ESO · adaptar al nivel real",
      "suggestedStudentIds": [
        "alejandra"
      ],
      "check": "Corrección automática de equivalencia de fracciones; el procedimiento se revisa por separado en clase.",
      "status": "Disponible"
    },
    {
      "id": "a-frac-resta",
      "title": "Restar octavos y tercios",
      "objective": "Practicar fracciones y explicar cómo se comprueba el resultado.",
      "subject": "Matemáticas",
      "skillId": "a-suma-fracciones",
      "duration": 5,
      "type": "fraction",
      "answer": "13/24",
      "instructions": "7/8 − 1/3. Calcula y escribe el resultado como fracción. Se aceptan fracciones equivalentes; en clase explicaremos la simplificación y el procedimiento.",
      "materials": "Papel para el procedimiento; respuesta en el cuadro.",
      "checkMethod": "Corrección automática de equivalencia de fracciones; el procedimiento se revisa por separado en clase.",
      "hints": [
        "Busca un denominador común: 24.",
        "7/8 = 21/24 y 1/3 = 8/24."
      ],
      "level": "2.º de ESO · adaptar al nivel real",
      "suggestedStudentIds": [
        "alejandra"
      ],
      "check": "Corrección automática de equivalencia de fracciones; el procedimiento se revisa por separado en clase.",
      "status": "Disponible"
    },
    {
      "id": "a-frac-producto",
      "title": "Multiplicar y simplificar",
      "objective": "Practicar fracciones y explicar cómo se comprueba el resultado.",
      "subject": "Matemáticas",
      "skillId": "a-operaciones",
      "duration": 5,
      "type": "fraction",
      "answer": "3/4",
      "instructions": "(9/10) × (5/6). Calcula y escribe el resultado como fracción. Se aceptan fracciones equivalentes; en clase explicaremos la simplificación y el procedimiento.",
      "materials": "Papel para el procedimiento; respuesta en el cuadro.",
      "checkMethod": "Corrección automática de equivalencia de fracciones; el procedimiento se revisa por separado en clase.",
      "hints": [
        "Multiplica numeradores entre sí y denominadores entre sí.",
        "Puedes simplificar factores antes o después: 45/60."
      ],
      "level": "2.º de ESO · adaptar al nivel real",
      "suggestedStudentIds": [
        "alejandra"
      ],
      "check": "Corrección automática de equivalencia de fracciones; el procedimiento se revisa por separado en clase.",
      "status": "Disponible"
    },
    {
      "id": "a-frac-division",
      "title": "Dividir fracciones",
      "objective": "Practicar fracciones y explicar cómo se comprueba el resultado.",
      "subject": "Matemáticas",
      "skillId": "a-operaciones",
      "duration": 5,
      "type": "fraction",
      "answer": "2/3",
      "instructions": "(3/4) ÷ (9/8). Calcula y escribe el resultado como fracción. Se aceptan fracciones equivalentes; en clase explicaremos la simplificación y el procedimiento.",
      "materials": "Papel para el procedimiento; respuesta en el cuadro.",
      "checkMethod": "Corrección automática de equivalencia de fracciones; el procedimiento se revisa por separado en clase.",
      "hints": [
        "Dividir por una fracción no nula equivale a multiplicar por su inversa.",
        "3/4 × 8/9 = 24/36; simplifica."
      ],
      "level": "2.º de ESO · adaptar al nivel real",
      "suggestedStudentIds": [
        "alejandra"
      ],
      "check": "Corrección automática de equivalencia de fracciones; el procedimiento se revisa por separado en clase.",
      "status": "Disponible"
    },
    {
      "id": "a-frac-cantidad",
      "title": "Cinco octavos de 120",
      "objective": "Practicar fracciones y explicar cómo se comprueba el resultado.",
      "subject": "Matemáticas",
      "skillId": "a-problemas",
      "duration": 5,
      "type": "numeric",
      "answer": "75",
      "instructions": "Calcula 5/8 de 120. Escribe solo la cantidad.",
      "materials": "Papel para el procedimiento; respuesta en el cuadro.",
      "checkMethod": "Corrección automática de la respuesta cerrada; no cambia el estado de la habilidad.",
      "hints": [
        "Calcula primero un octavo de 120.",
        "120 ÷ 8 = 15; necesitas cinco de esas partes."
      ],
      "level": "2.º de ESO · adaptar al nivel real",
      "suggestedStudentIds": [
        "alejandra"
      ],
      "check": "Corrección automática de la respuesta cerrada; no cambia el estado de la habilidad.",
      "status": "Disponible"
    },
    {
      "id": "a-frac-combinada-1",
      "title": "Primero la multiplicación",
      "objective": "Practicar fracciones y explicar cómo se comprueba el resultado.",
      "subject": "Matemáticas",
      "skillId": "a-operaciones",
      "duration": 5,
      "type": "fraction",
      "answer": "25/24",
      "instructions": "2/3 + (1/2) × (3/4). Calcula y escribe el resultado como fracción. Se aceptan fracciones equivalentes; en clase explicaremos la simplificación y el procedimiento.",
      "materials": "Papel para el procedimiento; respuesta en el cuadro.",
      "checkMethod": "Corrección automática de equivalencia de fracciones; el procedimiento se revisa por separado en clase.",
      "hints": [
        "Resuelve la multiplicación antes de sumar.",
        "1/2 × 3/4 = 3/8. Después suma 2/3 + 3/8."
      ],
      "level": "2.º de ESO · adaptar al nivel real",
      "suggestedStudentIds": [
        "alejandra"
      ],
      "check": "Corrección automática de equivalencia de fracciones; el procedimiento se revisa por separado en clase.",
      "status": "Disponible"
    },
    {
      "id": "a-frac-combinada-2",
      "title": "Primero el paréntesis",
      "objective": "Practicar fracciones y explicar cómo se comprueba el resultado.",
      "subject": "Matemáticas",
      "skillId": "a-operaciones",
      "duration": 5,
      "type": "fraction",
      "answer": "2/3",
      "instructions": "(2/3 + 1/6) ÷ (5/4). Calcula y escribe el resultado como fracción. Se aceptan fracciones equivalentes; en clase explicaremos la simplificación y el procedimiento.",
      "materials": "Papel para el procedimiento; respuesta en el cuadro.",
      "checkMethod": "Corrección automática de equivalencia de fracciones; el procedimiento se revisa por separado en clase.",
      "hints": [
        "Resuelve primero la suma del paréntesis.",
        "2/3 + 1/6 = 5/6. Después multiplica por 4/5."
      ],
      "level": "2.º de ESO · adaptar al nivel real",
      "suggestedStudentIds": [
        "alejandra"
      ],
      "check": "Corrección automática de equivalencia de fracciones; el procedimiento se revisa por separado en clase.",
      "status": "Disponible"
    },
    {
      "id": "a-frac-negativa",
      "title": "Fracciones con signo",
      "objective": "Practicar fracciones y explicar cómo se comprueba el resultado.",
      "subject": "Matemáticas",
      "skillId": "a-suma-fracciones",
      "duration": 5,
      "type": "fraction",
      "answer": "1/12",
      "instructions": "−3/4 + 5/6. Calcula y escribe el resultado como fracción. Se aceptan fracciones equivalentes; en clase explicaremos la simplificación y el procedimiento.",
      "materials": "Papel para el procedimiento; respuesta en el cuadro.",
      "checkMethod": "Corrección automática de equivalencia de fracciones; el procedimiento se revisa por separado en clase.",
      "hints": [
        "Conserva el signo negativo al pasar a denominador 12.",
        "−3/4 = −9/12 y 5/6 = 10/12."
      ],
      "level": "2.º de ESO · adaptar al nivel real",
      "suggestedStudentIds": [
        "alejandra"
      ],
      "check": "Corrección automática de equivalencia de fracciones; el procedimiento se revisa por separado en clase.",
      "status": "Disponible"
    },
    {
      "id": "a-libro-160",
      "title": "Dos días de lectura",
      "objective": "Interpretar fracciones del total y comprobar cuánto queda.",
      "subject": "Matemáticas",
      "skillId": "a-problemas",
      "duration": 12,
      "type": "open",
      "instructions": "Un libro tiene 160 páginas. El lunes lees 3/8 del total y el martes 1/4 del total. ¿Qué fracción del libro queda? ¿Cuántas páginas son? Representa la situación y explica por qué ambas fracciones se refieren al total inicial.",
      "materials": "Papel o dibujo de una barra dividida en ocho partes.",
      "checkMethod": "Revisión docente de representación, cálculo y significado de «del total».",
      "answer": "3/8 + 1/4 = 5/8 leídos. Quedan 1 − 5/8 = 3/8, equivalentes a 60 páginas de 160.",
      "hints": [
        "Convierte 1/4 a octavos.",
        "El lunes y el martes se habla del total, no de lo que queda.",
        "Calcula 3/8 de 160 para obtener las páginas restantes."
      ],
      "level": "2.º de ESO · adaptar al nivel real",
      "suggestedStudentIds": [
        "alejandra"
      ],
      "check": "Revisión docente de representación, cálculo y significado de «del total».",
      "status": "Disponible"
    },
    {
      "id": "a-masa-volumen",
      "title": "¿Qué mide cada cosa?",
      "objective": "Distinguir masa, volumen y unidades antes de calcular densidades.",
      "subject": "Física y química",
      "skillId": "a-masa-volumen",
      "duration": 10,
      "type": "open",
      "instructions": "Propuesta inicial pendiente de confirmar con el colegio. Explica qué describirías con masa y qué con volumen. Elige una unidad para cada magnitud y un instrumento para medirla. ¿Dos objetos del mismo tamaño tienen que tener la misma masa? Razona con un ejemplo.",
      "materials": "Objetos cotidianos; balanza y recipiente graduado si están disponibles.",
      "checkMethod": "Revisión docente del significado y de la justificación; no exigir fórmulas antes de comprender las magnitudes.",
      "answer": "Masa: por ejemplo g o kg, balanza. Volumen: por ejemplo mL, L o cm³, recipiente graduado o medidas geométricas según objeto. Igual volumen no implica igual masa: depende del material.",
      "hints": [
        "Piensa en una pelota de espuma y otra de metal del mismo tamaño.",
        "La balanza y la probeta no miden la misma magnitud."
      ],
      "level": "2.º de ESO · adaptar al nivel real",
      "suggestedStudentIds": [
        "alejandra"
      ],
      "check": "Revisión docente del significado y de la justificación; no exigir fórmulas antes de comprender las magnitudes.",
      "status": "Disponible"
    },
    {
      "id": "a-unidades",
      "title": "Unidades que cuentan lo mismo",
      "objective": "Relacionar kg y g, L y mL, y mL y cm³.",
      "subject": "Física y química",
      "skillId": "a-unidades",
      "duration": 8,
      "type": "open",
      "instructions": "Completa y explica: 1 kg = ___ g; 1 L = ___ mL; 1 mL = ___ cm³. Después convierte 0,5 kg a g y 250 mL a cm³. Explica por qué no podemos convertir cualquier cantidad de gramos a mililitros sin saber el material.",
      "materials": "Papel, envases o recipientes graduados si ayudan.",
      "checkMethod": "Revisión docente de equivalencias y de la distinción entre masa y volumen.",
      "answer": "1000 g; 1000 mL; 1 cm³. 0,5 kg = 500 g; 250 mL = 250 cm³. Para relacionar masa y volumen necesitamos la densidad del material y las condiciones pertinentes.",
      "hints": [
        "Kilo- equivale a mil unidades; mili- a una milésima.",
        "mL y cm³ expresan volumen; g expresa masa."
      ],
      "level": "2.º de ESO · adaptar al nivel real",
      "suggestedStudentIds": [
        "alejandra"
      ],
      "check": "Revisión docente de equivalencias y de la distinción entre masa y volumen.",
      "status": "Disponible"
    },
    {
      "id": "a-densidad-densidad",
      "title": "La densidad de un material",
      "objective": "Usar el significado de la densidad y comprobar las unidades.",
      "subject": "Física y química",
      "skillId": "a-densidad",
      "duration": 7,
      "type": "numeric",
      "instructions": "Un objeto tiene una masa de 120 g y un volumen de 40 cm³. Calcula su densidad en g/cm³. Escribe solo el valor numérico; la unidad solicitada es g/cm³.",
      "answer": "3",
      "materials": "Papel: datos con unidades → qué busco → razonamiento y cálculo → respuesta con unidades.",
      "checkMethod": "Corrección automática del valor en la unidad solicitada. El razonamiento y las unidades del procedimiento requieren revisión docente.",
      "hints": [
        "d = m/V: divide la masa entre el volumen.",
        "120 ÷ 40."
      ],
      "level": "2.º de ESO · adaptar al nivel real",
      "suggestedStudentIds": [
        "alejandra"
      ],
      "check": "Corrección automática del valor en la unidad solicitada. El razonamiento y las unidades del procedimiento requieren revisión docente.",
      "status": "Disponible"
    },
    {
      "id": "a-densidad-masa",
      "title": "Mismo material, más volumen",
      "objective": "Usar el significado de la densidad y comprobar las unidades.",
      "subject": "Física y química",
      "skillId": "a-densidad",
      "duration": 7,
      "type": "numeric",
      "instructions": "Para un mismo material y en las mismas condiciones, d = 3 g/cm³. ¿Qué masa tienen 80 cm³? Escribe solo el valor numérico en gramos.",
      "answer": "240",
      "materials": "Papel: datos con unidades → qué busco → razonamiento y cálculo → respuesta con unidades.",
      "checkMethod": "Corrección automática del valor en la unidad solicitada. El razonamiento y las unidades del procedimiento requieren revisión docente.",
      "hints": [
        "Si cada cm³ tiene 3 g, relaciona la masa con el número de cm³.",
        "m = d · V = 3 × 80."
      ],
      "level": "2.º de ESO · adaptar al nivel real",
      "suggestedStudentIds": [
        "alejandra"
      ],
      "check": "Corrección automática del valor en la unidad solicitada. El razonamiento y las unidades del procedimiento requieren revisión docente.",
      "status": "Disponible"
    },
    {
      "id": "a-densidad-volumen",
      "title": "Buscar el volumen",
      "objective": "Usar el significado de la densidad y comprobar las unidades.",
      "subject": "Física y química",
      "skillId": "a-densidad",
      "duration": 7,
      "type": "numeric",
      "instructions": "Para un mismo material y en las mismas condiciones, d = 3 g/cm³. ¿Qué volumen tienen 90 g? Escribe solo el valor numérico en cm³.",
      "answer": "30",
      "materials": "Papel: datos con unidades → qué busco → razonamiento y cálculo → respuesta con unidades.",
      "checkMethod": "Corrección automática del valor en la unidad solicitada. El razonamiento y las unidades del procedimiento requieren revisión docente.",
      "hints": [
        "Si 1 cm³ tiene 3 g, ¿cuántos grupos de 3 g hay en 90 g?",
        "V = m/d = 90 ÷ 3."
      ],
      "level": "2.º de ESO · adaptar al nivel real",
      "suggestedStudentIds": [
        "alejandra"
      ],
      "check": "Corrección automática del valor en la unidad solicitada. El razonamiento y las unidades del procedimiento requieren revisión docente.",
      "status": "Disponible"
    },
    {
      "id": "a-densidad-procedimiento",
      "title": "Explicar una densidad",
      "objective": "Justificar cada paso y las unidades de una fórmula.",
      "subject": "Física y química",
      "skillId": "a-densidad",
      "duration": 10,
      "type": "open",
      "instructions": "Explica cómo averiguarías la densidad de un objeto de 120 g y 40 cm³. Organiza la respuesta: datos con unidades; qué buscas; razonamiento y cálculo; respuesta con unidades. ¿Qué significa el resultado en una frase? Es una propuesta inicial que adaptaremos al tema del colegio.",
      "materials": "Papel o cuadro de respuesta.",
      "checkMethod": "Revisión docente del procedimiento y del significado de g/cm³.",
      "answer": "d = 120 g / 40 cm³ = 3 g/cm³. Cada cm³ de ese material tiene una masa de 3 g en esas condiciones.",
      "hints": [
        "La densidad expresa cuánta masa corresponde a cada unidad de volumen.",
        "No escribas solo 3: explica qué representa g/cm³."
      ],
      "level": "2.º de ESO · adaptar al nivel real",
      "suggestedStudentIds": [
        "alejandra"
      ],
      "check": "Revisión docente del procedimiento y del significado de g/cm³.",
      "status": "Disponible"
    },
    {
      "id": "a-sintaxis",
      "title": "Analizar y justificar",
      "objective": "Explicar funciones sintácticas con el método de su profesora.",
      "subject": "Lengua",
      "skillId": "a-sintaxis",
      "duration": 12,
      "type": "open",
      "instructions": "Trae una oración o un ejemplo corregido por tu profesora y anota sus etiquetas y procedimiento. Analiza después «La alumna revisó el problema con cuidado» con ese mismo método. Justifica las funciones y transforma el sujeto al plural comprobando la concordancia. Si hay una diferencia con otra fuente, consúltala en clase.",
      "materials": "Apuntes de su profesora y papel.",
      "checkMethod": "Revisión docente según la terminología y los procedimientos de su profesora, evitando valorar por coincidencia exacta.",
      "hints": [
        "Localiza primero el verbo y comprueba cómo cambia al variar el sujeto.",
        "Justifica cada etiqueta con una prueba utilizada en tus clases."
      ],
      "level": "2.º de ESO · adaptar al nivel real",
      "suggestedStudentIds": [
        "alejandra"
      ],
      "check": "Revisión docente según la terminología y los procedimientos de su profesora, evitando valorar por coincidencia exacta.",
      "status": "Disponible"
    },
    {
      "id": "r-ingles-contexto",
      "title": "Una conversación que usaría",
      "objective": "Usar y revisar inglés en contexto, ajustado al nivel real.",
      "subject": "Inglés",
      "skillId": "r-ingles",
      "level": "6.º de Primaria",
      "duration": 12,
      "type": "open",
      "instructions": "Elige un tema que estés trabajando en inglés en el colegio. Prepara cuatro frases sobre una situación real: presentarte, pedir algo o contar tu día. Léelas o dilo en voz alta y escribe una pregunta para continuar la conversación.",
      "materials": "Apuntes del colegio; voz o cuadro de respuesta.",
      "checkMethod": "Revisión docente de comunicación y del contenido acordado; no inferir nivel por una única actividad.",
      "hints": [
        "Empieza por lo que quieres decir y por las expresiones que ya conoces.",
        "Consulta un ejemplo de tus apuntes y adapta el significado a tu situación."
      ],
      "suggestedStudentIds": [
        "rocio"
      ],
      "check": "Revisión docente de comunicación y del contenido acordado; no inferir nivel por una única actividad.",
      "status": "Disponible"
    },
    {
      "id": "a-ingles-contexto",
      "title": "Inglés con una situación real",
      "objective": "Usar y revisar inglés en contexto, ajustado al nivel real.",
      "subject": "Inglés",
      "skillId": "a-ingles",
      "level": "Nivel por comprobar",
      "duration": 12,
      "type": "open",
      "instructions": "Elige con tu profesor una estructura del colegio y úsala en un diálogo de seis intervenciones. Explica qué querías comunicar. Revisa una frase y justifica el cambio con tus apuntes.",
      "materials": "Apuntes del colegio; voz o cuadro de respuesta.",
      "checkMethod": "Revisión docente de comunicación y del contenido acordado; no inferir nivel por una única actividad.",
      "hints": [
        "Empieza por lo que quieres decir y por las expresiones que ya conoces.",
        "Consulta un ejemplo de tus apuntes y adapta el significado a tu situación."
      ],
      "suggestedStudentIds": [
        "alejandra"
      ],
      "check": "Revisión docente de comunicación y del contenido acordado; no inferir nivel por una única actividad.",
      "status": "Disponible"
    },
    {
      "id": "act-res-mundo-ortografia",
      "title": "Mundo Primaria · Ortografía de sexto",
      "objective": "Aplicar una regla de acentuación y explicar las decisiones.",
      "subject": "Lengua",
      "skillId": "r-tildes",
      "level": "6.º de Primaria",
      "duration": 10,
      "instructions": "Elige con tu profesor una actividad de acentuación. Antes de abrirla, recuerda la regla. Después anota tres palabras y explica por qué llevan o no llevan tilde. Si lo deseas, guarda una captura del resultado para comentarla.",
      "materials": "Recurso externo: https://www.mundoprimaria.com/juegos-educativos/juegos-lenguaje/ortografia/ort-sexto. Se ha podido consultar el índice de ortografía; no se ha probado cada juego ni confirmado su gratuidad o condiciones de uso.",
      "checkMethod": "Entrega y revisión docente de la respuesta. Abrir el enlace o marcarlo como utilizado no registra aciertos externos ni cambia el estado de una habilidad.",
      "type": "external",
      "hints": [
        "Lee la consigna antes de abrir el enlace y decide qué vas a observar.",
        "Al volver, explica lo que hiciste y lo que necesitas preguntar."
      ],
      "suggestedStudentIds": [
        "rocio"
      ],
      "resourceId": "res-mundo-ortografia",
      "url": "https://www.mundoprimaria.com/juegos-educativos/juegos-lenguaje/ortografia/ort-sexto",
      "check": "Entrega y revisión docente de la respuesta. Abrir el enlace o marcarlo como utilizado no registra aciertos externos ni cambia el estado de una habilidad.",
      "status": "Disponible"
    },
    {
      "id": "act-res-jirafas",
      "title": "Mundo Primaria · Curiosidades de las jirafas",
      "objective": "Comprender una lectura y distinguir datos, inferencias y resumen.",
      "subject": "Lengua",
      "skillId": "r-lectura",
      "level": "Primaria · ajustar dificultad",
      "duration": 15,
      "instructions": "Lee el texto en la web. Elige dos datos que afirme y señala dónde aparecen. Formula una pregunta cuya respuesta pueda deducirse y justifica tu inferencia. Termina con un resumen de tres frases con tus palabras.",
      "materials": "Recurso externo: https://www.mundoprimaria.com/lecturas-para-ninos-primaria/curiosidades-las-jirafas. Texto legible en la consulta; el juego de comprensión incrustado no se ha probado. La web conserva sus propias condiciones y anuncios.",
      "checkMethod": "Entrega y revisión docente de la respuesta. Abrir el enlace o marcarlo como utilizado no registra aciertos externos ni cambia el estado de una habilidad.",
      "type": "external",
      "hints": [
        "Lee la consigna antes de abrir el enlace y decide qué vas a observar.",
        "Al volver, explica lo que hiciste y lo que necesitas preguntar."
      ],
      "suggestedStudentIds": [
        "rocio"
      ],
      "resourceId": "res-jirafas",
      "url": "https://www.mundoprimaria.com/lecturas-para-ninos-primaria/curiosidades-las-jirafas",
      "check": "Entrega y revisión docente de la respuesta. Abrir el enlace o marcarlo como utilizado no registra aciertos externos ni cambia el estado de una habilidad.",
      "status": "Disponible"
    },
    {
      "id": "act-res-bc-kids",
      "title": "British Council Kids · Grammar practice",
      "objective": "Aplicar una estructura de inglés del colegio en frases propias.",
      "subject": "Inglés",
      "skillId": "r-ingles",
      "level": "Por ajustar al nivel real",
      "duration": 12,
      "instructions": "Elige con tu profesor un punto de gramática que estéis trabajando. Lee un ejemplo y realiza una práctica breve. Después escribe dos frases sobre ti y una pregunta usando esa estructura.",
      "materials": "Recurso externo: https://learnenglishkids.britishcouncil.org/grammar-vocabulary/grammar-practice. Índice consultable. No se ha probado cada actividad ni se garantiza acceso gratuito a todos los servicios vinculados.",
      "checkMethod": "Entrega y revisión docente de la respuesta. Abrir el enlace o marcarlo como utilizado no registra aciertos externos ni cambia el estado de una habilidad.",
      "type": "external",
      "hints": [
        "Lee la consigna antes de abrir el enlace y decide qué vas a observar.",
        "Al volver, explica lo que hiciste y lo que necesitas preguntar."
      ],
      "suggestedStudentIds": [
        "rocio"
      ],
      "resourceId": "res-bc-kids",
      "url": "https://learnenglishkids.britishcouncil.org/grammar-vocabulary/grammar-practice",
      "check": "Entrega y revisión docente de la respuesta. Abrir el enlace o marcarlo como utilizado no registra aciertos externos ni cambia el estado de una habilidad.",
      "status": "Disponible"
    },
    {
      "id": "act-res-khan",
      "title": "Khan Academy · Matemáticas",
      "objective": "Practicar una habilidad matemática elegida a partir de una duda concreta.",
      "subject": "Matemáticas",
      "skillId": "a-fracciones",
      "level": "Por elegir según la habilidad",
      "duration": 15,
      "instructions": "Selecciona con tu profesor una explicación o práctica adecuada. Antes, intenta un ejemplo en papel. Después escribe qué cambió en tu procedimiento y resuelve una variante propia. Guarda una duda si un paso no se entiende.",
      "materials": "Recurso externo: https://es.khanacademy.org/math. La URL responde, pero su contenido dinámico no fue legible en la comprobación automática. Revisar acceso, selección y posibles requisitos de cuenta antes de asignar.",
      "checkMethod": "Entrega y revisión docente de la respuesta. Abrir el enlace o marcarlo como utilizado no registra aciertos externos ni cambia el estado de una habilidad.",
      "type": "external",
      "hints": [
        "Lee la consigna antes de abrir el enlace y decide qué vas a observar.",
        "Al volver, explica lo que hiciste y lo que necesitas preguntar."
      ],
      "suggestedStudentIds": [
        "alejandra"
      ],
      "resourceId": "res-khan",
      "url": "https://es.khanacademy.org/math",
      "check": "Entrega y revisión docente de la respuesta. Abrir el enlace o marcarlo como utilizado no registra aciertos externos ni cambia el estado de una habilidad.",
      "status": "Disponible"
    },
    {
      "id": "act-res-descartes",
      "title": "Descartes · Matemáticas de 2.º de ESO",
      "objective": "Relacionar una representación con un procedimiento de fracciones o ecuaciones.",
      "subject": "Matemáticas",
      "skillId": "a-fracciones",
      "level": "2.º de ESO · material LOMCE",
      "duration": 15,
      "instructions": "Abre la unidad elegida con tu profesor. Antes de mover un control o comprobar una respuesta, predice el resultado. Después compara lo observado con tu predicción y explica un ejemplo en papel.",
      "materials": "Recurso externo: https://proyectodescartes.org/EDAD/mat_2eso_cast-LOMCE.htm. Índice y unidades enlazadas visibles. No se han probado todas las escenas; comprobar compatibilidad y condiciones del material seleccionado.",
      "checkMethod": "Entrega y revisión docente de la respuesta. Abrir el enlace o marcarlo como utilizado no registra aciertos externos ni cambia el estado de una habilidad.",
      "type": "external",
      "hints": [
        "Lee la consigna antes de abrir el enlace y decide qué vas a observar.",
        "Al volver, explica lo que hiciste y lo que necesitas preguntar."
      ],
      "suggestedStudentIds": [
        "alejandra"
      ],
      "resourceId": "res-descartes",
      "url": "https://proyectodescartes.org/EDAD/mat_2eso_cast-LOMCE.htm",
      "check": "Entrega y revisión docente de la respuesta. Abrir el enlace o marcarlo como utilizado no registra aciertos externos ni cambia el estado de una habilidad.",
      "status": "Disponible"
    },
    {
      "id": "act-res-phet-densidad",
      "title": "PhET · Densidad",
      "objective": "Interpretar la relación entre masa, volumen y densidad.",
      "subject": "Física y química",
      "skillId": "a-densidad",
      "level": "Introducción · tema por confirmar",
      "duration": 15,
      "instructions": "Antes de abrir la simulación, predice qué pasará con la masa si duplicas el volumen de un mismo material. Compruébalo, registra los valores con sus unidades y explica si tu predicción se cumple. Cambia después de material manteniendo el volumen y compara.",
      "materials": "Recurso externo: https://phet.colorado.edu/es/simulations/density. La página de la simulación responde, pero no se ejecutó su parte interactiva. Revisar carga y funcionamiento en el dispositivo antes de la clase.",
      "checkMethod": "Entrega y revisión docente de la respuesta. Abrir el enlace o marcarlo como utilizado no registra aciertos externos ni cambia el estado de una habilidad.",
      "type": "external",
      "hints": [
        "Lee la consigna antes de abrir el enlace y decide qué vas a observar.",
        "Al volver, explica lo que hiciste y lo que necesitas preguntar."
      ],
      "suggestedStudentIds": [
        "alejandra"
      ],
      "resourceId": "res-phet-densidad",
      "url": "https://phet.colorado.edu/es/simulations/density",
      "check": "Entrega y revisión docente de la respuesta. Abrir el enlace o marcarlo como utilizado no registra aciertos externos ni cambia el estado de una habilidad.",
      "status": "Disponible"
    },
    {
      "id": "act-res-sintaxis",
      "title": "Sintaxis.org · Oraciones resueltas",
      "objective": "Justificar un análisis sintáctico y contrastarlo con el método del colegio.",
      "subject": "Lengua",
      "skillId": "a-sintaxis",
      "level": "Adaptar a su profesora",
      "duration": 12,
      "instructions": "Elige una oración adecuada con tu profesor. Analízala antes de mirar la solución y justifica dos funciones. Compárala después con la solución, usando las etiquetas de tu profesora. Anota cualquier discrepancia para revisarla en clase.",
      "materials": "Recurso externo: https://sintaxis.org/oracion-simple/ejercicios-resueltos/. Índice legible de oraciones resueltas. La adecuación y la terminología requieren selección docente; no se ha auditado todo el banco.",
      "checkMethod": "Entrega y revisión docente de la respuesta. Abrir el enlace o marcarlo como utilizado no registra aciertos externos ni cambia el estado de una habilidad.",
      "type": "external",
      "hints": [
        "Lee la consigna antes de abrir el enlace y decide qué vas a observar.",
        "Al volver, explica lo que hiciste y lo que necesitas preguntar."
      ],
      "suggestedStudentIds": [
        "alejandra"
      ],
      "resourceId": "res-sintaxis",
      "url": "https://sintaxis.org/oracion-simple/ejercicios-resueltos/",
      "check": "Entrega y revisión docente de la respuesta. Abrir el enlace o marcarlo como utilizado no registra aciertos externos ni cambia el estado de una habilidad.",
      "status": "Disponible"
    },
    {
      "id": "act-res-bc-teens",
      "title": "British Council Teens · A1–A2 Grammar",
      "objective": "Reconocer una estructura gramatical en una conversación y usarla.",
      "subject": "Inglés",
      "skillId": "a-ingles",
      "level": "A1–A2 de referencia · nivel por comprobar",
      "duration": 15,
      "instructions": "Elige con tu profesor una estructura del colegio. Mira un fragmento y localiza dos ejemplos. Después escribe un diálogo breve con esa estructura y señala una pregunta que quieras revisar.",
      "materials": "Recurso externo: https://learnenglishteens.britishcouncil.org/grammar/a1-a2-grammar. Índice y descripciones legibles. No se ha probado cada vídeo o ejercicio ni confirmado requisitos particulares de los servicios enlazados.",
      "checkMethod": "Entrega y revisión docente de la respuesta. Abrir el enlace o marcarlo como utilizado no registra aciertos externos ni cambia el estado de una habilidad.",
      "type": "external",
      "hints": [
        "Lee la consigna antes de abrir el enlace y decide qué vas a observar.",
        "Al volver, explica lo que hiciste y lo que necesitas preguntar."
      ],
      "suggestedStudentIds": [
        "alejandra"
      ],
      "resourceId": "res-bc-teens",
      "url": "https://learnenglishteens.britishcouncil.org/grammar/a1-a2-grammar",
      "check": "Entrega y revisión docente de la respuesta. Abrir el enlace o marcarlo como utilizado no registra aciertos externos ni cambia el estado de una habilidad.",
      "status": "Disponible"
    },
    {
      "id": "act-res-rae",
      "title": "RAE · Dudas sobre la tilde",
      "objective": "Consultar una duda ortográfica concreta y aplicar la explicación a ejemplos.",
      "subject": "Lengua",
      "skillId": "r-hiatos",
      "level": "Consulta acompañada",
      "duration": 8,
      "instructions": "Escribe primero tu duda y un ejemplo. Busca con tu profesor el apartado pertinente de la entrada sobre la tilde. Reformula la regla con tus palabras y aplícala a dos ejemplos nuevos; no hace falta leer toda la entrada.",
      "materials": "Recurso externo: https://www.rae.es/dpd/tilde. Entrada legible. La explicación requiere adaptación didáctica; acceso observado en esta fecha, no garantía futura.",
      "checkMethod": "Entrega y revisión docente de la respuesta. Abrir el enlace o marcarlo como utilizado no registra aciertos externos ni cambia el estado de una habilidad.",
      "type": "external",
      "hints": [
        "Lee la consigna antes de abrir el enlace y decide qué vas a observar.",
        "Al volver, explica lo que hiciste y lo que necesitas preguntar."
      ],
      "suggestedStudentIds": [
        "rocio"
      ],
      "resourceId": "res-rae",
      "url": "https://www.rae.es/dpd/tilde",
      "check": "Entrega y revisión docente de la respuesta. Abrir el enlace o marcarlo como utilizado no registra aciertos externos ni cambia el estado de una habilidad.",
      "status": "Disponible"
    }
  ],
  "resources": [
    {
      "id": "res-mundo-ortografia",
      "title": "Mundo Primaria · Ortografía de sexto",
      "url": "https://www.mundoprimaria.com/juegos-educativos/juegos-lenguaje/ortografia/ort-sexto",
      "subject": "Lengua",
      "skillId": "r-tildes",
      "level": "6.º de Primaria",
      "type": "Juego",
      "duration": 10,
      "suggestedStudentIds": [
        "rocio"
      ],
      "objective": "Aplicar una regla de acentuación y explicar las decisiones.",
      "instructions": "Elige con tu profesor una actividad de acentuación. Antes de abrirla, recuerda la regla. Después anota tres palabras y explica por qué llevan o no llevan tilde. Si lo deseas, guarda una captura del resultado para comentarla.",
      "description": "Selección de juegos de ortografía. Elegir una actividad concreta antes de usarla.",
      "checkedAt": "2026-11-10",
      "accessStatus": "Página accesible",
      "accessNote": "Se ha podido consultar el índice de ortografía; no se ha probado cada juego ni confirmado su gratuidad o condiciones de uso."
    },
    {
      "id": "res-jirafas",
      "title": "Mundo Primaria · Curiosidades de las jirafas",
      "url": "https://www.mundoprimaria.com/lecturas-para-ninos-primaria/curiosidades-las-jirafas",
      "subject": "Lengua",
      "skillId": "r-lectura",
      "level": "Primaria · ajustar dificultad",
      "type": "Lectura",
      "duration": 15,
      "suggestedStudentIds": [
        "rocio"
      ],
      "objective": "Comprender una lectura y distinguir datos, inferencias y resumen.",
      "instructions": "Lee el texto en la web. Elige dos datos que afirme y señala dónde aparecen. Formula una pregunta cuya respuesta pueda deducirse y justifica tu inferencia. Termina con un resumen de tres frases con tus palabras.",
      "description": "Lectura externa; conservar el enlace y respuestas propias, sin copiar la lectura a la aplicación.",
      "checkedAt": "2026-11-10",
      "accessStatus": "Página accesible",
      "accessNote": "Texto legible en la consulta; el juego de comprensión incrustado no se ha probado. La web conserva sus propias condiciones y anuncios."
    },
    {
      "id": "res-bc-kids",
      "title": "British Council Kids · Grammar practice",
      "url": "https://learnenglishkids.britishcouncil.org/grammar-vocabulary/grammar-practice",
      "subject": "Inglés",
      "skillId": "r-ingles",
      "level": "Por ajustar al nivel real",
      "type": "Práctica",
      "duration": 12,
      "suggestedStudentIds": [
        "rocio"
      ],
      "objective": "Aplicar una estructura de inglés del colegio en frases propias.",
      "instructions": "Elige con tu profesor un punto de gramática que estéis trabajando. Lee un ejemplo y realiza una práctica breve. Después escribe dos frases sobre ti y una pregunta usando esa estructura.",
      "description": "Índice de gramática con prácticas y materiales; selección docente previa.",
      "checkedAt": "2026-11-10",
      "accessStatus": "Página accesible",
      "accessNote": "Índice consultable. No se ha probado cada actividad ni se garantiza acceso gratuito a todos los servicios vinculados."
    },
    {
      "id": "res-khan",
      "title": "Khan Academy · Matemáticas",
      "url": "https://es.khanacademy.org/math",
      "subject": "Matemáticas",
      "skillId": "a-fracciones",
      "level": "Por elegir según la habilidad",
      "type": "Práctica",
      "duration": 15,
      "suggestedStudentIds": [
        "alejandra"
      ],
      "objective": "Practicar una habilidad matemática elegida a partir de una duda concreta.",
      "instructions": "Selecciona con tu profesor una explicación o práctica adecuada. Antes, intenta un ejemplo en papel. Después escribe qué cambió en tu procedimiento y resuelve una variante propia. Guarda una duda si un paso no se entiende.",
      "description": "Catálogo amplio de matemáticas; no equivale por sí mismo al temario del colegio.",
      "checkedAt": "2026-11-10",
      "accessStatus": "Revisar interacción",
      "accessNote": "La URL responde, pero su contenido dinámico no fue legible en la comprobación automática. Revisar acceso, selección y posibles requisitos de cuenta antes de asignar."
    },
    {
      "id": "res-descartes",
      "title": "Descartes · Matemáticas de 2.º de ESO",
      "url": "https://proyectodescartes.org/EDAD/mat_2eso_cast-LOMCE.htm",
      "subject": "Matemáticas",
      "skillId": "a-fracciones",
      "level": "2.º de ESO · material LOMCE",
      "type": "Interactivo",
      "duration": 15,
      "suggestedStudentIds": [
        "alejandra"
      ],
      "objective": "Relacionar una representación con un procedimiento de fracciones o ecuaciones.",
      "instructions": "Abre la unidad elegida con tu profesor. Antes de mover un control o comprobar una respuesta, predice el resultado. Después compara lo observado con tu predicción y explica un ejemplo en papel.",
      "description": "Índice de unidades de 2.º de ESO identificado como LOMCE; comprobar ajuste al contenido actual.",
      "checkedAt": "2026-11-10",
      "accessStatus": "Página accesible",
      "accessNote": "Índice y unidades enlazadas visibles. No se han probado todas las escenas; comprobar compatibilidad y condiciones del material seleccionado."
    },
    {
      "id": "res-phet-densidad",
      "title": "PhET · Densidad",
      "url": "https://phet.colorado.edu/es/simulations/density",
      "subject": "Física y química",
      "skillId": "a-densidad",
      "level": "Introducción · tema por confirmar",
      "type": "Simulación",
      "duration": 15,
      "suggestedStudentIds": [
        "alejandra"
      ],
      "objective": "Interpretar la relación entre masa, volumen y densidad.",
      "instructions": "Antes de abrir la simulación, predice qué pasará con la masa si duplicas el volumen de un mismo material. Compruébalo, registra los valores con sus unidades y explica si tu predicción se cumple. Cambia después de material manteniendo el volumen y compara.",
      "description": "Simulación externa de densidad. Propuesta inicial pendiente de confirmar con el colegio.",
      "checkedAt": "2026-11-10",
      "accessStatus": "Revisar interacción",
      "accessNote": "La página de la simulación responde, pero no se ejecutó su parte interactiva. Revisar carga y funcionamiento en el dispositivo antes de la clase."
    },
    {
      "id": "res-sintaxis",
      "title": "Sintaxis.org · Oraciones resueltas",
      "url": "https://sintaxis.org/oracion-simple/ejercicios-resueltos/",
      "subject": "Lengua",
      "skillId": "a-sintaxis",
      "level": "Adaptar a su profesora",
      "type": "Ejemplos",
      "duration": 12,
      "suggestedStudentIds": [
        "alejandra"
      ],
      "objective": "Justificar un análisis sintáctico y contrastarlo con el método del colegio.",
      "instructions": "Elige una oración adecuada con tu profesor. Analízala antes de mirar la solución y justifica dos funciones. Compárala después con la solución, usando las etiquetas de tu profesora. Anota cualquier discrepancia para revisarla en clase.",
      "description": "Banco de oraciones resueltas; la terminología puede diferir de la del colegio.",
      "checkedAt": "2026-11-10",
      "accessStatus": "Página accesible",
      "accessNote": "Índice legible de oraciones resueltas. La adecuación y la terminología requieren selección docente; no se ha auditado todo el banco."
    },
    {
      "id": "res-bc-teens",
      "title": "British Council Teens · A1–A2 Grammar",
      "url": "https://learnenglishteens.britishcouncil.org/grammar/a1-a2-grammar",
      "subject": "Inglés",
      "skillId": "a-ingles",
      "level": "A1–A2 de referencia · nivel por comprobar",
      "type": "Vídeo y práctica",
      "duration": 15,
      "suggestedStudentIds": [
        "alejandra"
      ],
      "objective": "Reconocer una estructura gramatical en una conversación y usarla.",
      "instructions": "Elige con tu profesor una estructura del colegio. Mira un fragmento y localiza dos ejemplos. Después escribe un diálogo breve con esa estructura y señala una pregunta que quieras revisar.",
      "description": "Referencia A1–A2: no supone que este sea el nivel real de la alumna.",
      "checkedAt": "2026-11-10",
      "accessStatus": "Página accesible",
      "accessNote": "Índice y descripciones legibles. No se ha probado cada vídeo o ejercicio ni confirmado requisitos particulares de los servicios enlazados."
    },
    {
      "id": "res-rae",
      "title": "RAE · Dudas sobre la tilde",
      "url": "https://www.rae.es/dpd/tilde",
      "subject": "Lengua",
      "skillId": "r-hiatos",
      "level": "Consulta acompañada",
      "type": "Referencia",
      "duration": 8,
      "suggestedStudentIds": [
        "rocio"
      ],
      "objective": "Consultar una duda ortográfica concreta y aplicar la explicación a ejemplos.",
      "instructions": "Escribe primero tu duda y un ejemplo. Busca con tu profesor el apartado pertinente de la entrada sobre la tilde. Reformula la regla con tus palabras y aplícala a dos ejemplos nuevos; no hace falta leer toda la entrada.",
      "description": "Diccionario panhispánico de dudas, segunda edición; fuente de consulta docente y acompañada.",
      "checkedAt": "2026-11-10",
      "accessStatus": "Página accesible",
      "accessNote": "Entrada legible. La explicación requiere adaptación didáctica; acceso observado en esta fecha, no garantía futura."
    }
  ]
} as const;
