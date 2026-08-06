import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, Image, TextInput,
  TouchableOpacity, StyleSheet, Animated, Alert, Platform, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStackParamList';

// ─── Hourly Weather Data ─────────────────────────────────────────────────────
const HOURLY = [
  { hour: '09', icon: 'cloud',      temp: '28°', active: false },
  { hour: '10', icon: 'cloud',      temp: '30°', active: false },
  { hour: '11', icon: 'sun',        temp: '32°', active: true  },
  { hour: '12', icon: 'sun',        temp: '36°', active: false },
  { hour: '13', icon: 'cloud-rain', temp: '35°', active: false },
  { hour: '14', icon: 'cloud',      temp: '34°', active: false },
];

// ─── Quick Action Grid ────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { id: 'agent',   icon: 'zap',         label: 'Farm Assistant', sub: 'Ask about a field',    bg: '#dcfce7', color: '#15803d', tab: 'AgentSelect' },
  { id: 'doctor',  icon: 'camera',      label: 'Leaf Doctor',    sub: 'Disease Diagnosis',    bg: '#fee2e2', color: '#b91c1c', tab: 'Doctor'      },
  { id: 'weather', icon: 'cloud-rain',  label: 'Rain Forecast',  sub: 'Spraying Radar',       bg: '#e0f2fe', color: '#0369a1', tab: 'Weather'     },
  { id: 'market',  icon: 'trending-up', label: 'Mandi Prices',   sub: 'Rubber & Pepper',      bg: '#fef3c7', color: '#b45309', tab: 'Market'      },
];

