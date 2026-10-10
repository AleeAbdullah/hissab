import type { GroupInvitation, GroupMember } from '@/api/contracts';

export function groupInviteStatus(
  userId: string,
  members: GroupMember[],
  invitations: GroupInvitation[]
) {
  if (
    members.some(
      (member) => member.userId === userId && member.status === 'ACTIVE'
    )
  )
    return 'Member';
  if (invitations.some((invitation) => invitation.userId === userId))
    return 'Invited';
  return undefined;
}
