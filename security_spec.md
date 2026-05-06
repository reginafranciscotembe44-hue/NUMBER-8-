# Security Specification - N8 Arena

## Data Invariants
1. **User Ownership**: Users can only read and modify their own profile data (with the exception of roles, which are managed by system/admins).
2. **Notification Privacy**: Notifications are strictly private to the recipient.
3. **Tournament Lifecycle**: Only owners can create tournaments. Public users can only see tournaments that are 'active' or 'finished', unless they are the creator of a 'draft'.
4. **Tournament Management**: Only the creator of a tournament can update its status or manage matches/players.
5. **Verified Access**: All write operations require a verified email address to prevent spam/spoofing.

## The "Dirty Dozen" Payloads (Deny List)
1. **Identity Spoofing**: Attempt to create a user document with a UID that doesn't match the auth UID.
2. **Role Escalation**: Attempt to update own role from 'player' to 'owner'.
3. **Notification Snooping**: Attempt to list notifications for another user's ID.
4. **Shadow Notification**: Attempt to create a notification in another user's subcollection without being an 'owner'.
5. **Tournament Hijacking**: Attempt to update a tournament created by someone else.
6. **Status Jumping**: Attempt to update a tournament's status to 'finished' without being the owner.
7. **Unverified Write**: Attempt to create a tournament with a non-verified email account.
8. **Malicious ID**: Attempt to create a tournament with a 2KB junk string as the ID.
9. **Field Injection**: Attempt to create a match with an undocumented field `is_active: true`.
10. **Resource Exhaustion**: Attempt to create a bio string with 1MB of text.
11. **Draft Leak**: Attempt to list tournaments with `status == 'draft'` as a non-owner.
12. **Orphaned Player**: Attempt to create a player in a tournament that doesn't exist.
