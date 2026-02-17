import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { OutageType } from '@/lib/outage-store';
import { useI18n } from '@/lib/i18n';

interface OutageCardProps {
  type: OutageType;
  quartier: string;
  ville: string;
  region: string;
  date: string;
  confirmations: number;
  hasPhoto: boolean;
  estRetablie: boolean;
  onPress?: () => void;
  index?: number;
}

const typeConfig = {
  water: { icon: 'water' as const, color: Colors.water, bgColor: Colors.waterGlow, label: 'water' },
  electricity: { icon: 'flash' as const, color: Colors.electricity, bgColor: Colors.electricityGlow, label: 'electricity' },
  internet: { icon: 'wifi' as const, color: Colors.internet, bgColor: Colors.internetGlow, label: 'internet' },
};

export function formatTimeAgo(dateStr: string, t: any): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return t.justNow;
  if (diffMin < 60) return `${diffMin} ${t.minutes}`;
  if (diffHrs < 24) return `${diffHrs} ${t.hours}`;

  const d = new Date(dateStr);
  const todayStr = new Date().toDateString();
  const yesterdayDate = new Date(now - 86400000);
  if (d.toDateString() === todayStr) return t.today;
  if (d.toDateString() === yesterdayDate.toDateString()) return t.yesterday;

  return d.toLocaleDateString('fr-CM', { day: '2-digit', month: 'short' });
}

export default function OutageCard({ type, quartier, ville, region, date, confirmations, hasPhoto, estRetablie, onPress, index = 0 }: OutageCardProps) {
  const { t } = useI18n();
  const config = typeConfig[type];

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={[styles.accentBar, { backgroundColor: config.color }]} />
      <View style={styles.cardContent}>
        <View style={styles.topSection}>
          <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
            <Ionicons name={config.icon} size={20} color={config.color} />
          </View>
          <View style={styles.headerInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.typeLabel}>{t[type]}</Text>
              {estRetablie && (
                <View style={styles.restoredPill}>
                  <Ionicons name="checkmark-circle" size={11} color={Colors.success} />
                  <Text style={styles.restoredText}>{t.restored}</Text>
                </View>
              )}
            </View>
            <Text style={styles.locationText} numberOfLines={1}>{quartier}, {ville}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
        </View>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={13} color={Colors.textTertiary} />
            <Text style={styles.metaText}>{formatTimeAgo(date, t)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="globe-outline" size={13} color={Colors.textTertiary} />
            <Text style={styles.metaText}>{region}</Text>
          </View>
          <View style={styles.metaRight}>
            {hasPhoto && (
              <Ionicons name="image-outline" size={13} color={Colors.textTertiary} />
            )}
            <View style={styles.confirmChip}>
              <Ionicons name="people-outline" size={12} color={Colors.accent} />
              <Text style={styles.confirmCount}>{confirmations}</Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  accentBar: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: 14,
    gap: 10,
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeLabel: {
    fontSize: 15,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text,
  },
  restoredPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.successLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  restoredText: {
    fontSize: 10,
    fontFamily: 'Nunito_700Bold',
    color: Colors.success,
  },
  locationText: {
    fontSize: 13,
    fontFamily: 'Nunito_400Regular',
    color: Colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 52,
    gap: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontFamily: 'Nunito_600SemiBold',
    color: Colors.textTertiary,
  },
  metaRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  confirmChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 87, 34, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  confirmCount: {
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
    color: Colors.accent,
  },
});
