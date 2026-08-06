import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

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

const INITIAL_PLOTS: Plot[] = [
  {
    id: 'F1',
    name: 'Wayanad Pepper Homestead',
    location: 'Meenangadi, Wayanad',
    acres: '2.4 Acres',
    npk: 'NPK: 85-42-140',
    status: 'Healthy',
    image: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'F2',
    name: 'Palakkad Nendran Field',
    location: 'Chittur, Palakkad',
    acres: '1.8 Acres',
    npk: 'NPK: 70-30-110',
    status: 'Inspection Due',
    image: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=400&q=80',
  },
];

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Healthy:        { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
  'Inspection Due': { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
  'At Risk':      { bg: '#ffe4e6', text: '#9f1239', border: '#fecdd3' },
};

export default function FarmsScreen() {
  const navigation = useNavigation();
  const [plots, setPlots] = useState<Plot[]>(INITIAL_PLOTS);
  const [modalOpen, setModalOpen] = useState(false);
  const [plotName, setPlotName] = useState('');
  const [plotAcres, setPlotAcres] = useState('');
  const [langMl, setLangMl] = useState(false);

  const labels = {
    sub:     langMl ? 'രജിസ്ട്ഡ് ഭൂമികൾ' : 'Registered Plots',
    title:   langMl ? 'എന്റെ ഫാമുകൾ & ഭൂമികൾ' : 'My Farms & Plots',
    addBtn:  langMl ? 'ഭൂമി ചേർക്കുക' : 'Add Plot',
    memberId:'Member ID: KL-WYD-8821 • Wayanad',
    plotCount: `${plots.length} Plots Registered`,
    modalTitle: langMl ? 'പുതിയ ഭൂമി ചേർക്കുക' : 'Register New Plot',
    savePlot: langMl ? 'ഭൂമി സേവ് ചെയ്യുക' : 'Save Plot',
  };

  function addPlot() {
    if (!plotName.trim()) {
      Alert.alert('Error', 'Please enter a plot name');
      return;
    }
    const newPlot: Plot = {
      id: `F${plots.length + 1}`,
      name: plotName,
      location: 'Kerala, India',
      acres: plotAcres ? `${plotAcres} Acres` : '1.0 Acres',
      npk: 'NPK: --',
      status: 'Inspection Due',
      image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=400&q=80',
    };
    setPlots(p => [...p, newPlot]);
    setPlotName('');
    setPlotAcres('');
    setModalOpen(false);
  }

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
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80' }}
              style={S.profileAvatar}
            />
            <View style={{ flex: 1 }}>
              <Text style={S.profileName}>Rajesh Nair</Text>
              <Text style={S.profileMeta}>{labels.memberId}</Text>
              <View style={S.plotCountBadge}>
                <Feather name="map-pin" size={10} color="#15803d" />
                <Text style={S.plotCountText}>{labels.plotCount}</Text>
              </View>
            </View>
            <TouchableOpacity style={S.editBtn}>
              <Feather name="edit-2" size={14} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* ── Stats Row ────────────────────────────────────────────────── */}
          <View style={S.statsRow}>
            {[
              { icon: 'layers',    label: 'Total Plots', value: `${plots.length}` },
              { icon: 'maximize',  label: 'Total Acres', value: '4.2'             },
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
            {plots.map((plot) => {
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
                      <Text style={S.plotId}>Plot #{plot.id}</Text>
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
            })}
          </View>

          {/* ── Quick Actions ────────────────────────────────────────────── */}
          <View style={S.quickActionsBox}>
            <Text style={S.sectionTitle}>Account & Settings</Text>
            {[
              { icon: 'bell',       label: 'Push Notifications', sub: '3 active alerts' },
              { icon: 'shield',     label: 'Data & Privacy',     sub: 'GDPR compliant' },
              { icon: 'help-circle', label: 'Help & Support',    sub: 'Contact Agri expert' },
              { icon: 'log-out',    label: 'Sign Out',           sub: 'Rajesh Nair' },
            ].map((item, i) => (
              <TouchableOpacity key={i} style={S.settingRow} activeOpacity={0.7}>
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
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  profileAvatar: { width: 52, height: 52, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  profileName: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  profileMeta: { fontSize: 10, color: '#64748b', marginTop: 2 },
  plotCountBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f0fdf4', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: '#bbf7d0', alignSelf: 'flex-start', marginTop: 5,
  },
  plotCountText: { fontSize: 9, fontWeight: '700', color: '#15803d' },
  editBtn: {
    width: 32, height: 32, borderRadius: 12,
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center',
  },

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
