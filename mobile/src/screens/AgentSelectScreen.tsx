import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Image, Platform, KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStackParamList';

// Shared field data (in a real app, this comes from state/context/DB)
export const FIELDS = [
  {
    id: 'F1',
    name: 'Wayanad Pepper Homestead',
    district: 'Wayanad',
    acres: 2.4,
    crop: 'Black Pepper & Coconut',
    image: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'F2',
    name: 'Palakkad Nendran Field',
    district: 'Palakkad',
    acres: 1.8,
    crop: 'Nendran Banana',
    image: 'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=400&q=80',
  },
];

export default function AgentSelectScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [newFieldName, setNewFieldName] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);
  const [fields, setFields] = useState(FIELDS);

  const selectField = (fieldId: string) => {
    (navigation as any).navigate('AgentChat', { fieldId });
  };

  const handleAddField = () => {
    if (!newFieldName.trim()) return;
    const id = 'F' + Date.now().toString(36);
    setFields(prev => [...prev, {
      id,
      name: newFieldName.trim(),
      district: 'Kerala',
      acres: 0,
      crop: '',
      image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=400&q=80',
    }]);
    setNewFieldName('');
    setShowAddInput(false);
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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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

        {/* Field Cards */}
        <Text style={styles.sectionLabel}>Your Registered Fields</Text>
        {fields.map((field) => (
          <TouchableOpacity
            key={field.id}
            style={styles.fieldCard}
            onPress={() => selectField(field.id)}
            activeOpacity={0.85}
          >
            <View style={styles.fieldIconWrap}>
              <Feather name="map-pin" size={20} color="#15803d" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.fieldName} numberOfLines={1}>{field.name}</Text>
              <Text style={styles.fieldMeta}>
                {field.district}{field.acres ? ` • ${field.acres} acres` : ''}
                {field.crop ? ` • ${field.crop}` : ''}
              </Text>
              <Text style={styles.fieldCTA}>Tap to start a conversation →</Text>
            </View>
            <Feather name="chevron-right" size={16} color="#cbd5e1" />
          </TouchableOpacity>
        ))}

        {/* Add Field */}
        {!showAddInput ? (
          <TouchableOpacity style={styles.addFieldBtn} onPress={() => setShowAddInput(true)}>
            <Feather name="plus-circle" size={16} color="#64748b" />
            <Text style={styles.addFieldBtnText}>Add a Field</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.addFieldInputRow}>
            <TextInput
              style={styles.addFieldInput}
              placeholder="Field name, e.g. Idukki Cardamom Plot"
              placeholderTextColor="#94a3b8"
              value={newFieldName}
              onChangeText={setNewFieldName}
              onSubmitEditing={handleAddField}
              autoFocus
            />
            <TouchableOpacity style={styles.addFieldConfirmBtn} onPress={handleAddField}>
              <Feather name="check" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Suggested Prompts Tip */}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  headerSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 12,
  },
  agentBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  agentBadgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  agentBadgeTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803d',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  agentBadgeVersion: {
    backgroundColor: 'rgba(21,128,61,0.12)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  agentBadgeVersionText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#15803d',
    fontVariant: ['tabular-nums'],
  },
  agentBadgeDesc: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  fieldCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  fieldIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  fieldName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  fieldMeta: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  fieldCTA: {
    fontSize: 9,
    fontWeight: '600',
    color: '#16a34a',
    marginTop: 3,
  },
  addFieldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 20,
    paddingVertical: 16,
  },
  addFieldBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  addFieldInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#86efac',
    padding: 8,
  },
  addFieldInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  addFieldConfirmBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#15803d',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tipCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  tipText: {
    fontSize: 11,
    color: '#1e40af',
    flex: 1,
    lineHeight: 16,
  },
});
