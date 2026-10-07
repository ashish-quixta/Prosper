import { Text, View } from 'react-native';
import { statusLabel, type ItemStatus } from '@/savedItem';

const badgeStyle: Record<ItemStatus, { box: string; text: string }> = {
  saving: { box: 'bg-blue-50', text: 'text-blue-700' },
  summarising: { box: 'bg-blue-50', text: 'text-blue-700' },
  ready: { box: 'bg-blue-700', text: 'text-white' },
  limited: { box: 'bg-amber-50', text: 'text-amber-800' },
  failed: { box: 'bg-red-50', text: 'text-red-700' },
};

export function StatusBadge({ status }: { status: ItemStatus }) {
  const colors = badgeStyle[status];
  return (
    <View className={`rounded-full px-2.5 py-1 ${colors.box}`}>
      <Text className={`text-xs font-semibold ${colors.text}`}>{statusLabel(status)}</Text>
    </View>
  );
}
