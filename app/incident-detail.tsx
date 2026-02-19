import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Share, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useI18n } from '@/lib/i18n';
import { useIncidents, IncidentType } from '@/lib/incident-store';
import { formatTimeAgo } from '@/components/OutageCard';

const incidentTypeConfig: Record<IncidentType, {
  icon: string;
  iconSet: 'material' | 'ionicons';
  color: string;
  gradientColors: [string, string];
  labelKey: 'brokenPipe' | 'fallenPole' | 'cableOnGround' | 'otherIncident';
}> = {
  broken_pipe: {
    icon: 'pipe-leak',
    iconSet: 'material',
    color: Colors.water,
    gradientColors: [Colors.water, Colors.waterDark],
    labelKey: 'brokenPipe',
  },
  fallen_pole: {
    icon: 'transmission-tower-off',
    iconSet: 'material',
    color: Colors.electricity,
    gradientColors: [Colors.electricity, Colors.electricityDark],
    labelKey: 'fallenPole',
  },
  cable_on_ground: {
    icon: 'cable-data',
    iconSet: 'material',
    color: Colors.internet,
    gradientColors: [Colors.internet, Colors.internetDark],
    labelKey: 'cableOnGround',
  },
  other: {
    icon: 'alert-circle-outline',
    iconSet: 'ionicons',
    color: Colors.accent,
    gradientColors: [Colors.accent, Colors.accentDark],
    labelKey: 'otherIncident',
  },
};

