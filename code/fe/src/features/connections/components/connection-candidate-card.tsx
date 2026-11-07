import { Link } from 'expo-router';
import { ActivityIndicator, View, useWindowDimensions } from 'react-native';

import type { ConnectionCandidate } from '@/api/contracts';
import { Avatar, Card } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

export function ConnectionCandidateCard({
  candidate,
  isSending,
  requestSent,
  onSend
}: {
  candidate: ConnectionCandidate;
  isSending: boolean;
  requestSent: boolean;
  onSend: () => void;
}) {
  const { fontScale } = useWindowDimensions();
  return (
    <Card>
      <View className="gap-4 p-4">
        <View
          className={
            fontScale >= 1.3
              ? 'items-start gap-3'
              : 'flex-row items-center gap-3'
          }
        >
          <Avatar name={candidate.displayName} />
          <View
            className={fontScale >= 1.3 ? 'w-full gap-0.5' : 'flex-1 gap-0.5'}
          >
            <Text selectable className="text-base font-semibold leading-6">
              {candidate.displayName}
            </Text>
            <Text
              selectable
              className="text-xs leading-4 text-muted-foreground"
            >
              {candidate.email}
            </Text>
          </View>
        </View>
        {candidate.state === 'AVAILABLE' && !requestSent ? (
          <Button
            disabled={isSending}
            accessibilityState={{ disabled: isSending, busy: isSending }}
            onPress={onSend}
          >
            {isSending ? (
              <ActivityIndicator className="text-primary-foreground" />
            ) : (
              <Text>Send connection request</Text>
            )}
          </Button>
        ) : null}
        {requestSent || candidate.state === 'PENDING_OUTGOING' ? (
          <Text
            selectable
            accessibilityLiveRegion="polite"
            className="text-[15px] leading-[22px] text-positive"
          >
            Request sent · waiting for them
          </Text>
        ) : null}
        {requestSent || candidate.state === 'PENDING_OUTGOING' ? (
          <Link href="/groups/friends/requests" asChild>
            <Button size="compact" variant="outline" role="link">
              <Text>Manage requests</Text>
            </Button>
          </Link>
        ) : null}
        {candidate.state === 'PENDING_INCOMING' ? (
          <Text>Wants to connect with you</Text>
        ) : null}
        {candidate.state === 'CONNECTED' ? (
          <Text>Already connected</Text>
        ) : null}
        {candidate.state === 'PENDING_INCOMING' ? (
          <Link href="/groups/friends/requests" asChild>
            <Button size="compact" variant="outline" role="link">
              <Text>Review request</Text>
            </Button>
          </Link>
        ) : null}
        {candidate.state === 'CONNECTED' ? (
          <Link
            href={{
              pathname: '/groups/friends/[friendId]',
              params: {
                friendId: candidate.userId,
                ledgerId: candidate.ledgerId ?? ''
              }
            }}
            asChild
          >
            <Button size="compact" variant="outline" role="link">
              <Text>View friend</Text>
            </Button>
          </Link>
        ) : null}
      </View>
    </Card>
  );
}
