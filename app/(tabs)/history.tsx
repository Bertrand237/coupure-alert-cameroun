import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Platform, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useI18n } from '@/lib/i18n';
import { useOutages, OutageType } from '@/lib/outage-store';
import { useIncidents, IncidentType, Incident } from '@/lib/incident-store';
import OutageCard from '@/components/OutageCard';
import { formatTimeAgo } from '@/components/OutageCard';
import FilterChip from '@/components/FilterChip';

type CategoryFilter = 'all' | 'outages' | 'incidents';

type FeedItem = {
  kind: 'outage' | 'incident';
  id: string;
  type: string;
  quartier: string;
  ville: string;
  region: string;
  date: string;
  confirmations: number;
  hasPhoto: boolean;
  isResolved: boolean;
};

const incidentTypeConfig: Record<IncidentType, { icon: string; iconSet: 'material' | 'ionicons'; color: string; bgColor: string }> = {
  broken_pipe: { icon: 'pipe-leak', iconSet: 'material', color: '#0097A7', bgColor: 'rgba(0, 151, 167, 0.15)' },
  fallen_pole: { icon: 'transmission-tower-off', iconSet: 'material', color: '#FF8F00', bgColor: 'rgba(255, 143, 0, 0.15)' },
  cable_on_ground: { icon: 'cable-data', iconSet: 'material', color: '#C62828', bgColor: 'rgba(198, 40, 40, 0.15)' },
  other: { icon: 'alert-circle-outline', iconSet: 'ionicons', color: '#5A6B7D', bgColor: 'rgba(90, 107, 125, 0.15)' },
};

