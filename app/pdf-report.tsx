import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useI18n } from '@/lib/i18n';
import { useOutages } from '@/lib/outage-store';
import { useIncidents } from '@/lib/incident-store';

type PeriodKey = '24h' | '7d' | '30d' | 'all';

interface PeriodOption {
  key: PeriodKey;
  label: string;
  hours: number | null;
}

export default function PdfReportScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { outages } = useOutages();
  const { incidents } = useIncidents();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>('7d');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);

  const periods: PeriodOption[] = [
    { key: '24h', label: '24h', hours: 24 },
    { key: '7d', label: '7j', hours: 168 },
    { key: '30d', label: '30j', hours: 720 },
    { key: 'all', label: t.all, hours: null },
  ];

  const allRegions = useMemo(() => {
    const regionSet = new Set<string>();
    outages.forEach(o => { if (o.region && o.region !== 'N/A') regionSet.add(o.region); });
    incidents.forEach(i => { if (i.region && i.region !== 'N/A') regionSet.add(i.region); });
    return Array.from(regionSet).sort();
  }, [outages, incidents]);

  const filteredOutages = useMemo(() => {
    let filtered = outages;
    if (selectedRegion) {
      filtered = filtered.filter(o => o.region === selectedRegion);
    }
    const period = periods.find(p => p.key === selectedPeriod);
    if (period?.hours) {
      const cutoff = Date.now() - period.hours * 60 * 60 * 1000;
      filtered = filtered.filter(o => new Date(o.date).getTime() > cutoff);
    }
    return filtered;
  }, [outages, selectedRegion, selectedPeriod]);

  const filteredIncidents = useMemo(() => {
    let filtered = incidents;
    if (selectedRegion) {
      filtered = filtered.filter(i => i.region === selectedRegion);
    }
    const period = periods.find(p => p.key === selectedPeriod);
    if (period?.hours) {
      const cutoff = Date.now() - period.hours * 60 * 60 * 1000;
      filtered = filtered.filter(i => new Date(i.date).getTime() > cutoff);
    }
    return filtered;
  }, [incidents, selectedRegion, selectedPeriod]);

  const handleGenerate = async () => {
    if (!selectedRegion) {
      Alert.alert(t.selectRegion);
      return;
    }

    setIsGenerating(true);
    setIsGenerated(false);

    try {
      const regionName = selectedRegion;
      const periodOption = periods.find(p => p.key === selectedPeriod);
      const periodLabel = periodOption?.label || '';

      const totalOutages = filteredOutages.length;
      const totalIncidents = filteredIncidents.length;
      const activeCount = filteredOutages.filter(o => !o.estRetablie).length + filteredIncidents.filter(i => !i.estResolue).length;
      const restoredCount = filteredOutages.filter(o => o.estRetablie).length + filteredIncidents.filter(i => i.estResolue).length;

      const outageRows = filteredOutages.map(o => `
        <tr>
          <td>${o.type === 'water' ? 'Eau' : o.type === 'electricity' ? 'Electricité' : 'Internet'}</td>
          <td>${o.quartier}</td>
          <td>${o.ville}</td>
          <td>${new Date(o.date).toLocaleDateString()}</td>
          <td>${o.estRetablie ? 'Rétabli' : 'Actif'}</td>
          <td>${o.confirmations}</td>
        </tr>
      `).join('');

      const incidentRows = filteredIncidents.map(i => `
        <tr>
          <td>${i.incidentType === 'broken_pipe' ? 'Tuyau cassé' : i.incidentType === 'fallen_pole' ? 'Poteau tombé' : i.incidentType === 'cable_on_ground' ? 'Câble au sol' : 'Autre'}</td>
          <td>${i.quartier}</td>
          <td>${i.ville}</td>
          <td>${new Date(i.date).toLocaleDateString()}</td>
          <td>${i.estResolue ? 'Résolu' : 'Actif'}</td>
          <td>${i.confirmations}</td>
        </tr>
      `).join('');

      const htmlContent = `
<html>
<head>
  <style>
    body { font-family: sans-serif; padding: 20px; }
    h1 { color: #1B2838; text-align: center; }
    h2 { color: #FF5722; margin-top: 30px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
    th { background: #1B2838; color: white; }
    .summary { display: flex; gap: 20px; margin: 20px 0; }
    .stat-box { background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center; flex: 1; }
    .stat-number { font-size: 24px; font-weight: bold; color: #1B2838; }
    .stat-label { font-size: 12px; color: #666; }
    tr:nth-child(even) { background: #f9f9f9; }
  </style>
</head>
<body>
  <h1>Coupure Alert Cameroun</h1>
  <p style="text-align:center">Rapport - ${regionName} - ${periodLabel}</p>
  
  <div class="summary">
    <div class="stat-box"><div class="stat-number">${totalOutages}</div><div class="stat-label">Coupures</div></div>
    <div class="stat-box"><div class="stat-number">${totalIncidents}</div><div class="stat-label">Incidents</div></div>
    <div class="stat-box"><div class="stat-number">${activeCount}</div><div class="stat-label">Actifs</div></div>
    <div class="stat-box"><div class="stat-number">${restoredCount}</div><div class="stat-label">Résolus</div></div>
  </div>
  
  <h2>Coupures</h2>
  <table>
    <tr><th>Type</th><th>Quartier</th><th>Ville</th><th>Date</th><th>Status</th><th>Confirmations</th></tr>
    ${outageRows}
  </table>
  
  <h2>Incidents Infrastructure</h2>
  <table>
    <tr><th>Type</th><th>Quartier</th><th>Ville</th><th>Date</th><th>Status</th><th>Confirmations</th></tr>
    ${incidentRows}
  </table>
  
  <p style="text-align:center;margin-top:30px;color:#999;font-size:10px">
    Généré par Coupure Alert Cameroun - ${new Date().toLocaleString()}
  </p>
</body>
</html>`;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });

      if (Platform.OS !== 'web') {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }

      setIsGenerated(true);
      setTimeout(() => setIsGenerated(false), 3000);
    } catch (e) {
      console.error('PDF generation error:', e);
      Alert.alert('Error', 'Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>{t.reportPDF}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroIconCircle}>
              <Ionicons name="document-text" size={28} color={Colors.accent} />
            </View>
            <Text style={styles.heroTitle}>{t.reportPDF}</Text>
            <Text style={styles.heroSubtitle}>
              {filteredOutages.length} {t.outages} | {filteredIncidents.length} {t.incidents}
            </Text>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>{t.selectRegion}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {allRegions.map((region) => (
              <Pressable
                key={region}
                onPress={() => setSelectedRegion(selectedRegion === region ? null : region)}
                style={[
                  styles.chip,
                  selectedRegion === region && styles.chipActive,
                ]}
              >
                <Text style={[
                  styles.chipText,
                  selectedRegion === region && styles.chipTextActive,
                ]}>
                  {region}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          {allRegions.length === 0 && (
            <Text style={styles.emptyText}>{t.noOutages}</Text>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>{t.selectPeriod}</Text>
          <View style={styles.periodRow}>
            {periods.map((period) => (
              <Pressable
                key={period.key}
                onPress={() => setSelectedPeriod(period.key)}
                style={[
                  styles.periodBtn,
                  selectedPeriod === period.key && styles.periodBtnActive,
                ]}
              >
                <Text style={[
                  styles.periodBtnText,
                  selectedPeriod === period.key && styles.periodBtnTextActive,
                ]}>
                  {period.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(350).springify()} style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{filteredOutages.length}</Text>
              <Text style={styles.summaryLabel}>{t.outages}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{filteredIncidents.length}</Text>
              <Text style={styles.summaryLabel}>{t.incidents}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: Colors.accent }]}>
                {filteredOutages.filter(o => !o.estRetablie).length + filteredIncidents.filter(i => !i.estResolue).length}
              </Text>
              <Text style={styles.summaryLabel}>Actifs</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.generateSection}>
          {isGenerated ? (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
              <Text style={styles.successText}>{t.reportGenerated}</Text>
            </View>
          ) : (
            <Pressable
              onPress={handleGenerate}
              disabled={isGenerating || !selectedRegion}
              style={({ pressed }) => [
                styles.generateBtn,
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                (!selectedRegion) && styles.generateBtnDisabled,
              ]}
            >
              <LinearGradient
                colors={selectedRegion ? [Colors.accent, Colors.accentDark] : ['#ccc', '#aaa']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.generateGradient}
              >
                {isGenerating ? (
                  <>
                    <ActivityIndicator size="small" color="#FFF" />
                    <Text style={styles.generateBtnText}>{t.generating}</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="download-outline" size={22} color="#FFF" />
                    <Text style={styles.generateBtnText}>{t.generateReport}</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  closeBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.borderLight,
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    fontSize: 18, fontFamily: 'Nunito_700Bold', color: Colors.text,
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, gap: 16 },
  heroCard: {
    borderRadius: 24, padding: 24, alignItems: 'center', gap: 10,
    shadowColor: Colors.shadowDark, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  heroIconCircle: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { fontSize: 22, fontFamily: 'Nunito_800ExtraBold', color: '#FFF' },
  heroSubtitle: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', color: 'rgba(255,255,255,0.7)' },
  section: {
    backgroundColor: Colors.cardBg, borderRadius: 20, padding: 16,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 12, elevation: 3,
  },
  sectionTitle: {
    fontSize: 14, fontFamily: 'Nunito_700Bold', color: Colors.text, marginBottom: 12,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  chipsRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14,
    backgroundColor: Colors.borderLight, borderWidth: 1.5, borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: Colors.accent + '15', borderColor: Colors.accent,
  },
  chipText: {
    fontSize: 13, fontFamily: 'Nunito_600SemiBold', color: Colors.textSecondary,
  },
  chipTextActive: { color: Colors.accent },
  emptyText: {
    fontSize: 13, fontFamily: 'Nunito_400Regular', color: Colors.textTertiary, textAlign: 'center',
    paddingVertical: 12,
  },
  periodRow: { flexDirection: 'row', gap: 8 },
  periodBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center',
    backgroundColor: Colors.borderLight, borderWidth: 1.5, borderColor: 'transparent',
  },
  periodBtnActive: {
    backgroundColor: Colors.primary + '12', borderColor: Colors.primary,
  },
  periodBtnText: {
    fontSize: 14, fontFamily: 'Nunito_700Bold', color: Colors.textSecondary,
  },
  periodBtnTextActive: { color: Colors.primary },
  summaryCard: {
    backgroundColor: Colors.cardBg, borderRadius: 20, padding: 20,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 12, elevation: 3,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryNumber: { fontSize: 28, fontFamily: 'Nunito_800ExtraBold', color: Colors.primary },
  summaryLabel: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', color: Colors.textTertiary, marginTop: 2 },
  summaryDivider: { width: 1, height: 40, backgroundColor: Colors.borderLight },
  generateSection: { marginTop: 8 },
  generateBtn: { borderRadius: 20, overflow: 'hidden' },
  generateBtnDisabled: { opacity: 0.6 },
  generateGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 18,
  },
  generateBtnText: { fontSize: 17, fontFamily: 'Nunito_800ExtraBold', color: '#FFF' },
  successBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Colors.successLight, paddingVertical: 18, borderRadius: 20,
  },
  successText: { fontSize: 16, fontFamily: 'Nunito_700Bold', color: Colors.success },
});
