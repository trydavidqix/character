import { describe, it, expect } from 'vitest';
import { compileScenePrompt } from '../src/core/promptCompiler';
import { defaultCharacters } from '../src/core/defaultCharacters';
import { SceneShot } from '../src/core/types';

describe('Prompt Compiler - Character Consistency Engine', () => {
  const megalina = defaultCharacters.find(c => c.id === 'megalina')!;
  const david = defaultCharacters.find(c => c.id === 'david')!;

  it('correctly includes character consistency citation anchor', () => {
    const shot: SceneShot = {
      id: 'shot-1',
      title: 'Poolside portrait',
      framing: 'medium close-up, waist-up',
      cameraAngle: 'eye level',
      lighting: 'warm direct sunlight with sharp shadows',
      environment: 'luxury villa poolside with limestone walls',
      action: 'standing relaxed wearing an off-white linen shirt',
      aspectRatio: '9:16',
    };

    const result = compileScenePrompt(megalina, shot);

    expect(result.finalPrompt).toContain(megalina.howToCite);
    expect(result.finalPrompt).toContain(megalina.identityBlockEn);
    expect(result.attachedReferences).toEqual(megalina.standardReferences);
  });

  it('removes forbidden words and registers warnings for Megalina', () => {
    const shot: SceneShot = {
      id: 'shot-2',
      title: 'Studio portrait',
      framing: 'close-up portrait',
      cameraAngle: 'facing camera',
      lighting: 'soft studio light',
      environment: 'plain backdrop',
      action: 'blonde woman with a butterfly tattoo on collarbone and nose ring',
      aspectRatio: '1:1',
    };

    const result = compileScenePrompt(megalina, shot);

    expect(result.finalPrompt).not.toContain('butterfly tattoo');
    expect(result.finalPrompt).not.toContain('blonde');
    expect(result.finalPrompt).not.toContain('nose ring');
    expect(result.removedTerms).toContain('blonde');
    expect(result.removedTerms).toContain('tattoo');
    expect(result.removedTerms).toContain('nose ring');
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('masks prominent person internal name if forbidden in prompt', () => {
    const shot: SceneShot = {
      id: 'shot-3',
      title: 'Urban walk',
      framing: 'medium shot',
      cameraAngle: 'low angle',
      lighting: 'golden hour',
      environment: 'city street',
      action: 'Megalina Fox walking down the avenue',
      aspectRatio: '9:16',
    };

    const result = compileScenePrompt(megalina, shot);

    expect(result.finalPrompt).not.toContain('Megalina Fox');
    expect(result.finalPrompt).toContain('the subject walking down the avenue');
  });

  it('enforces David accessories in prompt output', () => {
    const shot: SceneShot = {
      id: 'shot-4',
      title: 'Studio Tech Shot',
      framing: 'waist-up portrait',
      cameraAngle: 'head turned 45 degrees',
      lighting: 'hard single-source rim light',
      environment: 'minimalist tech lab',
      action: 'sitting at desk focused on review screen',
      aspectRatio: '16:9',
    };

    const result = compileScenePrompt(david, shot);

    expect(result.finalPrompt).toContain('large dark rectangular full-rim eyeglasses');
    expect(result.finalPrompt).toContain('thin dark hoop on the subject-right nostril');
    expect(result.negativePrompt).toContain('no mirrored nose hoop');
  });

  it('attaches body references on full body shots', () => {
    const shot: SceneShot = {
      id: 'shot-5',
      title: 'Full Body Fashion',
      framing: 'full body shot from head to toe',
      cameraAngle: 'straight on',
      lighting: 'daylight',
      environment: 'modern architectural terrace',
      action: 'standing in elegant summer outfit',
      aspectRatio: '9:16',
    };

    const result = compileScenePrompt(megalina, shot);

    expect(result.attachedReferences).toContain('Maga_121.jpg');
    expect(result.attachedReferences.length).toBeGreaterThan(megalina.standardReferences.length);
  });

  it('incorporates Buzzy camera movements and skill workflows', () => {
    const filmShot: SceneShot = {
      id: 'shot-film',
      title: 'Cinematic Noir',
      framing: 'Medium close-up',
      cameraAngle: 'low angle',
      cameraMovement: 'Dolly In (Push forward)',
      skillWorkflow: 'film',
      lighting: 'deep moody shadows',
      environment: 'foggy alley',
      action: 'looking intensely into the lens',
      aspectRatio: '16:9',
    };

    const filmResult = compileScenePrompt(megalina, filmShot);
    expect(filmResult.finalPrompt).toContain('camera motion: Dolly In (Push forward)');
    expect(filmResult.finalPrompt).toContain('cinematic film shot');
    expect(filmResult.skillWorkflow).toBe('film');

    const adShot: SceneShot = {
      id: 'shot-ad',
      title: 'UGC Commercial',
      framing: 'Selfie framing',
      cameraAngle: 'eye level',
      skillWorkflow: 'ads',
      lighting: 'ring light',
      environment: 'bright kitchen',
      action: 'smiling holding product',
      aspectRatio: '9:16',
    };

    const adResult = compileScenePrompt(megalina, adShot);
    expect(adResult.finalPrompt).toContain('high-conversion commercial advertisement style');
    expect(adResult.skillWorkflow).toBe('ads');
  });

  it('incorporates Character.ai dialogue lines into prompt', () => {
    const dialogueShot: SceneShot = {
      id: 'shot-dialogue',
      title: 'Dialogue scene',
      framing: 'Medium close-up',
      cameraAngle: 'straight on',
      lighting: 'golden hour',
      environment: 'balcony',
      action: 'standing near the railing',
      dialogueLine: 'We have arrived at the destination.',
      aspectRatio: '16:9',
    };

    const result = compileScenePrompt(megalina, dialogueShot);
    expect(result.finalPrompt).toContain('the subject delivering spoken line with natural facial expression: "We have arrived at the destination."');
  });
});

