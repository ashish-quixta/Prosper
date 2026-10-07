import { Text, View } from 'react-native';
import { Stack } from 'expo-router';

export default function FolderScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Folder' }} />
      <View className="flex-1 items-center justify-center bg-white px-8">
        <Text className="text-center text-base leading-6 text-slate-500">Saves in this folder will show here.</Text>
      </View>
    </>
  );
}
