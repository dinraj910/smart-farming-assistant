import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  ScrollView, Animated, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

// ─── Sample leaf data ─────────────────────────────────────────────────────────
const SAMPLES = {
  wilt: {
    image: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb16432?auto=format&fit=crop&w=800&q=80',
    title: 'Quick Wilt Disease (ദ്രുതവാട്ടം)',
    pathogen: 'Pathogen: Phytophthora capsici',
    risk: 'High Risk Detected',
    confidence: '98%',
    severity: 'Moderate (Stage 2)',
    step1: '1. Organic Spray: Apply 1% Bordeaux Mixture (ബോർഡോ മിശ്രിതം) on foliage and soil base immediately.',
    step2: '2. Bio-Control: Mix Trichoderma viride with organic compost around roots.',
    severityFill: 0.5,
  },
  blight: {
    image: 'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=800&q=80',
    title: 'Banana Bunchy Top Virus (ബഞ്ചി ടോപ്പ്)',
    pathogen: 'Pathogen: Banana Bunchy Top Virus',
    risk: 'Critical Alert',
    confidence: '91%',
    severity: 'Severe (Stage 3)',
    step1: '1. Quarantine: Remove infected suckers and spray Neem Oil emulsion.',
    step2: '2. Containment: Avoid moving soil from affected areas to healthy plots.',
    severityFill: 0.75,
  },
  healthy: {
    image: 'https://images.unsplash.com/photo-1508193638397-1c4234db14d8?auto=format&fit=crop&w=800&q=80',
    title: 'Healthy Tissue (രോഗമില്ല)',
    pathogen: 'No pathogen detected',
    risk: 'All Clear',
    confidence: '99%',
    severity: 'None (Stage 0)',
    step1: '1. Maintenance: Continue regular organic compost applications.',
    step2: '2. Prevention: Apply Neem-based spray every 3 weeks as prophylaxis.',
    severityFill: 0,
  },
};

type SampleKey = keyof typeof SAMPLES;

