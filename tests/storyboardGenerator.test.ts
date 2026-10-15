import { describe, it, expect } from 'vitest';
import { generateStoryboardFromIdea } from '../src/core/storyboardGenerator';
import { defaultCharacters } from '../src/core/defaultCharacters';
import { compileScenePrompt } from '../src/core/promptCompiler';

describe('Storyboard Generator Engine', () => {
  const megalina = defaultCharacters[0];
  const david = defaultCharacters[1];

  it('generates a 3-scene dramatic mystery storyboard from user prompt', () => {
    const pkg = generateStoryboardFromIdea(megalina, 'cria uma novela de mistério e segredos em Veneza');

    expect(pkg.storyTitle).toContain('Venice');
    expect(pkg.genre).toBe('mystery');
    expect(pkg.shots.length).toBe(3);

    // Verify first scene
    const shot1 = pkg.shots[0];
    expect(shot1.title).toContain('Scene 1');
    expect(shot1.cameraMovement).toBe('Dolly In (Push forward)');
    expect(shot1.environment).toContain('Venice');
    expect(shot1.dialogueLine).toBeDefined();

    // Verify compiled prompt includes Megalina's anchor
    const compiled = compileScenePrompt(megalina, shot1);
    expect(compiled.finalPrompt).toContain(megalina.howToCite);
    expect(compiled.finalPrompt).toContain('camera motion: Dolly In (Push forward)');
  });

  it('generates romance narrative with beach setting and David character', () => {
    const pkg = generateStoryboardFromIdea(david, 'história de amor na praia ao pôr do sol');

    expect(pkg.genre).toBe('romance');
    expect(pkg.shots.length).toBe(3);

    const shot3 = pkg.shots[2];
    const compiled = compileScenePrompt(david, shot3);
    expect(compiled.finalPrompt).toContain(david.howToCite);
    expect(compiled.finalPrompt).toContain('large dark rectangular full-rim eyeglasses');
  });
});
