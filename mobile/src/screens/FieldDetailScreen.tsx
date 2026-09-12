import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Platform, KeyboardAvoidingView, Alert, ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStackParamList';
import apiClient from '../api/client';

// Fallback high-res agricultural photography
const FARM_IMAGES = [
  'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1596401057633-54a8fe8ef647?auto=format&fit=crop&w=800&q=80',
];

interface Farm {
  id: string;
  name: string;
  location: string;
  acres: string;
  npk: string | null;
  status: string;
  image: string | null;
}

interface AdvisoryData {
  hasAdvisory: boolean;
  recommendedCrop: string | null;
  summary: string | null;
  takeaways: string[];
  consultedAt?: string | null;
  source?: string;
}

// Parse NPK string like "N: 85 ppm, P: 42 ppm, K: 140 ppm, pH: 6.2" or "85-42-140" or "NPK: --"
function parseNPK(raw: string | null) {
  if (!raw || raw === 'NPK: --') return { n: '', p: '', k: '', ph: '' };
  
  // Try pattern like N: 85, P: 42, K: 140, pH: 6.2
  const nMatch  = raw.match(/N[:\s]*(\d+(?:\.\d+)?)/i);
  const pMatch  = raw.match(/P[:\s]*(\d+(?:\.\d+)?)/i);
  const kMatch  = raw.match(/K[:\s]*(\d+(?:\.\d+)?)/i);
  const phMatch = raw.match(/pH[:\s]*(\d+(?:\.\d+)?)/i);

  // If pattern didn't match, try hyphen format e.g. "85-42-140"
  if (!nMatch && !pMatch && !kMatch) {
    const parts = raw.split(/[-,\/]/).map(s => s.trim()).filter(Boolean);
    if (parts.length >= 3) {
      return {
        n: parts[0] || '',
        p: parts[1] || '',
        k: parts[2] || '',
        ph: parts[3] || '',
      };
    }
  }

  return {
    n:  nMatch?.[1]  || '',
    p:  pMatch?.[1]  || '',
    k:  kMatch?.[1]  || '',
    ph: phMatch?.[1] || '',
  };
}

