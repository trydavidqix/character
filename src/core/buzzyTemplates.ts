import { SceneShot, SkillWorkflowType } from './types';

export interface BuzzyTemplate {
  id: string;
  name: string;
  category: SkillWorkflowType;
  description: string;
  shots: Omit<SceneShot, 'id'>[];
}

export const buzzyWorkflowTemplates: BuzzyTemplate[] = [
  {
    id: 'film-cinematic-mystery',
    name: 'Filme IA: Mistério Cinematográfico Noir',
    category: 'film',
    description: 'Progressão cinematográfica em 3 cenas com iluminação dramática, avanço de câmera e close-up de suspense.',
    shots: [
      {
        title: 'Cena 1 (Scene 1): Chegada Misteriosa',
        framing: 'Wide shot establishing subject and environment',
        cameraAngle: 'low angle looking up with slight camera tilt',
        cameraMovement: 'Dolly In (Push forward)',
        skillWorkflow: 'film',
        lighting: 'dramatic single-source street lamp with deep volumetric shadows and cinematic haze',
        environment: 'historic wet stone alleyway reflecting subtle warm ambient city lights at night',
        action: 'standing under the dim streetlight, pausing with guarded observant posture',
        aspectRatio: '16:9',
      },
      {
        title: 'Cena 2 (Scene 2): O Encontro',
        framing: 'Medium waist-up portrait framing',
        cameraAngle: 'three-quarter view facing slightly away from lens',
        cameraMovement: 'Cinematic Pan (Smooth lateral sweep)',
        skillWorkflow: 'film',
        lighting: 'soft rim light highlighting profile against dark textured wall',
        environment: 'aged limestone courtyard doorway with architectural ironwork',
        action: 'looking back over shoulder with intense contemplative gaze, hand holding an antique key',
        aspectRatio: '16:9',
      },
      {
        title: 'Cena 3 (Scene 3): Momento Decisivo',
        framing: 'Tight dramatic close-up headshot tack sharp on eyes',
        cameraAngle: 'straight on eye level with intense cinematic focus',
        cameraMovement: 'Orbit 360 (Circular rotation)',
        skillWorkflow: 'film',
        lighting: 'split Rembrandt lighting with sharp contrast and specular eye catchlights',
        environment: 'dark blurred interior backdrop with gentle candle flicker bokeh',
        action: 'composed resolute facial expression, eyes locking directly into the lens',
        aspectRatio: '16:9',
      }
    ]
  },
  {
    id: 'ads-viral-ugc',
    name: 'Anúncios IA: Pacote Viral UGC de Alta Conversão',
    category: 'ads',
    description: 'Formato comercial dinâmico: gancho de atenção de 0-3s, demonstração de produto e chamada para ação (CTA).',
    shots: [
      {
        title: 'Cena 1 (Scene 1): Gancho de 0-3s',
        framing: 'Dynamic close-up selfie angle',
        cameraAngle: 'slight high angle looking down towards energetic subject',
        cameraMovement: 'FPV Drone (Dynamic flythrough)',
        skillWorkflow: 'ads',
        lighting: 'bright high-key natural ring light with clean commercial reflections',
        environment: 'modern sunlit apartment kitchen with minimalist marble counters',
        action: 'holding product up to camera with energetic expressive reaction and direct eye contact',
        aspectRatio: '9:16',
      },
      {
        title: 'Cena 2 (Scene 2): Demonstração de Benefícios',
        framing: 'Medium waist-up demonstration framing',
        cameraAngle: 'eye level centered composition',
        cameraMovement: 'Dolly In (Push forward)',
        skillWorkflow: 'ads',
        lighting: 'crisp commercial studio softbox lighting highlighting product texture',
        environment: 'clean aesthetic workspace with neutral pastel backdrop',
        action: 'smoothly presenting product details with confident engaging smile',
        aspectRatio: '9:16',
      },
      {
        title: 'Cena 3 (Scene 3): Chamada para Ação (CTA)',
        framing: 'Medium close-up punchy framing',
        cameraAngle: 'direct eye level engaging viewer directly',
        cameraMovement: 'Low-Angle Hero (Upward power shot)',
        skillWorkflow: 'ads',
        lighting: 'vibrant colorful neon accent rim light with warm key fill',
        environment: 'chic contemporary studio with subtle branded ambient glow',
        action: 'pointing towards link area below with enthusiastic decisive nod',
        aspectRatio: '9:16',
      }
    ]
  },
  {
    id: 'animation-anime-burst',
    name: 'Animação IA: Sequência de Ação e Aventura',
    category: 'animation',
    description: 'Storyboard expressivo de animação com enquadramentos de alta energia e dinâmica de anime.',
    shots: [
      {
        title: 'Cena 1 (Scene 1): Foco Silencioso',
        framing: 'Cinematic wide silhouette with wind motion',
        cameraAngle: 'low angle horizon view',
        cameraMovement: 'Cinematic Pan (Smooth lateral sweep)',
        skillWorkflow: 'animation',
        lighting: 'saturated twilight purple and amber horizon gradient with stark silhouette',
        environment: 'rooftop edge overlooking sprawling futuristic cityscape at dusk',
        action: 'coat billow in heavy wind, calm focused stance before the burst',
        aspectRatio: '16:9',
      },
      {
        title: 'Cena 2 (Scene 2): Despertar do Poder',
        framing: 'Dynamic medium shot with diagonal Dutch angle',
        cameraAngle: 'steep Dutch tilt angle emphasizing kinetic energy',
        cameraMovement: 'Dolly Out (Pull back)',
        skillWorkflow: 'animation',
        lighting: 'intense glowing cyan particle illumination casting sharp rim highlights',
        environment: 'swirling energy field and shattered stone debris levitating in mid-air',
        action: 'reaching forward with glowing hand, determined anime expression with sharp eyes',
        aspectRatio: '16:9',
      },
      {
        title: 'Cena 3 (Scene 3): Clímax Heroico',
        framing: 'Extreme close-up eye focus with animated light trails',
        cameraAngle: 'level straight-on hero angle',
        cameraMovement: 'Orbit 360 (Circular rotation)',
        skillWorkflow: 'animation',
        lighting: 'prismatic chromatic aberration and high-contrast anime cell shading',
        environment: 'vivid speed lines and deep cosmic starfield backdrop',
        action: 'piercing unwavering stare with glowing iris and confident smirk',
        aspectRatio: '16:9',
      }
    ]
  }
];
