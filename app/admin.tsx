import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Alert, ActivityIndicator, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-store';
import { useOutages } from '@/lib/outage-store';
import {
  listAllUsers,
  deleteUserDoc,
  setUserAdminStatus,
  deleteOutageDoc,
  updateOutageDoc,
  type UserProfile,
} from '@/lib/appwrite';

type Tab = 'users' | 'outages';

interface AdminUser {
  id: string;
  phone: string;
  displayName: string;
  isAdmin: boolean;
}

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { user } = useAuth();
  const { outages, removeOutage } = useOutages();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const data = await listAllUsers();
      setUsers(data);
    } catch {
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDeleteUser = (userId: string, phone: string) => {
    Alert.alert(
      t.confirmDelete,
      t.confirmDeleteUser,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.deleteUser,
          style: 'destructive',
          onPress: async () => {
            setActionLoading(userId);
            try {
              await deleteUserDoc(userId);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setUsers(prev => prev.filter(u => u.id !== userId));
            } catch {
              Alert.alert('Error');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleToggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    setActionLoading(userId);
    try {
      const updated = await setUserAdminStatus(userId, !currentIsAdmin);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isAdmin: updated.isAdmin } : u));
    } catch {
      Alert.alert('Error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteOutage = (outageId: string) => {
    Alert.alert(
      t.confirmDelete,
      t.confirmDeleteOutage,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.deleteUser,
          style: 'destructive',
          onPress: async () => {
            setActionLoading(outageId);
            try {
              await deleteOutageDoc(outageId);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              removeOutage(outageId);
            } catch {
              Alert.alert('Error');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleRestoreOutage = async (outageId: string) => {
    setActionLoading(outageId);
    try {
      await updateOutageDoc(outageId, { estRetablie: true, dateRetablissement: new Date().toISOString() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Error');
    } finally {
      setActionLoading(null);
    }
  };

  const getTypeColor = (type: string) => {
    if (type === 'water') return Colors.water;
    if (type === 'electricity') return Colors.electricity;
    return Colors.internet;
  };

  const getTypeIcon = (type: string) => {
    if (type === 'water') return 'water';
    if (type === 'electricity') return 'flash';
    return 'wifi';
  };

  const activeOutages = outages.filter(o => !o.estRetablie);

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{t.adminPanel}</Text>
        <View style={{ width: 40 }} />
      </View>

      <Animated.View entering={FadeInDown.delay(50)} style={styles.tabBar}>
        <Pressable
          style={[styles.tabBtn, tab === 'users' && styles.tabActive]}
          onPress={() => setTab('users')}
        >
          <Ionicons name="people" size={18} color={tab === 'users' ? '#FFF' : Colors.textSecondary} />
          <Text style={[styles.tabText, tab === 'users' && styles.tabTextActive]}>
            {t.manageUsers} ({users.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, tab === 'outages' && styles.tabActive]}
          onPress={() => setTab('outages')}
        >
          <Ionicons name="alert-circle" size={18} color={tab === 'outages' ? '#FFF' : Colors.textSecondary} />
          <Text style={[styles.tabText, tab === 'outages' && styles.tabTextActive]}>
            {t.manageOutages} ({outages.length})
          </Text>
        </Pressable>
      </Animated.View>

      {tab === 'users' ? (
        loadingUsers ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={Colors.accent} />
          </View>
        ) : (
          <FlatList
            data={users}
            keyExtractor={item => item.id}
            contentContainerStyle={[styles.listContent, { paddingBottom: 40 + insets.bottom + (Platform.OS === 'web' ? 34 : 0) }]}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
                <View style={styles.userCard}>
                  <View style={styles.userTop}>
                    <View style={[styles.userAvatar, item.isAdmin && styles.userAvatarAdmin]}>
                      <Ionicons name={item.isAdmin ? "shield" : "person"} size={18} color="#FFF" />
                    </View>
                    <View style={styles.userInfo}>
                      <View style={styles.userNameRow}>
                        <Text style={styles.userName}>{item.displayName || item.phone}</Text>
                        <View style={[styles.roleBadge, item.isAdmin && styles.roleBadgeAdmin]}>
                          <Text style={[styles.roleBadgeText, item.isAdmin && styles.roleBadgeTextAdmin]}>
                            {item.isAdmin ? t.adminBadge : t.userBadge}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.userPhone}>{item.phone}</Text>
                    </View>
                  </View>
                  {item.id !== user?.id && (
                    <View style={styles.userActions}>
                      <Pressable
                        style={({ pressed }) => [styles.actionBtn, styles.adminToggleBtn, pressed && { opacity: 0.7 }]}
                        onPress={() => handleToggleAdmin(item.id, item.isAdmin)}
                        disabled={actionLoading === item.id}
                      >
                        {actionLoading === item.id ? (
                          <ActivityIndicator size="small" color={Colors.accent} />
                        ) : (
                          <>
                            <Ionicons name={item.isAdmin ? "shield-outline" : "shield-checkmark"} size={16} color={Colors.accent} />
                            <Text style={styles.adminToggleText}>
                              {item.isAdmin ? t.removeAdmin : t.makeAdmin}
                            </Text>
                          </>
                        )}
                      </Pressable>
                      <Pressable
                        style={({ pressed }) => [styles.actionBtn, styles.deleteBtn, pressed && { opacity: 0.7 }]}
                        onPress={() => handleDeleteUser(item.id, item.phone)}
                        disabled={actionLoading === item.id}
                      >
                        <Ionicons name="trash-outline" size={16} color={Colors.internet} />
                      </Pressable>
                    </View>
                  )}
                </View>
              </Animated.View>
            )}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={40} color={Colors.textTertiary} />
                <Text style={styles.emptyText}>{t.noUsers}</Text>
              </View>
            )}
          />
        )
      ) : (
        <FlatList
          data={outages}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: 40 + insets.bottom + (Platform.OS === 'web' ? 34 : 0) }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 40).springify()}>
              <View style={styles.outageCard}>
                <View style={styles.outageTop}>
                  <View style={[styles.outageTypeIcon, { backgroundColor: getTypeColor(item.type) + '20' }]}>
                    <Ionicons name={getTypeIcon(item.type) as any} size={18} color={getTypeColor(item.type)} />
                  </View>
                  <View style={styles.outageInfo}>
                    <Text style={styles.outageType}>{(t as any)[item.type]}</Text>
                    <Text style={styles.outageLocation} numberOfLines={1}>
                      {item.quartier !== 'N/A' ? `${item.quartier}, ` : ''}{item.ville}
                    </Text>
                  </View>
                  {item.estRetablie && (
                    <View style={styles.restoredBadge}>
                      <Text style={styles.restoredText}>{t.restored}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.outageActions}>
                  {!item.estRetablie && (
                    <Pressable
                      style={({ pressed }) => [styles.actionBtn, styles.restoreBtn, pressed && { opacity: 0.7 }]}
                      onPress={() => handleRestoreOutage(item.id)}
                      disabled={actionLoading === item.id}
                    >
                      {actionLoading === item.id ? (
                        <ActivityIndicator size="small" color={Colors.success} />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle-outline" size={16} color={Colors.success} />
                          <Text style={styles.restoreBtnText}>{t.markRestored}</Text>
                        </>
                      )}
                    </Pressable>
                  )}
                  <Pressable
                    style={({ pressed }) => [styles.actionBtn, styles.deleteBtn, pressed && { opacity: 0.7 }]}
                    onPress={() => handleDeleteOutage(item.id)}
                    disabled={actionLoading === item.id}
                  >
                    <Ionicons name="trash-outline" size={16} color={Colors.internet} />
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Ionicons name="alert-circle-outline" size={40} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>{t.noOutages}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.borderLight,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontFamily: 'Nunito_700Bold', color: Colors.text },
  tabBar: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, gap: 8,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 14, backgroundColor: Colors.cardBg,
    borderWidth: 1, borderColor: Colors.border,
  },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: 13, fontFamily: 'Nunito_700Bold', color: Colors.textSecondary },
  tabTextActive: { color: '#FFF' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 16 },
  userCard: {
    backgroundColor: Colors.cardBg, borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  userTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  userAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.textTertiary,
    alignItems: 'center', justifyContent: 'center',
  },
  userAvatarAdmin: { backgroundColor: Colors.accent },
  userInfo: { flex: 1 },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userName: { fontSize: 15, fontFamily: 'Nunito_700Bold', color: Colors.text },
  userPhone: { fontSize: 12, fontFamily: 'Nunito_400Regular', color: Colors.textSecondary, marginTop: 2 },
  roleBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: Colors.borderLight,
  },
  roleBadgeAdmin: { backgroundColor: Colors.accentLight + '30' },
  roleBadgeText: { fontSize: 10, fontFamily: 'Nunito_700Bold', color: Colors.textSecondary },
  roleBadgeTextAdmin: { color: Colors.accent },
  userActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10,
  },
  adminToggleBtn: { flex: 1, justifyContent: 'center', backgroundColor: Colors.background },
  adminToggleText: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', color: Colors.accent },
  deleteBtn: { backgroundColor: Colors.internetLight },
  outageCard: {
    backgroundColor: Colors.cardBg, borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  outageTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  outageTypeIcon: {
    width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  outageInfo: { flex: 1 },
  outageType: { fontSize: 14, fontFamily: 'Nunito_700Bold', color: Colors.text },
  outageLocation: { fontSize: 12, fontFamily: 'Nunito_400Regular', color: Colors.textSecondary, marginTop: 2 },
  restoredBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: Colors.successLight,
  },
  restoredText: { fontSize: 10, fontFamily: 'Nunito_700Bold', color: Colors.success },
  outageActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  restoreBtn: { flex: 1, justifyContent: 'center', backgroundColor: Colors.successLight },
  restoreBtnText: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', color: Colors.success },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', color: Colors.textTertiary },
});