export default function LeafDoctorScreen() {
  const [selected, setSelected] = useState<SampleKey>('wilt');
  const data = SAMPLES[selected];

  // Animated scan line
  const scanAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const scanTranslate = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, 60],
  });

  // Severity bar color
  const getRiskColor = () => {
    if (selected === 'healthy') return '#15803d';
    if (selected === 'blight') return '#be123c';
    return '#f59e0b';
  };

  const getRiskBgColor = () => {
    if (selected === 'healthy') return '#dcfce7';
    if (selected === 'blight') return '#ffe4e6';
    return '#fef3c7';
  };

  const getRiskTextColor = () => {
    if (selected === 'healthy') return '#166534';
    if (selected === 'blight') return '#9f1239';
    return '#92400e';
  };

  return (
    <View style={S.root}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── TOP SCANNER HEADER ───────────────────────────────────────── */}
        <View style={S.scannerContainer}>
          <Image source={{ uri: data.image }} style={S.leafImage} />
          {/* Gradient fade bottom */}
          <View style={S.scanGradient} />

          {/* Top controls */}
          <SafeAreaView edges={['top']} style={S.scanTopBar}>
            <View style={S.scannerPill}>
              <View style={S.pulseDot} />
              <Text style={S.scannerPillText}>Leaf Vision Scanner</Text>
            </View>
            <TouchableOpacity style={S.zapBtn}>
              <Feather name="zap" size={14} color="white" />
            </TouchableOpacity>
          </SafeAreaView>

          {/* Bounding box + scan line */}
          <View style={S.boundingBox}>
            {/* Corner decorations */}
            <View style={[S.corner, S.cornerTL]} />
            <View style={[S.corner, S.cornerTR]} />
            <View style={[S.corner, S.cornerBL]} />
            <View style={[S.corner, S.cornerBR]} />
            {/* Animated scan line */}
            <Animated.View style={[S.scanLine, { transform: [{ translateY: scanTranslate }] }]} />
          </View>
        </View>

        {/* ── DIAGNOSTIC CARD ──────────────────────────────────────────── */}
        <View style={S.diagContainer}>
          <View style={S.diagCard}>

            {/* Header row */}
            <View style={S.diagHeader}>
              <View style={{ flex: 1 }}>
                <View style={[S.riskBadge, { backgroundColor: getRiskBgColor() }]}>
                  <Text style={[S.riskBadgeText, { color: getRiskTextColor() }]}>{data.risk}</Text>
                </View>
                <Text style={S.diagTitle}>{data.title}</Text>
                <Text style={S.diagPathogen}>{data.pathogen}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={S.confidence}>{data.confidence}</Text>
                <Text style={S.confidenceLabel}>Confidence</Text>
              </View>
            </View>

            {/* Severity bar */}
            <View style={S.severityBox}>
              <View style={S.severityTopRow}>
                <Text style={S.severityTitle}>Disease Severity Index</Text>
                <Text style={[S.severityValue, { color: getRiskColor() }]}>{data.severity}</Text>
              </View>
              <View style={S.severityTrack}>
                <View style={[S.severityFill, { width: `${data.severityFill * 100}%`, backgroundColor: getRiskColor() }]} />
              </View>
            </View>

            {/* Sample selectors */}
            <View>
              <Text style={S.sampleLabel}>Test Leaf Samples:</Text>
              <View style={S.sampleRow}>
                {(Object.keys(SAMPLES) as SampleKey[]).map(key => (
                  <TouchableOpacity
                    key={key}
                    style={[S.sampleBtn, selected === key && S.sampleBtnActive]}
                    onPress={() => setSelected(key)}
                    activeOpacity={0.8}
                  >
                    <Text style={[S.sampleBtnText, selected === key && S.sampleBtnTextActive]}>
                      {key === 'wilt' ? 'Black Pepper Wilt' : key === 'blight' ? 'Banana Blight' : 'Healthy Leaf'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Treatment box */}
            <View style={S.treatmentBox}>
              <View style={S.treatmentHeader}>
                <Feather name="shield" size={14} color="#15803d" />
                <Text style={S.treatmentTitle}>Recommended Treatment</Text>
              </View>
              <Text style={S.treatmentStep}>{data.step1}</Text>
              <Text style={S.treatmentStep}>{data.step2}</Text>
            </View>

            {/* Scan button */}
            <TouchableOpacity style={S.scanBtn} activeOpacity={0.85}>
              <Feather name="camera" size={15} color="white" />
              <Text style={S.scanBtnText}>Scan New Leaf Sample</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 90 }} />
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f1f5f9' },

  // Scanner top
  scannerContainer: { height: 260, position: 'relative' },
  leafImage: { width: '100%', height: '100%' },
  scanGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 100,
    backgroundColor: 'rgba(241,245,249,0.85)',
  },
  scanTopBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, gap: 12,
  },
  scannerPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 99,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  pulseDot: { width: 8, height: 8, borderRadius: 99, backgroundColor: '#6ee7b7' },
  scannerPillText: { fontSize: 11, fontWeight: '700', color: 'white' },
  zapBtn: {
    position: 'absolute', right: 16, top: 8,
    width: 32, height: 32, borderRadius: 99,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    marginTop: 44,
  },

  // Bounding box
  boundingBox: {
    position: 'absolute', top: 56, left: 48, right: 48, bottom: 60,
    borderWidth: 2, borderColor: 'rgba(52,211,153,0.9)', borderRadius: 18,
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
  },
  corner: {
    position: 'absolute', width: 14, height: 14,
    borderColor: '#34d399',
  },
  cornerTL: { top: -1, left: -1, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 6 },
  cornerTR: { top: -1, right: -1, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 6 },
  cornerBL: { bottom: -1, left: -1, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: -1, right: -1, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 6 },
  scanLine: {
    width: '100%', height: 2,
    backgroundColor: '#34d399',
    shadowColor: '#34d399', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 8,
  },

  // Diagnostic card
  diagContainer: { paddingHorizontal: 14, marginTop: -32, zIndex: 20 },
  diagCard: {
    backgroundColor: 'white', borderRadius: 24, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 8,
    borderWidth: 1, borderColor: '#e2e8f0',
    gap: 12,
  },
  diagHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  riskBadge: { alignSelf: 'flex-start', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 6 },
  riskBadgeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  diagTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a', lineHeight: 18 },
  diagPathogen: { fontSize: 11, color: '#64748b', fontWeight: '500', marginTop: 2 },
  confidence: { fontSize: 18, fontWeight: '800', color: '#15803d' },
  confidenceLabel: { fontSize: 8, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Severity
  severityBox: {
    backgroundColor: '#f8fafc', borderRadius: 14, padding: 10,
    borderWidth: 1, borderColor: '#e2e8f0', gap: 8,
  },
  severityTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  severityTitle: { fontSize: 10, fontWeight: '700', color: '#334155' },
  severityValue: { fontSize: 10, fontWeight: '700' },
  severityTrack: { height: 8, backgroundColor: '#e2e8f0', borderRadius: 99, overflow: 'hidden' },
  severityFill: { height: '100%', borderRadius: 99 },

  // Samples
  sampleLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', marginBottom: 8 },
  sampleRow: { flexDirection: 'row', gap: 8 },
  sampleBtn: {
    flex: 1, backgroundColor: '#f1f5f9', borderRadius: 12, padding: 8,
    alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0',
  },
  sampleBtnActive: { backgroundColor: '#f0fdf4', borderColor: '#86efac' },
  sampleBtnText: { fontSize: 10, fontWeight: '700', color: '#475569', textAlign: 'center' },
  sampleBtnTextActive: { color: '#15803d' },

  // Treatment
  treatmentBox: {
    backgroundColor: '#f8fafc', borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: '#e2e8f0', gap: 8,
  },
  treatmentHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  treatmentTitle: { fontSize: 11, fontWeight: '800', color: '#0f172a' },
  treatmentStep: { fontSize: 10, color: '#475569', lineHeight: 16 },

  // Scan button
  scanBtn: {
    backgroundColor: '#15803d', borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12,
    shadowColor: '#15803d', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  scanBtnText: { color: 'white', fontWeight: '800', fontSize: 12 },
});
