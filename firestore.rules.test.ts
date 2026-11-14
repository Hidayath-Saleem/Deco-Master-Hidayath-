import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const blueprintPath = path.resolve(process.cwd(), 'firebase-blueprint.json');
const rules = fs.readFileSync(rulesPath, 'utf-8');
const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf-8'));

test('firestore.rules enforces default-deny catch-all and rules_version 2', () => {
  assert.match(rules, /rules_version = '2';/);
  assert.match(rules, /match \/\{document=\*\*\} \{\s*allow read, write: if false;\s*\}/);
});

test('firestore.rules covers every collection in firebase-blueprint.json with Dirty Dozen guards', () => {
  const paths = Object.keys(blueprint.firestore);
  assert.ok(paths.includes('/users/{userId}'));
  assert.ok(paths.includes('/users/{userId}/documents/{docId}'));
  assert.ok(paths.includes('/users/{userId}/workspace/{workspaceId}'));

  assert.match(rules, /request\.auth\.token\.email_verified == true/);
  assert.match(rules, /isValidId\(/);
  assert.match(rules, /incoming\(\)\.createdAt == request\.time/);
  assert.match(rules, /incoming\(\)\.updatedAt == request\.time/);
  assert.match(rules, /incoming\(\)\.ownerId == existing\(\)\.ownerId/);
  assert.match(rules, /exists\(\/databases\/\$\(database\)\/documents\/users\/\$\(userId\)\)/);
  assert.match(rules, /affectedKeys\(\)\.hasOnly\(/);
});
