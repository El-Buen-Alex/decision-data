import { TemplateResolverService } from './template-resolver.service';

describe('TemplateResolverService', () => {
  const service = new TemplateResolverService();

  it('substitutes every known placeholder with its context value', () => {
    const result = service.resolve(
      'Tu score es {{score}} y tu DTI es {{housingDtiRatioPercent}}.',
      {
        score: 640,
        housingDtiRatioPercent: '46%',
      },
    );

    expect(result.text).toBe('Tu score es 640 y tu DTI es 46%.');
    expect(result.isValid).toBe(true);
  });

  it('marks the result invalid and strips the placeholder when a key is unknown', () => {
    const result = service.resolve('Tu meta es {{unknownField}}.', {
      score: 640,
    });

    expect(result.isValid).toBe(false);
    expect(result.text).not.toContain('{{unknownField}}');
  });
});
