import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useI18n } from '@/lib/i18n';
import { useOutages } from '@/lib/outage-store';
import { PieChart, BarChart } from '@/components/StatChart';

type Period = 'week' | 'month' | 'all';

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { outages, regions } = useOutages();
  const [period, setPeriod] = useState<Period>('all');
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const filteredOutages = useMemo(() => {
    if (period === 'all') return outages;
    const now = Date.now();
    const cutoff = period === 'week' ? now - 7 * 86400000 : now - 30 * 86400000;
    return outages.filter(o => new Date(o.date).getTime() > cutoff);
  }, [outages, period]);

  const pieData = useMemo(() => {
    const counts = { water: 0, electricity: 0, internet: 0 };
    filteredOutages.forEach(o => counts[o.type]++);
    return [
      { label: t.water, value: counts.water, color: Colors.water },
      { label: t.electricity, value: counts.electricity, color: Colors.electricity },
      { label: t.internet, value: counts.internet, color: Colors.internet },
    ];
  }, [filteredOutages, t]);

  const barData = useMemo(() => {
    const counts: Record<string, number> = {};
    regions.forEach(r => counts[r] = 0);
    filteredOutages.forEach(o => { if (counts[o.region] !== undefined) counts[o.region]++; });
    return regions.map(r => ({ label: r, value: counts[r], color: Colors.accent })).filter(d => d.value > 0);
  }, [filteredOutages, regions]);

  const totalActive = filteredOutages.filter(o => !o.estRetablie).length;
  const totalRestored = filteredOutages.filter(o => o.estRetablie).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>{t.stats}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + (Platform.OS === 'web' ? 34 : 0) }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(100)} style={styles.periodRow}>
          {(['week', 'month', 'all'] as Period[]).map(p => (
            <Pressable
              key={p}
              style={[styles.periodBtn, period === p && styles.periodActive]}
              onPress={() => { Haptics.selectionAsync(); setPeriod(p); }}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{t[p]}</Text>
            </Pressable>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150)} style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderLeftColor: Colors.accent }]}>
            <Text style={styles.summaryNumber}>{filteredOutages.length}</Text>
            <Text style={styles.summaryLabel}>{t.total}</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: Colors.internet }]}>
            <Text style={styles.summaryNumber}>{totalActive}</Text>
            <Text style={styles.summaryLabel}>{t.active}</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: Colors.success }]}>
            <Text style={styles.summaryNumber}>{totalRestored}</Text>
            <Text style={styles.summaryLabel}>{t.restored}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)} style={styles.card}>
          <Text style={styles.cardTitle}>{t.outagesByType}</Text>
          {filteredOutages.length === 0 ? (
            <View style={styles.emptyChart}>
              <Ionicons name="pie-chart-outline" size={40} color={Colors.textTertiary} />
              <Text style={styles.emptyChartText}>{t.noOutages}</Text>
            </View>
          ) : (
            <PieChart data={pieData} size={200} />
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300)} style={styles.card}>
          <Text style={styles.cardTitle}>{t.outagesByRegion}</Text>
          {barData.length === 0 ? (
            <View style={styles.emptyChart}>
              <Ionicons name="bar-chart-outline" size={40} color={Colors.textTertiary} />
              <Text style={styles.emptyChartText}>{t.noOutages}</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <BarChart data={barData} height={220} />
            </ScrollView>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerBar: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  headerTitle: { fontSize: 26, fontFamily: 'Nunito_800ExtraBold', color: Colors.text },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingTop: 10 },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  periodBtn: {
    flex: 1, paddingVertical: 11, borderRadius: 14, backgroundColor: Colors.cardBg,
    alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border,
  },
  periodActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  periodText: { fontSize: 14, fontFamily: 'Nunito_700Bold', color: Colors.textSecondary },
  periodTextActive: { color: '#FFF' },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryCard: {
    flex: 1, backgroundColor: Colors.cardBg, borderRadius: 14, padding: 14,
    alignItems: 'center', borderLeftWidth: 3,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  summaryNumber: { fontSize: 26, fontFamily: 'Nunito_800ExtraBold', color: Colors.text },
  summaryLabel: { fontSize: 11, fontFamily: 'Nunito_600SemiBold', color: Colors.textSecondary, marginTop: 2 },
  card: {
    backgroundColor: Colors.cardBg, borderRadius: 20, padding: 20, marginBottom: 14,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3,
  },
  cardTitle: { fontSize: 16, fontFamily: 'Nunito_700Bold', color: Colors.text, marginBottom: 16 },
  emptyChart: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  emptyChartText: { fontSize: 13, fontFamily: 'Nunito_400Regular', color: Colors.textTertiary },
});
