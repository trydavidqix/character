import { CharacterSheet, SceneShot, CompiledPromptResult } from './types';

export function compileScenePrompt(character: CharacterSheet, shot: SceneShot): CompiledPromptResult {
  const warnings: string[] = [];
  const removedTerms: string[] = [];

  let rawAction = shot.action.trim();
  let rawEnv = shot.environment.trim();

  // 1. Sanitize character name if forbidden in prompt (e.g. prominent person filter)
  if (character.neverWriteNameInPrompt) {
    const namesToSanitize = [character.internalName, character.name]
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);
    for (const name of namesToSanitize) {
      const regex = new RegExp(`\\b${escapeRegExp(name)}\\b`, 'gi');
      if (regex.test(rawAction) || regex.test(rawEnv)) {
        rawAction = rawAction.replace(regex, 'the subject');
        rawEnv = rawEnv.replace(regex, 'the subject');
        warnings.push(`Name "${name}" was masked from prompt to avoid filter triggers.`);
      }
    }
  }

  // 2. Scan and sanitize forbidden words
  for (const forbidden of character.forbiddenWords) {
    const regex = new RegExp(`\\b${escapeRegExp(forbidden)}\\b`, 'gi');
    if (regex.test(rawAction)) {
      rawAction = rawAction.replace(regex, '');
      removedTerms.push(forbidden);
    }
    if (regex.test(rawEnv)) {
      rawEnv = rawEnv.replace(regex, '');
      removedTerms.push(forbidden);
    }
  }

  if (removedTerms.length > 0) {
    warnings.push(`Removed forbidden terms violating character identity: ${[...new Set(removedTerms)].join(', ')}`);
  }

  // Clean double spaces and punctuation gaps
  const cleanAction = rawAction.replace(/\s{2,}/g, ' ').replace(/\s,\s/g, ', ').trim();
  const cleanEnv = rawEnv.replace(/\s{2,}/g, ' ').replace(/\s,\s/g, ', ').trim();

  // 3. Assemble structured Flow-compatible prompt in English
  const promptParts: string[] = [];

  // Part 1: Framing, Camera Angle and Camera Movement (Buzzy Motion Control)
  const cameraElements: string[] = [];
  if (shot.framing) cameraElements.push(shot.framing);
  if (shot.cameraAngle) cameraElements.push(shot.cameraAngle);
  if (shot.cameraMovement && shot.cameraMovement !== 'Static / None') {
    cameraElements.push(`camera motion: ${shot.cameraMovement}`);
  }
  if (cameraElements.length > 0) {
    promptParts.push(cameraElements.join(', '));
  }

  // Part 2: Subject Consistency Anchor (Crucial for Flow/FaceID)
  promptParts.push(character.howToCite);

  // Part 3: Mandatory Identity Block
  if (character.identityBlockEn) {
    promptParts.push(character.identityBlockEn);
  }

  // Part 4: Action, Pose and Outfit
  if (cleanAction) {
    promptParts.push(cleanAction);
  }

  // Part 5: Character.ai Dialogue Line integration (Lip Sync & Expression)
  if (shot.dialogueLine && shot.dialogueLine.trim()) {
    promptParts.push(`the subject delivering spoken line with natural facial expression: "${shot.dialogueLine.trim()}"`);
  }

  // Part 6: Environment and Background
  if (cleanEnv) {
    promptParts.push(cleanEnv);
  }

  // Part 7: Lighting
  if (shot.lighting) {
    promptParts.push(shot.lighting);
  }

  // Part 8: Buzzy Workflow Skill Aesthetic Styling
  if (shot.skillWorkflow === 'film') {
    promptParts.push('cinematic film shot, cinematic 35mm lighting, color graded for cinema, master narrative composition');
  } else if (shot.skillWorkflow === 'ads') {
    promptParts.push('high-conversion commercial advertisement style, vibrant crisp studio lighting, premium commercial color grade, high-energy marketing aesthetic');
  } else if (shot.skillWorkflow === 'animation') {
    promptParts.push('stylized dynamic anime animation aesthetic, expressive keyframe motion, vibrant cel-shaded color palette');
  }

  // Part 9: Optical rendering quality tags
  promptParts.push('captured with high optical fidelity, sharp focus on subject, natural skin texture, 35mm filmic depth of field');

  const finalPrompt = promptParts.join(', ');

  // 4. Assemble Negative Prompt
  const defaultNegatives = 'blurry, oversaturated, deformed hands, distorted face, extra limbs, bad anatomy, cartoonish, low quality, render artifact';
  const negativePrompt = character.negativePromptEn
    ? `${character.negativePromptEn}, ${defaultNegatives}`
    : defaultNegatives;

  // 5. Determine attached references
  const isFullBody = shot.framing.toLowerCase().includes('full body') || shot.framing.toLowerCase().includes('wide');
  const attachedReferences = isFullBody && character.bodyReferences && character.bodyReferences.length > 0
    ? [...character.standardReferences, ...character.bodyReferences]
    : [...character.standardReferences];

  return {
    finalPrompt,
    negativePrompt,
    attachedReferences,
    warnings,
    removedTerms: [...new Set(removedTerms)],
    characterId: character.id,
    shotId: shot.id,
    aspectRatio: shot.aspectRatio,
    skillWorkflow: shot.skillWorkflow,
    cameraMovement: shot.cameraMovement,
  };
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
