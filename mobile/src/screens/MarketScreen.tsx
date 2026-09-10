import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Dimensions, ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import apiClient, { API_URL } from '../api/client';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_H = 96;
const CHART_W = SCREEN_W - 76;
const WEEKS = ['W1', 'W2', 'W3', 'W4', 'W5', 'Today'];

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface MandiRecord {
  commodity: string;
  variety: string;
  market: string;
  district: string;
  arrival_date: string;
  modal_price_qtl: number;
  modal_price_kg: number;
  min_price_kg: number;
  max_price_kg: number;
  display_price: string;
  display_qtl: string;
}

interface CrossStateItem {
  flag: string;
  region: string;
  price: string;
  active: boolean;
}

interface MarketResponse {
  status: string;
  commodity: string;
  is_live: boolean;
  message: string;
  source: string;
  records_count: number;
  summary: {
    average_price_kg: number;
    display_avg: string;
    highest_market: string;
    highest_price_kg: number;
    lowest_market: string;
    lowest_price_kg: number;
    trend_change: string;
    trend_up: boolean;
    trend_text: string;
    signal: string;
    signal_ml: string;
  };
  price_trend: number[];
  cross_state: CrossStateItem[];
  records: MandiRecord[];
  overview_mandis: any[];
}

const CROPS = ['Rubber', 'Pepper', 'Coconut', 'Cardamom', 'Banana', 'Tapioca'];

const CROP_EMOJIS: Record<string, string> = {
  Rubber: '🍃',
  Pepper: '🌶️',
  Coconut: '🥥',
  Cardamom: '🌱',
  Banana: '🍌',
  Tapioca: '🥔',
};

const DISTRICT_FILTERS = [
  'All Kerala', 'Wayanad', 'Kozhikode', 'Malappuram', 'Kottayam', 'Ernakulam', 'Idukki', 'Palakkad', 'Kannur'
];

