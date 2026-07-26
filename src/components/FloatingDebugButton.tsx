import React, { useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NetworkDebuggerModal } from './NetworkDebuggerModal';

const BUTTON_SIZE = 48;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const FloatingDebugButton: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);

  // Initial floating position: Bottom-Right
  const initialX = SCREEN_WIDTH - BUTTON_SIZE - 20;
  const initialY = SCREEN_HEIGHT - BUTTON_SIZE - Math.max(insets.bottom + 20, 32);

  const [pan] = useState(() => new Animated.ValueXY({ x: initialX, y: initialY }));

  const [panResponder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
      },
      onPanResponderGrant: () => {
        pan.extractOffset();
      },
      onPanResponderMove: (_, gestureState) => {
        pan.x.setValue(gestureState.dx);
        pan.y.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        const dragDistance = Math.hypot(gestureState.dx, gestureState.dy);
        // If movement was less than 6px, open network debugger modal
        if (dragDistance < 6) {
          setModalVisible(true);
        }
      },
    })
  );

  return (
    <>
      <Animated.View
        style={[
          styles.button,
          {
            transform: pan.getTranslateTransform(),
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Open Network Debugger"
          style={styles.touchableArea}
        >
          <View style={styles.badgeDot} />
          <Text style={styles.icon}>📡</Text>
        </TouchableOpacity>
      </Animated.View>

      <NetworkDebuggerModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: '#0F172A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 10,
    zIndex: 9999,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  touchableArea: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BUTTON_SIZE / 2,
  },
  badgeDot: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#0F172A',
  },
  icon: {
    fontSize: 20,
  },
});
