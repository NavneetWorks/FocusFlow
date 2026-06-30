# Security Specification & Test-Driven Development (TDD) for Firebase Security

This document outlines the zero-trust data invariants, the "Dirty Dozen" spoofing payloads, and security requirements to protect the **FocusFlow AI Commitments & Collaborative Groups** Firestore backend.

---

## 1. Zero-Trust Data Invariants

1. **Shared Commitments Isolation**: Shared commitments can be viewed by anyone with the link (including anonymous or unauthenticated users if public), but only the authenticated owner (`userId == request.auth.uid`) can create or update them.
2. **Commitment Immutable Attributes**: A commitment's `userId`, `userEmail`, and `createdAt` must be immutable once created.
3. **Group Entry Gate**: To read, write, or query a group's metadata, tasks, activities, or messages, the user **MUST** be listed in the group's `members` list.
4. **Group Admin Privilege**: Editing group metadata (like renaming the group or adding/removing admins) is strictly reserved for users in the `admins` list.
5. **Group Tasks State Enforcement**: Any member of a group can update a task's status (Pending, In Progress, Completed, Not Done, On Hold) or progress, but they can only do so if they are a group member. The task's `groupId` is strictly immutable.
6. **Task Message Integrity**: Only members of the parent group can write comments on a group task. The `senderId` of any comment must match the authenticated user's UID (`request.auth.uid`).
7. **Action-Based Key Verification**: During updates, only a subset of fields should be allowed to change. Unspecified fields (e.g., trying to write a custom privilege flag like `isAdmin: true` inside `memberInfo` map) must be strictly rejected.
8. **Size & Type Guards**: String bounds must be enforced to prevent Denial of Wallet attacks.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following 12 payloads attempt to bypass identity, integrity, or state gates:

1. **Identity Spoofing in Shared Commitment**: An attacker (`auth.uid: "malicious_user"`) attempts to create a shared commitment with `userId: "piyush_user"`.
2. **Temporal Integrity Hack**: An attacker attempts to create a commitment with `createdAt` set to a future date, rather than the server timestamp `request.time`.
3. **Commitment Ownership hijacking**: An attacker tries to edit a shared commitment belonging to another user.
4. **Group Bypassing (Read Group Tasks)**: A user who is NOT in the `members` list of `groups/study_group_1` tries to fetch the list of tasks.
5. **Unauthenticated Group Creation**: An unauthenticated user attempts to create a group.
6. **Self-Admin Escalation**: A normal member of a group attempts to update `groups/study_group_1` and add themselves to the `admins` list.
7. **Phantom Task Creation**: An attacker who is NOT a member of a group tries to create a task in `/groups/group_abc/tasks/task_xyz`.
8. **Malicious Message Impersonation**: A member of a group writes a discussion comment with `senderId: "another_member"`.
9. **Status State Shortcutting**: A user attempts to write an invalid status like `status: "Super Done"` to a Group Task, bypassing the permitted status values.
10. **Resource Poisoning via ID Injection**: An attacker attempts to inject a huge 2KB junk string as a task ID to crash client queries or exhaust storage.
11. **Immortality Field Update**: An attacker tries to edit a group task and change its parent `groupId`.
12. **Comment Injection in Sibling Task**: An attacker tries to write a comment inside a group they belong to, but references a taskId belonging to a different group they are not member of (cross-tenant injection).

---

## 3. Test Runner Design Reference

In the real project, these are compiled into the security rules schema where they are validated by the Firestore rules.

Below is the conceptual Firestore unit test setup checking for these permission denials:

```typescript
// firestore.rules.test.ts (Conceptual representation)
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

describe("Zero-Trust Security Tests", () => {
  it("rejects invalid UID commitment creation (Dirty Dozen #1)", async () => {
    // Attempting to write with mismatched auth UID
    const maliciousContext = { uid: "malicious_123" };
    const payload = { userId: "victim_456", progressPercentage: 100, date: "2026-06-29" };
    await assertFails(createCommitment(maliciousContext, "victim_commitment", payload));
  });

  it("prevents self-admin privilege escalation (Dirty Dozen #6)", async () => {
    // Member tries to write a payload adding themselves to admins
    const groupContext = { uid: "non_admin_member" };
    const payload = { admins: ["group_admin", "non_admin_member"] };
    await assertFails(updateGroup(groupContext, "group_id", payload));
  });
});
```
