# DECO Master Firestore Security Specification

## 1. Data Invariants
1. **Identity Isolation**: Every document under `/users/{userId}` (including `/documents/{docId}` and `/workspace/{workspaceId}`) belongs strictly to `userId == request.auth.uid` with `request.auth.token.email_verified == true`.
2. **PII Protection**: User profile documents containing `email` are never readable or listable by any other user. Blanket reads (`allow read: if isSignedIn();`) are strictly prohibited.
3. **Path Variable Hardening**: All `{userId}`, `{docId}`, and `{workspaceId}` variables must satisfy `isValidId(id)` (`^[a-zA-Z0-9_-]+$`, `<= 128` chars).
4. **Master Gate Relational Sync**: Subcollection writes under `/users/{userId}/documents/{docId}` and `/users/{userId}/workspace/{workspaceId}` enforce `ownerId == request.auth.uid == userId` and verify the parent `/users/{userId}` profile exists via `exists()`.
5. **Immutable Ownership & Temporal Integrity**: `uid`, `ownerId`, and `createdAt` are immutable after creation; `createdAt == request.time` on create and `updatedAt == request.time` on update.
6. **Strict Key Allowlists & Size Bounds**: Every collection enforces `keys().hasAll(...) && keys().hasOnly(...)` on create, `affectedKeys().hasOnly(...)` on update, and `.size()` bounds on every string and array.

## 2. "Dirty Dozen" Adversarial Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Read/Write**: Read `/users/u1` with `auth = null`.
2. **Unverified Email Write**: Create `/users/u1` with `auth.uid = 'u1'`, `email_verified = false`.
3. **Cross-User PII Read**: Read `/users/u1` while signed in as `auth.uid = 'u2'`.
4. **User List Scraping**: Query/list `/users` collection as `auth.uid = 'u2'`.
5. **Identity Spoofing on Profile**: Create `/users/u1` with `uid: 'u2'` while `auth.uid = 'u1'`.
6. **Ghost / Shadow Field Injection**: Create `/users/u1` with extra `isAdmin: true` or `role: 'admin'`.
7. **ID Poisoning**: Create `/users/u1/documents/${'a'.repeat(300)}` exceeding 128 chars.
8. **Orphan Subcollection Write**: Create `/users/u1/documents/doc1` before `/users/u1` parent profile exists.
9. **Owner Spoofing in StudyDocumentMeta**: Create `/users/u1/documents/doc1` with `ownerId: 'u2'`.
10. **Immutable Field Mutation**: Update `/users/u1/workspace/main` changing `ownerId` or `createdAt`.
11. **Backdated Timestamp Spoofing**: Create `/users/u1/workspace/main` with `createdAt: '2020-01-01T00:00:00Z'` instead of server `request.time`.
12. **Unbounded Array / String Denial-of-Wallet**: Update `/users/u1/workspace/main` with `units` array > 10 items or `name` > 240 chars.
