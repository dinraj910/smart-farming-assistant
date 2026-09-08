import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  PanResponder,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BUTTON_WIDTH = SCREEN_WIDTH - 56;
const BUTTON_HEIGHT = 64;
const KNOB_SIZE = 52;
const MAX_TRANSLATE = BUTTON_WIDTH - KNOB_SIZE - 8;

interface SlideButtonProps {
  onSlideComplete: () => void;
}

export default function SlideButton({ onSlideComplete }: SlideButtonProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [completed, setCompleted] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const newX = Math.max(0, Math.min(gestureState.dx, MAX_TRANSLATE));
        translateX.setValue(newX);
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentX = Math.max(0, Math.min(gestureState.dx, MAX_TRANSLATE));
        if (currentX > MAX_TRANSLATE * 0.75) {
          Animated.timing(translateX, {
            toValue: MAX_TRANSLATE,
            duration: 200,
            useNativeDriver: false,
          }).start(() => {
            setCompleted(true);
            onSlideComplete();
          });
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: false,
            damping: 20,
            stiffness: 200,
          }).start();
        }
      },
    })
  ).current;

  const textOpacity = translateX.interpolate({
    inputRange: [0, MAX_TRANSLATE * 0.5],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const highlightWidth = translateX.interpolate({
    inputRange: [0, MAX_TRANSLATE],
    outputRange: [KNOB_SIZE + 8, BUTTON_WIDTH],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Green highlight that grows as you slide */}
      <Animated.View style={[styles.highlight, { width: highlightWidth }]} />

      {/* "Slide to start" label */}
      <Animated.Text style={[styles.text, { opacity: textOpacity }]}>
        Slide to get started
      </Animated.Text>

      {/* Chevrons hint on the right */}
      <Feather
        name="chevrons-right"
        size={20}
        color="rgba(255,255,255,0.35)"
        style={styles.chevrons}
      />

      {/* Draggable knob */}
      <Animated.View
        style={[styles.knob, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        {completed ? (
          <ActivityIndicator color="#15803d" size="small" />
        ) : (
          <Feather name="arrow-right" size={22} color="#15803d" />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: BUTTON_HEIGHT,
    width: BUTTON_WIDTH,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(21,128,61,0.45)',
    borderRadius: 999,
  },
  knob: {
    position: 'absolute',
    left: 4,
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    backgroundColor: 'white',
    borderRadius: KNOB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  text: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    zIndex: 1,
  },
  chevrons: {
    position: 'absolute',
    right: 20,
    zIndex: 1,
  },
});
