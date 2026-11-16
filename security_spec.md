# NexasWorld Firestore Security Specification

## 1. Data Invariants
1. **No Unauthenticated Writes**: Only verified administrators (`request.auth != null && request.auth.token.email_verified == true` and matching bootstrapped admin `nexasworld5@gmail.com` or `/admins/{uid}`) may create, update, or delete `/settings/{settingId}`, `/plans/{planId}`, or `/banners/{bannerId}`.
2. **No PII in Public Collections**: `/settings/global`, `/plans/*`, and `/banners/*` contain strictly non-PII configuration and catalog data. User account records, phone numbers, balances, deposits, and withdrawals are managed server-side and never exposed in public Firestore collections.
3. **Strict Path & Schema Validation**: Every document ID must match `^[a-zA-Z0-9_\\-]+$` (`<= 128` chars), every string must enforce `.size()` bounds, and all writes must enforce `request.resource.data.keys().hasAll(...) && keys().hasOnly(...)` on create and `affectedKeys().hasOnly(...)` on update.
4. **Temporal Integrity**: `updatedAt` (and `createdAt` on `/admins`) must equal `request.time`.
5. **Admin Allowlist Isolation**: `/admins/{uid}` is readable only by the matching `uid` or bootstrapped admin, and writable only by the bootstrapped admin with verified email.
6. **Gift Code Protection**: `/giftCodes/{giftCode}` blocks collection listing for non-admins (`allow list: if isAdmin()`), permits single-code lookup by exact valid ID (`allow get`), and restricts create/update/delete strictly to verified admins.

## 2. The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. Unauthenticated write to `/settings/global`.
2. Signed-in non-admin user writing to `/settings/global`.
3. Signed-in user with `email_verified: false` spoofing admin email on `/settings/global`.
4. Admin write to `/settings/global` with extra ghost field `isSuperUser: true`.
5. Admin write to `/settings/global` with oversized `supportGroupUrl` (`> 300` chars).
6. Admin write to `/settings/global` with client-forged `updatedAt` timestamp instead of `request.time`.
7. Non-admin creating a VIP plan in `/plans/vip_hack`.
8. Admin creating a plan in `/plans/invalid$id!` with illegal characters in document ID.
9. Admin creating a plan with negative price (`price: -500`) or invalid type (`price: "free"`).
10. Non-admin creating or modifying a banner in `/banners/banner_1`.
11. Signed-in non-admin reading `/admins/other_uid`.
12. Signed-in non-admin self-registering into `/admins/{their_uid}` (privilege escalation).
