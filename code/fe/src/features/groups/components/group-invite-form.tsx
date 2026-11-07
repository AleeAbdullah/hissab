import { useMutation, useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { ActivityIndicator, View, useWindowDimensions } from 'react-native';

import { queryClient } from '@/api/query-client';
import {
  Card,
  ErrorMessage,
  Field,
  Loading,
  Notice,
  Avatar,
  Screen,
  SectionLabel
} from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { connectionsQuery, findCandidate } from '@/features/connections/api';
import { DiscoveryFeedback } from '@/features/connections/components/discovery-feedback';
import {
  groupInvitationsQuery,
  groupMembersQuery,
  groupQuery,
  inviteGroupUser
} from '@/features/groups/api';
import { groupInviteStatus } from '@/features/groups/invitations';

export function GroupInviteForm({ groupId }: { groupId: string }) {
  const [email, setEmail] = useState('');
  const { fontScale } = useWindowDimensions();
  const searching = useRef(false);
  const inviting = useRef(false);
  const group = useQuery(groupQuery(groupId));
  const connections = useQuery(connectionsQuery);
  const members = useQuery(groupMembersQuery(groupId));
  const canInvite =
    group.data?.status === 'ACTIVE' && group.data.membershipStatus === 'ACTIVE';
  const invitations = useQuery({
    ...groupInvitationsQuery(groupId),
    enabled: canInvite
  });
  const lookup = useMutation({
    mutationFn: findCandidate,
    onSettled: () => {
      searching.current = false;
    }
  });
  const invite = useMutation({
    mutationFn: (userId: string) => inviteGroupUser(groupId, userId),
    onSettled: async () => {
      try {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['groups', groupId] }),
          queryClient.invalidateQueries({ queryKey: ['activity'] })
        ]);
      } finally {
        inviting.current = false;
      }
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
    if (!canSearch || searching.current || inviting.current) return;
    searching.current = true;
    invite.reset();
    lookup.mutate(normalizedEmail);
  };
  const renderPerson = (
    person: { userId: string; displayName: string },
    lookupResult = false
  ) => {
    const status = groupInviteStatus(
      person.userId,
      members.data ?? [],
      invitations.data ?? []
    );
    const sent = invite.isSuccess && invite.variables === person.userId;
    const disabled = !ready || busy;
    const stateLabel =
      status === 'Member'
        ? lookupResult
          ? `Already in ${group.data.name}`
          : '✓ Member'
        : sent
          ? '✓ Invited'
          : status
            ? lookupResult
              ? 'Invitation pending'
              : 'Invited'
            : undefined;
    const action = stateLabel ? (
      <Text
        accessibilityLabel={`${person.displayName}, ${stateLabel}`}
        accessibilityLiveRegion="polite"
        className="text-[13px] leading-[18px] text-muted-foreground"
      >
        {stateLabel}
      </Text>
    ) : (
      <Button
        size="compact"
        variant="outline"
        disabled={disabled}
        accessibilityLabel={`Invite ${person.displayName}`}
        accessibilityState={{
          busy: invite.isPending && invite.variables === person.userId
        }}
        onPress={() => {
          if (disabled || searching.current || inviting.current) return;
          inviting.current = true;
          invite.mutate(person.userId);
        }}
      >
        {invite.isPending && invite.variables === person.userId ? (
          <ActivityIndicator className="text-primary" />
        ) : (
          <Text>Invite</Text>
        )}
      </Button>
    );
    return (
      <View key={person.userId}>
        <View className="min-h-14 flex-row items-start gap-3 py-2.5">
          <Avatar name={person.displayName} />
          <View className="flex-1 gap-1">
            <Text className="text-base font-medium leading-[22px]">
              {person.displayName}
            </Text>
            <Text className="text-[13px] leading-[18px] text-muted-foreground">
              {lookupResult ? normalizedEmail : 'Connected'}
            </Text>
            {fontScale >= 1.3 ? (
              <View className="items-start">{action}</View>
            ) : null}
          </View>
          {fontScale < 1.3 ? action : null}
        </View>
        <View className="ml-12 border-b-hairline border-border" />
      </View>
    );
  };
  return (
    <Screen>
      <Text
        selectable
        className="text-[15px] leading-[22px] text-muted-foreground"
      >
        Invite someone to {group.data.name} by the exact email on their Tally
        Stick account. They join only after accepting; this does not add them as
        a friend.
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
      {invite.error ? <ErrorMessage error={invite.error} /> : null}
      {lookup.error ? <DiscoveryFeedback group error onRetry={search} /> : null}
      {lookup.isSuccess &&
      lookup.variables === normalizedEmail &&
      !candidate ? (
        <DiscoveryFeedback group />
      ) : null}
      {!lookup.isPending && candidate ? (
        <Card>
          <View className="px-4">{renderPerson(candidate, true)}</View>
        </Card>
      ) : null}
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
        <View>{connections.data.map((person) => renderPerson(person))}</View>
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
