import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, ImageBackground, Image,
  TextInput, TouchableOpacity, StyleSheet, Animated, Alert, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

// ─── Hourly Weather Data ─────────────────────────────────────────────────────
const HOURLY = [
  { hour: '09', icon: 'cloud',      temp: '28°', active: false, color: '#64748b' },
  { hour: '10', icon: 'cloud',      temp: '30°', active: false, color: '#64748b' },
  { hour: '11', icon: 'sun',        temp: '32°', active: true,  color: '#f59e0b' },
  { hour: '12', icon: 'sun',        temp: '36°', active: false, color: '#f59e0b' },
  { hour: '13', icon: 'cloud-rain', temp: '35°', active: false, color: '#0ea5e9' },
  { hour: '14', icon: 'cloud',      temp: '34°', active: false, color: '#64748b' },
];

// ─── Quick Actions ────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { id: 'crop',    icon: 'feather',     label: 'Crop AI',      sub: 'Soil & Yield',   bg: '#dcfce7', color: '#15803d', tab: 'Home'    },
  { id: 'doctor',  icon: 'camera',      label: 'Leaf Doctor',  sub: 'Disease Vision', bg: '#ffe4e6', color: '#be123c', tab: 'Doctor'  },
  { id: 'weather', icon: 'cloud-rain',  label: 'Weather',      sub: 'Rain Alert',     bg: '#e0f2fe', color: '#0369a1', tab: 'Weather' },
  { id: 'market',  icon: 'trending-up', label: 'Mandi Radar',  sub: 'Kerala & TN',    bg: '#fef3c7', color: '#b45309', tab: 'Market'  },
];

// ─── Soil result data ─────────────────────────────────────────────────────────
type LangKey = 'en' | 'ml';

interface HomeScreenProps {
  navigation: any;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const [lang, setLang] = useState<LangKey>('en');
  const [n, setN] = useState('85');
  const [p, setP] = useState('42');
  const [k, setK] = useState('140');
  const [ph, setPh] = useState('6.2');
  const [cropResult, setCropResult] = useState({
    name: 'Black Pepper + Coconut Homestead',
    yield: '96%',
    profit: 'Best match based on your soil profile.',
    alternatives: ['Cocoa', 'Nendran Banana']
  });

  const labels = {
    en: {
      greeting: 'Hello Rajesh Nair',
      date: 'Monday, 30 Jul 2026',
      slogan: 'Farming Made\nSimple, Smarter,\nand Sustainable',
      langBtn: 'മലയാളം',
      quickTitle: 'Quick Assistant Actions',
      soilTitle: 'Soil Intelligence & Crop AI',
      location: 'Wayanad Location',
      runAi: 'Run Crop Recommendation Engine',
      plotTitle: 'My Registered Plots',
      weatherCondition: 'Bright and Sunny',
      weatherStatus: 'Stable for plant growth',
    },
    ml: {
      greeting: 'നമസ്കാരം, രാജേഷ് നായർ',
      date: 'തിങ്കൾ, 30 ജൂലൈ 2026',
      slogan: 'കൃഷി ഇനി\nലളിതവും, കാര്യക്ഷമവും,\nസുസ്ഥിരവുമാക്കാം',
      langBtn: 'English',
      quickTitle: 'പ്രധാന സേവനങ്ങൾ',
      soilTitle: 'മണ്ണ് വിശകലനം & വിള ഉപദേശം',
      location: 'വയനാട് ലൊക്കേഷൻ',
      runAi: 'വിള നിർദ്ദേശം പരിശോധിക്കുക',
      plotTitle: 'എന്റെ തോട്ടങ്ങൾ',
      weatherCondition: 'നല്ല തെളിഞ്ഞ വെയിൽ',
      weatherStatus: 'വിളവളർച്ചയ്ക്ക് അനുയോജ്യം',
    },
  };

  const t = labels[lang];

  function toggleLang() {
    setLang(l => l === 'en' ? 'ml' : 'en');
  }

