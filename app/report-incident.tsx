import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Alert, ActivityIndicator, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn, ZoomIn } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useI18n } from '@/lib/i18n';
import { useIncidents, IncidentType } from '@/lib/incident-store';
import { router } from 'expo-router';

function normalizeRegion(raw: string): string {
  const normalized = raw
    .replace(/^R[ée]gion\s+(de\s+l[''']?|du\s+|de\s+)/i, '')
    .trim();
  const regionMap: Record<string, string> = {
    'adamaoua': 'Adamaoua',
    'centre': 'Centre',
    'est': 'Est',
    'extrême-nord': 'Extrême-Nord',
    'extreme-nord': 'Extrême-Nord',
    'extreme nord': 'Extrême-Nord',
    'littoral': 'Littoral',
    'nord': 'Nord',
    'nord-ouest': 'Nord-Ouest',
    'northwest': 'Nord-Ouest',
    'ouest': 'Ouest',
    'west': 'Ouest',
    'sud': 'Sud',
    'sud-ouest': 'Sud-Ouest',
    'southwest': 'Sud-Ouest',
  };
  const key = normalized.toLowerCase();
  return regionMap[key] || normalized;
}

const incidentTypeConfig: Record<string, { icon: string; iconSet: 'material' | 'ionicons'; color: string; darkColor: string; bgColor: string }> = {
  broken_pipe: { icon: 'pipe-leak', iconSet: 'material', color: Colors.water, darkColor: Colors.waterDark, bgColor: Colors.waterGlow },
  fallen_pole: { icon: 'transmission-tower-off', iconSet: 'material', color: Colors.electricity, darkColor: Colors.electricityDark, bgColor: Colors.electricityGlow },
  cable_on_ground: { icon: 'cable-data', iconSet: 'material', color: Colors.internet, darkColor: Colors.internetDark, bgColor: Colors.internetGlow },
  other: { icon: 'alert-circle-outline', iconSet: 'ionicons', color: Colors.accent, darkColor: Colors.accentDark, bgColor: 'rgba(255, 87, 34, 0.15)' },
};

export default function ReportIncidentScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { addIncident } = useIncidents();

  const [selectedType, setSelectedType] = useState<IncidentType | null>(null);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'granted' | 'denied' | 'error'>('loading');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [quartier, setQuartier] = useState('');
  const [ville, setVille] = useState('');
  const [region, setRegion] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [commentaire, setCommentaire] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  useEffect(() => {
    requestLocation();
  }, []);

  const requestLocation = async () => {
    try {
      setLocationStatus('loading');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('denied');
        return;
      }
      setLocationStatus('granted');

      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
            setVille('Cameroun');
            setRegion('Centre');
          },
          () => {
            setVille('Cameroun');
            setRegion('Centre');
            setLocationStatus('granted');
          },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
        );
      } else {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        try {
          const geocode = await Location.reverseGeocodeAsync({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
          if (geocode.length > 0) {
            const place = geocode[0];
            setQuartier(place.street || place.name || '');
            setVille(place.city || place.subregion || '');
            setRegion(normalizeRegion(place.region || ''));
          }
        } catch {
          setVille('Cameroun');
          setRegion('Centre');
        }
      }
    } catch {
      setLocationStatus('error');
    }
  };

  const pickImage = async (useCamera: boolean) => {
    try {
      if (useCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return;
        const result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true });
        if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
      } else {
        const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true });
        if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
      }
    } catch { }
  };

  const handleSubmit = async () => {
    if (!selectedType || !coords) return;
    setSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await addIncident({
        incidentType: selectedType,
        latitude: coords.latitude,
        longitude: coords.longitude,
        quartier: quartier || 'N/A',
        ville: ville || 'N/A',
        region: region || 'N/A',
        date: new Date().toISOString(),
        photoUri,
        commentaire,
      });
      setSubmitted(true);
      setTimeout(() => {
        router.back();
      }, 2000);
    } catch (e) {
      Alert.alert('Error', String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectType = (type: IncidentType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedType(type);
  };

  const renderIncidentIcon = (type: string, selected: boolean) => {
    const config = incidentTypeConfig[type];
    const iconColor = selected ? '#FFF' : config.color;
    const iconSize = 26;
    if (config.iconSet === 'material') {
      return <MaterialCommunityIcons name={config.icon as any} size={iconSize} color={iconColor} />;
    }
    return <Ionicons name={config.icon as any} size={iconSize} color={iconColor} />;
  };

  const incidentTypes: { type: IncidentType; label: string }[] = [
    { type: 'broken_pipe', label: t.brokenPipe },
    { type: 'fallen_pole', label: t.fallenPole },
    { type: 'cable_on_ground', label: t.cableOnGround },
    { type: 'other', label: t.otherIncident },
  ];

  if (submitted) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top + webTopInset }]}>
        <Animated.View entering={ZoomIn.springify()} style={styles.successContainer}>
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={52} color="#FFF" />
          </View>
          <Text style={styles.successTitle}>{t.success}</Text>
          <Text style={styles.successSubtitle}>{t.incidentSaved}</Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.headerBar}>
        <Pressable style={styles.closeButton} onPress={() => router.back()}>
          <Ionicons name="close" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{t.reportIncident}</Text>
        <View style={styles.closeButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 140 + (Platform.OS === 'web' ? 34 : 0) }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(100)}>
          <Text style={styles.sectionLabel}>{t.incidentType}</Text>
          <View style={styles.typeGrid}>
            {incidentTypes.map((item) => {
              const config = incidentTypeConfig[item.type];
              const selected = selectedType === item.type;
              return (
                <Pressable
                  key={item.type}
                  style={({ pressed }) => [
                    styles.typeButton,
                    { borderColor: selected ? config.color : Colors.border },
                    selected && { backgroundColor: config.color },
                    !selected && { backgroundColor: config.bgColor },
                    pressed && styles.typeButtonPressed,
                  ]}
                  onPress={() => handleSelectType(item.type)}
                >
                  <View style={[styles.typeIconCircle, { backgroundColor: selected ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.9)' }]}>
                    {renderIncidentIcon(item.type, selected)}
                  </View>
                  <Text style={[styles.typeLabel, { color: selected ? '#FFF' : config.color }]}>{item.label}</Text>
                  {selected && (
                    <View style={styles.typeCheckBadge}>
                      <Ionicons name="checkmark" size={14} color={config.color} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)}>
          <Text style={styles.sectionLabel}>{t.location}</Text>
          <View style={styles.locationCard}>
            {locationStatus === 'loading' && (
              <View style={styles.locationRow}>
                <View style={styles.locationPulse}>
                  <ActivityIndicator size="small" color={Colors.accent} />
                </View>
                <Text style={styles.locationLoadingText}>{t.detecting}</Text>
              </View>
            )}
            {locationStatus === 'denied' && (
              <View style={styles.locationDenied}>
                <View style={styles.locationDeniedIcon}>
                  <Ionicons name="location-outline" size={24} color={Colors.internet} />
                </View>
                <Text style={styles.locationDeniedText}>{t.locationPermissionMsg}</Text>
                <Pressable style={styles.grantButton} onPress={requestLocation}>
                  <Text style={styles.grantButtonText}>{t.grantPermission}</Text>
                </Pressable>
              </View>
            )}
            {locationStatus === 'error' && (
              <Pressable style={styles.locationRow} onPress={requestLocation}>
                <Ionicons name="refresh" size={20} color={Colors.accent} />
                <Text style={styles.locationLoadingText}>Retry</Text>
              </Pressable>
            )}
            {locationStatus === 'granted' && coords && (
              <View>
                <View style={styles.locationGrantedRow}>
                  <View style={styles.locationPin}>
                    <Ionicons name="location" size={20} color="#FFF" />
                  </View>
                  <View style={styles.locationInfo}>
                    <Text style={styles.locationMain}>
                      {quartier ? `${quartier}, ` : ''}{ville}
                    </Text>
                    {region ? <Text style={styles.locationSub}>{region}</Text> : null}
                    <Text style={styles.coordsText}>
                      {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
                    </Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
                </View>
              </View>
            )}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300)}>
          <Text style={styles.sectionLabel}>{t.addPhoto}</Text>
          {!photoUri ? (
            <View style={styles.photoActions}>
              <Pressable
                style={({ pressed }) => [styles.photoBtn, pressed && styles.photoBtnPressed]}
                onPress={() => pickImage(true)}
              >
                <View style={styles.photoBtnIcon}>
                  <Ionicons name="camera-outline" size={24} color={Colors.primary} />
                </View>
                <Text style={styles.photoBtnText}>{t.takePhoto}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.photoBtn, pressed && styles.photoBtnPressed]}
                onPress={() => pickImage(false)}
              >
                <View style={styles.photoBtnIcon}>
                  <Ionicons name="images-outline" size={24} color={Colors.primary} />
                </View>
                <Text style={styles.photoBtnText}>{t.chooseGallery}</Text>
              </Pressable>
            </View>
          ) : (
            <Animated.View entering={FadeIn} style={styles.photoPreviewWrap}>
              <Image source={{ uri: photoUri }} style={styles.photoPreview} contentFit="cover" />
              <Pressable style={styles.removePhotoBtn} onPress={() => setPhotoUri(null)}>
                <Ionicons name="close" size={18} color="#FFF" />
              </Pressable>
            </Animated.View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400)}>
          <Text style={styles.sectionLabel}>{t.comment}</Text>
          <View style={styles.commentCard}>
            <TextInput
              style={styles.commentInput}
              placeholder={t.commentHint}
              placeholderTextColor={Colors.textTertiary}
              value={commentaire}
              onChangeText={setCommentaire}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </Animated.View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: (Platform.OS === 'web' ? 84 + 16 : 20 + insets.bottom) }]}>
        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            (!selectedType || !coords) && styles.submitDisabled,
            pressed && selectedType && coords && styles.submitPressed,
          ]}
          onPress={handleSubmit}
          disabled={!selectedType || !coords || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <LinearGradient
              colors={selectedType && coords ? [Colors.accent, Colors.accentLight] : [Colors.textTertiary, Colors.textTertiary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              <Ionicons name="paper-plane" size={20} color="#FFF" />
              <Text style={styles.submitText}>{t.submit}</Text>
            </LinearGradient>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 22, fontFamily: 'Nunito_800ExtraBold', color: Colors.text },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 18 },
  sectionLabel: {
    fontSize: 13, fontFamily: 'Nunito_700Bold', color: Colors.textSecondary,
    marginBottom: 10, marginTop: 20, textTransform: 'uppercase', letterSpacing: 1,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeButton: {
    width: '47%' as any,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 18,
    borderWidth: 2,
    gap: 8,
    position: 'relative',
  },
  typeButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
  typeIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: {
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
  },
  typeCheckBadge: {
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
  locationCard: {
    backgroundColor: Colors.cardBg, borderRadius: 18, padding: 16,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  locationPulse: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  locationLoadingText: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', color: Colors.textSecondary },
  locationDenied: { alignItems: 'center', gap: 10, paddingVertical: 10 },
  locationDeniedIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.internetGlow, alignItems: 'center', justifyContent: 'center' },
  locationDeniedText: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', color: Colors.textSecondary, textAlign: 'center' },
  grantButton: { backgroundColor: Colors.accent, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  grantButtonText: { fontSize: 13, fontFamily: 'Nunito_700Bold', color: '#FFF' },
  locationGrantedRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  locationPin: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  locationInfo: { flex: 1 },
  locationMain: { fontSize: 15, fontFamily: 'Nunito_700Bold', color: Colors.text },
  locationSub: { fontSize: 13, fontFamily: 'Nunito_400Regular', color: Colors.textSecondary },
  coordsText: { fontSize: 11, fontFamily: 'Nunito_400Regular', color: Colors.textTertiary, marginTop: 2 },
  photoActions: { flexDirection: 'row', gap: 10 },
  photoBtn: {
    flex: 1, backgroundColor: Colors.cardBg, borderRadius: 18, paddingVertical: 20, alignItems: 'center',
    gap: 8, borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed',
  },
  photoBtnPressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  photoBtnIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  photoBtnText: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', color: Colors.textSecondary },
  photoPreviewWrap: { borderRadius: 18, overflow: 'hidden', position: 'relative' },
  photoPreview: { width: '100%', height: 200, borderRadius: 18 },
  removePhotoBtn: {
    position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  commentCard: {
    backgroundColor: Colors.cardBg, borderRadius: 18, padding: 16,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3,
  },
  commentInput: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: Colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  bottomBar: {
    paddingHorizontal: 18, paddingTop: 12, backgroundColor: Colors.background,
    borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  submitButton: { borderRadius: 16, overflow: 'hidden' },
  submitDisabled: { opacity: 0.5 },
  submitPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  submitGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 16,
  },
  submitText: { fontSize: 16, fontFamily: 'Nunito_700Bold', color: '#FFF' },
  successContainer: { alignItems: 'center', gap: 16 },
  successCircle: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.success,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.success, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  successTitle: { fontSize: 24, fontFamily: 'Nunito_800ExtraBold', color: Colors.text },
  successSubtitle: { fontSize: 15, fontFamily: 'Nunito_400Regular', color: Colors.textSecondary },
});
