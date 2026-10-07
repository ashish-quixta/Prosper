import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

type OpeningScreenProps = {
  onFinish: () => void;
};

export function OpeningScreen({ onFinish }: OpeningScreenProps) {
  const wordOpacity = useSharedValue(0);
  const wordScale = useSharedValue(0.94);
  const lineScale = useSharedValue(0);
  const coverOpacity = useSharedValue(1);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});

    wordOpacity.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    wordScale.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    lineScale.value = withDelay(350, withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) }));
    coverOpacity.value = withDelay(
      1500,
      withTiming(0, { duration: 420, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onFinish)();
      }),
    );
  }, [coverOpacity, lineScale, onFinish, wordOpacity, wordScale]);

  const wordStyle = useAnimatedStyle(() => ({
    opacity: wordOpacity.value,
    transform: [{ scale: wordScale.value }],
  }));

  const lineStyle = useAnimatedStyle(() => ({
    opacity: lineScale.value,
    transform: [{ scaleX: lineScale.value }],
  }));

  const coverStyle = useAnimatedStyle(() => ({
    opacity: coverOpacity.value,
  }));

  return (
    <Animated.View style={[styles.cover, coverStyle]}>
      <Animated.Text style={[styles.word, wordStyle]}>PROSPOR</Animated.Text>
      <Animated.View style={[styles.line, lineStyle]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cover: {
    ...StyleSheet.absoluteFill,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1d4ed8',
  },
  word: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '600',
    letterSpacing: 6,
  },
  line: {
    width: 72,
    height: 2,
    marginTop: 18,
    backgroundColor: '#ffffff',
  },
});
