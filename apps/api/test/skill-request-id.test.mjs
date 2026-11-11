import assert from 'node:assert/strict';
import { test } from 'node:test';
import { skillRequestId } from '../../web/src/views/skill-request-id.ts';

test('retries retain the request id until the save payload changes', () => {
  let nextId = 0;
  const createId = () => String(++nextId);
  const first = skillRequestId(undefined, 'first payload', createId);
  assert.equal(skillRequestId(first, 'first payload', createId).id, first.id);
  const changed = skillRequestId(first, 'changed payload', createId);
  assert.notEqual(changed.id, first.id);
  assert.equal(skillRequestId(changed, 'changed payload', createId).id, changed.id);
});
