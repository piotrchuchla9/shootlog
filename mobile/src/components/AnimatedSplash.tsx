import { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Image, Animated, Easing, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('screen');

type Props = { onDone: () => void };

export function AnimatedSplash({ onDone }: Props) {
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const iconRotation = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(16)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      // Icon fades in
      Animated.timing(iconOpacity, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      // Icon spins 360°
      Animated.timing(iconRotation, {
        toValue: 1,
        duration: 1100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      // "ShootLog" fades in with slide-up (delayed)
      Animated.sequence([
        Animated.delay(500),
        Animated.parallel([
          Animated.timing(textOpacity, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(textTranslateY, {
            toValue: 0,
            duration: 500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start(() => {
      // Fade out whole screen after 600ms pause
      Animated.sequence([
        Animated.delay(600),
        Animated.timing(screenOpacity, {
          toValue: 0,
          duration: 400,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => onDone());
    });
  }, []);

  const rotate = iconRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[s.container, { opacity: screenOpacity }]}>
      <View style={s.group}>
        <Animated.View style={{ opacity: iconOpacity, transform: [{ rotate }] }}>
          <Image
            source={require('../../assets/images/splash-icon.png')}
            style={s.icon}
            resizeMode="contain"
          />
        </Animated.View>
        <Animated.Text style={[s.title, { opacity: textOpacity, transform: [{ translateY: textTranslateY }] }]}>
          ShootLog
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width,
    height,
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  group: {
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    width: 160,
    height: 160,
  },
  title: {
    color: '#E87722',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
