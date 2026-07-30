import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Price trend data (Rubber RSS-4, weekly) ─────────────────────────────────
const PRICE_TREND = [174, 180, 178, 185, 191, 198.5];
const WEEKS = ['W1', 'W2', 'W3', 'W4', 'W5', 'Today'];
const MAX_PRICE = Math.max(...PRICE_TREND);
const MIN_PRICE = Math.min(...PRICE_TREND);
const CHART_H = 90;
const CHART_W = SCREEN_W - 80;

// ─── Live mandi rates ─────────────────────────────────────────────────────────
const MANDI_RATES = [
  { emoji: '🥥', name: 'Raw Coconut (നാളികേരം)', market: 'Nedumangad Market',    price: '₹38.50 / kg', change: '+₹2.00',  up: true  },
  { emoji: '🌱', name: 'Green Cardamom (ഏലക്ക)', market: 'Spices Board Auction', price: '₹2,450 / kg', change: '-₹35.00', up: false },
  { emoji: '🌶️', name: 'Black Pepper (കുരുമുളക്)', market: 'Kochi Auction Center', price: '₹640 / kg',   change: '+₹18.00', up: true  },
  { emoji: '🍃', name: 'Rubber RSS-4',             market: 'Kottayam Market',     price: '₹198.50/kg',  change: '+₹12.50', up: true  },
];

// ─── Cross-state compare ──────────────────────────────────────────────────────
const CROSS_STATE = [
  { flag: '🌴', region: 'Kerala (Kochi / Wayanad)', price: '₹640 / kg', active: true  },
  { flag: '🌾', region: 'Tamil Nadu (Coimbatore)',  price: '₹622 / kg', active: false },
  { flag: '☕', region: 'Karnataka (Coorg)',         price: '₹631 / kg', active: false },
];

