import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, Image, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStackParamList';
import { useAuthStore } from '../store/authStore';
import apiClient from '../api/client';
import UserAvatar from '../components/UserAvatar';

// ─── Registered plots ─────────────────────────────────────────────────────────
interface Plot {
  id: string;
  name: string;
  location: string;
  acres: string;
  npk: string;
  status: 'Healthy' | 'Inspection Due' | 'At Risk';
  image: string;
}

// Empty initial plots, fetched from API

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Healthy:        { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
  'Inspection Due': { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
  'At Risk':      { bg: '#ffe4e6', text: '#9f1239', border: '#fecdd3' },
};

export default function FarmsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, logout } = useAuthStore();
  const [plots, setPlots] = useState<Plot[]>([]);
  const [loadingPlots, setLoadingPlots] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [plotName, setPlotName] = useState('');
  const [plotAcres, setPlotAcres] = useState('');
  const [langMl, setLangMl] = useState(false);

  const labels = {
    sub:     langMl ? 'രജിസ്ട്ഡ് ഭൂമികൾ' : 'Registered Plots',
    title:   langMl ? 'എന്റെ ഫാമുകൾ & ഭൂമികൾ' : 'My Farms & Plots',
    addBtn:  langMl ? 'ഭൂമി ചേർക്കുക' : 'Add Plot',
    modalTitle: langMl ? 'പുതിയ ഭൂമി ചേർക്കുക' : 'Register New Plot',
    savePlot: langMl ? 'ഭൂമി സേവ് ചെയ്യുക' : 'Save Plot',
  };

  useEffect(() => {
    fetchFarms();
  }, []);

  async function fetchFarms() {
    try {
      const res = await apiClient.get('/farms');
      setPlots(res.data);
    } catch (error) {
      console.error('Failed to fetch farms:', error);
    } finally {
      setLoadingPlots(false);
    }
  }

  async function addPlot() {
    if (!plotName.trim()) {
      Alert.alert('Error', 'Please enter a plot name');
      return;
    }
    
    try {
      const res = await apiClient.post('/farms', {
        name: plotName,
        location: 'Kerala, India',
        acres: plotAcres ? `${plotAcres} Acres` : '1.0 Acres',
        npk: 'NPK: --',
        status: 'Inspection Due'
      });
      setPlots(p => [res.data, ...p]);
      setPlotName('');
      setPlotAcres('');
      setModalOpen(false);
    } catch (error) {
      console.error('Error creating plot:', error);
      Alert.alert('Error', 'Failed to create plot');
    }
  }

  async function handleQuickAction(actionLabel: string) {
    if (actionLabel === 'Edit Profile') {
      navigation.navigate('EditProfile');
    } else if (actionLabel === 'Sign Out') {
      logout();
    }
  }

  const calculatedAcres = plots.reduce((sum, p) => {
    const match = p.acres ? p.acres.match(/([\d.]+)/) : null;
    return sum + (match ? parseFloat(match[1]) : 0);
  }, 0);
  const displayAcres = calculatedAcres > 0 ? calculatedAcres.toFixed(1) : (user?.farmSize || '4.2');

  return (
    <View style={S.root}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <SafeAreaView edges={['top']}>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <View style={S.header}>
            <View>
              <Text style={S.subTitle}>{labels.sub}</Text>
              <Text style={S.title}>{labels.title}</Text>
            </View>
            <View style={S.headerRight}>
              <TouchableOpacity onPress={() => setLangMl(v => !v)} style={S.langBtn}>
                <Feather name="globe" size={12} color="#6ee7b7" />
                <Text style={S.langBtnText}>{langMl ? 'EN' : 'ML'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.addBtn} onPress={() => setModalOpen(true)}>
                <Feather name="plus" size={14} color="white" />
                <Text style={S.addBtnText}>{labels.addBtn}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Profile Box ──────────────────────────────────────────────── */}
          <View style={S.profileBox}>
            <View style={S.profileMainRow}>
              <UserAvatar
                name={user?.name || 'Farmer'}
                size={56}
                fontSize={22}
                showBadge
              />
              <View style={S.profileInfoCol}>
                <View style={S.profileNameRow}>
                  <Text style={S.profileName} numberOfLines={1}>{user?.name || 'Farmer'}</Text>
                  <TouchableOpacity
                    style={S.editBtn}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('EditProfile')}
                  >
                    <Feather name="edit-2" size={12} color="#15803d" />
                    <Text style={S.editBtnLabel}>Edit</Text>
                  </TouchableOpacity>
                </View>
                <Text style={S.profileMeta} numberOfLines={1}>{user?.email || 'farmer@naturesync.ag'}</Text>
                {user?.phone ? (
                  <View style={S.phoneRow}>
                    <Feather name="phone" size={10} color="#64748b" />
                    <Text style={S.phoneText}>{user.phone}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Profile Meta Chips */}
            <View style={S.profileChipsRow}>
              <View style={S.profileChip}>
                <Feather name="map-pin" size={10} color="#15803d" />
                <Text style={S.profileChipText} numberOfLines={1}>{user?.district || 'Kerala, India'}</Text>
              </View>
              {user?.primaryCrop ? (
                <View style={[S.profileChip, S.cropChip]}>
                  <Feather name="sun" size={10} color="#b45309" />
                  <Text style={S.cropChipText} numberOfLines={1}>{user.primaryCrop}</Text>
                </View>
              ) : null}
              <View style={S.profileChip}>
                <Feather name="layers" size={10} color="#15803d" />
                <Text style={S.profileChipText}>{plots.length} {plots.length === 1 ? 'Plot' : 'Plots'}</Text>
              </View>
            </View>
          </View>

          {/* ── Stats Row ────────────────────────────────────────────────── */}
          <View style={S.statsRow}>
            {[
              { icon: 'layers',    label: 'Total Plots', value: `${plots.length}` },
              { icon: 'maximize',  label: 'Total Acres', value: `${displayAcres}` },
              { icon: 'shield',    label: 'Health Score', value: '94%'            },
            ].map(stat => (
              <View key={stat.label} style={S.statBox}>
                <View style={S.statIconBox}>
                  <Feather name={stat.icon as any} size={14} color="#15803d" />
                </View>
                <Text style={S.statValue}>{stat.value}</Text>
                <Text style={S.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* ── Plot Cards ───────────────────────────────────────────────── */}
          <View style={S.plotList}>
            <Text style={S.sectionTitle}>Registered Plots</Text>
            {loadingPlots ? (
              <ActivityIndicator size="small" color="#15803d" style={{ marginTop: 20 }} />
            ) : plots.length === 0 ? (
              <Text style={{ textAlign: 'center', color: '#64748b', marginTop: 20 }}>No plots registered yet. Click "Add Plot" to create one.</Text>
            ) : (
              plots.map((plot) => {
                const st = STATUS_STYLES[plot.status] || STATUS_STYLES['Inspection Due'];
                return (
                  <TouchableOpacity 
                    key={plot.id} 
                    style={S.plotCard} 
                    activeOpacity={0.8}
                    onPress={() => (navigation as any).navigate('FieldDetail', { fieldId: plot.id })}
                  >
                    <Image source={{ uri: plot.image }} style={S.plotImage} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={S.plotTopRow}>
                        <Text style={S.plotId}>Plot #{plot.id.substring(0,6)}</Text>
                        <View style={[S.statusBadge, { backgroundColor: st.bg, borderColor: st.border }]}>
                          <Text style={[S.statusText, { color: st.text }]}>{plot.status}</Text>
                        </View>
                      </View>
                      <Text style={S.plotName}>{plot.name}</Text>
                      <Text style={S.plotMeta}>{plot.acres} • {plot.npk}</Text>
                      <View style={S.plotLocation}>
                        <Feather name="map-pin" size={10} color="#94a3b8" />
                        <Text style={S.plotLocationText}>{plot.location}</Text>
                      </View>
                    </View>
                    <View style={S.arrowBtn}>
                      <Feather name="arrow-up-right" size={14} color="#64748b" />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* ── Quick Actions ────────────────────────────────────────────── */}
          <View style={S.quickActionsBox}>
            <Text style={S.sectionTitle}>Account & Settings</Text>
            {[
              { icon: 'user',        label: 'Edit Profile',       sub: 'Update personal & farm info' },
              { icon: 'bell',        label: 'Push Notifications', sub: '3 active alerts' },
              { icon: 'shield',     label: 'Data & Privacy',     sub: 'GDPR compliant' },
              { icon: 'help-circle', label: 'Help & Support',    sub: 'Contact Agri expert' },
              { icon: 'log-out',    label: 'Sign Out',           sub: user?.name || 'User' },
            ].map((item, i) => (
              <TouchableOpacity key={i} style={S.settingRow} activeOpacity={0.7} onPress={() => handleQuickAction(item.label)}>
                <View style={S.settingIcon}>
                  <Feather name={item.icon as any} size={15} color="#475569" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={S.settingLabel}>{item.label}</Text>
                  <Text style={S.settingSub}>{item.sub}</Text>
                </View>
                <Feather name="chevron-right" size={15} color="#cbd5e1" />
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 90 }} />
        </SafeAreaView>
      </ScrollView>

      {/* ── Add Plot Modal ───────────────────────────────────────────────── */}
      <Modal visible={modalOpen} transparent animationType="slide">
        <View style={S.modalOverlay}>
          <View style={S.modalCard}>
            <View style={S.modalHeader}>
              <Text style={S.modalTitle}>{labels.modalTitle}</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)} style={S.closeBtn}>
                <Feather name="x" size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={S.modalInputs}>
              <View>
                <Text style={S.inputLabel}>Plot Name</Text>
                <TextInput
                  value={plotName}
                  onChangeText={setPlotName}
                  placeholder="e.g. Coorg Border Estate"
                  placeholderTextColor="#cbd5e1"
                  style={S.textInput}
                />
              </View>
              <View>
                <Text style={S.inputLabel}>Acreage (Acres)</Text>
                <TextInput
                  value={plotAcres}
                  onChangeText={setPlotAcres}
                  placeholder="1.5"
                  placeholderTextColor="#cbd5e1"
                  keyboardType="numeric"
                  style={S.textInput}
                />
              </View>
            </View>

            <TouchableOpacity style={S.saveBtn} onPress={addPlot} activeOpacity={0.85}>
              <Feather name="check" size={15} color="white" />
              <Text style={S.saveBtnText}>{labels.savePlot}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f1f5f9' },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subTitle: { fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a', letterSpacing: -0.5 },
  langBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#0a2e18', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(21,128,61,0.4)',
  },
  langBtnText: { fontSize: 10, fontWeight: '800', color: '#6ee7b7' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#15803d', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 8,
    shadowColor: '#15803d', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
  },
  addBtnText: { color: 'white', fontSize: 12, fontWeight: '700' },

  // Profile
  profileBox: {
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: 'white', borderRadius: 22, padding: 14,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    gap: 12,
  },
  profileMainRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  profileInfoCol: {
    flex: 1, gap: 2,
  },
  profileNameRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  profileName: { fontSize: 15, fontWeight: '800', color: '#0f172a', flex: 1, marginRight: 8 },
  profileMeta: { fontSize: 11, color: '#64748b' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  phoneText: { fontSize: 10, color: '#64748b', fontWeight: '600' },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0',
    borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5,
  },
  editBtnLabel: { fontSize: 11, fontWeight: '700', color: '#15803d' },
  profileChipsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  profileChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f8fafc', borderRadius: 99,
    paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  profileChipText: { fontSize: 10, fontWeight: '700', color: '#334155' },
  cropChip: { backgroundColor: '#fef3c7', borderColor: '#fde68a' },
  cropChipText: { fontSize: 10, fontWeight: '700', color: '#92400e' },

  // Stats
  statsRow: {
    marginHorizontal: 16, marginTop: 10,
    flexDirection: 'row', gap: 8,
  },
  statBox: {
    flex: 1, backgroundColor: 'white', borderRadius: 18, padding: 12,
    alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  statIconBox: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center',
  },
  statValue: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  statLabel: { fontSize: 9, color: '#94a3b8', fontWeight: '600', textAlign: 'center' },

  // Plot list
  plotList: { paddingHorizontal: 16, marginTop: 14, gap: 10 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  plotCard: {
    backgroundColor: 'white', borderRadius: 22, padding: 12,
    flexDirection: 'row', gap: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  plotImage: { width: 56, height: 56, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  plotTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  plotId: { fontSize: 9, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  statusBadge: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  statusText: { fontSize: 9, fontWeight: '700' },
  plotName: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  plotMeta: { fontSize: 10, color: '#64748b' },
  plotLocation: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  plotLocationText: { fontSize: 9, color: '#94a3b8' },
  arrowBtn: {
    width: 28, height: 28, borderRadius: 10,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
  },

  // Quick actions (settings)
  quickActionsBox: { paddingHorizontal: 16, marginTop: 14, gap: 6 },
  settingRow: {
    backgroundColor: 'white', borderRadius: 18, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  settingIcon: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center',
  },
  settingLabel: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  settingSub: { fontSize: 10, color: '#94a3b8', marginTop: 1 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30,
    padding: 20, gap: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 12,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
  },
  modalInputs: { gap: 10 },
  inputLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', marginBottom: 5 },
  textInput: {
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 13, fontWeight: '600', color: '#1e293b',
  },
  saveBtn: {
    backgroundColor: '#15803d', borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14,
    shadowColor: '#15803d', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  saveBtnText: { color: 'white', fontWeight: '800', fontSize: 14 },
});
