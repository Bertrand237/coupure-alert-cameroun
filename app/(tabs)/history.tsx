import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Platform, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useI18n } from '@/lib/i18n';
import { useOutages, OutageType } from '@/lib/outage-store';
import OutageCard from '@/components/OutageCard';
import FilterChip from '@/components/FilterChip';

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { outages, regions } = useOutages();
  const [filterType, setFilterType] = useState<OutageType | null>(null);
  const [filterRegion, setFilterRegion] = useState<string | null>(null);
  const [filterVille, setFilterVille] = useState<string | null>(null);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const villes = useMemo(() => {
    const villeSet = new Set<string>();
    outages.forEach(o => {
      if (o.ville && o.ville !== 'N/A') villeSet.add(o.ville);
    });
    return Array.from(villeSet).sort();
  }, [outages]);

  const filteredOutages = useMemo(() => {
    let result = [...outages];
    if (filterType) result = result.filter(o => o.type === filterType);
    if (filterRegion) result = result.filter(o => o.region === filterRegion);
    if (filterVille) result = result.filter(o => o.ville === filterVille);
    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return result;
  }, [outages, filterType, filterRegion, filterVille]);

  const activeCount = filteredOutages.filter(o => !o.estRetablie).length;
  const restoredCount = filteredOutages.filter(o => o.estRetablie).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitle}>{t.history}</Text>
        </View>
        <View style={styles.headerBadges}>
          <View style={[styles.badge, { backgroundColor: Colors.accent + '15' }]}>
            <Text style={[styles.badgeText, { color: Colors.accent }]}>{activeCount} {t.active.toLowerCase()}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: Colors.successLight }]}>
            <Text style={[styles.badgeText, { color: Colors.success }]}>{restoredCount} {t.restored.toLowerCase()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.filtersSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <FilterChip label={t.allTypes} selected={!filterType} onPress={() => setFilterType(null)} color={Colors.primary} />
          <FilterChip label={t.water} selected={filterType === 'water'} onPress={() => setFilterType(filterType === 'water' ? null : 'water')} color={Colors.water} />
          <FilterChip label={t.electricity} selected={filterType === 'electricity'} onPress={() => setFilterType(filterType === 'electricity' ? null : 'electricity')} color={Colors.electricityDark} />
          <FilterChip label={t.internet} selected={filterType === 'internet'} onPress={() => setFilterType(filterType === 'internet' ? null : 'internet')} color={Colors.internet} />
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <FilterChip label={t.allRegions} selected={!filterRegion} onPress={() => setFilterRegion(null)} color={Colors.primary} />
          {regions.map(r => (
            <FilterChip key={r} label={r} selected={filterRegion === r} onPress={() => setFilterRegion(filterRegion === r ? null : r)} />
          ))}
        </ScrollView>
        {villes.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            <FilterChip label={t.allVilles || 'Toutes les villes'} selected={!filterVille} onPress={() => setFilterVille(null)} color={Colors.primary} />
            {villes.map(v => (
              <FilterChip key={v} label={v} selected={filterVille === v} onPress={() => setFilterVille(filterVille === v ? null : v)} />
            ))}
          </ScrollView>
        )}
      </View>

      <FlatList
        data={filteredOutages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: 100 + (Platform.OS === 'web' ? 34 : 0) }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={filteredOutages.length > 0}
        renderItem={({ item, index }) => (
          <OutageCard
            type={item.type}
            quartier={item.quartier}
            ville={item.ville}
            region={item.region}
            date={item.date}
            confirmations={item.confirmations}
            hasPhoto={!!item.photoUri}
            estRetablie={item.estRetablie}
            index={index}
            onPress={() => router.push({ pathname: '/detail', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyCircle}>
              <Ionicons name="document-text-outline" size={36} color={Colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>{t.noOutages}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4,
  },
  headerTitle: { fontSize: 26, fontFamily: 'Nunito_800ExtraBold', color: Colors.text },
  headerBadges: { flexDirection: 'row', gap: 6 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 11, fontFamily: 'Nunito_700Bold' },
  filtersSection: { paddingHorizontal: 12, marginBottom: 6, gap: 4, marginTop: 6 },
  filterRow: { paddingHorizontal: 4, paddingVertical: 2 },
  listContent: { paddingHorizontal: 16, paddingTop: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.borderLight,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 15, fontFamily: 'Nunito_600SemiBold', color: Colors.textSecondary },
});
