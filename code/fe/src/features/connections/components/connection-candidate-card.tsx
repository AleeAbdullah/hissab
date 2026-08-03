import type { ConnectionCandidate } from '@/api/contracts';
import { Avatar, Button, Card } from '@/components/ui';
import { Text, View } from 'react-native';

import { useAppTheme } from '@/theme/theme';

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
  const { colors } = useAppTheme();
  return (
    <Card>
      <View style={{ padding: 16, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={candidate.displayName} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text selectable style={{ color: colors.text, fontSize: 16, lineHeight: 24, fontWeight: '600' }}>
              {candidate.displayName}
            </Text>
            <Text selectable style={{ color: colors.secondary, fontSize: 12, lineHeight: 16 }}>
              {candidate.email}
            </Text>
          </View>
        </View>
        {candidate.state === 'AVAILABLE' && !requestSent ? (
          <Button title={isSending ? 'Sending…' : 'Send connection request'} loading={isSending} onPress={onSend} />
        ) : null}
        {requestSent || candidate.state === 'PENDING_OUTGOING' ? (
          <Text selectable style={{ color: colors.positive, fontSize: 15, lineHeight: 22 }}>
            Request sent. You can cancel it from Connection requests.
          </Text>
        ) : null}
        {candidate.state === 'PENDING_INCOMING' ? (
          <Button title="Review incoming request" href="/friends/requests" secondary />
        ) : null}
        {candidate.state === 'CONNECTED' ? (
          <Button title="View friend" href={{ pathname: '/friends/[friendId]', params: { friendId: candidate.userId } }} secondary />
        ) : null}
      </View>
    </Card>
  );
}
