import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStackParamList';
import { useAuthStore } from '../store/authStore';
import UserAvatar from '../components/UserAvatar';

const DISTRICT_PRESETS = [
  'Wayanad', 'Palakkad', 'Idukki', 'Kottayam', 'Kozhikode', 'Ernakulam', 'Thrissur', 'Kannur', 'Alappuzha'
];

const CROP_PRESETS = [
  'Black Pepper', 'Rubber RSS-4', 'Coconut & Copra', 'Green Cardamom', 'Banana (Nendran)', 'Tapioca', 'Coffee'
];

export default function EditProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, updateProfile, isLoading } = useAuthStore();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [district, setDistrict] = useState(user?.district || 'Wayanad, Kerala');
  const [primaryCrop, setPrimaryCrop] = useState(user?.primaryCrop || 'Black Pepper & Coconut');
  const [farmSize, setFarmSize] = useState(user?.farmSize || '4.2');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter your name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }

    try {
      setSaving(true);
      await updateProfile({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        district: district.trim(),
        primaryCrop: primaryCrop.trim(),
        farmSize: farmSize.trim(),
      });

      Alert.alert(
        'Profile Updated',
        'Your profile information and farmer avatar have been updated successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      Alert.alert('Update Failed', err?.message || 'Could not update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f8fafc' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView edges={['top']} style={S.headerSafe}>
        {/* Header */}
        <View style={S.header}>
          <TouchableOpacity
            style={S.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Feather name="arrow-left" size={18} color="#334155" />
          </TouchableOpacity>

          <View style={S.headerTitleWrap}>
            <Text style={S.headerSub}>ACCOUNT SETTINGS</Text>
            <Text style={S.headerTitle}>Edit Profile</Text>
          </View>

          <TouchableOpacity
            style={[S.saveHeaderBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#15803d" />
            ) : (
              <Text style={S.saveHeaderBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={S.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Avatar Showcase / Live Preview ──────────────────────────────── */}
        <View style={S.avatarPreviewCard}>
          <View style={S.avatarWrap}>
            <UserAvatar
              name={name || 'Farmer'}
              size={72}
              fontSize={30}
              showBadge
            />
          </View>
          <View style={S.avatarInfo}>
            <Text style={S.previewName}>{name.trim() || 'Your Name'}</Text>
            <Text style={S.previewEmail}>{email.trim() || 'your.email@example.com'}</Text>
            <View style={S.avatarBadge}>
              <Feather name="check-circle" size={11} color="#15803d" />
              <Text style={S.avatarBadgeText}>Live First-Letter Avatar</Text>
            </View>
          </View>
        </View>

        {/* ── Form Inputs ─────────────────────────────────────────────────── */}
        <View style={S.formCard}>
          <Text style={S.sectionTitle}>Basic Information</Text>

          {/* Full Name */}
          <View style={S.inputGroup}>
            <Text style={S.inputLabel}>Full Name / കർഷകന്റെ പേര്</Text>
            <View style={S.inputBox}>
              <Feather name="user" size={15} color="#64748b" style={S.inputIcon} />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor="#94a3b8"
                style={S.textInput}
              />
            </View>
          </View>

          {/* Email Address */}
          <View style={S.inputGroup}>
            <Text style={S.inputLabel}>Email Address</Text>
            <View style={S.inputBox}>
              <Feather name="mail" size={15} color="#64748b" style={S.inputIcon} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                style={S.textInput}
              />
            </View>
          </View>

          {/* Phone Number */}
          <View style={S.inputGroup}>
            <Text style={S.inputLabel}>Mobile Phone / ഫോൺ നമ്പർ</Text>
            <View style={S.inputBox}>
              <Feather name="phone" size={15} color="#64748b" style={S.inputIcon} />
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="+91 98765 43210"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                style={S.textInput}
              />
            </View>
          </View>
        </View>

        {/* ── Farm & Location Settings ─────────────────────────────────────── */}
        <View style={S.formCard}>
          <Text style={S.sectionTitle}>Farm & Regional Telemetry</Text>

          {/* District / Location */}
          <View style={S.inputGroup}>
            <Text style={S.inputLabel}>District / സ്ഥലം</Text>
            <View style={S.inputBox}>
              <Feather name="map-pin" size={15} color="#64748b" style={S.inputIcon} />
              <TextInput
                value={district}
                onChangeText={setDistrict}
                placeholder="e.g. Wayanad, Kerala"
                placeholderTextColor="#94a3b8"
                style={S.textInput}
              />
            </View>

            {/* Quick District Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={S.presetRow}
            >
              {DISTRICT_PRESETS.map(d => {
                const isSelected = district.toLowerCase().includes(d.toLowerCase());
                return (
                  <TouchableOpacity
                    key={d}
                    style={[S.presetChip, isSelected && S.presetChipActive]}
                    onPress={() => setDistrict(`${d}, Kerala`)}
                    activeOpacity={0.8}
                  >
                    <Text style={[S.presetChipText, isSelected && S.presetChipTextActive]}>
                      {d}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Primary Crops Focus */}
          <View style={S.inputGroup}>
            <Text style={S.inputLabel}>Primary Crop / പ്രധാന കൃഷി</Text>
            <View style={S.inputBox}>
              <Feather name="layers" size={15} color="#64748b" style={S.inputIcon} />
              <TextInput
                value={primaryCrop}
                onChangeText={setPrimaryCrop}
                placeholder="e.g. Black Pepper, Rubber, Coconut"
                placeholderTextColor="#94a3b8"
                style={S.textInput}
              />
            </View>

            {/* Quick Crop Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={S.presetRow}
            >
              {CROP_PRESETS.map(c => {
                const isSelected = primaryCrop.toLowerCase().includes(c.toLowerCase());
                return (
                  <TouchableOpacity
                    key={c}
                    style={[S.presetChip, isSelected && S.presetChipActive]}
                    onPress={() => setPrimaryCrop(c)}
                    activeOpacity={0.8}
                  >
                    <Text style={[S.presetChipText, isSelected && S.presetChipTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Total Landholding in Acres */}
          <View style={S.inputGroup}>
            <Text style={S.inputLabel}>Total Farm Size (Acres) / വിസ്തീർണ്ണം</Text>
            <View style={S.inputBox}>
              <Feather name="maximize" size={15} color="#64748b" style={S.inputIcon} />
              <TextInput
                value={farmSize}
                onChangeText={setFarmSize}
                placeholder="e.g. 4.2"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                style={S.textInput}
              />
            </View>
          </View>
        </View>

        {/* ── Save Button ─────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[S.primarySaveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Feather name="check" size={18} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={S.primarySaveBtnText}>Save Profile Changes</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const S = StyleSheet.create({
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
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerSub: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803d',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  saveHeaderBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  saveHeaderBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803d',
  },

  scrollContent: {
    padding: 16,
    gap: 14,
  },

  // Avatar Card Preview
  avatarPreviewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    gap: 16,
  },
  avatarWrap: {
    shadowColor: '#15803d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  previewEmail: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  avatarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  avatarBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#15803d',
  },

  // Form Card
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 6,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },

  presetRow: {
    gap: 6,
    paddingTop: 8,
    paddingBottom: 2,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  presetChipActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },
  presetChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  presetChipTextActive: {
    color: '#15803d',
    fontWeight: '700',
  },

  // Primary Save Button
  primarySaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#15803d',
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 6,
    shadowColor: '#15803d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primarySaveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
});
