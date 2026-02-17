import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useI18n } from '@/lib/i18n';
import { useOutages } from '@/lib/outage-store';
import OutageCard from '@/components/OutageCard';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { t, lang, toggleLang } = useI18n();
  const { outages, getRecentOutages } = useOutages();

  const recentOutages = getRecentOutages(48);
  const activeWater = outages.filter(o => o.type === 'water' && !o.estRetablie).length;
  const activeElectricity = outages.filter(o => o.type === 'electricity' && !o.estRetablie).length;
  const activeInternet = outages.filter(o => o.type === 'internet' && !o.estRetablie).length;
  const totalActive = activeWater + activeElectricity + activeInternet;

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + webTopInset + 16 }]}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{t.appName}</Text>
            <Text style={styles.subtitle}>{t.subtitle}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                toggleLang();
              }}
              style={styles.langChip}
            >
              <Ionicons name="language" size={16} color="#FFF" />
              <Text style={styles.langLabel}>{lang === 'fr' ? 'FR' : 'EN'}</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/settings')}
              style={styles.settingsBtn}
            >
              <Ionicons name="settings-outline" size={20} color="rgba(255,255,255,0.8)" />
            </Pressable>
          </View>
        </View>

        <View style={styles.statsBar}>
          <StatBubble icon="water" count={activeWater} label={t.water} color={Colors.water} />
          <StatBubble icon="flash" count={activeElectricity} label={t.electricity} color={Colors.electricity} />
          <StatBubble icon="wifi" count={activeInternet} label={t.internet} color={Colors.internet} />
          <StatBubble icon="alert-circle" count={totalActive} label={t.total} color={Colors.accent} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + (Platform.OS === 'web' ? 34 : 0) }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Pressable
            style={({ pressed }) => [styles.reportCta, pressed && styles.ctaPressed]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              router.push('/(tabs)/report');
            }}
          >
            <LinearGradient
              colors={[Colors.accent, Colors.accentLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.reportGradient}
            >
              <View style={styles.reportIconCircle}>
                <Ionicons name="add" size={28} color={Colors.accent} />
              </View>
              <View style={styles.reportCtaText}>
                <Text style={styles.reportCtaTitle}>{t.reportOutage}</Text>
                <Text style={styles.reportCtaSub}>{t.quickReport}</Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={32} color="rgba(255,255,255,0.8)" />
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.quickNav}>
          <QuickNavCard
            icon="map-outline"
            label={t.map}
            onPress={() => router.push('/(tabs)/map')}
            color={Colors.primary}
          />
          <QuickNavCard
            icon="stats-chart-outline"
            label={t.stats}
            onPress={() => router.push('/(tabs)/stats')}
            color={Colors.primary}
          />
          <QuickNavCard
            icon="time-outline"
            label={t.history}
            onPress={() => router.push('/(tabs)/history')}
            color={Colors.primary}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t.recentOutages}</Text>
            <Pressable onPress={() => router.push('/(tabs)/history')} hitSlop={10}>
              <Text style={styles.seeAllLink}>{t.seeAll}</Text>
            </Pressable>
          </View>

          {recentOutages.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="shield-checkmark-outline" size={36} color={Colors.success} />
              </View>
              <Text style={styles.emptyTitle}>{t.noOutagesYet}</Text>
              <Text style={styles.emptySubtitle}>{t.noOutages}</Text>
            </View>
          ) : (
            recentOutages.slice(0, 8).map((outage, i) => (
              <OutageCard
                key={outage.id}
                type={outage.type}
                quartier={outage.quartier}
                ville={outage.ville}
                region={outage.region}
                date={outage.date}
                confirmations={outage.confirmations}
                hasPhoto={!!outage.photoUri}
                estRetablie={outage.estRetablie}
                index={i}
                onPress={() => router.push({ pathname: '/detail', params: { id: outage.id } })}
              />
            ))
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function StatBubble({ icon, count, label, color }: { icon: any; count: number; label: string; color: string }) {
  return (
    <View style={styles.statBubble}>
      <View style={[styles.statIconBg, { backgroundColor: color + '30' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={styles.statCount}>{count}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function QuickNavCard({ icon, label, onPress, color }: { icon: any; label: string; onPress: () => void; color: string }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.quickNavCard, pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] }]}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
    >
      <Ionicons name={icon} size={22} color={color} />
      <Text style={styles.quickNavLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerLeft: {
    gap: 2,
  },
  greeting: {
    fontSize: 28,
    fontFamily: 'Nunito_800ExtraBold',
    color: '#FFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: 'rgba(255,255,255,0.6)',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  langLabel: {
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
    color: '#FFF',
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    gap: 8,
  },
  statBubble: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: 12,
    gap: 4,
  },
  statIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCount: {
    fontSize: 20,
    fontFamily: 'Nunito_800ExtraBold',
    color: '#FFF',
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Nunito_600SemiBold',
    color: 'rgba(255,255,255,0.6)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
    gap: 0,
  },
  reportCta: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  reportGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 18,
    gap: 14,
  },
  reportIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportCtaText: {
    flex: 1,
  },
  reportCtaTitle: {
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
    color: '#FFF',
  },
  reportCtaSub: {
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    color: 'rgba(255,255,255,0.8)',
  },
  quickNav: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  quickNavCard: {
    flex: 1,
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  quickNavLabel: {
    fontSize: 12,
    fontFamily: 'Nunito_600SemiBold',
    color: Colors.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text,
  },
  seeAllLink: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: Colors.accent,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: 'Nunito_400Regular',
    color: Colors.textTertiary,
  },
});
