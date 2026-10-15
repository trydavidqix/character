import { CharacterSheet } from './types';

export const defaultCharacters: CharacterSheet[] = [
  {
    id: 'megalina',
    name: 'Megalina',
    internalName: 'Megalina Fox',
    gender: 'f',
    neverWriteNameInPrompt: true,
    tagline: 'Lead Persona & Expressive Screen Presence',
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
    greeting: "Hey! I'm Megalina. Ready to rehearse or plan the next cinematic scene?",
    personality: 'Spontaneous, elegant, confident, expressive and natural on camera.',
    voicePitch: 1.1,
    voiceRate: 1.0,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    dialogueExamples: [
      { user: 'What style do you prefer for today?', char: 'Something relaxed and natural, perhaps warm tones and loose wavy hair.' },
      { user: 'Ready for the outdoor shoot?', char: 'Definitely! The late afternoon natural golden light is perfect for our contrast.' }
    ],
    observation: 'Name never appears in prompt (prominent person filter in Flow). Facial consistency anchored by the 3 attached master references.'
  },
  {
    id: 'david',
    name: 'David',
    internalName: 'David Qix',
    gender: 'm',
    neverWriteNameInPrompt: false,
    tagline: 'Technical Director & Consistent Character Architect',
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
    greeting: "Hey! This is David. Let's structure the shots and calibrate consistency across the storyboard.",
    personality: 'Focused, strategic, precise, meticulous with visual continuity and technical execution.',
    voicePitch: 0.85,
    voiceRate: 1.0,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    dialogueExamples: [
      { user: 'Which framing works best here?', char: 'Medium waist-up or 3/4 profile with sharp directional lighting.' },
      { user: 'How do we guarantee the glasses and nose hoop stay intact?', char: 'The mandatory identity block anchors the accessories and the negative blocks mirrored artifacts.' }
    ],
    observation: 'Face and beard from master references; prompt reinforces mandatory accessory anchors.'
  }
];