  async function runCropAI() {
    const nVal = parseFloat(n) || 0;
    const pVal = parseFloat(p) || 0;
    const kVal = parseFloat(k) || 0;
    const phVal = parseFloat(ph) || 6.5;

    // Hardcoded weather values for Kerala context since UI doesn't have them
    const temperature = 28.0;
    const humidity = 80.0;
    const rainfall = 200.0;

    // Use 10.0.2.2 for Android emulator, localhost for web/iOS
    const backendUrl = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

    try {
      const response = await fetch(`${backendUrl}/api/v1/crop-recommendation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nitrogen: nVal,
          phosphorus: pVal,
          potassium: kVal,
          temperature,
          humidity,
          ph: phVal,
          rainfall
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recommendation');
      }

      const data = await response.json();
      
      setCropResult({
        name: data.recommended_crop,
        yield: `${(data.confidence_score * 100).toFixed(1)}%`,
        profit: data.explanation,
        alternatives: data.alternatives.map((alt: any) => alt.crop)
      });
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not connect to the backend AI service.");
      // Fallback
      if (nVal > 80) {
        setCropResult({ name: 'Black Pepper + Coconut Homestead', yield: '96%', profit: 'Fallback match based on high N.', alternatives: ['Cocoa'] });
      } else {
        setCropResult({ name: 'Nendran Banana Plantation', yield: '85%', profit: 'Fallback match based on low N.', alternatives: ['Papaya'] });
      }
    }
  }

  function goToTab(tabName: string) {
    navigation.navigate(tabName);
  }

  return (
    <View style={S.root}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── HERO SECTION ─────────────────────────────────────────────── */}
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80' }}
          style={S.hero}
        >
          {/* Gradient overlay */}
          <View style={S.heroOverlay} />

          <SafeAreaView edges={['top']} style={S.heroContent}>

            {/* Top Row */}
            <View style={S.topRow}>
              <View>
                <Text style={S.greetingText}>{t.greeting}</Text>
                <Text style={S.dateText}>{t.date}</Text>
              </View>
              <View style={S.topRowRight}>
                {/* Language toggle pill */}
                <TouchableOpacity onPress={toggleLang} style={S.langPill}>
                  <Feather name="globe" size={11} color="#6ee7b7" />
                  <Text style={S.langPillText}>{t.langBtn}</Text>
                </TouchableOpacity>
                {/* Avatar */}
                <View style={S.avatarRing}>
                  <Image
                    source={{ uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80' }}
                    style={S.avatar}
                  />
                </View>
              </View>
            </View>

            {/* Headline Slogan */}
            <Text style={S.slogan}>{t.slogan}</Text>

            {/* Search Row */}
            <View style={S.searchRow}>
              <View style={S.searchPill}>
                <Feather name="search" size={15} color="rgba(255,255,255,0.9)" />
                <TextInput
                  placeholder="Search places, crops, pests..."
                  placeholderTextColor="rgba(255,255,255,0.75)"
                  style={S.searchInput}
                />
              </View>
              <TouchableOpacity style={S.mapBtn}>
                <Feather name="map-pin" size={16} color="#1e293b" />
              </TouchableOpacity>
            </View>

            {/* ── Glassmorphic Weather Widget ───────────────────────────── */}
            <View style={S.weatherCard}>
              {/* Hourly strip */}
              <View style={S.hourlyRow}>
                {HOURLY.map((h, i) => (
                  <View key={i} style={[S.hourItem, h.active && S.hourItemActive]}>
                    <Text style={[S.hourTime, h.active && S.hourTextActive]}>{h.hour}</Text>
                    <Feather
                      name={h.icon as any}
                      size={13}
                      color={h.active ? 'white' : h.color}
                    />
                    <Text style={[S.hourTemp, h.active && S.hourTextActive]}>{h.temp}</Text>
                  </View>
                ))}
              </View>

              {/* Weather details bottom */}
              <View style={S.weatherBottom}>
                <View>
                  <Text style={S.weatherDate}>{t.date}</Text>
                  <Text style={S.weatherTemp}>32°C</Text>
                  <View style={S.weatherCondRow}>
                    <Feather name="cloud" size={11} color="#64748b" />
                    <Text style={S.weatherCondText}>Weather</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={S.sunnyRow}>
                    <Feather name="sun" size={13} color="#f59e0b" />
                    <Text style={S.sunnyText}>{t.weatherCondition}</Text>
                  </View>
                  <View style={S.growthBadge}>
                    <Feather name="feather" size={10} color="#15803d" />
                    <Text style={S.growthText}>{t.weatherStatus}</Text>
                  </View>
                </View>
              </View>
            </View>

          </SafeAreaView>
        </ImageBackground>

        {/* ── CONTENT BODY ─────────────────────────────────────────────── */}
        <View style={S.body}>

          {/* Quick Actions 2×2 Grid */}
          <Text style={S.sectionTitle}>{t.quickTitle}</Text>
          <View style={S.gridRow}>
            {QUICK_ACTIONS.map((a) => (
              <TouchableOpacity
                key={a.id}
                style={S.actionCard}
                onPress={() => goToTab(a.tab)}
                activeOpacity={0.8}
              >
                <View style={[S.actionIcon, { backgroundColor: a.bg }]}>
                  <Feather name={a.icon as any} size={18} color={a.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={S.actionLabel}>{a.label}</Text>
                  <Text style={S.actionSub}>{a.sub}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Soil Intelligence & Crop AI Form ─────────────────────── */}
          <View style={S.soilCard}>
            <View style={S.soilHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Feather name="sliders" size={14} color="#15803d" />
                <Text style={S.soilTitle}>{t.soilTitle}</Text>
              </View>
              <View style={S.locationBadge}>
                <Text style={S.locationBadgeText}>{t.location}</Text>
              </View>
            </View>

            {/* NPK + pH inputs */}
            <View style={S.inputGrid}>
              {[
                { label: 'Nitrogen (N)',    val: n,  set: setN  },
                { label: 'Phosphorus (P)',  val: p,  set: setP  },
                { label: 'Potassium (K)',   val: k,  set: setK  },
                { label: 'Soil pH Level',  val: ph, set: setPh },
              ].map((field) => (
                <View key={field.label} style={S.inputBox}>
                  <Text style={S.inputLabel}>{field.label}</Text>
                  <TextInput
                    value={field.val}
                    onChangeText={field.set}
                    keyboardType="numeric"
                    style={S.inputField}
                  />
                </View>
              ))}
            </View>

            <TouchableOpacity style={S.runBtn} onPress={runCropAI} activeOpacity={0.85}>
              <Feather name="zap" size={15} color="white" />
              <Text style={S.runBtnText}>{t.runAi}</Text>
            </TouchableOpacity>

            {/* AI Result Box */}
            <View style={S.resultBox}>
              <View style={S.resultTopRow}>
                <View>
                  <Text style={S.resultLabel}>AI Best Match</Text>
                  <Text style={S.resultCropName}>{cropResult.name}</Text>
                </View>
                <View style={S.fitBadge}>
                  <Text style={S.fitBadgeText}>96% Fit</Text>
                </View>
              </View>
              <View style={S.resultDivider} />
              <Text style={S.resultStat}>
                <Text style={{ fontWeight: '700' }}>Confidence: </Text>{cropResult.yield}
              </Text>
              <Text style={S.resultStat}>
                <Text style={{ fontWeight: '700' }}>AI Note: </Text>
                <Text style={{ color: '#fcd34d', fontWeight: '700' }}>{cropResult.profit}</Text>
              </Text>

              {/* Intercrop matrix */}
              <View style={S.intercropBox}>
                <Text style={S.intercropTitle}>🌱 Recommended Alternatives</Text>
                <View style={S.intercropTags}>
                  {cropResult.alternatives.map(tag => (
                    <View key={tag} style={S.intercropTag}>
                      <Text style={S.intercropTagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* ── My Registered Plots ───────────────────────────────────── */}
          <View style={S.plotsHeader}>
            <Text style={S.sectionTitle}>{t.plotTitle}</Text>
            <TouchableOpacity onPress={() => goToTab('Farms')}>
              <Text style={S.manageLink}>Manage &gt;</Text>
            </TouchableOpacity>
          </View>

          {/* Field Photo Card */}
          <TouchableOpacity style={S.fieldCard} activeOpacity={0.9} onPress={() => goToTab('Farms')}>
            <ImageBackground
              source={{ uri: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=800&q=80' }}
              style={S.fieldBg}
              imageStyle={{ borderRadius: 20 }}
            >
              <View style={S.fieldOverlay} />
              {/* Rating pill */}
              <View style={S.ratingPill}>
                <Feather name="star" size={11} color="#fcd34d" />
                <Text style={S.ratingText}>4.9 Health</Text>
              </View>
              {/* Bottom info */}
              <View style={S.fieldBottom}>
                <View>
                  <Text style={S.fieldMeta}>Meenangadi Plot #F3 • 2.4 Acres</Text>
                  <Text style={S.fieldName}>Wayanad Pepper & Coconut Field</Text>
                </View>
                <View style={S.fieldArrowBtn}>
                  <Feather name="arrow-up-right" size={16} color="#1e293b" />
                </View>
              </View>
            </ImageBackground>
          </TouchableOpacity>

        </View>
        {/* bottom spacing for tab bar */}
        <View style={{ height: 90 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f1f5f9' },

  // HERO
  hero: { minHeight: 460 },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  heroContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16, gap: 12 },

  // Top row
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 4 },
  greetingText: { color: 'white', fontWeight: '800', fontSize: 13, letterSpacing: -0.3 },
  dateText: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '500', marginTop: 2 },
  topRowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  // Lang pill
  langPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  langPillText: { color: '#6ee7b7', fontSize: 10, fontWeight: '800' },

  // Avatar
  avatarRing: { width: 38, height: 38, borderRadius: 99, borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)', overflow: 'hidden' },
  avatar: { width: '100%', height: '100%' },

  // Slogan
  slogan: { color: 'white', fontSize: 22, fontWeight: '900', lineHeight: 29, letterSpacing: -0.5 },

  // Search
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchPill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  searchInput: { flex: 1, color: 'white', fontSize: 12, fontWeight: '500' },
  mapBtn: {
    width: 36, height: 36, borderRadius: 99,
    backgroundColor: 'white', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 4,
  },

  // Weather card
  weatherCard: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 24, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 6,
  },
  hourlyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(15,23,42,0.08)' },
  hourItem: { alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 4, borderRadius: 99 },
  hourItemActive: { backgroundColor: '#f59e0b', paddingHorizontal: 8, transform: [{ scale: 1.05 }] },
  hourTime: { fontSize: 9, fontWeight: '700', color: '#64748b' },
  hourTemp: { fontSize: 10, fontWeight: '800', color: '#1e293b' },
  hourTextActive: { color: 'white' },

  weatherBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 10 },
  weatherDate: { fontSize: 9, color: '#64748b', fontWeight: '600' },
  weatherTemp: { fontSize: 26, fontWeight: '900', color: '#0f172a', lineHeight: 30 },
  weatherCondRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  weatherCondText: { fontSize: 10, color: '#64748b', fontWeight: '700' },
  sunnyRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  sunnyText: { fontSize: 11, fontWeight: '800', color: '#1e293b' },
  growthBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#dcfce7', borderRadius: 99,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  growthText: { fontSize: 9, fontWeight: '800', color: '#166534' },

  // Body
  body: { paddingHorizontal: 16, paddingTop: 16, gap: 14 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },

  // Grid
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: {
    width: '47.5%', backgroundColor: 'white',
    borderRadius: 18, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  actionIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 11, fontWeight: '800', color: '#0f172a' },
  actionSub: { fontSize: 9, color: '#64748b', marginTop: 1 },

  // Soil Card
  soilCard: {
    backgroundColor: 'white', borderRadius: 22, padding: 14,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    gap: 10,
  },
  soilHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  soilTitle: { fontSize: 11, fontWeight: '800', color: '#0f172a' },
  locationBadge: {
    backgroundColor: '#f0fdf4', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  locationBadgeText: { fontSize: 9, fontWeight: '700', color: '#15803d' },

  inputGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  inputBox: { width: '47.5%' },
  inputLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', marginBottom: 4 },
  inputField: {
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8,
    fontSize: 13, fontWeight: '700', color: '#1e293b',
  },

  runBtn: {
    backgroundColor: '#15803d', borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12,
    shadowColor: '#15803d', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  runBtnText: { color: 'white', fontWeight: '800', fontSize: 12 },

  // Result box
  resultBox: { backgroundColor: '#052e16', borderRadius: 18, padding: 14, gap: 8 },
  resultTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  resultLabel: { fontSize: 9, fontWeight: '700', color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: 1 },
  resultCropName: { fontSize: 13, fontWeight: '800', color: 'white', marginTop: 2 },
  fitBadge: {
    backgroundColor: 'rgba(251,191,36,0.2)', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)',
  },
  fitBadgeText: { fontSize: 11, fontWeight: '800', color: '#fcd34d' },
  resultDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  resultStat: { fontSize: 11, color: '#cbd5e1', lineHeight: 18 },

  intercropBox: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  intercropTitle: { fontSize: 10, fontWeight: '700', color: '#a7f3d0', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  intercropTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  intercropTag: { backgroundColor: 'rgba(21,128,61,0.6)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  intercropTagText: { fontSize: 10, color: '#a7f3d0', fontWeight: '700' },

  // Plots section
  plotsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  manageLink: { fontSize: 12, fontWeight: '700', color: '#15803d' },

  // Field card
  fieldCard: { borderRadius: 22, overflow: 'hidden', height: 176 },
  fieldBg: { width: '100%', height: '100%', padding: 12, justifyContent: 'space-between' },
  fieldOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 20 },
  ratingPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 99,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  ratingText: { fontSize: 10, fontWeight: '700', color: '#fcd34d' },
  fieldBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  fieldMeta: { fontSize: 9, color: '#cbd5e1', fontWeight: '500' },
  fieldName: { fontSize: 13, fontWeight: '800', color: 'white', marginTop: 2 },
  fieldArrowBtn: {
    width: 32, height: 32, borderRadius: 99,
    backgroundColor: 'white', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
});