// ─── My Fields Data ───────────────────────────────────────────────────────────
const MY_FIELDS = [
  {
    id: 'F1',
    name: 'Pepper & Hybrid Coconut Field',
    tag: 'Wayanad Plot #F3 • 2.4 Acres',
    monitoring: 'Continuous AI Monitoring: Active',
    image: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=800&q=80',
    large: true,
  },
  {
    id: 'F2',
    name: 'Palakkad Nendran Banana Field',
    tag: 'Palakkad #F2 • 1.8 Acres',
    image: 'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=800&q=80',
    large: false,
  },
];

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const heroAnim = useRef(new Animated.Value(0)).current;

  // Navigate to the appropriate tab
  const handleQuickAction = (tab: string) => {
    if (tab === 'AgentSelect') {
      (navigation as any).navigate('Main', { screen: 'Assistant' });
    } else {
      (navigation as any).navigate('Main', { screen: tab });
    }
  };

  const openAgentHub = () => {
    (navigation as any).navigate('Main', { screen: 'Assistant' });
  };

  const openFieldDetail = (fieldId: string) => {
    // Navigate to field detail through the Farms tab or directly
    (navigation as any).navigate('Main', { screen: 'Farms' });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ── HERO BANNER ─────────────────────────────────── */}
        <View style={styles.hero}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80' }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
          {/* gradient overlay */}
          <View style={styles.heroOverlay} />

          {/* Safe area inset + status */}
          <SafeAreaView edges={['top']}>
            <View style={styles.heroContent}>
              {/* Top row */}
              <View style={styles.heroTopRow}>
                <View>
                  <Text style={styles.greetingText}>Hello Rajesh Nair</Text>
                  <Text style={styles.dateText}>Monday, 30 Jul 2026</Text>
                </View>
                <TouchableOpacity
                  style={styles.avatarBtn}
                  onPress={() => (navigation as any).navigate('Main', { screen: 'Farms' })}
                >
                  <Image
                    source={{ uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80' }}
                    style={styles.avatar}
                  />
                </TouchableOpacity>
              </View>

              {/* Slogan */}
              <Text style={styles.slogan}>{'Farming Made\nSimple, Smarter,\nand Sustainable'}</Text>

              {/* Search / Agent launcher */}
              <View style={styles.searchRow}>
                <TouchableOpacity style={styles.searchBar} onPress={openAgentHub} activeOpacity={0.8}>
                  <Feather name="zap" size={16} color="#34d399" />
                  <Text style={styles.searchPlaceholder}>Ask about your farm...</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.micBtn} onPress={openAgentHub} activeOpacity={0.85}>
                  <Feather name="mic" size={16} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Weather Glass Card */}
              <View style={styles.weatherCard}>
                {/* Hourly strip */}
                <View style={styles.hourlyRow}>
                  {HOURLY.map((h) => (
                    <View key={h.hour} style={[styles.hourItem, h.active && styles.hourItemActive]}>
                      <Text style={[styles.hourText, h.active && styles.hourTextActive]}>{h.hour}</Text>
                      <Feather
                        name={h.icon as any}
                        size={13}
                        color={h.active ? '#fff' : h.icon === 'cloud-rain' ? '#0ea5e9' : h.icon === 'sun' ? '#f59e0b' : '#64748b'}
                      />
                      <Text style={[styles.hourTemp, h.active && styles.hourTempActive]}>{h.temp}</Text>
                    </View>
                  ))}
                </View>

                {/* Bottom info */}
                <View style={styles.weatherBottom}>
                  <View>
                    <Text style={styles.weatherDateLabel}>Monday, 30 Jul 2026</Text>
                    <Text style={styles.weatherTemp}>32°C</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Feather name="map-pin" size={11} color="#16a34a" />
                      <Text style={styles.weatherLocation}>Wayanad District</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Feather name="sun" size={13} color="#f59e0b" />
                      <Text style={styles.weatherCondition}>Sunny & humid</Text>
                    </View>
                    <View style={styles.cropBadge}>
                      <Feather name="droplet" size={10} color="#15803d" />
                      <Text style={styles.cropBadgeText}>Good for Pepper & Palms</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </View>

        {/* ── BODY CONTENT ──────────────────────────────────── */}
        <View style={styles.body}>

          {/* Agent Quick Launch Banner */}
          <TouchableOpacity style={styles.agentBanner} onPress={openAgentHub} activeOpacity={0.9}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <View style={styles.agentBannerBadge}>
                <Text style={styles.agentBannerBadgeText}>✨ Farm Assistant</Text>
              </View>
              <Text style={styles.agentBannerTitle}>Ask about any of your fields</Text>
              <Text style={styles.agentBannerSub}>Pick a field, then ask in your own words.</Text>
            </View>
            <View style={styles.agentBannerArrow}>
              <Feather name="arrow-right" size={20} color="#15803d" />
            </View>
          </TouchableOpacity>

          {/* Quick Actions Grid */}
          <View>
            <Text style={styles.sectionTitle}>Quick Assistant Actions</Text>
            <View style={styles.quickGrid}>
              {QUICK_ACTIONS.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={styles.quickCard}
                  onPress={() => handleQuickAction(action.tab)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.quickIcon, { backgroundColor: action.bg }]}>
                    <Feather name={action.icon as any} size={20} color={action.color} />
                  </View>
                  <View>
                    <Text style={styles.quickLabel}>{action.label}</Text>
                    <Text style={styles.quickSub}>{action.sub}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* My Fields Section */}
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Fields (തോട്ടങ്ങൾ)</Text>
              <TouchableOpacity onPress={() => (navigation as any).navigate('Main', { screen: 'Farms' })}>
                <Text style={styles.viewAllBtn}>View All {'>'}</Text>
              </TouchableOpacity>
            </View>

            {/* Field Card #1 — Large */}
            <TouchableOpacity
              style={[styles.fieldCard, { height: 160 }]}
              onPress={() => openFieldDetail('F1')}
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: MY_FIELDS[0].image }}
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
              />
              <View style={styles.fieldGradient} />
              {/* Tag badge */}
              <View style={styles.fieldTagBadge}>
                <View style={styles.fieldTagDot} />
                <Text style={styles.fieldTagText}>{MY_FIELDS[0].tag}</Text>
              </View>
              {/* Bottom info */}
              <View style={styles.fieldBottom}>
                <View>
                  <Text style={styles.fieldName}>{MY_FIELDS[0].name}</Text>
                  <Text style={styles.fieldMonitoring}>{MY_FIELDS[0].monitoring}</Text>
                </View>
                <View style={styles.fieldChevron}>
                  <Feather name="chevron-right" size={16} color="#fff" />
                </View>
              </View>
            </TouchableOpacity>

            {/* Field Card #2 — Compact */}
            <TouchableOpacity
              style={[styles.fieldCard, { height: 110, marginTop: 10 }]}
              onPress={() => openFieldDetail('F2')}
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: MY_FIELDS[1].image }}
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
              />
              <View style={styles.fieldGradient} />
              <View style={styles.fieldBottom}>
                <View>
                  <View style={styles.fieldSmallTag}>
                    <Text style={styles.fieldSmallTagText}>{MY_FIELDS[1].tag}</Text>
                  </View>
                  <Text style={[styles.fieldName, { marginTop: 4 }]}>{MY_FIELDS[1].name}</Text>
                </View>
                <View style={[styles.fieldChevron, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Feather name="chevron-right" size={14} color="#fff" />
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Hero ──────────────────────────────────────────────
  hero: {
    minHeight: 450,
    position: 'relative',
    justifyContent: 'flex-end',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  heroContent: {
    padding: 16,
    paddingBottom: 20,
    gap: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greetingText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
  dateText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    marginTop: 2,
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#34d399',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  slogan: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  // Search bar
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  searchPlaceholder: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    flex: 1,
  },
  micBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  // Weather card
  weatherCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 24,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    gap: 10,
  },
  hourlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hourItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
    borderRadius: 16,
  },
  hourItemActive: {
    backgroundColor: '#f59e0b',
    transform: [{ scale: 1.05 }],
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  hourText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748b',
  },
  hourTextActive: {
    color: '#fff',
    fontWeight: '800',
  },
  hourTemp: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  hourTempActive: {
    color: '#fff',
    fontWeight: '800',
  },
  weatherBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(15,23,42,0.08)',
  },
  weatherDateLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748b',
  },
  weatherTemp: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0f172a',
    lineHeight: 30,
    marginVertical: 2,
  },
  weatherLocation: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  weatherCondition: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1e293b',
  },
  cropBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(220,252,231,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(187,247,208,0.8)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cropBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#166534',
  },

  // ── Body ──────────────────────────────────────────────
  body: {
    padding: 16,
    paddingTop: 16,
    gap: 16,
  },

  // Agent Banner
  agentBanner: {
    backgroundColor: '#1d4f30',
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#166534',
    shadowColor: '#15803d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  agentBannerBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  agentBannerBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#a7f3d0',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  agentBannerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  agentBannerSub: {
    fontSize: 10,
    color: '#a7f3d0',
  },
  agentBannerArrow: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  // Section headings
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  viewAllBtn: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
  },

  // Quick Actions Grid
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  quickLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
  },
  quickSub: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 1,
  },

  // My Fields
  fieldCard: {
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  fieldGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.0)',
    // Simulated gradient via top/bottom approach
  },
  fieldTagBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  fieldTagDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  fieldTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0f172a',
  },
  fieldBottom: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  fieldName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.2,
  },
  fieldMonitoring: {
    fontSize: 10,
    color: '#86efac',
    fontWeight: '500',
    marginTop: 2,
  },
  fieldChevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldSmallTag: {
    backgroundColor: 'rgba(245,158,11,0.9)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  fieldSmallTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1c1917',
  },
});
