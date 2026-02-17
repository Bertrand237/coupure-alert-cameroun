import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-store';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { t, lang, setLang } = useI18n();
  const { user, logout } = useAuth();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{t.settings}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom + (Platform.OS === 'web' ? 34 : 0) }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(50)}>
          <Text style={styles.sectionLabel}>{t.myAccount}</Text>
          <View style={styles.accountCard}>
            <View style={styles.accountInfo}>
              <View style={styles.avatarCircle}>
                <Ionicons name="person" size={22} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.accountName}>{user?.displayName || user?.phone}</Text>
                <Text style={styles.accountPhone}>{user?.phone}</Text>
              </View>
            </View>
            {user?.isAdmin && (
              <Pressable
                style={({ pressed }) => [styles.adminBtn, pressed && { opacity: 0.8 }]}
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push('/admin');
                }}
                testID="admin-btn"
              >
                <Ionicons name="shield-checkmark" size={18} color={Colors.accent} />
                <Text style={styles.adminBtnText}>{t.adminPanel}</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.8 }]}
              onPress={async () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                await logout();
                router.dismissAll();
              }}
              testID="logout-btn"
            >
              <Ionicons name="log-out-outline" size={18} color={Colors.internet} />
              <Text style={styles.logoutText}>{t.logout}</Text>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100)}>
          <Text style={styles.sectionLabel}>{t.language}</Text>
          <View style={styles.langRow}>
            <Pressable
              style={[styles.langOption, lang === 'fr' && styles.langActive]}
              onPress={() => { Haptics.selectionAsync(); setLang('fr'); }}
            >
              <Text style={[styles.langOptionText, lang === 'fr' && styles.langActiveText]}>{t.french}</Text>
            </Pressable>
            <Pressable
              style={[styles.langOption, lang === 'en' && styles.langActive]}
              onPress={() => { Haptics.selectionAsync(); setLang('en'); }}
            >
              <Text style={[styles.langOptionText, lang === 'en' && styles.langActiveText]}>{t.english}</Text>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)}>
          <Text style={styles.sectionLabel}>{t.appwriteSettings}</Text>
          <View style={styles.statusCard}>
            <Ionicons name="cloud-done" size={24} color={Colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.statusTitle}>{t.connected}</Text>
              <Text style={styles.statusSub}>Appwrite Cloud (Frankfurt)</Text>
            </View>
            <View style={[styles.statusDot, { backgroundColor: Colors.success }]} />
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  accountCard: {
    backgroundColor: Colors.cardBg, borderRadius: 18, padding: 16,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3,
  },
  accountInfo: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, marginBottom: 14 },
  avatarCircle: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.accent,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  accountName: { fontSize: 16, fontFamily: 'Nunito_700Bold', color: Colors.text },
  accountPhone: { fontSize: 13, fontFamily: 'Nunito_400Regular', color: Colors.textSecondary },
  adminBtn: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8,
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: Colors.background,
    marginBottom: 8,
  },
  adminBtnText: { fontSize: 14, fontFamily: 'Nunito_700Bold', color: Colors.text, flex: 1 },
  logoutBtn: {
    flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 6,
    paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.internetLight, borderWidth: 1, borderColor: 'rgba(229,57,53,0.15)',
  },
  logoutText: { fontSize: 13, fontFamily: 'Nunito_700Bold', color: Colors.internet },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.borderLight,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontFamily: 'Nunito_700Bold', color: Colors.text },
  scrollContent: { paddingHorizontal: 18 },
  sectionLabel: {
    fontSize: 13, fontFamily: 'Nunito_700Bold', color: Colors.textSecondary,
    marginTop: 24, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1,
  },
  langRow: { flexDirection: 'row', gap: 10 },
  langOption: {
    flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: Colors.cardBg,
    alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border,
  },
  langActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  langOptionText: { fontSize: 14, fontFamily: 'Nunito_700Bold', color: Colors.textSecondary },
  langActiveText: { color: '#FFF' },
  statusCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.cardBg, borderRadius: 18, padding: 16,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  statusTitle: { fontSize: 15, fontFamily: 'Nunito_700Bold', color: Colors.text },
  statusSub: { fontSize: 12, fontFamily: 'Nunito_400Regular', color: Colors.textSecondary },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
});
