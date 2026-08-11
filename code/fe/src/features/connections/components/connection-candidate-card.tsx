import { Link } from 'expo-router';
import type { ConnectionCandidate } from '@/api/contracts';
import { Avatar, Card } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ActivityIndicator, View } from 'react-native';

export function ConnectionCandidateCard({
  candidate,
  isSending,
  requestSent,
  onSend,
}: {
  candidate: ConnectionCandidate;
  isSending: boolean;
  requestSent: boolean;
  onSend: () => void;
}) {
  return (
    <Card>
      <View className="gap-4 p-4">
        <View className="flex-row items-center gap-3">
          <Avatar name={candidate.displayName} />
          <View className="flex-1 gap-0.5">
            <Text selectable className="text-base font-semibold leading-6">
              {candidate.displayName}
            </Text>
            <Text selectable className="text-xs leading-4 text-muted-foreground">
              {candidate.email}
            </Text>
          </View>
        </View>
        {candidate.state === 'AVAILABLE' && !requestSent ? (
          <Button disabled={isSending} accessibilityState={{ disabled: isSending, busy: isSending }} onPress={onSend}>
            {isSending ? <ActivityIndicator className="text-primary-foreground" /> : <Text>Send connection request</Text>}
          </Button>
        ) : null}
        {requestSent || candidate.state === 'PENDING_OUTGOING' ? (
          <Text selectable className="text-[15px] leading-[22px] text-positive">
            Request sent. You can cancel it from Connection requests.
          </Text>
        ) : null}
        {candidate.state === 'PENDING_INCOMING' ? (
          <Link href="/friends/requests" asChild><Button variant="outline" role="link"><Text>Review incoming request</Text></Button></Link>
        ) : null}
        {candidate.state === 'CONNECTED' ? (
          <Link href={{ pathname: '/friends/[friendId]', params: { friendId: candidate.userId } }} asChild><Button variant="outline" role="link"><Text>View friend</Text></Button></Link>
        ) : null}
      </View>
    </Card>
  );
}
