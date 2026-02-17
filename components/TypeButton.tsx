import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { OutageType } from '@/lib/outage-store';

interface TypeButtonProps {
  type: OutageType;
  label: string;
  selected: boolean;
  onPress: () => void;
}

const typeConfig = {
  water: { icon: 'water' as const, color: Colors.water, darkColor: Colors.waterDark, bgColor: Colors.waterGlow },
  electricity: { icon: 'flash' as const, color: Colors.electricity, darkColor: Colors.electricityDark, bgColor: Colors.electricityGlow },
  internet: { icon: 'wifi' as const, color: Colors.internet, darkColor: Colors.internetDark, bgColor: Colors.internetGlow },
};

export default function TypeButton({ type, label, selected, onPress }: TypeButtonProps) {
  const config = typeConfig[type];

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        { borderColor: selected ? config.color : Colors.border },
        selected && { backgroundColor: config.color },
        !selected && { backgroundColor: config.bgColor },
        pressed && styles.buttonPressed,
      ]}
      onPress={handlePress}
    >
      <View style={[styles.iconCircle, { backgroundColor: selected ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.9)' }]}>
        <Ionicons name={config.icon} size={26} color={selected ? '#FFF' : config.color} />
      </View>
      <Text style={[styles.label, { color: selected ? '#FFF' : config.color }]}>{label}</Text>
      {selected && (
        <View style={styles.checkBadge}>
          <Ionicons name="checkmark" size={14} color={config.color} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 18,
    borderWidth: 2,
    gap: 8,
    position: 'relative',
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontFamily: 'Nunito_700Bold',
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
