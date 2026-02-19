import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useI18n } from '@/lib/i18n';
import { useOutages } from '@/lib/outage-store';
import { useIncidents } from '@/lib/incident-store';
import { PieChart, BarChart } from '@/components/StatChart';

type Period = 'week' | 'month' | 'all';
type Category = 'outages' | 'incidents' | 'all';

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { outages, regions } = useOutages();
  const { incidents } = useIncidents();
  const [period, setPeriod] = useState<Period>('all');
  const [category, setCategory] = useState<Category>('all');
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const filteredOutages = useMemo(() => {
    if (period === 'all') return outages;
    const now = Date.now();
    const cutoff = period === 'week' ? now - 7 * 86400000 : now - 30 * 86400000;
    return outages.filter(o => new Date(o.date).getTime() > cutoff);
  }, [outages, period]);

  const filteredIncidents = useMemo(() => {
    if (period === 'all') return incidents;
    const now = Date.now();
    const cutoff = period === 'week' ? now - 7 * 86400000 : now - 30 * 86400000;
    return incidents.filter(i => new Date(i.date).getTime() > cutoff);
  }, [incidents, period]);

  const outagePieData = useMemo(() => {
    const counts = { water: 0, electricity: 0, internet: 0 };
    filteredOutages.forEach(o => counts[o.type]++);
    return [
      { label: t.water, value: counts.water, color: Colors.water },
      { label: t.electricity, value: counts.electricity, color: Colors.electricity },
      { label: t.internet, value: counts.internet, color: Colors.internet },
    ];
  }, [filteredOutages, t]);

  const incidentPieData = useMemo(() => {
    const counts = { broken_pipe: 0, fallen_pole: 0, cable_on_ground: 0, other: 0 };
    filteredIncidents.forEach(i => counts[i.incidentType]++);
    return [
      { label: t.brokenPipe, value: counts.broken_pipe, color: Colors.water },
      { label: t.fallenPole, value: counts.fallen_pole, color: Colors.electricity },
      { label: t.cableOnGround, value: counts.cable_on_ground, color: Colors.internet },
      { label: t.otherIncident, value: counts.other, color: Colors.accent },
    ];
  }, [filteredIncidents, t]);

  const combinedPieData = useMemo(() => {
    if (category === 'outages') return outagePieData;
    if (category === 'incidents') return incidentPieData;
    return [...outagePieData, ...incidentPieData];
  }, [category, outagePieData, incidentPieData]);

  const barData = useMemo(() => {
    const counts: Record<string, number> = {};
    regions.forEach(r => counts[r] = 0);

    if (category === 'outages' || category === 'all') {
      filteredOutages.forEach(o => { if (counts[o.region] !== undefined) counts[o.region]++; });
    }
    if (category === 'incidents' || category === 'all') {
      filteredIncidents.forEach(i => { if (counts[i.region] !== undefined) counts[i.region]++; });
    }

    return regions.map(r => ({ label: r, value: counts[r], color: Colors.accent })).filter(d => d.value > 0);
  }, [filteredOutages, filteredIncidents, regions, category]);

  const totalOutages = filteredOutages.length;
  const totalIncidents = filteredIncidents.length;

  const displayTotal = useMemo(() => {
    if (category === 'outages') return totalOutages;
    if (category === 'incidents') return totalIncidents;
    return totalOutages + totalIncidents;
  }, [category, totalOutages, totalIncidents]);

  const displayActive = useMemo(() => {
    let count = 0;
    if (category === 'outages' || category === 'all') {
      count += filteredOutages.filter(o => !o.estRetablie).length;
    }
    if (category === 'incidents' || category === 'all') {
      count += filteredIncidents.filter(i => !i.estResolue).length;
    }
    return count;
  }, [category, filteredOutages, filteredIncidents]);

  const displayRestored = useMemo(() => {
    let count = 0;
    if (category === 'outages' || category === 'all') {
      count += filteredOutages.filter(o => o.estRetablie).length;
    }
    if (category === 'incidents' || category === 'all') {
      count += filteredIncidents.filter(i => i.estResolue).length;
    }
    return count;
  }, [category, filteredOutages, filteredIncidents]);

  const pieChartTitle = useMemo(() => {
    if (category === 'incidents') return t.incidents + ' - ' + t.outagesByType;
    return t.outagesByType;
  }, [category, t]);

  const hasData = displayTotal > 0;

  const categoryButtons: { key: Category; label: string }[] = [
    { key: 'outages', label: t.outages },
    { key: 'incidents', label: t.incidents },
    { key: 'all', label: t.allEvents },
  ];

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
        <Animated.View entering={FadeInDown.delay(80)} style={styles.categoryRow}>
          {categoryButtons.map(c => (
            <Pressable
              key={c.key}
              style={[styles.categoryBtn, category === c.key && styles.categoryActive]}
              onPress={() => { Haptics.selectionAsync(); setCategory(c.key); }}
            >
              <Text style={[styles.categoryText, category === c.key && styles.categoryTextActive]}>{c.label}</Text>
            </Pressable>
          ))}
        </Animated.View>

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
            <Text style={styles.summaryNumber}>{displayTotal}</Text>
            <Text style={styles.summaryLabel}>{t.total}</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: Colors.internet }]}>
            <Text style={styles.summaryNumber}>{displayActive}</Text>
            <Text style={styles.summaryLabel}>{t.active}</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: Colors.success }]}>
            <Text style={styles.summaryNumber}>{displayRestored}</Text>
            <Text style={styles.summaryLabel}>{category === 'incidents' ? t.resolved : t.restored}</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: Colors.electricity }]}>
            <Text style={styles.summaryNumber}>{totalIncidents}</Text>
            <Text style={styles.summaryLabel}>{t.incidents}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)} style={styles.card}>
          <Text style={styles.cardTitle}>{pieChartTitle}</Text>
          {!hasData ? (
            <View style={styles.emptyChart}>
              <Ionicons name="pie-chart-outline" size={40} color={Colors.textTertiary} />
              <Text style={styles.emptyChartText}>{t.noOutages}</Text>
            </View>
          ) : (
            <PieChart data={combinedPieData} size={200} />
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

        <Animated.View entering={FadeInDown.delay(400)}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/pdf-report'); }}
            style={({ pressed }) => [styles.pdfBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
          >
            <LinearGradient
              colors={[Colors.primary, '#2C3E50']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.pdfGradient}
            >
              <Ionicons name="document-text" size={22} color="#FFF" />
              <Text style={styles.pdfBtnText}>{t.generateReport}</Text>
            </LinearGradient>
          </Pressable>
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
  categoryRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  categoryBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 14, backgroundColor: Colors.cardBg,
    alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border,
  },
  categoryActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  categoryText: { fontSize: 13, fontFamily: 'Nunito_700Bold', color: Colors.textSecondary },
  categoryTextActive: { color: '#FFF' },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  periodBtn: {
    flex: 1, paddingVertical: 11, borderRadius: 14, backgroundColor: Colors.cardBg,
    alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border,
  },
  periodActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  periodText: { fontSize: 14, fontFamily: 'Nunito_700Bold', color: Colors.textSecondary },
  periodTextActive: { color: '#FFF' },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  summaryCard: {
    flexBasis: '22%' as any, flexGrow: 1, backgroundColor: Colors.cardBg, borderRadius: 14, padding: 12,
    alignItems: 'center', borderLeftWidth: 3, minWidth: 70,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  summaryNumber: { fontSize: 24, fontFamily: 'Nunito_800ExtraBold', color: Colors.text },
  summaryLabel: { fontSize: 10, fontFamily: 'Nunito_600SemiBold', color: Colors.textSecondary, marginTop: 2, textAlign: 'center' },
  card: {
    backgroundColor: Colors.cardBg, borderRadius: 20, padding: 20, marginBottom: 14,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3,
  },
  cardTitle: { fontSize: 16, fontFamily: 'Nunito_700Bold', color: Colors.text, marginBottom: 16 },
  emptyChart: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  emptyChartText: { fontSize: 13, fontFamily: 'Nunito_400Regular', color: Colors.textTertiary },
  pdfBtn: { borderRadius: 18, overflow: 'hidden', marginBottom: 14 },
  pdfGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  pdfBtnText: { fontSize: 16, fontFamily: 'Nunito_700Bold', color: '#FFF' },
});
