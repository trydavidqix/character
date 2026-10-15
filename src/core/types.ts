export interface CharacterFixedTraits {
  cabelo?: string;
  olhos?: string;
  pele?: string;
  labios?: string;
  acessorios?: string;
  corpo_e_idade?: string;
  [key: string]: string | undefined;
}

export interface CharacterDialogueExample {
  user: string;
  char: string;
}

export interface CharacterSheet {
  id: string;
  name: string;
  internalName: string;
  gender: 'f' | 'm' | 'other';
  neverWriteNameInPrompt: boolean;
  howToCite: string;
  identityBlockEn: string;
  fixedTraits: CharacterFixedTraits;
  forbiddenWords: string[];
  negativePromptEn: string;
  standardReferences: string[];
  bodyReferences?: string[];
  tagline?: string;
  greeting?: string;
  personality?: string;
  dialogueExamples?: CharacterDialogueExample[];
  observation?: string;
  voicePitch?: number;
  voiceRate?: number;
  avatarUrl?: string;
}

export type SkillWorkflowType = 'film' | 'ads' | 'animation' | 'custom';

export interface SceneShot {
  id: string;
  title: string;
  framing: string;
  cameraAngle: string;
  cameraMovement?: string;
  skillWorkflow?: SkillWorkflowType;
  lighting: string;
  environment: string;
  action: string;
  aspectRatio: '9:16' | '16:9' | '1:1' | '2:3';
  seed?: number;
  mediaUrl?: string;
  mediaType?: 'video' | 'image';
  audioUrl?: string;
  audioName?: string;
  dialogueLine?: string;
}

export interface CompiledPromptResult {
  finalPrompt: string;
  negativePrompt: string;
  attachedReferences: string[];
  warnings: string[];
  removedTerms: string[];
  characterId: string;
  shotId?: string;
  aspectRatio: string;
  skillWorkflow?: SkillWorkflowType;
  cameraMovement?: string;
}
