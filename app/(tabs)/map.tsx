import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useI18n } from '@/lib/i18n';
import { useOutages, OutageType, Outage } from '@/lib/outage-store';
import { useIncidents, IncidentType, Incident } from '@/lib/incident-store';
import { formatTimeAgo } from '@/components/OutageCard';
import FilterChip from '@/components/FilterChip';
import NativeMapComponent, { isNativeMapAvailable as nativeMapAvailable } from '@/components/NativeMapView';

const typeIcons: Record<OutageType, { icon: any; color: string }> = {
  water: { icon: 'water', color: Colors.water },
  electricity: { icon: 'flash', color: Colors.electricity },
  internet: { icon: 'wifi', color: Colors.internet },
};

const incidentTypeIcons: Record<IncidentType, { icon: string; color: string; iconSet: 'material' | 'ionicons' }> = {
  broken_pipe: { icon: 'pipe-leak', color: Colors.water, iconSet: 'material' },
  fallen_pole: { icon: 'transmission-tower-off', color: Colors.electricity, iconSet: 'material' },
  cable_on_ground: { icon: 'cable-data', color: Colors.internet, iconSet: 'material' },
  other: { icon: 'alert-circle-outline', color: Colors.accent, iconSet: 'ionicons' },
};

const incidentTypeTranslationKeys: Record<IncidentType, string> = {
  broken_pipe: 'brokenPipe',
  fallen_pole: 'fallenPole',
  cable_on_ground: 'cableOnGround',
  other: 'otherIncident',
};

type CategoryFilter = 'outages' | 'incidents' | 'all';