function IncidentCard({ type, quartier, ville, region, date, confirmations, hasPhoto, isResolved, onPress }: {
  type: IncidentType;
  quartier: string;
  ville: string;
  region: string;
  date: string;
  confirmations: number;
  hasPhoto: boolean;
  isResolved: boolean;
  onPress?: () => void;
}) {
  const { t } = useI18n();
  const config = incidentTypeConfig[type] || incidentTypeConfig.other;

  const incidentLabel: Record<IncidentType, string> = {
    broken_pipe: t.brokenPipe,
    fallen_pole: t.fallenPole,
    cable_on_ground: t.cableOnGround,
    other: t.otherIncident,
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={[styles.accentBar, { backgroundColor: config.color }]} />
      <View style={styles.cardContent}>
        <View style={styles.topSection}>
          <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
            {config.iconSet === 'material' ? (
              <MaterialCommunityIcons name={config.icon as any} size={20} color={config.color} />
            ) : (
              <Ionicons name={config.icon as any} size={20} color={config.color} />
            )}
          </View>
          <View style={styles.headerInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.typeLabel}>{incidentLabel[type]}</Text>
              {isResolved && (
                <View style={styles.restoredPill}>
                  <Ionicons name="checkmark-circle" size={11} color={Colors.success} />
                  <Text style={styles.restoredText}>{t.resolved}</Text>
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

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { outages, regions } = useOutages();
  const { incidents } = useIncidents();
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterRegion, setFilterRegion] = useState<string | null>(null);
  const [filterVille, setFilterVille] = useState<string | null>(null);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const villes = useMemo(() => {
    const villeSet = new Set<string>();
    outages.forEach(o => {
      if (o.ville && o.ville !== 'N/A') villeSet.add(o.ville);
    });
    incidents.forEach(o => {
      if (o.ville && o.ville !== 'N/A') villeSet.add(o.ville);
    });
    return Array.from(villeSet).sort();
  }, [outages, incidents]);

  const feedItems = useMemo((): FeedItem[] => {
    const outageItems: FeedItem[] = (category === 'all' || category === 'outages')
      ? outages.map(o => ({
          kind: 'outage' as const,
          id: o.id,
          type: o.type,
          quartier: o.quartier,
          ville: o.ville,
          region: o.region,
          date: o.date,
          confirmations: o.confirmations,
          hasPhoto: !!o.photoUri,
          isResolved: o.estRetablie,
        }))
      : [];

    const incidentItems: FeedItem[] = (category === 'all' || category === 'incidents')
      ? incidents.map(i => ({
          kind: 'incident' as const,
          id: i.id,
          type: i.incidentType,
          quartier: i.quartier,
          ville: i.ville,
          region: i.region,
          date: i.date,
          confirmations: i.confirmations,
          hasPhoto: !!i.photoUri,
          isResolved: i.estResolue,
        }))
      : [];

    let result = [...outageItems, ...incidentItems];

    if (filterType) result = result.filter(o => o.type === filterType);
    if (filterRegion) result = result.filter(o => o.region === filterRegion);
    if (filterVille) result = result.filter(o => o.ville === filterVille);

    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return result;
  }, [outages, incidents, category, filterType, filterRegion, filterVille]);

  const activeCount = feedItems.filter(o => !o.isResolved).length;
  const restoredCount = feedItems.filter(o => o.isResolved).length;

  const outageTypes: { key: OutageType; label: string; color: string }[] = [
    { key: 'water', label: t.water, color: Colors.water },
    { key: 'electricity', label: t.electricity, color: Colors.electricityDark },
    { key: 'internet', label: t.internet, color: Colors.internet },
  ];

  const incidentTypes: { key: IncidentType; label: string; color: string }[] = [
    { key: 'broken_pipe', label: t.brokenPipe, color: '#0097A7' },
    { key: 'fallen_pole', label: t.fallenPole, color: '#FF8F00' },
    { key: 'cable_on_ground', label: t.cableOnGround, color: '#C62828' },
    { key: 'other', label: t.otherIncident, color: '#5A6B7D' },
  ];

  const visibleTypeFilters = useMemo(() => {
    const types: { key: string; label: string; color: string }[] = [];
    if (category === 'all' || category === 'outages') {
      types.push(...outageTypes);
    }
    if (category === 'all' || category === 'incidents') {
      types.push(...incidentTypes);
    }
    return types;
  }, [category, t]);

  const handleCategoryChange = (newCategory: CategoryFilter) => {
    setCategory(newCategory);
    setFilterType(null);
  };

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
          <FilterChip label={t.allEvents} selected={category === 'all'} onPress={() => handleCategoryChange('all')} color={Colors.primary} />
          <FilterChip label={t.outages} selected={category === 'outages'} onPress={() => handleCategoryChange('outages')} color={Colors.accent} />
          <FilterChip label={t.incidents} selected={category === 'incidents'} onPress={() => handleCategoryChange('incidents')} color="#0097A7" />
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <FilterChip label={t.allTypes} selected={!filterType} onPress={() => setFilterType(null)} color={Colors.primary} />
          {visibleTypeFilters.map(tf => (
            <FilterChip
              key={tf.key}
              label={tf.label}
              selected={filterType === tf.key}
              onPress={() => setFilterType(filterType === tf.key ? null : tf.key)}
              color={tf.color}
            />
          ))}
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
        data={feedItems}
        keyExtractor={(item) => `${item.kind}-${item.id}`}
        contentContainerStyle={[styles.listContent, { paddingBottom: 100 + (Platform.OS === 'web' ? 34 : 0) }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={feedItems.length > 0}
        renderItem={({ item, index }) => {
          if (item.kind === 'incident') {
            return (
              <IncidentCard
                type={item.type as IncidentType}
                quartier={item.quartier}
                ville={item.ville}
                region={item.region}
                date={item.date}
                confirmations={item.confirmations}
                hasPhoto={item.hasPhoto}
                isResolved={item.isResolved}
                onPress={() => router.push({ pathname: '/incident-detail', params: { id: item.id } })}
              />
            );
          }
          return (
            <OutageCard
              type={item.type as OutageType}
              quartier={item.quartier}
              ville={item.ville}
              region={item.region}
              date={item.date}
              confirmations={item.confirmations}
              hasPhoto={item.hasPhoto}
              estRetablie={item.isResolved}
              index={index}
              onPress={() => router.push({ pathname: '/detail', params: { id: item.id } })}
            />
          );
        }}
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
