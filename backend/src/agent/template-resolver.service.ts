import { Injectable } from '@nestjs/common';

export interface ResolvedTemplate {
  text: string;
  isValid: boolean;
  rejectedKeys: string[];
}

const PLACEHOLDER_PATTERN = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;

@Injectable()
export class TemplateResolverService {
  resolve(
    template: string,
    context: Record<string, string | number>,
  ): ResolvedTemplate {
    const rejectedKeys: string[] = [];

    const text = template.replace(
      PLACEHOLDER_PATTERN,
      (_fullMatch, key: string) => {
        const value = context[key];
        if (value === undefined) {
          rejectedKeys.push(key);
          return '[dato no disponible]';
        }
        return String(value);
      },
    );

    return { text, isValid: rejectedKeys.length === 0, rejectedKeys };
  }
}