export default function MarketScreen() {
  const [langMl, setLangMl] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState('Rubber');

  const crops = ['Rubber', 'Pepper', 'Coconut', 'Cardamom'];

  const labels = {
    title:     langMl ? 'വിപണി ഇന്റലിജൻസ്' : 'Market Intelligence',
    subtitle:  langMl ? 'Agmarknet മണ്ടി നിരക്ക്' : 'Agmarknet Mandi Rates',
    aiSignal:  langMl ? 'AI വിൽക്കൽ / കൈവശം സൂക്ഷിക്കൽ സിഗ്നൽ' : 'AI Sell / Hold Signal',
    crossState: langMl ? 'ക്രോസ്-സ്റ്റേറ്റ് മണ്ടി താരതമ്യം' : 'Cross-State Mandi Compare',
    mandiTitle: langMl ? 'ഇന്നത്തെ കേരള മണ്ടി നിരക്ക്' : 'Kerala Mandi Rates Today',
  };

  // Build a simple SVG-like line chart using Views
  const chartPoints = PRICE_TREND.map((val, i) => {
    const x = (i / (PRICE_TREND.length - 1)) * CHART_W;
    const y = CHART_H - ((val - MIN_PRICE) / (MAX_PRICE - MIN_PRICE)) * CHART_H;
    return { x, y, val };
  });

  return (
    <View style={S.root}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <SafeAreaView edges={['top']}>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <View style={S.header}>
            <View>
              <Text style={S.subtitle}>{labels.subtitle}</Text>
              <Text style={S.title}>{labels.title}</Text>
            </View>
            <View style={S.headerRight}>
              <View style={S.trendIcon}>
                <Feather name="trending-up" size={16} color="#b45309" />
              </View>
              <TouchableOpacity onPress={() => setLangMl(v => !v)} style={S.langBtn}>
                <Feather name="globe" size={12} color="#6ee7b7" />
                <Text style={S.langBtnText}>{langMl ? 'EN' : 'ML'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Crop Selector Pills ─────────────────────────────────────── */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.cropScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 4 }}>
            {crops.map(c => (
              <TouchableOpacity
                key={c}
                style={[S.cropPill, selectedCrop === c && S.cropPillActive]}
                onPress={() => setSelectedCrop(c)}
              >
                <Text style={[S.cropPillText, selectedCrop === c && S.cropPillTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ── Price Trend Chart Card ───────────────────────────────────── */}
          <View style={S.chartCard}>
            <View style={S.chartHeader}>
              <View>
                <Text style={S.chartTitle}>
                  {selectedCrop === 'Rubber' ? 'Rubber RSS-4 Price Index' : `${selectedCrop} Price Index`}
                </Text>
                <Text style={S.chartTrend}>▲ +₹12.50 / kg in Kottayam</Text>
              </View>
              <View style={S.priceBadge}>
                <Text style={S.priceText}>₹198.50/kg</Text>
              </View>
            </View>

            {/* Native line chart */}
            <View style={{ height: CHART_H + 28, marginTop: 8 }}>
              {/* Y-axis gridlines */}
              <View style={S.gridLines}>
                {[0, 25, 50, 75, 100].map(pct => (
                  <View key={pct} style={[S.gridLine, { bottom: (pct / 100) * CHART_H }]} />
                ))}
              </View>

              {/* Area fill (approximate with view) */}
              <View style={S.chartArea}>
                {chartPoints.map((pt, i) => {
                  if (i === 0) return null;
                  const prev = chartPoints[i - 1];
                  const segW = pt.x - prev.x;
                  const segH = Math.abs(pt.y - prev.y);
                  const isUp = pt.y < prev.y;
                  return (
                    <View key={i} style={[S.lineSegContainer, { left: prev.x, width: segW }]}>
                      {/* Line segment */}
                      <View style={[
                        S.lineSeg,
                        {
                          top: Math.min(prev.y, pt.y),
                          height: Math.max(segH, 2),
                          width: segW,
                          transform: [{ skewY: isUp ? `${Math.atan2(segH, segW) * (180 / Math.PI) * -1}deg` : `${Math.atan2(segH, segW) * (180 / Math.PI)}deg` }],
                        },
                      ]} />
                    </View>
                  );
                })}

                {/* Data dots */}
                {chartPoints.map((pt, i) => (
                  <View key={i} style={[S.dot, { left: pt.x - 4, top: pt.y - 4 }]} />
                ))}
              </View>

              {/* X labels */}
              <View style={[S.xLabels, { top: CHART_H + 8 }]}>
                {chartPoints.map((pt, i) => (
                  <Text key={i} style={[S.xLabel, { left: pt.x - 12 }]}>{WEEKS[i]}</Text>
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
              <Text style={{ fontWeight: '700', color: 'white' }}>HOLD Black Pepper inventory for 8 days. </Text>
              <Text style={{ color: '#cbd5e1' }}>Export demand at Kochi port is predicted to raise prices by </Text>
              <Text style={{ fontWeight: '700', color: '#fcd34d' }}>+6%</Text>
              <Text style={{ color: '#cbd5e1' }}>.</Text>
            </Text>
          </View>

          {/* ── Cross-State Compare ──────────────────────────────────────── */}
          <View style={S.compareCard}>
            <View style={S.compareHeader}>
              <Text style={S.cardTitle}>{labels.crossState}</Text>
              <Text style={S.compareSubtitle}>Black Pepper</Text>
            </View>
            {CROSS_STATE.map((row, i) => (
              <View key={i} style={[S.compareRow, row.active && S.compareRowActive]}>
                <Text style={S.compareFlag}>{row.flag}</Text>
                <Text style={[S.compareRegion, row.active && S.compareRegionActive]}>{row.region}</Text>
                <Text style={[S.comparePrice, row.active && S.comparePriceActive]}>{row.price}</Text>
              </View>
            ))}
          </View>

          {/* ── Live Mandi Rates ─────────────────────────────────────────── */}
          <View style={{ paddingHorizontal: 16, marginTop: 12, gap: 8 }}>
            <Text style={S.sectionTitle}>{labels.mandiTitle}</Text>
            {MANDI_RATES.map((rate, i) => (
              <View key={i} style={S.mandiRow}>
                <Text style={S.mandiEmoji}>{rate.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={S.mandiName}>{rate.name}</Text>
                  <Text style={S.mandiMarket}>{rate.market}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={S.mandiPrice}>{rate.price}</Text>
                  <Text style={[S.mandiChange, { color: rate.up ? '#15803d' : '#be123c' }]}>
                    {rate.up ? '▲' : '▼'} {rate.change}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={{ height: 90 }} />
        </SafeAreaView>
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f1f5f9' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subtitle: { fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a', letterSpacing: -0.5 },
  trendIcon: {
    width: 36, height: 36, borderRadius: 14,
    backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center',
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
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99,
    backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0',
  },
  cropPillActive: { backgroundColor: '#15803d', borderColor: '#15803d' },
  cropPillText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  cropPillTextActive: { color: 'white' },

  // Chart
  chartCard: {
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: 'white', borderRadius: 22, padding: 14,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  chartTitle: { fontSize: 11, fontWeight: '800', color: '#0f172a' },
  chartTrend: { fontSize: 9, fontWeight: '700', color: '#15803d', marginTop: 2 },
  priceBadge: {
    backgroundColor: '#f0fdf4', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  priceText: { fontSize: 11, fontWeight: '800', color: '#15803d' },

  // Native chart internals
  chartArea: { position: 'absolute', top: 0, left: 0, right: 0, height: CHART_H },
  gridLines: { position: 'absolute', left: 0, right: 0, height: CHART_H },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#f1f5f9' },
  lineSegContainer: { position: 'absolute', height: CHART_H, overflow: 'visible' },
  lineSeg: { position: 'absolute', left: 0, height: 2, backgroundColor: '#15803d', borderRadius: 1 },
  dot: {
    position: 'absolute', width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#15803d', borderWidth: 2, borderColor: 'white',
  },
  xLabels: { position: 'absolute', left: 0, right: 0, flexDirection: 'row' },
  xLabel: { position: 'absolute', fontSize: 9, fontWeight: '600', color: '#94a3b8', width: 24, textAlign: 'center' },

  // Signal
  signalCard: {
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: '#052e16', borderRadius: 20, padding: 14, gap: 8,
    shadowColor: '#052e16', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  signalHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  signalTitle: { fontSize: 11, fontWeight: '700', color: '#6ee7b7' },
  signalBody: { fontSize: 11, lineHeight: 18 },

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
  compareSubtitle: { fontSize: 9, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' },
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

  // Mandi
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.8 },
  mandiRow: {
    backgroundColor: 'white', borderRadius: 18, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  mandiEmoji: { fontSize: 22 },
  mandiName: { fontSize: 11, fontWeight: '700', color: '#0f172a' },
  mandiMarket: { fontSize: 9, color: '#94a3b8', marginTop: 2 },
  mandiPrice: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  mandiChange: { fontSize: 9, fontWeight: '700', marginTop: 2 },
});
