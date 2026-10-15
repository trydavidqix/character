import { CharacterSheet, SceneShot } from './types';

export interface StoryPackage {
  id: string;
  storyTitle: string;
  logline: string;
  genre: 'drama' | 'mystery' | 'romance' | 'thriller' | 'commercial' | 'action';
  shots: SceneShot[];
}

/**
 * Intelligent Storyboard Engine:
 * Analyzes the user prompt / story synopsis / reference text and synthesizes
 * a complete, multi-scene dramatic storyboard with camera movements,
 * lighting setups, dialogue lines, and Google Flow-compatible prompts.
 */
export function generateStoryboardFromIdea(
  character: CharacterSheet,
  userIdea: string
): StoryPackage {
  const cleanIdea = userIdea.trim();
  const lower = cleanIdea.toLowerCase();

  // Detect Genre & Tone
  let genre: StoryPackage['genre'] = 'drama';
  if (/mystery|roubo|morte|crime|investig|segredo|detective|noir/i.test(lower)) {
    genre = 'mystery';
  } else if (/romance|amor|casal|paix|encontro|love|heart/i.test(lower)) {
    genre = 'romance';
  } else if (/action|persegui|luta|tiro|chase|fug|explos|fight/i.test(lower)) {
    genre = 'action';
  } else if (/commercial|ad|anuncio|propaganda|venda|produto|ugc/i.test(lower)) {
    genre = 'commercial';
  } else if (/thriller|suspens|terror|fear|dark/i.test(lower)) {
    genre = 'thriller';
  }

  // Extract or synthesize environment and theme
  let location = 'historic Mediterranean architecture with sunlit limestone walls';
  if (/veneza|venice|canal|gondola/i.test(lower)) {
    location = 'grand canal of Venice with aged Venetian palazzos and water reflections';
  } else if (/praia|beach|ocean|mar|ilha/i.test(lower)) {
    location = 'scenic coastal cliffs overlooking deep turquoise ocean waves';
  } else if (/mans[aã]o|villa|pal[aá]cio/i.test(lower)) {
    location = 'opulent Italian neoclassical villa courtyard with carved marble statues';
  } else if (/cidade|urbano|street|rua|cyberpunk|t[oó]quio/i.test(lower)) {
    location = 'sleek modern metropolis avenue with neon reflections and glass facades';
  } else if (/est[uú]dio|estudio|studio/i.test(lower)) {
    location = 'high-end minimalist photo studio with textured concrete backdrop';
  }

  // Synthesize Story Title
  let storyTitle = 'Tides of Fate: The Secret Chapter';
  if (genre === 'mystery') {
    storyTitle = 'The Venice Cipher: Midnight Masquerade';
  } else if (genre === 'romance') {
    storyTitle = 'Whispers at Sunset: A Mediterranean Romance';
  } else if (genre === 'action') {
    storyTitle = 'Velocity: The Final Escape';
  } else if (genre === 'commercial') {
    storyTitle = 'The Signature Look: Premium Editorial Pack';
  }

  // Synthesize Logline
  const logline = `A captivating ${genre} narrative following ${character.name} through an escalating series of dramatic encounters set in ${location}.`;

  const timestamp = Date.now();
  const shots: SceneShot[] = [
    {
      id: `story-shot-${timestamp}-1`,
      title: 'Episode 1, Scene 1: The Arrival & Discovery',
      framing: 'A medium close-up, waist-up establishing portrait',
      cameraAngle: 'three-quarter view facing forty-five degrees from lens',
      cameraMovement: 'Dolly In (Push forward)',
      skillWorkflow: 'film',
      lighting: 'dramatic late afternoon golden sunlight with deep directional shadows and subtle volumetric haze',
      environment: `${location}, detailed stone textures with soft warm ambient fill`,
      action: 'pausing attentively with poised posture, observing the surroundings with guarded curiosity',
      dialogueLine: 'We finally made it here. Now the real story begins.',
      aspectRatio: '16:9',
    },
    {
      id: `story-shot-${timestamp}-2`,
      title: 'Episode 1, Scene 2: The Rising Tension',
      framing: 'Medium portrait framing from chest up',
      cameraAngle: 'eye level with sharp dramatic perspective',
      cameraMovement: 'Cinematic Pan (Smooth lateral sweep)',
      skillWorkflow: 'film',
      lighting: 'high-contrast Rembrandt lighting with intense rim light separating hair waves from background',
      environment: `${location}, shadowed arched corridor with dramatic architectural columns`,
      action: 'turning head smoothly towards camera, intense piercing gaze with sudden realization',
      dialogueLine: 'Someone else knew about this place long before us.',
      aspectRatio: '16:9',
    },
    {
      id: `story-shot-${timestamp}-3`,
      title: 'Episode 1, Scene 3: The Climax & Resolution',
      framing: 'Tight dramatic close-up headshot tack sharp on eyes and accessories',
      cameraAngle: 'slight low angle looking up with heroic authority',
      cameraMovement: 'Orbit 360 (Circular rotation)',
      skillWorkflow: 'film',
      lighting: 'sharp directional key light with rich specular catchlights and deep cinematic contrast',
      environment: `${location}, deep blurred twilight backdrop with subtle bokeh glow`,
      action: 'composed resolute expression, chin held high with unwavering confidence',
      dialogueLine: 'There is no turning back now. We see this through to the end.',
      aspectRatio: '16:9',
    }
  ];

  return {
    id: `story-${timestamp}`,
    storyTitle,
    logline,
    genre,
    shots,
  };
}
