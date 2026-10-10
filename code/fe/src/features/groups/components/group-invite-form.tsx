import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { queryClient } from '@/api/query-client';
import {
  Card,
  ErrorMessage,
  Field,
  Loading,
  Notice,
  Row,
  Screen,
  SectionLabel
} from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { connectionsQuery, findCandidate } from '@/features/connections/api';
import {
  groupInvitationsQuery,
  groupMembersQuery,
  groupQuery,
  inviteGroupUser
} from '@/features/groups/api';
import { groupInviteStatus } from '@/features/groups/invitations';

export function GroupInviteForm({ groupId }: { groupId: string }) {
  const [email, setEmail] = useState('');
  const group = useQuery(groupQuery(groupId));
  const connections = useQuery(connectionsQuery);
  const members = useQuery(groupMembersQuery(groupId));
  const canInvite =
    group.data?.status === 'ACTIVE' && group.data.membershipStatus === 'ACTIVE';
  const invitations = useQuery({
    ...groupInvitationsQuery(groupId),
    enabled: canInvite
  });
  const lookup = useMutation({ mutationFn: findCandidate });
  const invite = useMutation({
    mutationFn: (userId: string) => inviteGroupUser(groupId, userId),
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['groups', groupId] }),
        queryClient.invalidateQueries({ queryKey: ['activity'] })
      ]);
    }
  });

  if (group.isLoading || members.isLoading) return <Loading />;
  if (group.error || members.error || !group.data)
    return (
      <Screen>
        <ErrorMessage
          error={group.error ?? members.error ?? new Error('Group not found.')}
        />
        <Button
          variant="outline"
          onPress={() => {
            void group.refetch();
            void members.refetch();
          }}
        >
          <Text>Retry</Text>
        </Button>
      </Screen>
    );
  if (!canInvite)
    return (
      <Screen>
        <Notice title="Invitations unavailable">
          Only active members can invite people to an active group.
        </Notice>
      </Screen>
    );

  const ready = invitations.isSuccess && !invitations.isFetching;
  const busy = lookup.isPending || invite.isPending;
  const normalizedEmail = email.trim().toLowerCase();
  const canSearch = normalizedEmail.includes('@') && !busy;
  // Only show a result for the current input, including when an older lookup finishes late.
  const candidate =
    lookup.variables === normalizedEmail ? lookup.data : undefined;
  const search = () => {
    if (!canSearch) return;
    invite.reset();
    lookup.mutate(normalizedEmail);
  };
  const renderPerson = (person: { userId: string; displayName: string }) => {
    const status = groupInviteStatus(
      person.userId,
      members.data ?? [],
      invitations.data ?? []
    );
    const sent = invite.isSuccess && invite.variables === person.userId;
    const badge = status ?? (sent ? 'Invited' : undefined);
    const disabled = !ready || busy || !!badge;
    return (
      <Row
        key={person.userId}
        title={person.displayName}
        titleBadge={badge}
        trailing={
          <Button
            variant="outline"
            disabled={disabled}
            accessibilityLabel={`Invite ${person.displayName}`}
            accessibilityState={{
              disabled,
              busy: invite.isPending && invite.variables === person.userId
            }}
            onPress={() => {
              if (!disabled) invite.mutate(person.userId);
            }}
          >
            {invite.isPending && invite.variables === person.userId ? (
              <ActivityIndicator className="text-primary" />
            ) : (
              <Text>Invite</Text>
            )}
          </Button>
        }
      />
    );
  };
  return (
    <Screen>
      <Text
        selectable
        className="text-[15px] leading-[22px] text-muted-foreground"
      >
        Invite someone to {group.data.name} by their exact Hissab email. They
        join only after accepting; this does not add them as a friend.
      </Text>
      <Field
        label="Email address"
        placeholder="person@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        maxLength={254}
        value={email}
        editable={!busy}
        onChangeText={(value) => {
          setEmail(value);
          lookup.reset();
          invite.reset();
        }}
        onSubmitEditing={search}
        returnKeyType="search"
      />
      <Button
        disabled={!canSearch}
        accessibilityState={{ disabled: !canSearch, busy: lookup.isPending }}
        onPress={search}
      >
        {lookup.isPending ? (
          <ActivityIndicator className="text-primary-foreground" />
        ) : (
          <Text>Find person</Text>
        )}
      </Button>
      {lookup.error || invite.error ? (
        <ErrorMessage error={lookup.error ?? invite.error} />
      ) : null}
      {lookup.isSuccess &&
      lookup.variables === normalizedEmail &&
      !candidate ? (
        <Notice>
          No invitation is available for that email. Check the spelling or
          confirm the email with them.
        </Notice>
      ) : null}
      {candidate ? <Card>{renderPerson(candidate)}</Card> : null}
      {invite.isSuccess ? (
        <Text
          accessibilityLiveRegion="polite"
          className="text-[15px] leading-[22px] text-positive"
        >
          Invitation sent. It will appear under pending invitations on Members.
        </Text>
      ) : null}
      {invitations.isLoading ? (
        <ActivityIndicator
          accessibilityLabel="Loading invitations"
          className="text-primary"
        />
      ) : null}
      {invitations.error ? (
        <>
          <ErrorMessage error={invitations.error} />
          <Button variant="outline" onPress={() => void invitations.refetch()}>
            <Text>Retry invitations</Text>
          </Button>
        </>
      ) : null}
      <SectionLabel>YOUR CONNECTIONS</SectionLabel>
      {connections.isLoading ? (
        <ActivityIndicator
          accessibilityLabel="Loading connections"
          className="text-primary"
        />
      ) : connections.error ? (
        <>
          <ErrorMessage error={connections.error} />
          <Button variant="outline" onPress={() => void connections.refetch()}>
            <Text>Retry connections</Text>
          </Button>
        </>
      ) : connections.data?.length ? (
        <Card>{connections.data.map(renderPerson)}</Card>
      ) : (
        <Text
          selectable
          className="text-[15px] leading-[22px] text-muted-foreground"
        >
          No connections yet. You can still invite someone by email.
        </Text>
      )}
    </Screen>
  );
}