function buildNPKString(n: string, p: string, k: string, ph: string): string {
  const parts: string[] = [];
  if (n.trim())  parts.push(`N: ${n.trim()} ppm`);
  if (p.trim())  parts.push(`P: ${p.trim()} ppm`);
  if (k.trim())  parts.push(`K: ${k.trim()} ppm`);
  if (ph.trim()) parts.push(`pH: ${ph.trim()}`);
  return parts.length > 0 ? parts.join(', ') : 'NPK: --';
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Healthy:          { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0', dot: '#22c55e' },
  'Inspection Due': { bg: '#fef3c7', text: '#b45309', border: '#fde68a', dot: '#f59e0b' },
  'At Risk':        { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca', dot: '#ef4444' },
};

const QUICK_AI_PROMPTS = [
  { icon: '🌱', label: 'Crop Advisory', prompt: 'What crop should I plant on this plot based on my soil parameters and season?' },
  { icon: '🧪', label: 'Soil Health', prompt: 'Analyze my soil N, P, K and pH values and recommend needed fertilizer or amendments.' },
  { icon: '🌧️', label: 'Monsoon Risk', prompt: 'What is the rain and weather outlook for this field this week?' },
  { icon: '📈', label: 'Mandi Rates', prompt: 'What are the current APMC mandi prices for crops suited to my district in Kerala?' },
];

export default function FieldDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<any>();
  const fieldId: string = route.params?.fieldId ?? '';

  const [farm, setFarm] = useState<Farm | null>(null);
  const [loading, setLoading] = useState(true);

  // Latest AI Advisory consolidated state
  const [advisory, setAdvisory] = useState<AdvisoryData | null>(null);
  const [loadingAdvisory, setLoadingAdvisory] = useState(false);

  // Field Info edit states
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [plotName, setPlotName] = useState('');
  const [acreage, setAcreage] = useState('');
  const [location, setLocation] = useState('');
  const [plotStatus, setPlotStatus] = useState('Inspection Due');
  const [savingInfo, setSavingInfo] = useState(false);

  // Soil / NPK edit states
  const [isEditingSoil, setIsEditingSoil] = useState(false);
  const [nitrogen, setNitrogen] = useState('');
  const [phosphorus, setPhosphorus] = useState('');
  const [potassium, setPotassium] = useState('');
  const [soilPh, setSoilPh] = useState('');
  const [savingSoil, setSavingSoil] = useState(false);

  useEffect(() => {
    loadFarm();
    fetchAdvisory();
  }, [fieldId]);

  async function fetchAdvisory() {
    try {
      setLoadingAdvisory(true);
      const res = await apiClient.get<AdvisoryData>(`/farms/${fieldId}/advisory`);
      setAdvisory(res.data);
    } catch (e) {
      console.log('Advisory fetch error:', e);
    } finally {
      setLoadingAdvisory(false);
    }
  }

  async function loadFarm() {
    try {
      setLoading(true);
      const res = await apiClient.get(`/farms/${fieldId}`);
      const f: Farm = res.data;
      setFarm(f);
      setPlotName(f.name || '');
      setAcreage(f.acres?.replace(/[^0-9.]/g, '') || '');
      setLocation(f.location || '');
      setPlotStatus(f.status || 'Inspection Due');
      const parsed = parseNPK(f.npk);
      setNitrogen(parsed.n);
      setPhosphorus(parsed.p);
      setPotassium(parsed.k);
      setSoilPh(parsed.ph);
    } catch (err) {
      console.error('Failed to load farm:', err);
    } finally {
      setLoading(false);
    }
  }

  const cancelInfoEdit = () => {
    if (!farm) return;
    setPlotName(farm.name || '');
    setAcreage(farm.acres?.replace(/[^0-9.]/g, '') || '');
    setLocation(farm.location || '');
    setPlotStatus(farm.status || 'Inspection Due');
    setIsEditingInfo(false);
  };

  async function saveGeneralInfo() {
    if (!farm) return;
    try {
      setSavingInfo(true);
      const updatedAcres = acreage ? `${acreage} Acres` : farm.acres;
      const updatedLocation = location || farm.location;
      const updatedName = plotName || farm.name;

      await apiClient.put(`/farms/${farm.id}`, {
        name: updatedName,
        acres: updatedAcres,
        location: updatedLocation,
        status: plotStatus,
      });

      setFarm(prev => prev ? {
        ...prev,
        name: updatedName,
        acres: updatedAcres,
        location: updatedLocation,
        status: plotStatus,
      } : prev);

      setIsEditingInfo(false);
      Alert.alert('Saved', 'Plot information updated successfully.');
    } catch (err) {
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setSavingInfo(false);
    }
  }

  const cancelSoilEdit = () => {
    if (!farm) return;
    const parsed = parseNPK(farm.npk);
    setNitrogen(parsed.n);
    setPhosphorus(parsed.p);
    setPotassium(parsed.k);
    setSoilPh(parsed.ph);
    setIsEditingSoil(false);
  };

  async function saveSoilData() {
    if (!farm) return;
    const npkString = buildNPKString(nitrogen, phosphorus, potassium, soilPh);
    try {
      setSavingSoil(true);
      await apiClient.put(`/farms/${farm.id}`, { npk: npkString });
      setFarm(prev => prev ? { ...prev, npk: npkString } : prev);
      setIsEditingSoil(false);
      Alert.alert('Saved', 'Soil telemetry parameters updated successfully.');
    } catch (err) {
      Alert.alert('Error', 'Failed to save soil data. Please try again.');
    } finally {
      setSavingSoil(false);
    }
  }

  function openAgentChat(initialPrompt?: string) {
    if (!farm) return;
    const district = farm.location ? farm.location.split(',')[0].trim() : 'Kerala';
    const parsedAcres = parseFloat(farm.acres?.replace(/[^0-9.]/g, '') || '0') || undefined;
    const npkContext = farm.npk && farm.npk !== 'NPK: --' ? farm.npk : undefined;

    navigation.navigate('AgentChat', {
      fieldId: farm.id,
      fieldName: farm.name,
      district,
      acres: parsedAcres,
      farmId: farm.id,
      location: farm.location,
      npk: npkContext,
      initialPrompt,
    });
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#15803d" />
        <Text style={styles.loadingText}>Loading plot telemetry...</Text>
      </View>
    );
  }

  if (!farm) {
    return (
      <View style={styles.centerContainer}>
        <Feather name="alert-circle" size={42} color="#94a3b8" />
        <Text style={styles.notFoundTitle}>Plot Not Found</Text>
        <Text style={styles.notFoundSub}>This plot may have been removed or unavailable.</Text>
        <TouchableOpacity style={styles.backBtnLarge} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={16} color="#15803d" />
          <Text style={styles.backBtnLargeText}>Return to Plots</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const st = STATUS_CONFIG[farm.status] || STATUS_CONFIG['Inspection Due'];
  const district = farm.location ? farm.location.split(',')[0].trim() : 'Kerala';
  const npkParsed = parseNPK(farm.npk);
  const hasNPK = Boolean(npkParsed.n || npkParsed.p || npkParsed.k || npkParsed.ph);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f8fafc' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Feather name="arrow-left" size={18} color="#1e293b" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>{farm.name}</Text>
            <Text style={styles.headerSub}>{district} · Plot Details</Text>
          </View>

          <TouchableOpacity
            style={styles.askHeaderBtn}
            onPress={() => openAgentChat()}
            activeOpacity={0.85}
          >
            <Feather name="zap" size={13} color="#15803d" />
            <Text style={styles.askHeaderBtnText}>Ask AI</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Image & Floating Badges ───────────────────────────────────── */}
        <View style={styles.heroWrap}>
          <Image
            source={{ uri: farm.image || FARM_IMAGES[0] }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.heroOverlay} />

          {/* Plot ID Badge */}
          <View style={styles.plotIdBadge}>
            <Feather name="tag" size={11} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={styles.plotIdText}>Plot #{farm.id.substring(0, 8).toUpperCase()}</Text>
          </View>

          {/* Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: st.bg, borderColor: st.border }]}>
            <View style={[styles.statusDot, { backgroundColor: st.dot }]} />
            <Text style={[styles.statusText, { color: st.text }]}>{farm.status}</Text>
          </View>

          {/* Bottom Hero Details */}
          <View style={styles.heroBottom}>
            <Text style={styles.heroTitle}>{farm.name}</Text>
            <View style={styles.heroMetaRow}>
              <View style={styles.heroMetaChip}>
                <Feather name="map-pin" size={11} color="#a7f3d0" />
                <Text style={styles.heroMetaChipText}>{farm.location || 'Kerala'}</Text>
              </View>
              <Text style={styles.heroMetaSeparator}>•</Text>
              <View style={styles.heroMetaChip}>
                <Feather name="maximize-2" size={11} color="#a7f3d0" />
                <Text style={styles.heroMetaChipText}>{farm.acres || '1.0 Acres'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Latest AI Agronomic Advisory Card (Consolidated) ─────────────── */}
        <View style={styles.advisoryCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleGroup}>
              <View style={[styles.cardIconBadge, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}>
                <Feather name="award" size={16} color="#059669" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Latest Agronomic Advisory</Text>
                <Text style={styles.cardSubtitle}>Consolidated Insights & Recommended Crop</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.chatAdvisoryBtn}
              onPress={() => openAgentChat('What are the key agronomic insights and recommended crop for this plot?')}
              activeOpacity={0.8}
            >
              <Feather name="message-square" size={11} color="#059669" />
              <Text style={styles.chatAdvisoryBtnText}>Chat AI</Text>
            </TouchableOpacity>
          </View>

          {loadingAdvisory ? (
            <View style={{ paddingVertical: 18, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#15803d" />
              <Text style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>Fetching latest advisory insights...</Text>
            </View>
          ) : advisory?.hasAdvisory && advisory.recommendedCrop ? (
            <View style={styles.advisoryContent}>
              {/* Primary Recommended Crop Banner */}
              <View style={styles.cropHighlightBanner}>
                <View style={styles.cropIconBox}>
                  <Text style={{ fontSize: 24 }}>🌱</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cropBannerLabel}>RECOMMENDED CROP</Text>
                  <Text style={styles.cropBannerName}>{advisory.recommendedCrop}</Text>
                </View>
                <View style={styles.matchBadge}>
                  <Feather name="check-circle" size={11} color="#059669" />
                  <Text style={styles.matchBadgeText}>High Suitability</Text>
                </View>
              </View>

              {/* Very Important Takeaways (Consolidated bullets) */}
              <View style={styles.takeawaysBox}>
                <Text style={styles.takeawaysTitle}>KEY FIELD HIGHLIGHTS & ESSENTIALS</Text>
                {advisory.takeaways.map((point, idx) => (
                  <View key={idx} style={styles.takeawayRow}>
                    <View style={styles.takeawayDot} />
                    <Text style={styles.takeawayText}>{point}</Text>
                  </View>
                ))}
              </View>

              {/* Source Tag & Date */}
              <View style={styles.advisoryFooterRow}>
                <View style={styles.advisorySourceTag}>
                  <Feather name="cpu" size={10} color="#0284c7" />
                  <Text style={styles.advisorySourceText}>{advisory.source || 'AI Agronomy Model'}</Text>
                </View>
                <TouchableOpacity
                  style={styles.openFullAdvisoryBtn}
                  onPress={() => openAgentChat()}
                  activeOpacity={0.7}
                >
                  <Text style={styles.openFullAdvisoryText}>Consult AI Advisor</Text>
                  <Feather name="arrow-right" size={11} color="#15803d" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.emptyAdvisoryBox}>
              <View style={styles.emptyAdvisoryIcon}>
                <Feather name="compass" size={20} color="#15803d" />
              </View>
              <Text style={styles.emptyAdvisoryTitle}>No Advisory Generated Yet</Text>
              <Text style={styles.emptyAdvisorySub}>
                Ask our AI Advisor to evaluate your soil parameters and season to produce consolidated crop recommendations for this plot.
              </Text>
              <TouchableOpacity
                style={styles.getAdvisoryBtn}
                onPress={() => openAgentChat('What crop should I plant on this plot based on my soil parameters and season?')}
                activeOpacity={0.85}
              >
                <Feather name="zap" size={12} color="#ffffff" />
                <Text style={styles.getAdvisoryBtnText}>Get First Recommendation</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Soil Telemetry Section (N, P, K, pH) ────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleGroup}>
              <View style={styles.cardIconBadge}>
                <Feather name="activity" size={15} color="#15803d" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Soil Parameters & Health</Text>
                <Text style={styles.cardSubtitle}>NPK & pH Telemetry for AI Advisory</Text>
              </View>
            </View>

            {!isEditingSoil ? (
              <TouchableOpacity
                style={styles.editPillBtn}
                onPress={() => setIsEditingSoil(true)}
                activeOpacity={0.8}
              >
                <Feather name="edit-2" size={12} color="#15803d" />
                <Text style={styles.editPillBtnText}>Edit NPK</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {isEditingSoil ? (
            <View style={styles.editSoilContainer}>
              <Text style={styles.editInstructionText}>
                Input current lab or sensor values for your plot. NatureSync AI uses these to calculate precise fertilizer & crop recommendations.
              </Text>

              <View style={styles.soilInputGrid}>
                {/* Nitrogen */}
                <View style={styles.soilInputField}>
                  <Text style={styles.inputLabel}>Nitrogen (N)</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.textInput}
                      value={nitrogen}
                      onChangeText={setNitrogen}
                      placeholder="e.g. 85"
                      placeholderTextColor="#94a3b8"
                      keyboardType="decimal-pad"
                    />
                    <Text style={styles.inputUnit}>ppm</Text>
                  </View>
                </View>

                {/* Phosphorus */}
                <View style={styles.soilInputField}>
                  <Text style={styles.inputLabel}>Phosphorus (P)</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.textInput}
                      value={phosphorus}
                      onChangeText={setPhosphorus}
                      placeholder="e.g. 42"
                      placeholderTextColor="#94a3b8"
                      keyboardType="decimal-pad"
                    />
                    <Text style={styles.inputUnit}>ppm</Text>
                  </View>
                </View>

                {/* Potassium */}
                <View style={styles.soilInputField}>
                  <Text style={styles.inputLabel}>Potassium (K)</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.textInput}
                      value={potassium}
                      onChangeText={setPotassium}
                      placeholder="e.g. 140"
                      placeholderTextColor="#94a3b8"
                      keyboardType="decimal-pad"
                    />
                    <Text style={styles.inputUnit}>ppm</Text>
                  </View>
                </View>

                {/* Soil pH */}
                <View style={styles.soilInputField}>
                  <Text style={styles.inputLabel}>Soil pH</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.textInput}
                      value={soilPh}
                      onChangeText={setSoilPh}
                      placeholder="e.g. 6.2"
                      placeholderTextColor="#94a3b8"
                      keyboardType="decimal-pad"
                    />
                    <Text style={styles.inputUnit}>pH</Text>
                  </View>
                </View>
              </View>

              <View style={styles.editActionRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={cancelSoilEdit}
                  disabled={savingSoil}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={saveSoilData}
                  disabled={savingSoil}
                  activeOpacity={0.85}
                >
                  {savingSoil ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Feather name="check" size={14} color="#ffffff" style={{ marginRight: 6 }} />
                      <Text style={styles.saveBtnText}>Save Soil Data</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : hasNPK ? (
            <View style={styles.telemetryGrid}>
              {/* Nitrogen Card */}
              <View style={[styles.telemetryCard, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
                <View style={styles.telemetryCardTop}>
                  <Text style={[styles.telemetryCardLabel, { color: '#15803d' }]}>Nitrogen (N)</Text>
                  <View style={[styles.badgePill, { backgroundColor: '#dcfce7' }]}>
                    <Text style={[styles.badgePillText, { color: '#15803d' }]}>
                      {npkParsed.n ? (parseFloat(npkParsed.n) >= 70 ? 'Adequate' : 'Low') : '—'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.telemetryValueText, { color: '#14532d' }]}>
                  {npkParsed.n ? `${npkParsed.n}` : '—'}
                  <Text style={styles.telemetryUnitText}> ppm</Text>
                </Text>
                <Text style={styles.targetHint}>Optimal: 80 - 140 ppm</Text>
              </View>

              {/* Phosphorus Card */}
              <View style={[styles.telemetryCard, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
                <View style={styles.telemetryCardTop}>
                  <Text style={[styles.telemetryCardLabel, { color: '#0369a1' }]}>Phosphorus (P)</Text>
                  <View style={[styles.badgePill, { backgroundColor: '#dbeafe' }]}>
                    <Text style={[styles.badgePillText, { color: '#0369a1' }]}>
                      {npkParsed.p ? (parseFloat(npkParsed.p) >= 30 ? 'Adequate' : 'Low') : '—'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.telemetryValueText, { color: '#0c4a6e' }]}>
                  {npkParsed.p ? `${npkParsed.p}` : '—'}
                  <Text style={styles.telemetryUnitText}> ppm</Text>
                </Text>
                <Text style={styles.targetHint}>Optimal: 30 - 60 ppm</Text>
              </View>

              {/* Potassium Card */}
              <View style={[styles.telemetryCard, { backgroundColor: '#faf5ff', borderColor: '#e9d5ff' }]}>
                <View style={styles.telemetryCardTop}>
                  <Text style={[styles.telemetryCardLabel, { color: '#7c3aed' }]}>Potassium (K)</Text>
                  <View style={[styles.badgePill, { backgroundColor: '#f3e8ff' }]}>
                    <Text style={[styles.badgePillText, { color: '#7c3aed' }]}>
                      {npkParsed.k ? (parseFloat(npkParsed.k) >= 100 ? 'Adequate' : 'Low') : '—'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.telemetryValueText, { color: '#4c1d95' }]}>
                  {npkParsed.k ? `${npkParsed.k}` : '—'}
                  <Text style={styles.telemetryUnitText}> ppm</Text>
                </Text>
                <Text style={styles.targetHint}>Optimal: 100 - 200 ppm</Text>
              </View>

              {/* Soil pH Card */}
              <View style={[styles.telemetryCard, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
                <View style={styles.telemetryCardTop}>
                  <Text style={[styles.telemetryCardLabel, { color: '#b45309' }]}>Soil pH</Text>
                  <View style={[styles.badgePill, { backgroundColor: '#fef3c7' }]}>
                    <Text style={[styles.badgePillText, { color: '#b45309' }]}>
                      {npkParsed.ph ? (parseFloat(npkParsed.ph) < 6.0 ? 'Acidic' : 'Balanced') : '—'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.telemetryValueText, { color: '#78350f' }]}>
                  {npkParsed.ph ? `${npkParsed.ph}` : '—'}
                  <Text style={styles.telemetryUnitText}> pH</Text>
                </Text>
                <Text style={styles.targetHint}>Target: 5.5 - 6.5 (Kerala)</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.emptySoilBox}
              onPress={() => setIsEditingSoil(true)}
              activeOpacity={0.8}
            >
              <View style={styles.emptySoilIconCircle}>
                <Feather name="plus" size={20} color="#15803d" />
              </View>
              <Text style={styles.emptySoilTitle}>No Soil Telemetry Configured</Text>
              <Text style={styles.emptySoilSub}>
                Tap here to set your Nitrogen, Phosphorus, Potassium, and pH levels to enable high-accuracy AI crop matching.
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Field Information Card ────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleGroup}>
              <View style={styles.cardIconBadge}>
                <Feather name="info" size={15} color="#15803d" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Field Information</Text>
                <Text style={styles.cardSubtitle}>Plot Location & Land Size</Text>
              </View>
            </View>

            {!isEditingInfo ? (
              <TouchableOpacity
                style={styles.editPillBtn}
                onPress={() => setIsEditingInfo(true)}
                activeOpacity={0.8}
              >
                <Feather name="edit-2" size={12} color="#15803d" />
                <Text style={styles.editPillBtnText}>Edit Info</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {isEditingInfo ? (
            <View style={styles.editInfoContainer}>
              {/* Plot Name */}
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Plot / Farm Name</Text>
                <TextInput
                  style={styles.infoTextInput}
                  value={plotName}
                  onChangeText={setPlotName}
                  placeholder="e.g. Wayanad Homestead"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              {/* Location */}
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Location / District (Kerala)</Text>
                <TextInput
                  style={styles.infoTextInput}
                  value={location}
                  onChangeText={setLocation}
                  placeholder="e.g. Wayanad, Kerala"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              {/* Acreage */}
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Acreage (Acres)</Text>
                <TextInput
                  style={styles.infoTextInput}
                  value={acreage}
                  onChangeText={setAcreage}
                  placeholder="e.g. 2.5"
                  placeholderTextColor="#94a3b8"
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Health Status Picker */}
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Field Status</Text>
                <View style={styles.statusPickerRow}>
                  {['Healthy', 'Inspection Due', 'At Risk'].map(s => {
                    const active = plotStatus === s;
                    return (
                      <TouchableOpacity
                        key={s}
                        style={[
                          styles.statusPickerBtn,
                          active && { backgroundColor: '#f0fdf4', borderColor: '#15803d' },
                        ]}
                        onPress={() => setPlotStatus(s)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.statusPickerBtnText, active && { color: '#15803d', fontWeight: '800' }]}>
                          {s}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.editActionRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={cancelInfoEdit}
                  disabled={savingInfo}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={saveGeneralInfo}
                  disabled={savingInfo}
                  activeOpacity={0.85}
                >
                  {savingInfo ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Feather name="check" size={14} color="#ffffff" style={{ marginRight: 6 }} />
                      <Text style={styles.saveBtnText}>Save Changes</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.infoList}>
              <View style={styles.infoItem}>
                <Text style={styles.infoItemLabel}>Plot Name</Text>
                <Text style={styles.infoItemValue}>{farm.name}</Text>
              </View>

              <View style={styles.infoItem}>
                <Text style={styles.infoItemLabel}>Location</Text>
                <View style={styles.infoLocationVal}>
                  <Feather name="map-pin" size={12} color="#15803d" style={{ marginRight: 4 }} />
                  <Text style={styles.infoItemValue}>{farm.location || 'Kerala'}</Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <Text style={styles.infoItemLabel}>Total Acreage</Text>
                <Text style={styles.infoItemValue}>{farm.acres || '1.0 Acres'}</Text>
              </View>

              <View style={[styles.infoItem, { borderBottomWidth: 0 }]}>
                <Text style={styles.infoItemLabel}>Status</Text>
                <View style={[styles.statusBadgeSmall, { backgroundColor: st.bg, borderColor: st.border }]}>
                  <View style={[styles.statusDot, { backgroundColor: st.dot }]} />
                  <Text style={[styles.statusTextSmall, { color: st.text }]}>{farm.status}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* ── Ask AI About This Field Banner ─────────────────────────────────── */}
        <View style={styles.aiBannerCard}>
          <View style={styles.aiBannerHeader}>
            <View style={styles.aiAvatar}>
              <Text style={{ fontSize: 20 }}>🌾</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.aiBannerTitle}>AI Field Advisor</Text>
              <Text style={styles.aiBannerSub}>
                Hyperlocal guidance tailored to {farm.name} and {district}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.openChatIconBtn}
              onPress={() => openAgentChat()}
              activeOpacity={0.85}
            >
              <Feather name="arrow-right" size={16} color="#15803d" />
            </TouchableOpacity>
          </View>

          <View style={styles.quickPromptsWrap}>
            <Text style={styles.quickPromptsHeader}>1-Tap Quick Inquiries:</Text>
            <View style={styles.quickPromptsRow}>
              {QUICK_AI_PROMPTS.map((qp, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.quickPromptChip}
                  onPress={() => openAgentChat(qp.prompt)}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 13, marginRight: 5 }}>{qp.icon}</Text>
                  <Text style={styles.quickPromptChipText}>{qp.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* ── Field Activity Log ────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardTitleGroup}>
            <View style={styles.cardIconBadge}>
              <Feather name="clock" size={15} color="#15803d" />
            </View>
            <View>
              <Text style={styles.cardTitle}>Field Activity & Timeline</Text>
              <Text style={styles.cardSubtitle}>Audit trail & health tracking</Text>
            </View>
          </View>

          <View style={styles.timelineList}>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineIcon, { backgroundColor: '#f0fdf4' }]}>
                <Feather name="check-circle" size={14} color="#16a34a" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.timelineTitle}>Plot Registered on NatureSync</Text>
                <Text style={styles.timelineMeta}>Location linked to {farm.location || 'Kerala'}</Text>
              </View>
            </View>

            {hasNPK && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineIcon, { backgroundColor: '#eff6ff' }]}>
                  <Feather name="activity" size={14} color="#0284c7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.timelineTitle}>Soil Parameters Active</Text>
                  <Text style={styles.timelineMeta}>
                    N: {npkParsed.n || '—'} · P: {npkParsed.p || '—'} · K: {npkParsed.k || '—'} · pH: {npkParsed.ph || '—'}
                  </Text>
                </View>
              </View>
            )}

            {farm.status === 'Inspection Due' && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineIcon, { backgroundColor: '#fffbeb' }]}>
                  <Feather name="alert-circle" size={14} color="#d97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.timelineTitle}>Field Inspection Recommended</Text>
                  <Text style={styles.timelineMeta}>Update soil test values or consult AI advisor for timely guidance</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: 24,
  },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 13, fontWeight: '600' },
  notFoundTitle: { marginTop: 12, fontSize: 16, fontWeight: '800', color: '#0f172a' },
  notFoundSub: { marginTop: 6, fontSize: 13, color: '#64748b', textAlign: 'center' },
  backBtnLarge: {
    marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 18, paddingVertical: 10,
    backgroundColor: '#f0fdf4', borderRadius: 12, borderWidth: 1, borderColor: '#bbf7d0',
  },
  backBtnLargeText: { color: '#15803d', fontWeight: '700', fontSize: 13 },

  headerSafe: { backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  headerBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center', marginHorizontal: 12 },
  headerTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  headerSub: { fontSize: 11, color: '#64748b', fontWeight: '600', marginTop: 1 },
  askHeaderBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7,
  },
  askHeaderBtnText: { fontSize: 12, fontWeight: '700', color: '#15803d' },

  scrollContent: { paddingBottom: 40 },

  // Hero Section
  heroWrap: {
    height: 220, marginHorizontal: 16, marginTop: 14,
    borderRadius: 24, overflow: 'hidden', position: 'relative',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 10, elevation: 4,
  },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  plotIdBadge: {
    position: 'absolute', top: 12, left: 12,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 99,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  plotIdText: { fontSize: 10, fontWeight: '700', color: '#ffffff', letterSpacing: 0.5 },
  statusBadge: {
    position: 'absolute', top: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '800' },
  heroBottom: { position: 'absolute', bottom: 14, left: 14, right: 14 },
  heroTitle: { fontSize: 20, fontWeight: '900', color: '#ffffff', letterSpacing: -0.3 },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap' },
  heroMetaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroMetaChipText: { fontSize: 12, color: '#a7f3d0', fontWeight: '700' },
  heroMetaSeparator: { color: '#a7f3d0', marginHorizontal: 6, fontSize: 12 },

  // Cards
  card: {
    backgroundColor: '#ffffff', marginHorizontal: 16, marginTop: 14,
    borderRadius: 22, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 14,
  },
  cardTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIconBadge: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#dcfce7',
  },
  cardTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  cardSubtitle: { fontSize: 10, color: '#64748b', fontWeight: '600', marginTop: 1 },

  editPillBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
  },
  editPillBtnText: { fontSize: 11, fontWeight: '700', color: '#15803d' },

  // Telemetry Grid
  telemetryGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  telemetryCard: {
    width: '48%', borderRadius: 16, padding: 12,
    borderWidth: 1, gap: 4,
  },
  telemetryCardTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  telemetryCardLabel: { fontSize: 11, fontWeight: '700' },
  badgePill: {
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  badgePillText: { fontSize: 9, fontWeight: '700' },
  telemetryValueText: { fontSize: 18, fontWeight: '900', marginTop: 2 },
  telemetryUnitText: { fontSize: 11, fontWeight: '600' },
  targetHint: { fontSize: 9, color: '#64748b', fontWeight: '600', marginTop: 2 },

  emptySoilBox: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f0fdf4', borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: '#bbf7d0', borderStyle: 'dashed',
    gap: 6,
  },
  emptySoilIconCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center',
  },
  emptySoilTitle: { fontSize: 13, fontWeight: '800', color: '#15803d' },
  emptySoilSub: { fontSize: 11, color: '#166534', textAlign: 'center', lineHeight: 16 },

  // Edit Soil Form
  editSoilContainer: { gap: 12 },
  editInstructionText: { fontSize: 11, color: '#64748b', lineHeight: 16 },
  soilInputGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  soilInputField: { width: '48%' },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#334155', marginBottom: 4 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8,
  },
  textInput: { flex: 1, fontSize: 13, fontWeight: '700', color: '#0f172a', padding: 0 },
  inputUnit: { fontSize: 11, color: '#94a3b8', fontWeight: '700', marginLeft: 4 },

  editActionRow: {
    flexDirection: 'row', gap: 10, marginTop: 10,
  },
  cancelBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  cancelBtnText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  saveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 12,
    backgroundColor: '#15803d',
  },
  saveBtnText: { fontSize: 12, fontWeight: '800', color: '#ffffff' },

  // Edit Info Form
  editInfoContainer: { gap: 12 },
  inputRow: { gap: 4 },
  infoTextInput: {
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
    fontSize: 13, fontWeight: '600', color: '#0f172a',
  },
  statusPickerRow: { flexDirection: 'row', gap: 8 },
  statusPickerBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc',
    alignItems: 'center', justifyContent: 'center',
  },
  statusPickerBtnText: { fontSize: 10, fontWeight: '700', color: '#64748b' },

  // Info List (Not editing)
  infoList: { gap: 12 },
  infoItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  infoItemLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  infoItemValue: { fontSize: 13, color: '#0f172a', fontWeight: '700' },
  infoLocationVal: { flexDirection: 'row', alignItems: 'center' },
  statusBadgeSmall: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1,
  },
  statusTextSmall: { fontSize: 10, fontWeight: '800' },

  // AI Banner Card
  aiBannerCard: {
    backgroundColor: '#052e16', marginHorizontal: 16, marginTop: 14,
    borderRadius: 22, padding: 16, borderWidth: 1, borderColor: '#14532d',
    shadowColor: '#15803d', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 5,
  },
  aiBannerHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  aiAvatar: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  aiBannerTitle: { fontSize: 15, fontWeight: '900', color: '#ffffff' },
  aiBannerSub: { fontSize: 11, color: '#a7f3d0', marginTop: 2, lineHeight: 16 },
  openChatIconBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: '#86efac', alignItems: 'center', justifyContent: 'center',
  },
  quickPromptsWrap: { marginTop: 14 },
  quickPromptsHeader: { fontSize: 10, fontWeight: '700', color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  quickPromptsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickPromptChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 99, paddingHorizontal: 10, paddingVertical: 6,
  },
  quickPromptChipText: { fontSize: 11, color: '#ffffff', fontWeight: '700' },

  // Timeline
  timelineList: { gap: 10, marginTop: 14 },
  timelineItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9',
    borderRadius: 14, padding: 10,
  },
  timelineIcon: {
    width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  timelineTitle: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  timelineMeta: { fontSize: 10, color: '#64748b', marginTop: 2 },

  // Advisory Card Styles
  advisoryCard: {
    backgroundColor: '#ffffff', marginHorizontal: 16, marginTop: 14,
    borderRadius: 22, padding: 16,
    borderWidth: 1.5, borderColor: '#bbf7d0',
    shadowColor: '#15803d', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  chatAdvisoryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
  },
  chatAdvisoryBtnText: { fontSize: 11, fontWeight: '700', color: '#15803d' },

  advisoryContent: { gap: 12 },
  cropHighlightBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#f0fdf4', borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: '#dcfce7',
  },
  cropIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center',
  },
  cropBannerLabel: { fontSize: 9, fontWeight: '800', color: '#16a34a', letterSpacing: 0.8 },
  cropBannerName: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginTop: 1 },
  matchBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#dcfce7', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 4,
  },
  matchBadgeText: { fontSize: 10, fontWeight: '800', color: '#15803d' },

  takeawaysBox: {
    backgroundColor: '#f8fafc', borderRadius: 14, padding: 12, gap: 8,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  takeawaysTitle: { fontSize: 10, fontWeight: '800', color: '#64748b', letterSpacing: 0.5 },
  takeawayRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  takeawayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#15803d', marginTop: 5 },
  takeawayText: { flex: 1, fontSize: 12, color: '#334155', lineHeight: 17, fontWeight: '500' },

  advisoryFooterRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 4,
  },
  advisorySourceTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  advisorySourceText: { fontSize: 10, color: '#64748b', fontWeight: '600' },
  openFullAdvisoryBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  openFullAdvisoryText: { fontSize: 11, fontWeight: '700', color: '#15803d' },

  emptyAdvisoryBox: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f0fdf4', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#bbf7d0', borderStyle: 'dashed', gap: 6,
  },
  emptyAdvisoryIcon: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center',
  },
  emptyAdvisoryTitle: { fontSize: 13, fontWeight: '800', color: '#15803d' },
  emptyAdvisorySub: { fontSize: 11, color: '#166534', textAlign: 'center', lineHeight: 16 },
  getAdvisoryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#15803d', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, marginTop: 4,
  },
  getAdvisoryBtnText: { fontSize: 11, fontWeight: '800', color: '#ffffff' },
});
