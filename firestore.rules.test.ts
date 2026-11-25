import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { VALID_ID_REGEX } from './src/utils/agronomy';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const blueprintPath = path.resolve(process.cwd(), 'firebase-blueprint.json');
const rulesContent = fs.readFileSync(rulesPath, 'utf8');
const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));

test('firestore.rules enforces default-deny safety net and rules_version 2', () => {
  assert.match(rulesContent, /rules_version\s*=\s*'2'/);
  assert.match(rulesContent, /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;/);
});

test('every collection in firebase-blueprint.json has an explicit match block in firestore.rules', () => {
  const collections = Object.keys(blueprint.firestore);
  assert.ok(collections.length >= 6);
  for (const colPath of collections) {
    const escaped = colPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(rulesContent, new RegExp(`match\\s+${escaped}`), `Missing rule for ${colPath}`);
  }
});

test('Dirty Dozen security invariants are explicitly guarded in firestore.rules', () => {
  // 1 & 2: No self-assigned admin role on create or role change on update
  assert.match(rulesContent, /isOwner\(userId\)\s*&&\s*incoming\(\)\.role\s*==\s*'farmer'/);
  assert.match(rulesContent, /incoming\(\)\.role\s*==\s*existing\(\)\.role/);
  // 3: Admins collection creation restricted to isAdmin()
  assert.match(rulesContent, /match \/admins\/\{adminId\}[\s\S]*?allow create:[\s\S]*?&& isAdmin\(\)/);
  // 4: PII isolation on /users/{userId}
  assert.match(rulesContent, /match \/users\/\{userId\}[\s\S]*?allow get: if isValidId\(userId\) && \(isOwner\(userId\) \|\| isAdmin\(\)\)/);
  // 5: Owner spoofing guard on farms
  assert.match(rulesContent, /incoming\(\)\.ownerId\s*==\s*request\.auth\.uid/);
  // 6: Shadow field guard via keys().hasOnly() and affectedKeys().hasOnly()
  assert.ok((rulesContent.match(/\.keys\(\)\.hasOnly\(/g) || []).length >= 6);
  assert.ok((rulesContent.match(/affectedKeys\(\)\.hasOnly\(/g) || []).length >= 4);
  // 7: Orphaned analysis guard checks farm exists and belongs to user
  assert.match(rulesContent, /exists\(\/databases\/\$\(database\)\/documents\/farms\/\$\(incoming\(\)\.farmId\)\)/);
  // 8: Server timestamp integrity
  assert.match(rulesContent, /incoming\(\)\.createdAt\s*==\s*request\.time/);
  assert.match(rulesContent, /incoming\(\)\.updatedAt\s*==\s*request\.time/);
  // 9: ID poisoning guard
  assert.equal(VALID_ID_REGEX.test('farm_123-abc'), true);
  assert.equal(VALID_ID_REGEX.test('../../../evil'), false);
  assert.equal(VALID_ID_REGEX.test('a'.repeat(129)), false);
  // 10: Advisories create/delete restricted to admin
  assert.match(rulesContent, /match \/advisories\/\{advisoryId\}[\s\S]*?allow create:[\s\S]*?&& isAdmin\(\)/);
  // 11: Verified email required and single-admin lock to jatinkanara2006@gmail.com
  assert.match(rulesContent, /request\.auth\.token\.email_verified\s*==\s*true/);
  assert.match(rulesContent, /request\.auth\.token\.email\s*==\s*'jatinkanara2006@gmail\.com'/);
  assert.match(rulesContent, /function isAdmin\(\)\s*\{\s*return isBootstrappedAdmin\(\);\s*\}/);
  // 12: Array size guard on highlights
  assert.match(rulesContent, /data\.highlights\.size\(\)\s*<=\s*8/);
});
