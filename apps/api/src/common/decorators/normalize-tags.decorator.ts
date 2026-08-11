import { Transform } from 'class-transformer';
import { normalizeTagsInput } from '../utils/normalize-tags';

export function NormalizeTags() {
  return Transform(({ value }: { value: unknown }) => normalizeTagsInput(value));
}
