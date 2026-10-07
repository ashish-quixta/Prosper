import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';

export default function SearchScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white px-8">
      <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
        <Ionicons name="search" size={28} color="#1d4ed8" />
      </View>
      <Text className="text-center text-lg font-semibold text-slate-900">Search your saves</Text>
      <Text className="mt-2 text-center text-base leading-6 text-slate-500">
        Titles, summaries, and tags will show up here.
      </Text>
    </View>
  );
}