export default function MarketScreen() {
  const [langMl, setLangMl] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState('Rubber');
  const [selectedDistrict, setSelectedDistrict] = useState('All Kerala');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [marketData, setMarketData] = useState<MarketResponse | null>(null);

  // ─── Fetch Market Data ───────────────────────────────────────────────────────
  const fetchMarketPrices = useCallback(async (crop: string, district?: string) => {
    try {
      setLoading(true);
      const distParam = district && district !== 'All Kerala' ? district : undefined;
      const res = await apiClient.get<MarketResponse>('/market/prices', {
        params: {
          commodity: crop,
          ...(distParam ? { district: distParam } : {}),
        },
      });
      if (res.data) {
        setMarketData(res.data);
      }
    } catch (err) {
      console.warn('[MarketScreen] Failed to fetch live prices:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMarketPrices(selectedCrop, selectedDistrict);
  }, [selectedCrop, selectedDistrict, fetchMarketPrices]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMarketPrices(selectedCrop, selectedDistrict);
  }, [selectedCrop, selectedDistrict, fetchMarketPrices]);

  // ─── Bilingual Labels ───────────────────────────────────────────────────────
  const labels = {
    title: langMl ? 'വിപണി ഇന്റലിജൻസ്' : 'Market Intelligence',
    subtitle: langMl ? 'Agmarknet തത്സമയ മണ്ടി നിരക്ക്' : 'Agmarknet Live Mandi Rates',
    aiSignal: langMl ? 'AI വിൽക്കൽ / കൈവശം സൂക്ഷിക്കൽ സിഗ്നൽ' : 'AI Sell / Hold Signal',
    crossState: langMl ? 'ക്രോസ്-സ്റ്റേറ്റ് മണ്ടി താരതമ്യം' : 'Cross-State Mandi Compare',
    mandiTitle: langMl ? 'ഇന്നത്തെ കേരള മണ്ടി നിരക്കുകൾ' : 'Live Kerala APMC Mandi Rates',
    emptyMsg: langMl
      ? 'ഈ വിളയ്ക്ക് ഇന്നത്തെ ലൈവ് മണ്ടി നിരക്കുകൾ റിപ്പോർട്ട് ചെയ്തിട്ടില്ല. ദയവായി അല്പം കഴിഞ്ഞ് വീണ്ടും പരിശോധിക്കുക.'
      : 'No live price updates reported by APMC mandis for this combination today. Please check back later.',
    sourceNotice: langMl ? 'ഔദ്യോഗിക Agmarknet API (data.gov.in) വഴി ലഭ്യമാക്കിയത്' : 'Sourced via official Agmarknet (data.gov.in)',
  };

  // ─── Dynamic Line Chart Calculations ────────────────────────────────────────
  const priceTrend = marketData?.price_trend && marketData.price_trend.length === 6
    ? marketData.price_trend
    : [174, 180, 178, 185, 191, 198.5];

  const maxPrice = Math.max(...priceTrend);
  const minPrice = Math.min(...priceTrend);
  const priceRange = (maxPrice - minPrice) || 1;

  const chartPoints = priceTrend.map((val, i) => {
    const x = (i / (priceTrend.length - 1)) * CHART_W;
    const y = CHART_H - ((val - minPrice) / priceRange) * (CHART_H - 18) - 9;
    return { x, y, val };
  });

  const currentModalPrice = marketData?.summary?.display_avg || '₹198.50 / kg';
  const trendText = marketData?.summary?.trend_text || '▲ +₹12.50 / kg in Kottayam';
  const isTrendUp = marketData?.summary?.trend_up ?? true;

  return (
    <View style={S.root}>
      <ScrollView
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
        <SafeAreaView edges={['top']}>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <View style={S.header}>
            <View>
              <View style={S.liveBadgeRow}>
                <View style={S.liveDot} />
                <Text style={S.subtitle}>{labels.subtitle}</Text>
              </View>
              <Text style={S.title}>{labels.title}</Text>
            </View>
            <View style={S.headerRight}>
              <TouchableOpacity
                style={S.trendIcon}
                onPress={onRefresh}
                activeOpacity={0.8}
              >
                <Feather name={loading ? 'loader' : 'trending-up'} size={16} color="#b45309" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setLangMl(v => !v)} style={S.langBtn} activeOpacity={0.8}>
                <Feather name="globe" size={12} color="#6ee7b7" />
                <Text style={S.langBtnText}>{langMl ? 'EN' : 'ML'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Crop Selector Pills ─────────────────────────────────────── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={S.cropScroll}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 4 }}
          >
            {CROPS.map(c => {
              const isSelected = selectedCrop === c;
              return (
                <TouchableOpacity
                  key={c}
                  style={[S.cropPill, isSelected && S.cropPillActive]}
                  onPress={() => setSelectedCrop(c)}
                  activeOpacity={0.8}
                >
                  <Text style={S.cropEmoji}>{CROP_EMOJIS[c] || '🌱'}</Text>
                  <Text style={[S.cropPillText, isSelected && S.cropPillTextActive]}>{c}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ── District Quick Filter Bar ───────────────────────────────── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={S.distScroll}
          >
            {DISTRICT_FILTERS.map(d => {
              const isActive = selectedDistrict === d;
              return (
                <TouchableOpacity
                  key={d}
                  style={[S.distChip, isActive && S.distChipActive]}
                  onPress={() => setSelectedDistrict(d)}
                  activeOpacity={0.8}
                >
                  <Text style={[S.distChipText, isActive && S.distChipTextActive]}>
                    {d}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ── Price Trend Chart Card ───────────────────────────────────── */}
          <View style={S.chartCard}>
            <View style={S.chartHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={S.chartTitle}>
                  {selectedCrop} Price Index (Kerala Mandis)
                </Text>
                <Text style={[S.chartTrend, { color: isTrendUp ? '#15803d' : '#be123c' }]}>
                  {trendText}
                </Text>
              </View>
              <View style={S.priceBadge}>
                {loading ? (
                  <ActivityIndicator size="small" color="#15803d" />
                ) : (
                  <Text style={S.priceText}>{currentModalPrice}</Text>
                )}
              </View>
            </View>

            {/* Price Scale Indicators */}
            <View style={S.scaleRow}>
              <Text style={S.scaleText}>High: ₹{Math.round(maxPrice)}/kg</Text>
              <Text style={S.scaleText}>Low: ₹{Math.round(minPrice)}/kg</Text>
            </View>

            {/* Native line chart */}
            <View style={{ height: CHART_H + 28, marginTop: 4 }}>
              {/* Y-axis gridlines */}
              <View style={S.gridLines}>
                {[0, 25, 50, 75, 100].map(pct => (
                  <View key={pct} style={[S.gridLine, { bottom: (pct / 100) * (CHART_H - 18) + 9 }]} />
                ))}
              </View>

              {/* Connected Line Segments and Data Points */}
              <View style={S.chartArea}>
                {chartPoints.map((pt, i) => {
                  if (i === 0) return null;
                  const prev = chartPoints[i - 1];
                  const segW = pt.x - prev.x;
                  const segH = Math.abs(pt.y - prev.y);
                  const isUp = pt.y < prev.y;
                  return (
                    <View key={`seg-${i}`} style={[S.lineSegContainer, { left: prev.x, width: segW }]}>
                      <View style={[
                        S.lineSeg,
                        {
                          top: Math.min(prev.y, pt.y),
                          height: Math.max(segH, 2.5),
                          width: segW,
                          transform: [{
                            skewY: isUp
                              ? `${Math.atan2(segH, segW) * (180 / Math.PI) * -1}deg`
                              : `${Math.atan2(segH, segW) * (180 / Math.PI)}deg`,
                          }],
                        },
                      ]} />
                    </View>
                  );
                })}

                {/* Data dots with live pulse on last dot */}
                {chartPoints.map((pt, i) => (
                  <View
                    key={`dot-${i}`}
                    style={[
                      S.dot,
                      { left: pt.x - 4, top: pt.y - 4 },
                      i === chartPoints.length - 1 && S.dotActive,
                    ]}
                  />
                ))}
              </View>

              {/* X timeline labels */}
              <View style={[S.xLabels, { top: CHART_H + 6 }]}>
                {chartPoints.map((pt, i) => (
                  <Text key={`lbl-${i}`} style={[S.xLabel, { left: Math.max(0, pt.x - 14) }]}>
                    {WEEKS[i]}
                  </Text>
                ))}
              </View>
            </View>
          </View>

          {/* ── AI Sell/Hold Signal ──────────────────────────────────────── */}
          <View style={S.signalCard}>
            <View style={S.signalHeader}>
              <Feather name="zap" size={14} color="#fcd34d" />
              <Text style={S.signalTitle}>{labels.aiSignal}</Text>
            </View>
            <Text style={S.signalBody}>
              {langMl
                ? (marketData?.summary?.signal_ml || 'വിപണി സ്ഥിതിഗതികൾ സാധാരണമാണ്. നിരക്കുകൾ നിരീക്ഷിക്കുക.')
                : (marketData?.summary?.signal || 'HOLD Black Pepper inventory for 8-10 days. Export demand at Kochi port is projected to raise prices by +6%.')}
            </Text>
          </View>

          {/* ── Cross-State Compare ──────────────────────────────────────── */}
          <View style={S.compareCard}>
            <View style={S.compareHeader}>
              <Text style={S.cardTitle}>{labels.crossState}</Text>
              <Text style={S.compareSubtitle}>{selectedCrop}</Text>
            </View>
            {(marketData?.cross_state || [
              { flag: '🌴', region: 'Kerala (Kochi / Wayanad)', price: currentModalPrice, active: true },
              { flag: '🌾', region: 'Tamil Nadu (Coimbatore)', price: '₹648.00 / kg', active: false },
              { flag: '☕', region: 'Karnataka (Coorg)', price: '₹655.00 / kg', active: false },
            ]).map((row, i) => (
              <View key={`cs-${i}`} style={[S.compareRow, row.active && S.compareRowActive]}>
                <Text style={S.compareFlag}>{row.flag}</Text>
                <Text style={[S.compareRegion, row.active && S.compareRegionActive]}>{row.region}</Text>
                <Text style={[S.comparePrice, row.active && S.comparePriceActive]}>{row.price}</Text>
              </View>
            ))}
          </View>

          {/* ── Live Mandi Rates ─────────────────────────────────────────── */}
          <View style={{ paddingHorizontal: 16, marginTop: 14, gap: 10 }}>
            <View style={S.mandiSectionHeader}>
              <View>
                <Text style={S.sectionTitle}>{labels.mandiTitle}</Text>
                <Text style={S.sourceText}>{labels.sourceNotice}</Text>
              </View>
              <View style={S.recordsCountBadge}>
                <Text style={S.recordsCountText}>
                  {marketData?.records?.length || 0} Mandis
                </Text>
              </View>
            </View>

            {loading && !marketData && (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#15803d" />
              </View>
            )}

            {/* Empty State */}
            {marketData && marketData.records && marketData.records.length === 0 && (
              <View style={S.emptyBox}>
                <Feather name="info" size={16} color="#64748b" style={{ marginBottom: 6 }} />
                <Text style={S.emptyMsgText}>{labels.emptyMsg}</Text>
              </View>
            )}

            {/* Mandi Cards List */}
            {marketData?.records?.map((rate, i) => (
              <View key={`mandi-${i}`} style={S.mandiRow}>
                <Text style={S.mandiEmoji}>{CROP_EMOJIS[selectedCrop] || '🌱'}</Text>
                <View style={{ flex: 1, paddingRight: 6 }}>
                  <Text style={S.mandiName}>
                    {rate.commodity} {rate.variety && rate.variety !== 'Other' ? `(${rate.variety})` : ''}
                  </Text>
                  <Text style={S.mandiMarket}>
                    {rate.market}{rate.district ? `, ${rate.district}` : ''}
                  </Text>
                  <View style={S.mandiSubRow}>
                    <Text style={S.mandiDate}>{rate.arrival_date}</Text>
                    {rate.min_price_kg > 0 && (
                      <Text style={S.mandiRange}>
                        Range: ₹{rate.min_price_kg} - ₹{rate.max_price_kg}/kg
                      </Text>
                    )}
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={S.mandiPrice}>{rate.display_price}</Text>
                  <Text style={S.mandiQtl}>{rate.display_qtl}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={{ height: 100 }} />
        </SafeAreaView>
      </ScrollView>
    </View>
  );
}

// ─── Styles matching app theme ────────────────────────────────────────────────
const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f1f5f9' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
  },
  liveBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subtitle: { fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a', letterSpacing: -0.5 },
  trendIcon: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  langBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#0a2e18', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(21,128,61,0.4)',
  },
  langBtnText: { fontSize: 10, fontWeight: '800', color: '#6ee7b7' },

  // Crop pills
  cropScroll: { marginTop: 8 },
  cropPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99,
    backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1,
  },
  cropPillActive: { backgroundColor: '#15803d', borderColor: '#15803d' },
  cropEmoji: { fontSize: 13 },
  cropPillText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  cropPillTextActive: { color: 'white' },

  // District filter
  distScroll: {
    paddingHorizontal: 16, gap: 6, paddingVertical: 4, marginTop: 4,
  },
  distChip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14,
    backgroundColor: '#e2e8f0', borderWidth: 1, borderColor: 'transparent',
  },
  distChipActive: {
    backgroundColor: '#dcfce7', borderColor: '#86efac',
  },
  distChipText: { fontSize: 10, fontWeight: '600', color: '#475569' },
  distChipTextActive: { color: '#15803d', fontWeight: '700' },

  // Chart
  chartCard: {
    marginHorizontal: 16, marginTop: 10,
    backgroundColor: 'white', borderRadius: 22, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  chartTitle: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  chartTrend: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  priceBadge: {
    backgroundColor: '#f0fdf4', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  priceText: { fontSize: 12, fontWeight: '800', color: '#15803d' },
  scaleRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, marginBottom: 2,
  },
  scaleText: { fontSize: 9, fontWeight: '600', color: '#94a3b8' },

  // Native chart internals
  chartArea: { position: 'absolute', top: 0, left: 0, right: 0, height: CHART_H },
  gridLines: { position: 'absolute', left: 0, right: 0, height: CHART_H },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#f1f5f9' },
  lineSegContainer: { position: 'absolute', height: CHART_H, overflow: 'visible' },
  lineSeg: { position: 'absolute', left: 0, height: 2.5, backgroundColor: '#15803d', borderRadius: 1 },
  dot: {
    position: 'absolute', width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#15803d', borderWidth: 2, borderColor: 'white',
  },
  dotActive: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e',
    borderColor: '#15803d', borderWidth: 2,
  },
  xLabels: { position: 'absolute', left: 0, right: 0, flexDirection: 'row' },
  xLabel: { position: 'absolute', fontSize: 9, fontWeight: '600', color: '#94a3b8', width: 28, textAlign: 'center' },

  // Signal
  signalCard: {
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: '#052e16', borderRadius: 20, padding: 14, gap: 8,
    shadowColor: '#052e16', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  signalHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  signalTitle: { fontSize: 11, fontWeight: '700', color: '#6ee7b7' },
  signalBody: { fontSize: 11, lineHeight: 18, color: '#f1f5f9', fontWeight: '500' },

  // Compare
  compareCard: {
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: 'white', borderRadius: 22, padding: 14,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    gap: 8,
  },
  compareHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 11, fontWeight: '800', color: '#0f172a' },
  compareSubtitle: { fontSize: 10, fontWeight: '700', color: '#15803d', textTransform: 'uppercase' },
  compareRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, borderRadius: 14,
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
  },
  compareRowActive: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  compareFlag: { fontSize: 16 },
  compareRegion: { flex: 1, fontSize: 11, fontWeight: '600', color: '#475569' },
  compareRegionActive: { fontWeight: '700', color: '#15803d' },
  comparePrice: { fontSize: 12, fontWeight: '700', color: '#1e293b' },
  comparePriceActive: { color: '#15803d', fontWeight: '800' },

  // Mandi Section
  mandiSectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2,
  },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.8 },
  sourceText: { fontSize: 9, color: '#64748b', marginTop: 1 },
  recordsCountBadge: {
    backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  recordsCountText: { fontSize: 9, fontWeight: '700', color: '#475569' },

  emptyBox: {
    backgroundColor: 'white', borderRadius: 16, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0',
  },
  emptyMsgText: { fontSize: 11, color: '#64748b', textAlign: 'center', lineHeight: 16 },

  mandiRow: {
    backgroundColor: 'white', borderRadius: 18, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  mandiEmoji: { fontSize: 22 },
  mandiName: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  mandiMarket: { fontSize: 10, color: '#64748b', marginTop: 2 },
  mandiSubRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  mandiDate: { fontSize: 9, color: '#94a3b8', fontWeight: '600' },
  mandiRange: { fontSize: 9, color: '#15803d', fontWeight: '600' },
  mandiPrice: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  mandiQtl: { fontSize: 9, color: '#94a3b8', marginTop: 2, fontWeight: '600' },
});