export default function IncidentDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const { incidents, confirmIncident, canConfirmIncident, markResolved } = useIncidents();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const incident = useMemo(() => incidents.find(i => i.id === id), [incidents, id]);

  if (!incident) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top + webTopInset }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtnAbs}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.notFoundText}>Not found</Text>
      </View>
    );
  }

  const config = incidentTypeConfig[incident.incidentType];
  const confirmable = canConfirmIncident(incident.id);

  const handleConfirm = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await confirmIncident(incident.id);
    if (!result) Alert.alert(t.alreadyConfirmed);
  };

  const handleShare = async () => {
    Haptics.selectionAsync();
    try {
      await Share.share({
        message: `${t.shareText}: ${t[config.labelKey]} - ${incident.quartier}, ${incident.ville} (${incident.region}) - ${new Date(incident.date).toLocaleString()}`,
      });
    } catch {}
  };

  const handleMarkResolved = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await markResolved(incident.id);
  };

  const renderHeroIcon = () => {
    if (config.iconSet === 'material') {
      return <MaterialCommunityIcons name={config.icon as any} size={32} color={config.color} />;
    }
    return <Ionicons name={config.icon as any} size={32} color={config.color} />;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </Pressable>
        <Pressable onPress={handleShare} style={styles.shareBtn}>
          <Ionicons name="share-outline" size={22} color={Colors.text} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <LinearGradient
            colors={config.gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.typeHero}
          >
            <View style={styles.heroIconCircle}>
              {renderHeroIcon()}
            </View>
            <Text style={styles.heroTitle}>{t[config.labelKey]}</Text>
            {incident.estResolue && (
              <View style={styles.heroResolvedPill}>
                <Ionicons name="checkmark-circle" size={14} color="#FFF" />
                <Text style={styles.heroResolvedText}>{t.resolved}</Text>
              </View>
            )}
            <View style={styles.heroConfirmRow}>
              <Ionicons name="people" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.heroConfirmText}>{incident.confirmations} {t.confirmations}</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.infoCard}>
          <InfoRow icon="location" label={t.neighborhood} value={incident.quartier} />
          <View style={styles.divider} />
          <InfoRow icon="business" label={t.city} value={incident.ville} />
          <View style={styles.divider} />
          <InfoRow icon="globe" label={t.region} value={incident.region} />
          <View style={styles.divider} />
          <InfoRow icon="time" label={t.date} value={new Date(incident.date).toLocaleString()} sub={formatTimeAgo(incident.date, t)} />
          <View style={styles.divider} />
          <InfoRow icon="navigate" label="GPS" value={`${incident.latitude.toFixed(4)}, ${incident.longitude.toFixed(4)}`} />
          {incident.commentaire ? (
            <>
              <View style={styles.divider} />
              <InfoRow icon="chatbubble" label={t.comment} value={incident.commentaire} />
            </>
          ) : null}
        </Animated.View>

        {incident.photoUri && (
          <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.photoCard}>
            <Image source={{ uri: incident.photoUri }} style={styles.photo} contentFit="cover" />
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(350).springify()} style={styles.actionsSection}>
          {!incident.estResolue && confirmable && (
            <Pressable
              style={({ pressed }) => [styles.confirmBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
              onPress={handleConfirm}
            >
              <LinearGradient
                colors={[Colors.accent, Colors.accentLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.confirmGradient}
              >
                <Ionicons name="checkmark-circle" size={22} color="#FFF" />
                <Text style={styles.confirmBtnText}>{t.confirmIncident}</Text>
              </LinearGradient>
            </Pressable>
          )}

          {!incident.estResolue && !confirmable && (
            <View style={styles.confirmedBanner}>
              <Ionicons name="checkmark-done" size={20} color={Colors.success} />
              <Text style={styles.confirmedText}>{t.confirmed}</Text>
            </View>
          )}

          {!incident.estResolue && (
            <Pressable
              style={({ pressed }) => [styles.resolveBtn, pressed && { opacity: 0.85 }]}
              onPress={handleMarkResolved}
            >
              <Ionicons name="construct" size={20} color={Colors.success} />
              <Text style={styles.resolveBtnText}>{t.markResolved}</Text>
            </Pressable>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconBg}>
        <Ionicons name={icon} size={18} color={Colors.accent} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
        {sub && <Text style={styles.infoSub}>{sub}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  notFoundText: { fontSize: 16, fontFamily: 'Nunito_600SemiBold', color: Colors.textSecondary },
  backBtnAbs: { position: 'absolute', top: 60, left: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  closeBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.borderLight,
    alignItems: 'center', justifyContent: 'center',
  },
  shareBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.borderLight,
    alignItems: 'center', justifyContent: 'center',
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 18 },
  typeHero: {
    borderRadius: 24, padding: 24, alignItems: 'center', gap: 10, marginBottom: 16,
    shadowColor: Colors.shadowDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  heroIconCircle: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { fontSize: 24, fontFamily: 'Nunito_800ExtraBold', color: '#FFF' },
  heroResolvedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12,
  },
  heroResolvedText: { fontSize: 12, fontFamily: 'Nunito_700Bold', color: '#FFF' },
  heroConfirmRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroConfirmText: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', color: 'rgba(255,255,255,0.8)' },
  infoCard: {
    backgroundColor: Colors.cardBg, borderRadius: 20, padding: 16, marginBottom: 16,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10 },
  infoIconBg: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.accent + '12',
    alignItems: 'center', justifyContent: 'center',
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, fontFamily: 'Nunito_600SemiBold', color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 15, fontFamily: 'Nunito_700Bold', color: Colors.text, marginTop: 2 },
  infoSub: { fontSize: 12, fontFamily: 'Nunito_400Regular', color: Colors.textSecondary, marginTop: 1 },
  divider: { height: 1, backgroundColor: Colors.borderLight },
  photoCard: { borderRadius: 20, overflow: 'hidden', marginBottom: 16 },
  photo: { width: '100%', height: 250, borderRadius: 20 },
  actionsSection: { gap: 12 },
  confirmBtn: { borderRadius: 18, overflow: 'hidden' },
  confirmGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16,
  },
  confirmBtnText: { fontSize: 16, fontFamily: 'Nunito_700Bold', color: '#FFF' },
  confirmedBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.successLight, paddingVertical: 14, borderRadius: 18,
  },
  confirmedText: { fontSize: 15, fontFamily: 'Nunito_700Bold', color: Colors.success },
  resolveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.cardBg, paddingVertical: 14, borderRadius: 18,
    borderWidth: 1.5, borderColor: Colors.success,
  },
  resolveBtnText: { fontSize: 15, fontFamily: 'Nunito_700Bold', color: Colors.success },
});
