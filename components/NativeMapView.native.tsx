import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Callout } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useI18n } from '@/lib/i18n';
import { Outage, OutageType } from '@/lib/outage-store';
import { formatTimeAgo } from '@/components/OutageCard';
import FilterChip from '@/components/FilterChip';

interface Props {
  outages: Outage[];
  filterType: OutageType | null;
  setFilterType: (t: OutageType | null) => void;
  userLocation: { latitude: number; longitude: number } | null;
  waterCount: number;
  elecCount: number;
  netCount: number;
}

const typeIcons: Record<OutageType, { color: string }> = {
  water: { color: Colors.water },
  electricity: { color: Colors.electricity },
  internet: { color: Colors.internet },
};

export const isNativeMapAvailable = true;

export default function NativeMapScreen({ outages, filterType, setFilterType, userLocation, waterCount, elecCount, netCount }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const mapRef = useRef<MapView>(null);

  const defaultRegion = {
    latitude: userLocation?.latitude || 5.9536,
    longitude: userLocation?.longitude || 10.1464,
    latitudeDelta: userLocation ? 0.15 : 6,
    longitudeDelta: userLocation ? 0.15 : 6,
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={defaultRegion}
        showsUserLocation={true}
        showsMyLocationButton={false}
      >
        {outages.map(o => (
          <Marker
            key={o.id}
            coordinate={{ latitude: o.latitude, longitude: o.longitude }}
            pinColor={typeIcons[o.type].color}
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
      </MapView>

      <View style={[styles.overlay, { top: insets.top + 10 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <FilterChip label={t.allTypes} selected={!filterType} onPress={() => setFilterType(null)} color={Colors.primary} />
          <FilterChip label={`${t.water} (${waterCount})`} selected={filterType === 'water'} onPress={() => setFilterType(filterType === 'water' ? null : 'water')} color={Colors.water} />
          <FilterChip label={`${t.electricity} (${elecCount})`} selected={filterType === 'electricity'} onPress={() => setFilterType(filterType === 'electricity' ? null : 'electricity')} color={Colors.electricityDark} />
          <FilterChip label={`${t.internet} (${netCount})`} selected={filterType === 'internet'} onPress={() => setFilterType(filterType === 'internet' ? null : 'internet')} color={Colors.internet} />
        </ScrollView>
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
