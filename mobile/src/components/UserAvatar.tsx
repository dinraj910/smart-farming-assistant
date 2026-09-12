import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

interface UserAvatarProps {
  name?: string;
  size?: number;
  fontSize?: number;
  showBadge?: boolean;
  style?: ViewStyle;
}

export default function UserAvatar({
  name = 'Farmer',
  size = 44,
  fontSize = 18,
  showBadge = false,
  style,
}: UserAvatarProps) {
  const letter = (name?.trim()?.[0] || 'F').toUpperCase();

  return (
    <View
      style={[
        S.avatarContainer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
    >
      <Text
        style={[
          S.avatarLetter,
          {
            fontSize,
            lineHeight: fontSize + 4,
          },
        ]}
      >
        {letter}
      </Text>

      {showBadge && (
        <View
          style={[
            S.badgeDot,
            {
              width: Math.max(10, size * 0.24),
              height: Math.max(10, size * 0.24),
              borderRadius: Math.max(10, size * 0.24) / 2,
            },
          ]}
        />
      )}
    </View>
  );
}

const S = StyleSheet.create({
  avatarContainer: {
    backgroundColor: '#15803d',
    borderWidth: 2,
    borderColor: '#86efac',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#15803d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
    position: 'relative',
  },
  avatarLetter: {
    color: '#ffffff',
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  badgeDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
});
