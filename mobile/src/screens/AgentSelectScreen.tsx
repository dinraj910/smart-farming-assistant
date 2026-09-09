import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Platform, KeyboardAvoidingView, ActivityIndicator, Image,
  TextInput, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStackParamList';
import apiClient from '../api/client';

// ─── Types matching the backend Farm model ─────────────────────────────────
export interface Farm {
  id: string;         // DB UUID
  name: string;
  location: string;
  acres: string;
  npk: string | null;
  status: string;
  image: string | null;
}

// Kept for backward-compat — used by FieldDetailScreen and AgentChatScreen as fallback
export const FIELDS = [
  {
    id: 'F1',
    name: 'Wayanad Pepper Homestead',
    district: 'Wayanad',
    acres: 2.4,
    crop: 'Black Pepper & Coconut',
  },
];

// Fallback high-res agricultural photography
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=800&q=80',
];

// Status badge styling matching NatureSync theme
const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Healthy:          { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0', dot: '#22c55e' },
  'Inspection Due': { bg: '#fef3c7', text: '#b45309', border: '#fde68a', dot: '#f59e0b' },
  'At Risk':        { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca', dot: '#ef4444' },
};

// 1-Tap Quick Action Prompts on Cards
const QUICK_PROMPTS = [
  { id: 'soil',    icon: 'activity',    label: 'Soil & NPK' },
  { id: 'weather', icon: 'cloud-rain',  label: 'Rain Radar' },
  { id: 'market',  icon: 'trending-up', label: 'Mandi Rates' },
];

export default function AgentSelectScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Interactive search & filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'HEALTHY' | 'ACTION'>('ALL');
  const [langMl, setLangMl] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadFarms();
    }, [])
  );

  async function loadFarms() {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get<Farm[]>('/farms');
      setFarms(res.data || []);
    } catch (err: any) {
      setError('Could not load your farms. Check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFarms();
  }, []);

  const selectFarm = (farm: Farm) => {
    // Parse district from "location" field (e.g. "Wayanad, Kerala" → "Wayanad")
    const district = farm.location ? farm.location.split(',')[0].trim() : 'Kerala';
    (navigation as any).navigate('AgentChat', {
      fieldId: farm.id,
      fieldName: farm.name,
      district,
      acres: parseFloat(farm.acres) || undefined,
      farmId: farm.id,
    });
  };

  // Filter & search logic
  const filteredFarms = useMemo(() => {
    return farms.filter(f => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        (f.name && f.name.toLowerCase().includes(q)) ||
        (f.location && f.location.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (activeFilter === 'HEALTHY') return f.status === 'Healthy';
      if (activeFilter === 'ACTION') return f.status === 'Inspection Due' || f.status === 'At Risk';
      return true;
    });
  }, [farms, searchQuery, activeFilter]);

  const healthyCount = useMemo(() => farms.filter(f => f.status === 'Healthy').length, [farms]);
  const actionCount  = useMemo(() => farms.filter(f => f.status !== 'Healthy').length, [farms]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f8fafc' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ── Cohesive Page Header ────────────────────────────────────────── */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => (navigation as any).navigate('Main', { screen: 'Home' })}
            activeOpacity={0.8}
          >
            <Feather name="arrow-left" size={18} color="#334155" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <View style={styles.headerSubtitleRow}>
              <View style={styles.headerActiveDot} />
              <Text style={styles.headerSub}>
                {langMl ? 'ഫാം അസിസ്റ്റന്റ് ഹബ്' : 'AI FIELD ADVISOR'}
              </Text>
            </View>
            <Text style={styles.headerTitle}>
              {langMl ? 'ഫാം അസിസ്റ്റന്റ്' : 'Farm Assistant'}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setLangMl(v => !v)}
              style={styles.langBtn}
              activeOpacity={0.8}
            >
              <Feather name="globe" size={12} color="#15803d" />
              <Text style={styles.langBtnText}>{langMl ? 'EN' : 'ML'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={onRefresh}
              activeOpacity={0.8}
            >
              <Feather name="refresh-cw" size={15} color="#475569" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#15803d']}
            tintColor="#15803d"
          />
        }
      >
        {/* ── Farm Assistant Showcase Card with Agricultural Photo ───────── */}
        <View style={styles.agentHeroCard}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80' }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
          <View style={styles.heroImageOverlay} />

          <View style={styles.heroContent}>
            {/* Top Badge Row */}
            <View style={styles.heroTopRow}>
              <View style={styles.heroBadge}>
                <Feather name="compass" size={12} color="#86efac" />
                <Text style={styles.heroBadgeText}>
                  {langMl ? 'എഐ ഫാം അസിസ്റ്റന്റ്' : 'AI Farm Assistant'}
                </Text>
              </View>

              <View style={styles.heroStatusBadge}>
                <View style={styles.statusDotGreen} />
                <Text style={styles.heroStatusText}>Active</Text>
              </View>
            </View>

            {/* Main Headline */}
            <Text style={styles.heroTitle}>
              {langMl ? 'നിങ്ങളുടെ സ്മാർട്ട് കാർഷിക സഹായി' : 'Smart Field Intelligence'}
            </Text>

            {/* Subtitle / Description */}
            <Text style={styles.heroDesc}>
              {langMl
                ? 'നിങ്ങളുടെ തോട്ടത്തിന് അനുയോജ്യമായ മണ്ണ് പരിശോധന, കാലാവസ്ഥാ റഡാർ, വിപണി വില വിവരങ്ങൾ എന്നിവ ലഭ്യമാക്കുക.'
                : 'Instant agricultural guidance tailored to your soil telemetry, KAU crop practices, rain radar, and live mandi prices.'}
            </Text>

            {/* 3 Clean Standard Agri Badges */}
            <View style={styles.heroTagsRow}>
              <View style={styles.heroTag}>
                <Feather name="layers" size={11} color="#bbf7d0" />
                <Text style={styles.heroTagText}>Soil & NPK</Text>
              </View>
              <View style={styles.heroTag}>
                <Feather name="cloud-rain" size={11} color="#bae6fd" />
                <Text style={styles.heroTagText}>Rain Radar</Text>
              </View>
              <View style={styles.heroTag}>
                <Feather name="trending-up" size={11} color="#fef08a" />
                <Text style={styles.heroTagText}>Mandi Rates</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Stats Strip ────────────────────────────────────────────────── */}
        <View style={styles.statsStrip}>
          <View style={styles.statPill}>
            <Feather name="map-pin" size={13} color="#15803d" />
            <Text style={styles.statPillText}>
              <Text style={styles.statPillBold}>{farms.length}</Text> {farms.length === 1 ? 'Plot' : 'Plots'} Registered
            </Text>
          </View>
          <View style={styles.statPill}>
            <Feather name="cpu" size={13} color="#0284c7" />
            <Text style={styles.statPillText}>
              <Text style={styles.statPillBold}>7</Text> Models Active
            </Text>
          </View>
          <View style={styles.statPill}>
            <Feather name="message-square" size={13} color="#b45309" />
            <Text style={styles.statPillText}>EN + മലയാളം</Text>
          </View>
        </View>

        {/* ── Section Title & Interactive Controls ───────────────────────── */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              {langMl ? 'തോട്ടം തിരഞ്ഞെടുക്കുക' : 'Select Field to Consult'}
            </Text>
            <Text style={styles.sectionSub}>
              {langMl
                ? 'ഉപദേശം ആരംഭിക്കാൻ ഒരു തോട്ടത്തിൽ ക്ലിക്കുചെയ്യുക'
                : 'Choose a plot to start tailored chat with AI'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addPlotShortcut}
            onPress={() => (navigation as any).navigate('Main', { screen: 'Farms' })}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={14} color="#15803d" />
            <Text style={styles.addPlotShortcutText}>Manage</Text>
          </TouchableOpacity>
        </View>

        {/* ── Search & Filter Controls ──────────────────────────────────── */}
        {farms.length > 0 && (
          <View style={styles.controlsWrap}>
            {/* Search Input */}
            <View style={styles.searchBar}>
              <Feather name="search" size={15} color="#94a3b8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by field name or district..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="x" size={14} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Filter Pills */}
            <View style={styles.filterPillsRow}>
              <TouchableOpacity
                style={[styles.filterPill, activeFilter === 'ALL' && styles.filterPillActive]}
                onPress={() => setActiveFilter('ALL')}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterPillText, activeFilter === 'ALL' && styles.filterPillTextActive]}>
                  All ({farms.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterPill, activeFilter === 'HEALTHY' && styles.filterPillActive]}
                onPress={() => setActiveFilter('HEALTHY')}
                activeOpacity={0.8}
              >
                <View style={[styles.filterDot, { backgroundColor: '#22c55e' }]} />
                <Text style={[styles.filterPillText, activeFilter === 'HEALTHY' && styles.filterPillTextActive]}>
                  Healthy ({healthyCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterPill, activeFilter === 'ACTION' && styles.filterPillActive]}
                onPress={() => setActiveFilter('ACTION')}
                activeOpacity={0.8}
              >
                <View style={[styles.filterDot, { backgroundColor: '#f59e0b' }]} />
                <Text style={[styles.filterPillText, activeFilter === 'ACTION' && styles.filterPillTextActive]}>
                  Attention ({actionCount})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Loading State ──────────────────────────────────────────────── */}
        {loading && !refreshing && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#15803d" />
            <Text style={styles.loadingText}>Syncing your plots & telemetry...</Text>
          </View>
        )}

        {/* ── Error State ────────────────────────────────────────────────── */}
        {!loading && error && (
          <View style={styles.errorBox}>
            <Feather name="alert-triangle" size={18} color="#dc2626" />
            <View style={{ flex: 1 }}>
              <Text style={styles.errorTitle}>Failed to load fields</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
            <TouchableOpacity onPress={loadFarms} style={styles.retryBtn} activeOpacity={0.8}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Empty State ────────────────────────────────────────────────── */}
        {!loading && !error && farms.length === 0 && (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconCircle}>
              <Feather name="map" size={32} color="#15803d" />
            </View>
            <Text style={styles.emptyTitle}>No registered fields found</Text>
            <Text style={styles.emptyText}>
              Register your first plot to unlock personalized AI recommendations for your specific crops, soil, and weather.
            </Text>
            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => (navigation as any).navigate('Main', { screen: 'Farms' })}
              activeOpacity={0.85}
            >
              <Feather name="plus-circle" size={16} color="#fff" />
              <Text style={styles.emptyAddBtnText}>Register New Plot</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Search No Results ──────────────────────────────────────────── */}
        {!loading && !error && farms.length > 0 && filteredFarms.length === 0 && (
          <View style={styles.noResultsBox}>
            <Feather name="search" size={24} color="#94a3b8" />
            <Text style={styles.noResultsTitle}>No matching fields found</Text>
            <Text style={styles.noResultsSub}>Try adjusting your search query or filter.</Text>
            <TouchableOpacity
              style={styles.resetFilterBtn}
              onPress={() => { setSearchQuery(''); setActiveFilter('ALL'); }}
              activeOpacity={0.8}
            >
              <Text style={styles.resetFilterBtnText}>Clear Filters</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Rich Interactive Plot Cards ────────────────────────────────── */}
        {!loading && filteredFarms.map((farm, idx) => {
          const st = STATUS_CONFIG[farm.status] || STATUS_CONFIG['Inspection Due'];
          const imageUri = farm.image || FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length];

          return (
            <TouchableOpacity
              key={farm.id}
              style={styles.fieldCard}
              onPress={() => selectFarm(farm)}
              activeOpacity={0.88}
            >
              {/* Top Row: Image, Name, Badges */}
              <View style={styles.cardMainRow}>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.cardThumb}
                  resizeMode="cover"
                />

                <View style={styles.cardInfo}>
                  <View style={styles.cardTopMeta}>
                    <Text style={styles.cardPlotId}>PLOT #{farm.id.substring(0, 6).toUpperCase()}</Text>
                    <View style={[styles.cardStatusBadge, { backgroundColor: st.bg, borderColor: st.border }]}>
                      <View style={[styles.statusDotSmall, { backgroundColor: st.dot }]} />
                      <Text style={[styles.cardStatusText, { color: st.text }]}>{farm.status}</Text>
                    </View>
                  </View>

                  <Text style={styles.cardName} numberOfLines={1}>
                    {farm.name}
                  </Text>

                  <View style={styles.cardLocationRow}>
                    <Feather name="map-pin" size={11} color="#15803d" />
                    <Text style={styles.cardLocationText} numberOfLines={1}>
                      {farm.location || 'Kerala, India'}
                    </Text>
                    <Text style={styles.cardDotSeparator}>•</Text>
                    <Text style={styles.cardAcresText}>{farm.acres || '1.0 Acres'}</Text>
                  </View>
                </View>
              </View>

              {/* Telemetry pill row */}
              <View style={styles.cardTelemetryRow}>
                <View style={styles.telemetryChip}>
                  <Feather name="activity" size={11} color="#15803d" />
                  <Text style={styles.telemetryChipText}>
                    {farm.npk ? farm.npk : 'NPK Telemetry Synced'}
                  </Text>
                </View>
                <View style={styles.consultPromptWrap}>
                  <Text style={styles.consultPromptText}>Consult Plot</Text>
                  <Feather name="arrow-right" size={12} color="#15803d" />
                </View>
              </View>

              {/* 1-Tap Quick Action Prompts */}
              <View style={styles.cardQuickPromptsWrap}>
                <Text style={styles.quickPromptsLabel}>Quick ask:</Text>
                <View style={styles.quickPromptsRow}>
                  {QUICK_PROMPTS.map(qp => (
                    <TouchableOpacity
                      key={qp.id}
                      style={styles.quickPromptBtn}
                      onPress={() => selectFarm(farm)}
                      activeOpacity={0.8}
                    >
                      <Feather name={qp.icon as any} size={10} color="#15803d" />
                      <Text style={styles.quickPromptBtnText}>{qp.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* ── Information Guide Card ─────────────────────────────────────── */}
        <View style={styles.guideCard}>
          <View style={styles.guideIconWrap}>
            <Feather name="info" size={16} color="#0369a1" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.guideTitle}>
              {langMl ? 'വ്യക്തിഗത കൃഷി നിർദ്ദേശങ്ങൾ' : 'Plot-Specific Context'}
            </Text>
            <Text style={styles.guideText}>
              {langMl
                ? 'നിങ്ങൾ തിരഞ്ഞെടുക്കുന്ന തോട്ടത്തിന്റെ മണ്ണിന്റെ സ്വഭാവം, നിലവിലെ രോഗ സാധ്യത, കാലാവസ്ഥ എന്നിവ അടിസ്ഥാനമാക്കി കൃത്യമായ പരിഹാരങ്ങൾ നൽകുന്നു.'
                : 'When you select a plot, the assistant loads that plot\'s real-time soil telemetry, historical crop cycles, and hyperlocal rainfall forecast for precise answers.'}
            </Text>
          </View>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles matching NatureSync Theme ─────────────────────────────────────────
const styles = StyleSheet.create({
  headerSafe: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: 12,
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  headerActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  headerSub: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803d',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  langBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803d',
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 110,
    gap: 14,
  },

  // ── Hero Agent Showcase Card with Farm Photography ──────────────────────────
  agentHeroCard: {
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 175,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  heroImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.64)',
  },
  heroContent: {
    padding: 16,
    gap: 8,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  heroStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  statusDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  heroStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#86efac',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 2,
    letterSpacing: -0.2,
  },
  heroDesc: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 17,
  },
  heroTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  heroTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 99,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  heroTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },

  // ── Stats Strip ──────────────────────────────────────────────────────────────
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  statPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  statPillBold: {
    fontWeight: '800',
    color: '#0f172a',
  },

  // ── Section Header ───────────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  sectionSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  addPlotShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  addPlotShortcutText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },

  // ── Controls (Search + Filters) ──────────────────────────────────────────────
  controlsWrap: {
    gap: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '500',
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterPillActive: {
    backgroundColor: '#15803d',
    borderColor: '#15803d',
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  filterPillTextActive: {
    color: '#ffffff',
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // ── Loading & Error ──────────────────────────────────────────────────────────
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  errorTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#dc2626',
  },
  errorText: {
    fontSize: 11,
    color: '#dc2626',
    marginTop: 2,
  },
  retryBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  retryBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },

  // ── Empty State ──────────────────────────────────────────────────────────────
  emptyBox: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
    marginTop: 6,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptyText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#15803d',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 8,
    shadowColor: '#15803d',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  emptyAddBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },

  // ── No Results ───────────────────────────────────────────────────────────────
  noResultsBox: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 6,
  },
  noResultsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  noResultsSub: {
    fontSize: 11,
    color: '#94a3b8',
  },
  resetFilterBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  resetFilterBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },

  // ── Rich Plot Cards ──────────────────────────────────────────────────────────
  fieldCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 10,
  },
  cardMainRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  cardThumb: {
    width: 60,
    height: 60,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  cardTopMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardPlotId: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  cardStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 99,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
  },
  statusDotSmall: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  cardStatusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  cardName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardLocationText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  cardDotSeparator: {
    fontSize: 10,
    color: '#cbd5e1',
  },
  cardAcresText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803d',
  },

  // Card Telemetry Row
  cardTelemetryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  telemetryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  telemetryChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  consultPromptWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  consultPromptText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803d',
  },

  // 1-Tap Quick Action Prompts
  cardQuickPromptsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 2,
  },
  quickPromptsLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  quickPromptsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    flex: 1,
  },
  quickPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  quickPromptBtnText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#15803d',
  },

  // ── Guide Card ───────────────────────────────────────────────────────────────
  guideCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#bae6fd',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  guideIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  guideTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0369a1',
  },
  guideText: {
    fontSize: 11,
    color: '#075985',
    lineHeight: 16,
    marginTop: 2,
  },
});
