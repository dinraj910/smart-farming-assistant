import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── 7-day rainfall data (mm) ─────────────────────────────────────────────────
const RAINFALL = [
  { day: 'Mon', mm: 18,  isToday: true  },
  { day: 'Tue', mm: 52,  isToday: false },
  { day: 'Wed', mm: 35,  isToday: false },
  { day: 'Thu', mm: 10,  isToday: false },
  { day: 'Fri', mm: 70,  isToday: false },
  { day: 'Sat', mm: 42,  isToday: false },
  { day: 'Sun', mm: 15,  isToday: false },
];

const MAX_MM = Math.max(...RAINFALL.map(d => d.mm));
const BAR_MAX_H = 80;

// ─── 5-day forecast ───────────────────────────────────────────────────────────
const FORECAST = [
  { day: 'Mon', icon: 'cloud-rain',  high: '32°', low: '24°', rain: '92%' },
  { day: 'Tue', icon: 'cloud-rain',  high: '30°', low: '23°', rain: '88%' },
  { day: 'Wed', icon: 'cloud',       high: '33°', low: '25°', rain: '60%' },
  { day: 'Thu', icon: 'sun',         high: '36°', low: '27°', rain: '15%' },
  { day: 'Fri', icon: 'cloud-rain',  high: '29°', low: '22°', rain: '95%' },
];

