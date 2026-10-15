import { CharacterSheet } from './types';

export const defaultCharacters: CharacterSheet[] = [
  {
    id: 'megalina',
    name: 'Megalina',
    internalName: 'Megalina Fox',
    gender: 'f',
    neverWriteNameInPrompt: true,
    howToCite: 'the same woman as in the reference images, face and features identical to the references, unchanged',
    identityBlockEn: 'small gold hoop earrings, no tattoos, no piercings',
    fixedTraits: {
      cabelo: 'long wavy dark-brown with caramel highlights, center part',
      olhos: 'warm honey-brown, never green or blue',
      pele: 'warm tan, visible light freckles on nose and cheeks, visible pores',
      labios: 'very full, plump, natural nude-pink',
      acessorios: 'small gold hoop earrings',
      corpo_e_idade: 'as in the reference images; adult',
    },
    forbiddenWords: [
      'tattoo', 'tattoos', 'tattooed', 'piercing', 'piercings', 'nose ring',
      'septum', 'lip ring', 'eyebrow piercing', 'belly piercing', 'blonde',
      'blond', 'platinum hair', 'red hair', 'pink hair', 'blue hair',
      'short hair', 'bald', 'glasses', 'eyeglasses', 'nose stud', 'braces', 'lip stud'
    ],
    negativePromptEn: 'no tattoos, no piercings, no beauty filter, no plastic skin',
    standardReferences: ['Maga_002.png', 'Maga_003.png', 'Maga_004.png'],
    bodyReferences: ['Maga_121.jpg', 'Maga_122.jpg', 'Maga_124.jpg', 'Maga_129.jpg'],
    greeting: 'Oi! Sou a Megalina. Pronta pra gravar ou planejar a próxima cena?',
    personality: 'Espontânea, elegante, confiante, expressiva e natural na câmera.',
    dialogueExamples: [
      { user: 'Como você prefere o look pra hoje?', char: 'Algo casual e leve, talvez tons quentes e cabelo natural solto.' },
      { user: 'Pronta pra gravação externa?', char: 'Com certeza! A luz natural da tarde é perfeita pro nosso contraste.' }
    ],
    observation: 'Nome nunca entra no prompt (filtro de pessoa proeminente no Flow). Rosto e traços vêm das 3 referências mestre anexadas.'
  },
  {
    id: 'david',
    name: 'David',
    internalName: 'David Qix',
    gender: 'm',
    neverWriteNameInPrompt: false,
    howToCite: 'the same man as in the reference images, face and features identical to the references, unchanged',
    identityBlockEn: 'large dark rectangular full-rim eyeglasses, a thin dark hoop on the subject-right nostril (never mirrored, never a stud), small gold-tone spherical stud earrings in both earlobes, short dark stubble beard, very short dark cropped hair with close faded sides',
    fixedTraits: {
      oculos: 'dark rectangular full-rim, always',
      narina: 'thin dark hoop, right nostril, never mirrored',
      brincos: 'gold ball studs, both lobes',
      cabelo: 'very short dark cropped hair with close faded sides',
      barba: 'short dark stubble beard'
    },
    forbiddenWords: [
      'no glasses', 'curly hair', 'long hair', 'clean shaven', 'tattoo'
    ],
    negativePromptEn: 'no beauty filter, no smoothing, no face slimming, no mirrored nose hoop, no plastic skin',
    standardReferences: ['01_IDENTITY_APPROVED_MASTER.png', '04_PORTRAIT_01_FRONT_NEUTRAL.png', '02_FACE_3Q_LOOK_LEFT_030.png'],
    bodyReferences: ['05_BODY_FRONT_000.png', '05_BODY_3Q_LOOK_LEFT_030.png', '05_BODY_PROFILE_LOOK_LEFT_090.png', '05_BODY_BACK_180.png'],
    greeting: 'E aí! Aqui é o David. Vamos estruturar a cena e afinar a consistência das tomadas?',
    personality: 'Focado, estratégico, direto, exigente com detalhe e fidelidade visual.',
    dialogueExamples: [
      { user: 'Qual enquadramento fica melhor nessa cena?', char: 'Plano médio cintura pra cima ou 3/4 com iluminação direcional forte.' },
      { user: 'Como garantir que o óculos e a argola não sumam?', char: 'O bloco de identidade obrigatório segura os acessórios e o negativo bloqueia reflexos espelhados.' }
    ],
    observation: 'Rosto e barba vêm das referências mestres; o prompt reforça os acessórios chave.'
  }
];