function MapOutageItem({ outage, t, onPress }: { outage: Outage; t: any; onPress: () => void }) {
  const config = typeIcons[outage.type];
  return (
    <Pressable
      style={({ pressed }) => [styles.mapItem, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
      onPress={onPress}
    >
      <View style={[styles.mapItemDot, { backgroundColor: config.color }]}>
        <Ionicons name={config.icon} size={16} color="#FFF" />
      </View>
      <View style={styles.mapItemContent}>
        <Text style={styles.mapItemTitle} numberOfLines={1}>{t[outage.type]} - {outage.quartier}</Text>
        <Text style={styles.mapItemSub}>{outage.ville}, {outage.region}</Text>
      </View>
      <View style={styles.mapItemRight}>
        <Text style={styles.mapItemTime}>{formatTimeAgo(outage.date, t)}</Text>
        <View style={styles.mapItemConfirm}>
          <Ionicons name="people-outline" size={11} color={Colors.accent} />
          <Text style={styles.mapItemConfirmText}>{outage.confirmations}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function MapIncidentItem({ incident, t, onPress }: { incident: Incident; t: any; onPress: () => void }) {
  const config = incidentTypeIcons[incident.incidentType];
  const translationKey = incidentTypeTranslationKeys[incident.incidentType];
  return (
    <Pressable
      style={({ pressed }) => [styles.mapItem, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
      onPress={onPress}
    >
      <View style={[styles.mapItemDot, { backgroundColor: config.color }]}>
        {config.iconSet === 'material' ? (
          <MaterialCommunityIcons name={config.icon as any} size={16} color="#FFF" />
        ) : (
          <Ionicons name={config.icon as any} size={16} color="#FFF" />
        )}
      </View>
      <View style={styles.mapItemContent}>
        <Text style={styles.mapItemTitle} numberOfLines={1}>{(t as any)[translationKey]} - {incident.quartier}</Text>
        <Text style={styles.mapItemSub}>{incident.ville}, {incident.region}</Text>
      </View>
      <View style={styles.mapItemRight}>
        <Text style={styles.mapItemTime}>{formatTimeAgo(incident.date, t)}</Text>
        <View style={styles.mapItemConfirm}>
          <Ionicons name="people-outline" size={11} color={Colors.accent} />
          <Text style={styles.mapItemConfirmText}>{incident.confirmations}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { outages, getNearbyOutages } = useOutages();
  const { incidents, getNearbyIncidents } = useIncidents();
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<OutageType | null>(null);
  const [category, setCategory] = useState<CategoryFilter>('all');
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setUserLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
              setLoading(false);
            },
            () => { setLoading(false); },
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
          );
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      }
    } catch { } finally {
      setLoading(false);
    }
  };

  const activeOutages = outages.filter(o => !o.estRetablie);
  const filteredOutages = filterType ? activeOutages.filter(o => o.type === filterType) : activeOutages;
  const nearbyOutages = userLocation
    ? getNearbyOutages(userLocation.latitude, userLocation.longitude, 50)
    : filteredOutages;

  const displayOutages = filterType
    ? filteredOutages
    : (userLocation ? nearbyOutages : filteredOutages);

  const activeIncidents = incidents.filter(i => !i.estResolue);
  const nearbyIncidents = userLocation
    ? getNearbyIncidents(userLocation.latitude, userLocation.longitude, 50)
    : activeIncidents;
  const displayIncidents = userLocation ? nearbyIncidents : activeIncidents;

  const waterCount = activeOutages.filter(o => o.type === 'water').length;
  const elecCount = activeOutages.filter(o => o.type === 'electricity').length;
  const netCount = activeOutages.filter(o => o.type === 'internet').length;

  const brokenPipeCount = activeIncidents.filter(i => i.incidentType === 'broken_pipe').length;
  const fallenPoleCount = activeIncidents.filter(i => i.incidentType === 'fallen_pole').length;
  const cableCount = activeIncidents.filter(i => i.incidentType === 'cable_on_ground').length;
  const otherCount = activeIncidents.filter(i => i.incidentType === 'other').length;

  const buildDisplayList = () => {
    if (category === 'outages') {
      return displayOutages.map(o => ({ kind: 'outage' as const, data: o, date: o.date }));
    }
    if (category === 'incidents') {
      return displayIncidents.map(i => ({ kind: 'incident' as const, data: i, date: i.date }));
    }
    const combined = [
      ...displayOutages.map(o => ({ kind: 'outage' as const, data: o, date: o.date })),
      ...displayIncidents.map(i => ({ kind: 'incident' as const, data: i, date: i.date })),
    ];
    combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return combined;
  };

  const displayList = buildDisplayList();

  if (nativeMapAvailable) {
    return (
      <NativeMapComponent
        outages={displayOutages}
        incidents={displayIncidents}
        category={category}
        setCategory={setCategory}
        filterType={filterType}
        setFilterType={setFilterType}
        userLocation={userLocation}
        waterCount={waterCount}
        elecCount={elecCount}
        netCount={netCount}
      />
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>{t.map}</Text>
      </View>

      <View style={styles.categoryRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <FilterChip label={t.allEvents} selected={category === 'all'} onPress={() => setCategory('all')} color={Colors.primary} />
          <FilterChip label={t.outages} selected={category === 'outages'} onPress={() => setCategory('outages')} color={Colors.accent} />
          <FilterChip label={t.incidents} selected={category === 'incidents'} onPress={() => setCategory('incidents')} color={Colors.electricityDark} />
        </ScrollView>
      </View>

      {(category === 'outages' || category === 'all') && (
        <View style={styles.mapStatsRow}>
          <MapStatChip icon="water" count={waterCount} color={Colors.water} />
          <MapStatChip icon="flash" count={elecCount} color={Colors.electricity} />
          <MapStatChip icon="wifi" count={netCount} color={Colors.internet} />
        </View>
      )}

      {(category === 'incidents' || category === 'all') && (
        <View style={styles.mapStatsRow}>
          <MapStatChipMaterial icon="pipe-leak" count={brokenPipeCount} color={Colors.water} />
          <MapStatChipMaterial icon="transmission-tower-off" count={fallenPoleCount} color={Colors.electricity} />
          <MapStatChipMaterial icon="cable-data" count={cableCount} color={Colors.internet} />
          <MapStatChipIonicons icon="alert-circle-outline" count={otherCount} color={Colors.accent} />
        </View>
      )}

      {(category === 'outages' || category === 'all') && (
        <View style={styles.filtersSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            <FilterChip label={t.allTypes} selected={!filterType} onPress={() => setFilterType(null)} color={Colors.primary} />
            <FilterChip label={t.water} selected={filterType === 'water'} onPress={() => setFilterType(filterType === 'water' ? null : 'water')} color={Colors.water} />
            <FilterChip label={t.electricity} selected={filterType === 'electricity'} onPress={() => setFilterType(filterType === 'electricity' ? null : 'electricity')} color={Colors.electricityDark} />
            <FilterChip label={t.internet} selected={filterType === 'internet'} onPress={() => setFilterType(filterType === 'internet' ? null : 'internet')} color={Colors.internet} />
          </ScrollView>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + (Platform.OS === 'web' ? 34 : 0) }]}
          showsVerticalScrollIndicator={false}
        >
          {userLocation && (
            <View style={styles.locationBanner}>
              <Ionicons name="navigate-circle" size={20} color={Colors.accent} />
              <Text style={styles.locationBannerText}>
                {userLocation.latitude.toFixed(3)}, {userLocation.longitude.toFixed(3)}
              </Text>
            </View>
          )}

          {displayList.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyCircle}>
                <Ionicons name="shield-checkmark-outline" size={40} color={Colors.success} />
              </View>
              <Text style={styles.emptyTitle}>{t.noOutages}</Text>
            </View>
          ) : (
            displayList.map((item, i) => (
              <Animated.View key={item.data.id} entering={FadeInDown.delay(i * 50).springify()}>
                {item.kind === 'outage' ? (
                  <MapOutageItem
                    outage={item.data as Outage}
                    t={t}
                    onPress={() => router.push({ pathname: '/detail', params: { id: item.data.id } })}
                  />
                ) : (
                  <MapIncidentItem
                    incident={item.data as Incident}
                    t={t}
                    onPress={() => router.push({ pathname: '/incident-detail', params: { id: item.data.id } })}
                  />
                )}
              </Animated.View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

function MapStatChip({ icon, count, color }: { icon: any; count: number; color: string }) {
  return (
    <View style={[styles.mapStatChip, { borderColor: color + '40' }]}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.mapStatCount, { color }]}>{count}</Text>
    </View>
  );
}

function MapStatChipMaterial({ icon, count, color }: { icon: any; count: number; color: string }) {
  return (
    <View style={[styles.mapStatChip, { borderColor: color + '40' }]}>
      <MaterialCommunityIcons name={icon} size={16} color={color} />
      <Text style={[styles.mapStatCount, { color }]}>{count}</Text>
    </View>
  );
}

function MapStatChipIonicons({ icon, count, color }: { icon: any; count: number; color: string }) {
  return (
    <View style={[styles.mapStatChip, { borderColor: color + '40' }]}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.mapStatCount, { color }]}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerBar: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  headerTitle: { fontSize: 26, fontFamily: 'Nunito_800ExtraBold', color: Colors.text },
  categoryRow: { paddingHorizontal: 12, marginBottom: 6 },
  mapStatsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 10, marginTop: 6 },
  mapStatChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14,
    backgroundColor: Colors.cardBg, borderWidth: 1.5,
  },
  mapStatCount: { fontSize: 16, fontFamily: 'Nunito_800ExtraBold' },
  filtersSection: { paddingHorizontal: 12, marginBottom: 6 },
  filterRow: { paddingHorizontal: 8, paddingVertical: 4 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },
  locationBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.cardBg, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: Colors.borderLight,
  },
  locationBannerText: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', color: Colors.textSecondary },
  emptyState: { alignItems: 'center', paddingVertical: 50, gap: 12 },
  emptyCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.successLight,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 16, fontFamily: 'Nunito_700Bold', color: Colors.textSecondary },
  mapItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.cardBg, padding: 14, borderRadius: 16,
    marginBottom: 10, borderWidth: 1, borderColor: Colors.borderLight,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  mapItemDot: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  mapItemContent: { flex: 1 },
  mapItemTitle: { fontSize: 14, fontFamily: 'Nunito_700Bold', color: Colors.text },
  mapItemSub: { fontSize: 12, fontFamily: 'Nunito_400Regular', color: Colors.textSecondary, marginTop: 1 },
  mapItemRight: { alignItems: 'flex-end', gap: 4 },
  mapItemTime: { fontSize: 11, fontFamily: 'Nunito_600SemiBold', color: Colors.textTertiary },
  mapItemConfirm: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(255,87,34,0.08)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8,
  },
  mapItemConfirmText: { fontSize: 11, fontFamily: 'Nunito_700Bold', color: Colors.accent },
});
