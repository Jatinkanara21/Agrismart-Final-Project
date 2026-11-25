# AgriSmart Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Owner Isolation**: A farmer can read, create, update, and delete only their own `users/{uid}`, `farms/{farmId}`, `analyses/{analysisId}`, and `chatMessages/{messageId}` documents.
2. **PII Protection**: `users/{uid}` contains PII (`email`, `phone`, `village`, `district`). Non-owners cannot `get` or `list` other farmers' profiles unless they are a verified Admin.
3. **No Self-Assigned Admin Roles**: On `users/{uid}` creation, regular users can ONLY set `role == 'farmer'`. Modifying `role` on update is forbidden for non-admins. Writing to `admins/{adminId}` is restricted to existing verified Admins only.
4. **Relational Integrity**: Every `analyses/{analysisId}` create MUST verify `exists(/databases/$(database)/documents/farms/$(incoming().farmId))` and that the referenced farm's `ownerId == request.auth.uid`.
5. **Temporal & Immutability Integrity**: `createdAt == request.time` on create; `updatedAt == request.time` on update; `ownerId` and `createdAt` are strictly immutable after creation.
6. **Verified Identity**: All writes require `request.auth != null && request.auth.token.email_verified == true`.
7. **Admin Advisories RBAC**: `advisories/{advisoryId}` are readable by authenticated users (`active == true` or `isAdmin()`), while create/update/delete are strictly restricted to `isAdmin()`.
8. **Strict Key & Size Bounds**: Every collection enforces `keys().hasAll(...)` and `keys().hasOnly(...)` on create, `affectedKeys().hasOnly(...)` on update, `isValidId()` on single-document path IDs, `.size()` bounds on every string/list, and numeric bounds on coordinates, acreage, NPK, and pH.

## 2. Dirty Dozen Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Role Escalation on Registration**: Farmer creates `/users/{uid}` with `role: "admin"`.
2. **Role Escalation on Update**: Farmer updates `/users/{uid}` changing `role` from `"farmer"` to `"admin"`.
3. **Admin Collection Injection**: Farmer creates `/admins/{uid}` to grant themselves admin rights.
4. **Cross-Tenant PII Read**: Farmer A attempts `get` on `/users/{farmerB}`.
5. **Cross-Tenant Farm Spoofing**: Farmer A creates `/farms/{id}` with `ownerId: "{farmerB}"`.
6. **Shadow Field Injection**: Farmer creates `/farms/{id}` with valid fields plus `"isVerified": true`.
7. **Orphaned Analysis Creation**: Farmer creates `/analyses/{id}` referencing a nonexistent `farmId` or Farmer B's `farmId`.
8. **Immutable Timestamp Tampering**: Farmer creates `/farms/{id}` with backdated `createdAt` (`createdAt != request.time`).
9. **ID Poisoning**: Attacker writes `/farms/../../../evil_id_over_128_chars` or special characters violating `^[a-zA-Z0-9_\-]+$`.
10. **Non-Admin Advisory Broadcast**: Farmer attempts to create or delete `/advisories/{id}`.
11. **Unverified Email Spoofing**: User with `email: "jatinkanara2006@gmail.com"` and `email_verified: false` attempts admin read/write.
12. **Unbounded Array / Value Poisoning**: Farmer writes `/analyses/{id}` with `highlights` exceeding 8 entries or string `summary` > 1500 chars.
