import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, Callout } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useI18n } from '@/lib/i18n';
import { Outage, OutageType } from '@/lib/outage-store';
import { Incident, IncidentType } from '@/lib/incident-store';
import { formatTimeAgo } from '@/components/OutageCard';
import FilterChip from '@/components/FilterChip';

type CategoryFilter = 'outages' | 'incidents' | 'all';

interface Props {
  outages: Outage[];
  incidents: Incident[];
  category: CategoryFilter;
  setCategory: (c: CategoryFilter) => void;
  filterType: OutageType | null;
  setFilterType: (t: OutageType | null) => void;
  userLocation: { latitude: number; longitude: number } | null;
  waterCount: number;
  elecCount: number;
  netCount: number;
}

const typeColors: Record<OutageType, string> = {
  water: Colors.water,
  electricity: Colors.electricity,
  internet: Colors.internet,
};

const incidentTypeColors: Record<IncidentType, string> = {
  broken_pipe: Colors.water,
  fallen_pole: Colors.electricity,
  cable_on_ground: Colors.internet,
  other: Colors.accent,
};

const incidentTypeTranslationKeys: Record<IncidentType, string> = {
  broken_pipe: 'brokenPipe',
  fallen_pole: 'fallenPole',
  cable_on_ground: 'cableOnGround',
  other: 'otherIncident',
};

export const isNativeMapAvailable = true;

export default function NativeMapScreen({ outages, incidents, category, setCategory, filterType, setFilterType, userLocation, waterCount, elecCount, netCount }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const mapRef = useRef<MapView>(null);

  const defaultRegion = {
    latitude: userLocation?.latitude || 5.9536,
    longitude: userLocation?.longitude || 10.1464,
    latitudeDelta: userLocation ? 0.15 : 6,
    longitudeDelta: userLocation ? 0.15 : 6,
  };

  const showOutages = category === 'outages' || category === 'all';
  const showIncidents = category === 'incidents' || category === 'all';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={defaultRegion}
        showsUserLocation={true}
        showsMyLocationButton={false}
      >
        {showOutages && outages.map(o => (
          <Marker
            key={`outage-${o.id}`}
            coordinate={{ latitude: o.latitude, longitude: o.longitude }}
            pinColor={typeColors[o.type]}
          >
            <Callout onPress={() => router.push({ pathname: '/detail', params: { id: o.id } })}>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{t[o.type]}</Text>
                <Text style={styles.calloutText}>{o.quartier}, {o.ville}</Text>
                <Text style={styles.calloutText}>{formatTimeAgo(o.date, t)}</Text>
                <Text style={styles.calloutText}>{o.confirmations} {t.confirmations}</Text>
              </View>
            </Callout>
          </Marker>
        ))}
        {showIncidents && incidents.map(inc => (
          <Marker
            key={`incident-${inc.id}`}
            coordinate={{ latitude: inc.latitude, longitude: inc.longitude }}
            pinColor={incidentTypeColors[inc.incidentType]}
          >
            <Callout onPress={() => router.push({ pathname: '/incident-detail', params: { id: inc.id } })}>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{(t as any)[incidentTypeTranslationKeys[inc.incidentType]]}</Text>
                <Text style={styles.calloutText}>{inc.quartier}, {inc.ville}</Text>
                <Text style={styles.calloutText}>{formatTimeAgo(inc.date, t)}</Text>
                <Text style={styles.calloutText}>{inc.confirmations} {t.confirmations}</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      <View style={[styles.overlay, { top: insets.top + 10 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <FilterChip label={t.allEvents} selected={category === 'all'} onPress={() => setCategory('all')} color={Colors.primary} />
          <FilterChip label={t.outages} selected={category === 'outages'} onPress={() => setCategory('outages')} color={Colors.accent} />
          <FilterChip label={t.incidents} selected={category === 'incidents'} onPress={() => setCategory('incidents')} color={Colors.electricityDark} />
        </ScrollView>
        {(category === 'outages' || category === 'all') && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            <FilterChip label={t.allTypes} selected={!filterType} onPress={() => setFilterType(null)} color={Colors.primary} />
            <FilterChip label={`${t.water} (${waterCount})`} selected={filterType === 'water'} onPress={() => setFilterType(filterType === 'water' ? null : 'water')} color={Colors.water} />
            <FilterChip label={`${t.electricity} (${elecCount})`} selected={filterType === 'electricity'} onPress={() => setFilterType(filterType === 'electricity' ? null : 'electricity')} color={Colors.electricityDark} />
            <FilterChip label={`${t.internet} (${netCount})`} selected={filterType === 'internet'} onPress={() => setFilterType(filterType === 'internet' ? null : 'internet')} color={Colors.internet} />
          </ScrollView>
        )}
      </View>

      {userLocation && (
        <Pressable
          style={[styles.locateBtn, { bottom: 100 + insets.bottom }]}
          onPress={() => {
            mapRef.current?.animateToRegion({ ...userLocation, latitudeDelta: 0.08, longitudeDelta: 0.08 }, 500);
          }}
        >
          <Ionicons name="locate" size={22} color={Colors.primary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  map: { flex: 1 },
  overlay: { position: 'absolute', left: 0, right: 0 },
  filterRow: { paddingHorizontal: 12, paddingVertical: 4 },
  callout: { padding: 10, minWidth: 160 },
  calloutTitle: { fontSize: 14, fontWeight: '700' as const, marginBottom: 4 },
  calloutText: { fontSize: 12, color: Colors.textSecondary, marginBottom: 2 },
  locateBtn: {
    position: 'absolute', right: 16,
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6,
  },
});
