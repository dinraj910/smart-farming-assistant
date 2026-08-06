import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Platform, KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStackParamList';
import { FIELDS } from './AgentSelectScreen';

export default function FieldDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<any>();
  const fieldId: string = route.params?.fieldId ?? 'F1';
  const field = FIELDS.find(f => f.id === fieldId) || FIELDS[0];

  const [acreage, setAcreage] = useState(field.acres?.toString() || '');
  const [cropType, setCropType] = useState(field.crop || '');
  const [soilType, setSoilType] = useState('Loamy Soil'); // Default mock
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    setIsEditing(false);
    // In a real app, save to backend/context
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
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={16} color="#475569" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Plot Details</Text>
          <TouchableOpacity
            style={styles.askBtn}
            onPress={() => navigation.navigate('AgentChat', { fieldId })}
          >
            <Text style={styles.askBtnText}>Ask Assistant</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Field Main Card */}
        <View style={styles.mainCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.plotCode}>Plot #{fieldId} • {field.district}</Text>
              <Text style={styles.plotName}>{field.name}</Text>
              <Text style={styles.plotMeta}>{acreage || '0'} Acres • {soilType}</Text>
            </View>
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>AI Monitored</Text>
            </View>
          </View>

          {/* Live Soil Telemetry Gauges */}
          <View style={styles.telemetryGrid}>
            <View style={styles.telemetryBox}>
              <Text style={styles.telemetryLabel}>Nitrogen</Text>
              <Text style={styles.telemetryValue}>85 ppm</Text>
            </View>
            <View style={styles.telemetryBox}>
              <Text style={styles.telemetryLabel}>Phosphorus</Text>
              <Text style={styles.telemetryValue}>42 ppm</Text>
            </View>
            <View style={styles.telemetryBox}>
              <Text style={styles.telemetryLabel}>Potassium</Text>
              <Text style={styles.telemetryValue}>140 ppm</Text>
            </View>
            <View style={styles.telemetryBox}>
              <Text style={styles.telemetryLabel}>Soil pH</Text>
              <Text style={[styles.telemetryValue, { color: '#d97706' }]}>6.2 pH</Text>
            </View>
          </View>
        </View>

        {/* General Information Form */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>General Information</Text>
            <TouchableOpacity onPress={() => isEditing ? handleSave() : setIsEditing(true)}>
              <Text style={styles.editBtnText}>{isEditing ? 'Save' : 'Edit'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Acreage</Text>
            <TextInput
              style={[styles.formInput, isEditing && styles.formInputEditing]}
              value={acreage}
              onChangeText={setAcreage}
              editable={isEditing}
              keyboardType="numeric"
              placeholder="e.g. 2.4"
            />
          </View>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Crop Type</Text>
            <TextInput
              style={[styles.formInput, isEditing && styles.formInputEditing]}
              value={cropType}
              onChangeText={setCropType}
              editable={isEditing}
              placeholder="e.g. Black Pepper"
            />
          </View>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Soil Type</Text>
            <TextInput
              style={[styles.formInput, isEditing && styles.formInputEditing]}
              value={soilType}
              onChangeText={setSoilType}
              editable={isEditing}
              placeholder="e.g. Loamy Soil"
            />
          </View>
        </View>

        {/* Ask about this field */}
        <View style={styles.askBanner}>
          <View style={styles.askBannerHeader}>
            <Feather name="aperture" size={20} color="#34d399" />
            <Text style={styles.askBannerTitle}>Ask About This Field</Text>
          </View>
          <Text style={styles.askBannerDesc}>
            Ask about planting, weather, pests, or today's prices for this field.
          </Text>
          <TouchableOpacity 
            style={styles.openChatBtn}
            onPress={() => navigation.navigate('AgentChat', { fieldId })}
          >
            <Feather name="zap" size={16} color="#0f172a" />
            <Text style={styles.openChatBtnText}>Open Field Assistant</Text>
          </TouchableOpacity>
        </View>

        {/* Past Actions & Diagnostic Log */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Field Activity Log</Text>
          
          <View style={styles.logItem}>
            <Feather name="check-circle" size={16} color="#16a34a" style={styles.logIcon} />
            <View>
              <Text style={styles.logTitle}>Organic Compost Applied</Text>
              <Text style={styles.logMeta}>2 days ago • Verified by Agent</Text>
            </View>
          </View>

          <View style={styles.logItem}>
            <Feather name="alert-circle" size={16} color="#d97706" style={styles.logIcon} />
            <View>
              <Text style={styles.logTitle}>Soil Acidity Alert</Text>
              <Text style={styles.logMeta}>Recommended 200kg lime per acre before rain</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  askBtn: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  askBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  mainCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  plotCode: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  plotName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  plotMeta: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  aiBadge: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#166534',
  },
  telemetryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  telemetryBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    width: '23%',
  },
  telemetryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 4,
  },
  telemetryValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 8,
  },
  formLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    width: '35%',
  },
  formInput: {
    flex: 1,
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '700',
    textAlign: 'right',
    padding: 0,
  },
  formInputEditing: {
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  askBanner: {
    backgroundColor: '#064e3b',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  askBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  askBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },
  askBannerDesc: {
    fontSize: 11,
    color: '#d1fae5',
    lineHeight: 16,
    marginBottom: 12,
  },
  openChatBtn: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  openChatBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  logIcon: {
    marginTop: 2,
  },
  logTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  logMeta: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
});