export default function WeatherScreen() {
  const [langMl, setLangMl] = useState(false);

  const labels = {
    region: langMl ? 'പാലക്കാട് & വയനാട്' : 'Palakkad & Wayanad',
    title: langMl ? 'കാലാവസ്ഥ റഡാർ' : 'Weather Radar',
    advisory: langMl ? 'ഇന്ന് വളം തളിക്കുന്നത് ഒഴിവാക്കുക' : 'Hold Spraying Fertilizers Today',
    advisoryBody: langMl
      ? 'മഴ കാരണം ബോർഡോ മിശ്രിതം കഴുകിപ്പോകാൻ സാധ്യതയുണ്ട്. വെള്ളിയാഴ്ചത്തേക്ക് മാറ്റുക.'
      : 'Monsoon rainfall will wash away Bordeaux sprays. Reschedule for Friday morning.',
    chart: langMl ? '7 ദിവസത്തെ മഴ നിലവാരം (mm)' : '7-Day Rainfall Forecast (mm)',
    forecast: langMl ? '5 ദിവസ പ്രവചനം' : '5-Day Forecast',
  };

  return (
    <View style={S.root}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <SafeAreaView edges={['top']}>

          {/* ── Page Header ─────────────────────────────────────────────── */}
          <View style={S.header}>
            <View>
              <Text style={S.regionText}>{labels.region}</Text>
              <Text style={S.titleText}>{labels.title}</Text>
            </View>
            <View style={S.headerRight}>
              <TouchableOpacity style={S.cloudIcon}>
                <Feather name="cloud-rain" size={16} color="#0369a1" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setLangMl(v => !v)} style={S.langBtn}>
                <Feather name="globe" size={12} color="#6ee7b7" />
                <Text style={S.langBtnText}>{langMl ? 'EN' : 'ML'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Hero Dark Weather Card ───────────────────────────────────── */}
          <View style={S.heroCard}>
            <View style={S.heroTop}>
              <View>
                <Text style={S.heroRegion}>Monsoon Rainfall Radar</Text>
                <Text style={S.heroTemp}>29°C</Text>
                <Text style={S.heroSub}>Heavy rain expected around 3:30 PM</Text>
              </View>
              <Feather name="cloud-lightning" size={36} color="#fcd34d" />
            </View>

            {/* Stats row */}
            <View style={S.statsRow}>
              {[
                { label: 'Humidity', value: '88%',      color: 'white' },
                { label: 'Rain Risk', value: '92%',     color: '#7dd3fc' },
                { label: 'Wind',      value: '24 km/h', color: 'white' },
              ].map(stat => (
                <View key={stat.label} style={S.statBox}>
                  <Text style={S.statLabel}>{stat.label}</Text>
                  <Text style={[S.statValue, { color: stat.color }]}>{stat.value}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Amber Advisory Box ───────────────────────────────────────── */}
          <View style={S.advisoryBox}>
            <Feather name="alert-circle" size={16} color="#d97706" style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={S.advisoryTitle}>{labels.advisory}</Text>
              <Text style={S.advisoryBody}>{labels.advisoryBody}</Text>
            </View>
          </View>

          {/* ── Rainfall Bar Chart ───────────────────────────────────────── */}
          <View style={S.chartCard}>
            <Text style={S.chartTitle}>{labels.chart}</Text>
            <View style={S.barChart}>
              {RAINFALL.map((d, i) => {
                const barH = (d.mm / MAX_MM) * BAR_MAX_H;
                return (
                  <View key={i} style={S.barCol}>
                    <Text style={S.barValue}>{d.mm}</Text>
                    <View style={S.barTrack}>
                      <View style={[
                        S.barFill,
                        { height: barH, backgroundColor: d.isToday ? '#15803d' : '#86efac' },
                      ]} />
                    </View>
                    <Text style={[S.barDay, d.isToday && { color: '#15803d', fontWeight: '800' }]}>{d.day}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* ── 5-Day Forecast ───────────────────────────────────────────── */}
          <View style={S.forecastCard}>
            <Text style={S.sectionTitle}>{labels.forecast}</Text>
            {FORECAST.map((f, i) => (
              <View key={i} style={[S.forecastRow, i < FORECAST.length - 1 && S.forecastRowBorder]}>
                <Text style={S.forecastDay}>{f.day}</Text>
                <Feather name={f.icon as any} size={18} color={f.icon.includes('sun') ? '#f59e0b' : f.icon.includes('rain') ? '#0ea5e9' : '#64748b'} />
                <View style={S.forecastRight}>
                  <Text style={S.forecastHigh}>{f.high}</Text>
                  <Text style={S.forecastLow}>{f.low}</Text>
                </View>
                <View style={[S.rainChance, { backgroundColor: parseFloat(f.rain) > 70 ? '#e0f2fe' : '#f0fdf4' }]}>
                  <Feather name="droplet" size={10} color={parseFloat(f.rain) > 70 ? '#0369a1' : '#15803d'} />
                  <Text style={[S.rainChanceText, { color: parseFloat(f.rain) > 70 ? '#0369a1' : '#15803d' }]}>{f.rain}</Text>
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
  regionText: { fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 },
  titleText: { fontSize: 20, fontWeight: '800', color: '#0f172a', letterSpacing: -0.5 },
  cloudIcon: {
    width: 36, height: 36, borderRadius: 14,
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

  // Hero card
  heroCard: {
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: '#0f172a',
    borderRadius: 24, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
    gap: 14,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroRegion: { fontSize: 10, fontWeight: '700', color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  heroTemp: { fontSize: 30, fontWeight: '800', color: 'white', lineHeight: 34 },
  heroSub: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  statsRow: {
    flexDirection: 'row', gap: 8,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 12,
  },
  statBox: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 10, alignItems: 'center',
  },
  statLabel: { fontSize: 9, color: '#94a3b8', marginBottom: 4 },
  statValue: { fontSize: 12, fontWeight: '700' },

  // Advisory
  advisoryBox: {
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: '#fffbeb', borderRadius: 20, padding: 12,
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    borderWidth: 1, borderColor: '#fde68a',
  },
  advisoryTitle: { fontSize: 12, fontWeight: '700', color: '#92400e' },
  advisoryBody: { fontSize: 10, color: '#78350f', marginTop: 4, lineHeight: 16 },

  // Chart
  chartCard: {
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: 'white', borderRadius: 22, padding: 14,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  chartTitle: { fontSize: 11, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: BAR_MAX_H + 40 },
  barCol: { alignItems: 'center', gap: 4, flex: 1 },
  barValue: { fontSize: 8, fontWeight: '700', color: '#64748b' },
  barTrack: {
    width: 22, height: BAR_MAX_H,
    backgroundColor: '#f1f5f9', borderRadius: 6,
    justifyContent: 'flex-end', overflow: 'hidden',
  },
  barFill: { width: '100%', borderRadius: 6 },
  barDay: { fontSize: 9, fontWeight: '600', color: '#94a3b8' },

  // Forecast
  forecastCard: {
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: 'white', borderRadius: 22, padding: 14,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    gap: 0,
  },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  forecastRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  forecastRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  forecastDay: { fontSize: 12, fontWeight: '700', color: '#334155', width: 36 },
  forecastRight: { flex: 1, flexDirection: 'row', gap: 8 },
  forecastHigh: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  forecastLow: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  rainChance: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 4 },
  rainChanceText: { fontSize: 10, fontWeight: '700' },
});
