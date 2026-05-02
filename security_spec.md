# Security Specification for NUMBER 8

## Data Invariants
1. A tournament can only be managed by its creator.
2. Players and Matches must belong to an existing tournament.
3. Match scores can only be updated if the match is 'in_progress'.
4. A match winner can only be one of the two participants.

## The Dirty Dozen Payloads (Targeting Rejection)
1. **Identity Spoofing**: Creating a tournament with `createdBy` NOT matching `auth.uid`.
2. **Access Escalation**: Updating a tournament owned by another user.
3. **Orphaned Registration**: Creating a player for a non-existent `tournamentId`.
4. **Shadow Field Injection**: Adding an `isAdmin` field to a player document.
5. **Score Poisoning**: Submitting a negative score or a non-number score.
6. **Winner Spoofing**: Setting `winnerId` to a player who is not in the match.
7. **Premature Results**: Setting a winner for a match that is still `pending`.
8. **Resource Exhaustion**: Sending a 1MB string for a player name.
9. **Status Jumping**: Moving a tournament directly from `draft` to `finished` skipping `active` (if lifecycle is enforced).
10. **Immutable Field Tampering**: Changing `createdAt` or `createdBy` on an existing tournament.
11. **ID Poisoning**: Using a 500-character document ID.
12. **Public Write**: Attempting to create a player without being signed in.

## Test Runner (Conceptual)
Verified through logic checks in `firestore.rules`.
