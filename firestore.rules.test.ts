/**
 * Security Rules Test Suite for NexasWorld Firestore Rules
 * Verifies the "Dirty Dozen" adversarial payloads against firestore.rules.
 */

export const DIRTY_DOZEN_CASES = [
  { id: 1, path: '/settings/global', op: 'write', auth: null, expect: 'PERMISSION_DENIED' },
  { id: 2, path: '/settings/global', op: 'update', auth: { uid: 'user1', email: 'user@example.com', email_verified: true }, expect: 'PERMISSION_DENIED' },
  { id: 3, path: '/settings/global', op: 'write', auth: { uid: 'spoof', email: 'nexasworld5@gmail.com', email_verified: false }, expect: 'PERMISSION_DENIED' },
  { id: 4, path: '/settings/global', op: 'create', auth: { uid: 'admin', email: 'nexasworld5@gmail.com', email_verified: true }, payload: { isSuperUser: true }, expect: 'PERMISSION_DENIED' },
  { id: 5, path: '/settings/global', op: 'update', auth: { uid: 'admin', email: 'nexasworld5@gmail.com', email_verified: true }, payload: { supportGroupUrl: 'x'.repeat(305) }, expect: 'PERMISSION_DENIED' },
  { id: 6, path: '/settings/global', op: 'update', auth: { uid: 'admin', email: 'nexasworld5@gmail.com', email_verified: true }, payload: { updatedAt: '2026-01-01T00:00:00Z' }, expect: 'PERMISSION_DENIED' },
  { id: 7, path: '/plans/vip_hack', op: 'create', auth: { uid: 'user1', email: 'user@example.com', email_verified: true }, expect: 'PERMISSION_DENIED' },
  { id: 8, path: '/plans/invalid$id!', op: 'create', auth: { uid: 'admin', email: 'nexasworld5@gmail.com', email_verified: true }, expect: 'PERMISSION_DENIED' },
  { id: 9, path: '/plans/vip_1', op: 'create', auth: { uid: 'admin', email: 'nexasworld5@gmail.com', email_verified: true }, payload: { price: -500 }, expect: 'PERMISSION_DENIED' },
  { id: 10, path: '/banners/banner_1', op: 'update', auth: { uid: 'user1', email: 'user@example.com', email_verified: true }, expect: 'PERMISSION_DENIED' },
  { id: 11, path: '/admins/other_uid', op: 'get', auth: { uid: 'user1', email: 'user@example.com', email_verified: true }, expect: 'PERMISSION_DENIED' },
  { id: 12, path: '/admins/user1', op: 'create', auth: { uid: 'user1', email: 'user@example.com', email_verified: true }, payload: { uid: 'user1', email: 'user@example.com' }, expect: 'PERMISSION_DENIED' },
  { id: 13, path: '/giftCodes', op: 'list', auth: { uid: 'user1', email: 'user@example.com', email_verified: true }, expect: 'PERMISSION_DENIED' },
  { id: 14, path: '/giftCodes/FREE100', op: 'create', auth: { uid: 'user1', email: 'user@example.com', email_verified: true }, payload: { code: 'FREE100', amount: 100 }, expect: 'PERMISSION_DENIED' },
];
