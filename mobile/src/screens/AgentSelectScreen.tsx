import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Platform, KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStackParamList';
import apiClient from '../api/client';

// ─── Types matching the backend Farm model ─────────────────────────────────
interface Farm {
  id: string;         // DB UUID
  name: string;
  location: string;
  acres: string;
  npk: string | null;
  status: string;
  image: string | null;
}

// Kept for backward-compat — used by AgentChatScreen as fallback
export const FIELDS = [
  {
    id: 'F1',
    name: 'Wayanad Pepper Homestead',
    district: 'Wayanad',
    acres: 2.4,
    crop: 'Black Pepper & Coconut',
  },
];

export default function AgentSelectScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setFarms(res.data);
    } catch (err: any) {
      setError('Could not load your farms. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  const selectFarm = (farm: Farm) => {
    // Parse district from "location" field  (e.g. "Kottayam, Kerala" → "Kottayam")
    const district = farm.location.split(',')[0].trim();
    (navigation as any).navigate('AgentChat', {
      fieldId: farm.id,
      fieldName: farm.name,
      district,
      acres: parseFloat(farm.acres) || undefined,
      farmId: farm.id,
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f8fafc' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff' }}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => (navigation as any).navigate('Main', { screen: 'Home' })}
          >
            <Feather name="arrow-left" size={16} color="#475569" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Farm Assistant</Text>
            <Text style={styles.headerSub}>Choose a field to continue</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Agent Active Badge */}
        <View style={styles.agentBadge}>
          <View style={styles.agentBadgeLeft}>
            <View style={styles.pulseDot} />
            <Text style={styles.agentBadgeTitle}>Field Agent Active</Text>
          </View>
          <View style={styles.agentBadgeVersion}>
            <Text style={styles.agentBadgeVersionText}>v4.2 Professional</Text>
          </View>
        </View>
        <Text style={styles.agentBadgeDesc}>
          Connected to soil telemetry, IMD rain radar, & Agmarknet mandi pricing.
        </Text>

        {/* Farm Cards */}
        <Text style={styles.sectionLabel}>Your Registered Fields</Text>

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#15803d" />
            <Text style={styles.loadingText}>Loading your farms...</Text>
          </View>
        )}

        {!loading && error && (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={14} color="#dc2626" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadFarms} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && farms.length === 0 && (
          <View style={styles.emptyBox}>
            <Feather name="map" size={28} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No farms registered yet</Text>
            <Text style={styles.emptyText}>
              Go to the Profile tab to register your first plot, then come back here.
            </Text>
          </View>
        )}

        {farms.map(farm => (
          <TouchableOpacity
            key={farm.id}
            style={styles.fieldCard}
            onPress={() => selectFarm(farm)}
            activeOpacity={0.85}
          >
            <View style={styles.fieldIconWrap}>
              <Feather name="map-pin" size={20} color="#15803d" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.fieldName} numberOfLines={1}>{farm.name}</Text>
              <Text style={styles.fieldMeta}>
                {farm.location}{farm.acres ? ` • ${farm.acres}` : ''}
              </Text>
              <Text style={styles.fieldCTA}>Tap to start a conversation →</Text>
            </View>
            <Feather name="chevron-right" size={16} color="#cbd5e1" />
          </TouchableOpacity>
        ))}

        {/* Tip */}
        <View style={styles.tipCard}>
          <Feather name="info" size={14} color="#0369a1" />
          <Text style={styles.tipText}>
            After selecting a field, you can ask about planting, weather, pests, or live mandi prices — in English or Malayalam.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  headerSub:   { fontSize: 10, color: '#64748b', marginTop: 1 },
  scrollContent: { padding: 16, paddingBottom: 100, gap: 12 },

  agentBadge: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#f0fdf4', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  agentBadgeLeft:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pulseDot:              { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  agentBadgeTitle:       { fontSize: 11, fontWeight: '800', color: '#15803d', textTransform: 'uppercase', letterSpacing: 0.5 },
  agentBadgeVersion:     { backgroundColor: 'rgba(21,128,61,0.12)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  agentBadgeVersionText: { fontSize: 9, fontWeight: '700', color: '#15803d' },
  agentBadgeDesc:        { fontSize: 11, color: '#334155', lineHeight: 16 },

  sectionLabel: {
    fontSize: 11, fontWeight: '800', color: '#64748b',
    textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4,
  },

  loadingBox: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 20, justifyContent: 'center' },
  loadingText: { fontSize: 12, color: '#64748b' },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fef2f2', borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: '#fca5a5',
  },
  errorText:    { flex: 1, fontSize: 11, color: '#dc2626' },
  retryBtn:     { backgroundColor: '#fca5a5', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  retryBtnText: { fontSize: 11, fontWeight: '700', color: '#dc2626' },

  emptyBox:  { alignItems: 'center', gap: 8, paddingVertical: 30 },
  emptyTitle:{ fontSize: 13, fontWeight: '800', color: '#334155' },
  emptyText: { fontSize: 11, color: '#94a3b8', textAlign: 'center', lineHeight: 16 },

  fieldCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 20, padding: 14,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  fieldIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  fieldName: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  fieldMeta: { fontSize: 10, color: '#64748b', marginTop: 2 },
  fieldCTA:  { fontSize: 9, fontWeight: '600', color: '#16a34a', marginTop: 3 },

  tipCard: {
    flexDirection: 'row', gap: 10, backgroundColor: '#eff6ff',
    borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#bfdbfe',
    alignItems: 'flex-start', marginTop: 4,
  },
  tipText: { fontSize: 11, color: '#1e40af', flex: 1, lineHeight: 16 },
});
