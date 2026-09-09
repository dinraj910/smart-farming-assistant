import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Image, Animated, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { API_URL } from '../api/client';
import * as SecureStore from 'expo-secure-store';

// ─── Types ────────────────────────────────────────────────────────────────────
interface DiseaseResult {
  raw_label: string;
  disease_name: string;
  is_healthy: boolean;
  confidence: number;
  confidence_pct: string;
  explanation: string;
  severity: string;
  severity_score: number;
  treatment: string[];
}

type ScreenState = 'idle' | 'scanning' | 'result' | 'error';

// ─── Severity colour helpers ──────────────────────────────────────────────────
function getSeverityColor(severity: string): string {
  if (severity === 'None') return '#16a34a';
  if (severity === 'Mild') return '#d97706';
  if (severity === 'Moderate') return '#ea580c';
  return '#dc2626';
}

function getSeverityBg(severity: string): string {
  if (severity === 'None') return '#dcfce7';
  if (severity === 'Mild') return '#fef3c7';
  if (severity === 'Moderate') return '#ffedd5';
  return '#fee2e2';
}

function getSeverityTextColor(severity: string): string {
  if (severity === 'None') return '#166534';
  if (severity === 'Mild') return '#92400e';
  if (severity === 'Moderate') return '#9a3412';
  return '#991b1b';
}

// ─── Animated Scan Overlay ────────────────────────────────────────────────────
function ScanOverlay({ active }: { active: boolean }) {
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active]);

  const scanY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-80, 80],
  });

  if (!active) return null;

  return (
    <View style={scanOverlayStyles.overlay}>
      {/* Corner decorations */}
      <View style={[scanOverlayStyles.corner, scanOverlayStyles.cTL]} />
      <View style={[scanOverlayStyles.corner, scanOverlayStyles.cTR]} />
      <View style={[scanOverlayStyles.corner, scanOverlayStyles.cBL]} />
      <View style={[scanOverlayStyles.corner, scanOverlayStyles.cBR]} />
      {/* Scan line */}
      <Animated.View style={[scanOverlayStyles.scanLine, { transform: [{ translateY: scanY }] }]} />
    </View>
  );
}

const scanOverlayStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: 'rgba(52,211,153,0.85)',
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderColor: '#34d399',
  },
  cTL: { top: -1, left: -1, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 6 },
  cTR: { top: -1, right: -1, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 6 },
  cBL: { bottom: -1, left: -1, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 6 },
  cBR: { bottom: -1, right: -1, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 6 },
  scanLine: {
    width: '100%',
    height: 2,
    backgroundColor: '#34d399',
    shadowColor: '#34d399',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
});

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LeafDoctorScreen() {
  const navigation = useNavigation();

  const [screenState, setScreenState] = useState<ScreenState>('idle');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [result, setResult] = useState<DiseaseResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // ── Image picking ────────────────────────────────────────────────────────────
  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!picked.canceled && picked.assets.length > 0) {
      await analyzeImage(picked.assets[0].uri);
    }
  };

  const openCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Please allow camera access.');
      return;
    }
    const taken = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!taken.canceled && taken.assets.length > 0) {
      await analyzeImage(taken.assets[0].uri);
    }
  };

  // ── API Call ─────────────────────────────────────────────────────────────────
  const analyzeImage = async (uri: string) => {
    setCapturedUri(uri);
    setScreenState('scanning');
    setResult(null);
    setErrorMsg('');

    try {
      // Build multipart form body
      const formData = new FormData();
      const filename = uri.split('/').pop() ?? 'leaf.jpg';
      const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
      const mime = ext === 'png' ? 'image/png' : 'image/jpeg';

      (formData as any).append('image', {
        uri,
        name: filename,
        type: mime,
      });

      // Retrieve auth token
      let token: string | null = null;
      try {
        token = await SecureStore.getItemAsync('auth_token');
      } catch (_) {}

      // In React Native fetch with FormData, DO NOT set 'Content-Type': 'multipart/form-data'
      // manually because it omits the boundary string. Fetch automatically sets it.
      const headers: Record<string, string> = {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const response = await fetch(`${API_URL}/disease/detect`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (response.status === 503) {
        throw new Error('The disease model is warming up. Please wait ~20 seconds and try again.');
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.detail ?? `Server error (${response.status})`);
      }

      const data: DiseaseResult = await response.json();
      setResult(data);
      setScreenState('result');
    } catch (e: any) {
      console.error('Disease detection error:', e);
      setErrorMsg(e.message ?? 'Could not analyse image. Check your connection.');
      setScreenState('error');
    }
  };

  const resetScan = () => {
    setScreenState('idle');
    setCapturedUri(null);
    setResult(null);
    setErrorMsg('');
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <View style={S.root}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <SafeAreaView edges={['top']} style={S.headerSafe}>
        <View style={S.header}>
          <TouchableOpacity
            style={S.backBtn}
            onPress={() => (navigation as any).navigate('Main', { screen: 'Home' })}
            activeOpacity={0.8}
          >
            <Feather name="arrow-left" size={18} color="#334155" />
          </TouchableOpacity>
          <View style={S.headerTitleWrap}>
            <View style={S.headerSubRow}>
              <View style={S.headerDot} />
              <Text style={S.headerSub}>AI PLANT PATHOLOGY SCANNER</Text>
            </View>
            <Text style={S.headerTitle}>Leaf Doctor</Text>
          </View>
          <View style={S.headerBadge}>
            <Feather name="shield" size={12} color="#15803d" />
            <Text style={S.headerBadgeText}>NatureSync</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >

        {/* ── IDLE STATE ──────────────────────────────────────────────── */}
        {screenState === 'idle' && (
          <>
            {/* Farm Hero Photo */}
            <View style={S.heroWrap}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb16432?auto=format&fit=crop&w=900&q=80' }}
                style={S.heroImage}
                resizeMode="cover"
              />
              <View style={S.heroOverlay} />
              <View style={S.heroContent}>
                <View style={S.heroTopBadge}>
                  <View style={S.heroPulseDot} />
                  <Text style={S.heroTopBadgeText}>MobileNetV2 • 87K+ Disease Classes</Text>
                </View>
                <Text style={S.heroTitle}>Instant Leaf Diagnosis</Text>
                <Text style={S.heroDesc}>
                  Photograph any plant leaf — our AI identifies diseases in seconds and suggests organic treatments.
                </Text>
              </View>
            </View>

            {/* How it Works Strip */}
            <View style={S.stepsRow}>
              {[
                { icon: 'camera', label: 'Capture', sub: 'Take / upload leaf photo' },
                { icon: 'zap', label: 'Analyse', sub: 'MobileNetV2 AI scans' },
                { icon: 'shield', label: 'Treat', sub: 'Get KAU treatment plan' },
              ].map((s, i) => (
                <View key={i} style={S.stepCard}>
                  <View style={S.stepIcon}>
                    <Feather name={s.icon as any} size={18} color="#15803d" />
                  </View>
                  <Text style={S.stepLabel}>{s.label}</Text>
                  <Text style={S.stepSub}>{s.sub}</Text>
                </View>
              ))}
            </View>

            {/* CTA Buttons */}
            <View style={S.ctaWrap}>
              <TouchableOpacity style={S.cameraBtn} onPress={openCamera} activeOpacity={0.85}>
                <Feather name="camera" size={18} color="#fff" />
                <Text style={S.cameraBtnText}>Take Photo of Leaf</Text>
              </TouchableOpacity>

              <TouchableOpacity style={S.galleryBtn} onPress={pickFromGallery} activeOpacity={0.85}>
                <Feather name="image" size={18} color="#15803d" />
                <Text style={S.galleryBtnText}>Choose from Gallery</Text>
              </TouchableOpacity>
            </View>

            {/* Supported plants info */}
            <View style={S.infoCard}>
              <Feather name="info" size={15} color="#0369a1" style={{ marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={S.infoTitle}>38 Crop Types • 87,000+ Disease Labels</Text>
                <Text style={S.infoText}>
                  Trained on rice, maize, tomato, wheat, grape, pepper, potato, banana, coconut, and many more. Works best with clear, close-up photos in natural daylight.
                </Text>
              </View>
            </View>
          </>
        )}

        {/* ── SCANNING STATE ──────────────────────────────────────────── */}
        {(screenState === 'scanning') && capturedUri && (
          <>
            <View style={S.scanWrap}>
              <Image source={{ uri: capturedUri }} style={S.scanImage} resizeMode="cover" />
              <View style={S.scanDarkOverlay} />
              <ScanOverlay active={true} />
              {/* Scan status overlay */}
              <View style={S.scanStatusBadge}>
                <ActivityIndicator size="small" color="#34d399" />
                <Text style={S.scanStatusText}>Analysing leaf tissue...</Text>
              </View>
            </View>
            <View style={S.scanInfoCard}>
              <View style={S.scanInfoIcon}>
                <Feather name="cpu" size={18} color="#15803d" />
              </View>
              <View>
                <Text style={S.scanInfoTitle}>MobileNetV2 Processing</Text>
                <Text style={S.scanInfoDesc}>Running 87K-class plant pathology model + KAU advisory synthesis...</Text>
              </View>
            </View>
          </>
        )}

        {/* ── ERROR STATE ─────────────────────────────────────────────── */}
        {screenState === 'error' && (
          <View style={S.errorCard}>
            <View style={S.errorIconCircle}>
              <Feather name="alert-triangle" size={28} color="#dc2626" />
            </View>
            <Text style={S.errorTitle}>Diagnosis Failed</Text>
            <Text style={S.errorMsg}>{errorMsg}</Text>
            <TouchableOpacity style={S.retryBtn} onPress={resetScan} activeOpacity={0.85}>
              <Feather name="refresh-cw" size={15} color="#fff" />
              <Text style={S.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── RESULT STATE ─────────────────────────────────────────────── */}
        {screenState === 'result' && result && capturedUri && (
          <>
            {/* Captured leaf image */}
            <View style={S.resultImageWrap}>
              <Image source={{ uri: capturedUri }} style={S.resultImage} resizeMode="cover" />
              <View style={S.resultImageOverlay} />
              {/* Confidence badge on image */}
              <View style={S.confBadgeOnImage}>
                <Text style={S.confBadgeValue}>{result.confidence_pct}</Text>
                <Text style={S.confBadgeLabel}>Confidence</Text>
              </View>
            </View>

            {/* Result Card */}
            <View style={S.resultCardOuter}>
              <View style={S.resultCard}>

                {/* Status Badge + Disease Name */}
                <View style={S.resultHeader}>
                  <View>
                    <View style={[S.riskBadge, {
                      backgroundColor: getSeverityBg(result.severity),
                      borderColor: getSeverityColor(result.severity) + '44',
                    }]}>
                      <View style={[S.riskDot, { backgroundColor: getSeverityColor(result.severity) }]} />
                      <Text style={[S.riskBadgeText, { color: getSeverityTextColor(result.severity) }]}>
                        {result.is_healthy ? '✅ Healthy Plant' : `⚠️ ${result.severity} Severity`}
                      </Text>
                    </View>
                    <Text style={S.diseaseName}>{result.disease_name}</Text>
                    <Text style={S.rawLabel}>{result.raw_label}</Text>
                  </View>
                </View>

                {/* Severity Progress Bar */}
                {!result.is_healthy && (
                  <View style={S.severityBox}>
                    <View style={S.severityTopRow}>
                      <Text style={S.severityLabel}>Disease Severity Index</Text>
                      <Text style={[S.severityValue, { color: getSeverityColor(result.severity) }]}>
                        {result.severity}
                      </Text>
                    </View>
                    <View style={S.severityTrack}>
                      <View style={[S.severityFill, {
                        width: `${result.severity_score * 100}%` as any,
                        backgroundColor: getSeverityColor(result.severity),
                      }]} />
                    </View>
                  </View>
                )}

                {/* Explanation */}
                <View style={S.explanationBox}>
                  <View style={S.explanationHeader}>
                    <Feather name="book-open" size={14} color="#0369a1" />
                    <Text style={S.explanationTitle}>What was detected</Text>
                  </View>
                  <Text style={S.explanationText}>{result.explanation}</Text>
                </View>

                {/* Treatment Steps */}
                <View style={S.treatmentBox}>
                  <View style={S.treatmentHeader}>
                    <Feather name="shield" size={14} color="#15803d" />
                    <Text style={S.treatmentTitle}>
                      {result.is_healthy ? 'Maintenance Recommendations' : 'Recommended Treatment'}
                    </Text>
                  </View>
                  {result.treatment.map((step, i) => (
                    <View key={i} style={S.treatmentStep}>
                      <View style={S.stepNumBadge}>
                        <Text style={S.stepNum}>{i + 1}</Text>
                      </View>
                      <Text style={S.stepText}>{step}</Text>
                    </View>
                  ))}
                </View>

                {/* Action Buttons */}
                <TouchableOpacity style={S.scanAnotherBtn} onPress={resetScan} activeOpacity={0.85}>
                  <Feather name="camera" size={16} color="#fff" />
                  <Text style={S.scanAnotherBtnText}>Scan Another Leaf</Text>
                </TouchableOpacity>

                <TouchableOpacity style={S.galleryAnotherBtn} onPress={pickFromGallery} activeOpacity={0.85}>
                  <Feather name="image" size={15} color="#15803d" />
                  <Text style={S.galleryAnotherBtnText}>Upload from Gallery</Text>
                </TouchableOpacity>

              </View>
            </View>

            {/* Disclaimer */}
            <View style={S.disclaimerCard}>
              <Feather name="alert-circle" size={13} color="#b45309" />
              <Text style={S.disclaimerText}>
                AI diagnosis is a decision-support tool. For critical cases, consult your local KAU agricultural officer or Krishi Bhavan for field verification.
              </Text>
            </View>
          </>
        )}

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },

  // Header
  headerSafe: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: { flex: 1 },
  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  headerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  headerSub: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803d',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 1,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803d',
  },

  // ── Idle Hero ─────────────────────────────────────────────────────────────
  heroWrap: {
    height: 220,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.62)',
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 18,
    gap: 6,
  },
  heroTopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heroPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#34d399',
  },
  heroTopBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  heroDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 18,
  },

  // ── How it Works Steps ───────────────────────────────────────────────────
  stepsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  stepCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  stepIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  stepSub: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center',
  },

  // ── CTA Buttons ───────────────────────────────────────────────────────────
  ctaWrap: {
    paddingHorizontal: 14,
    paddingTop: 14,
    gap: 10,
  },
  cameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#15803d',
    borderRadius: 18,
    paddingVertical: 15,
    shadowColor: '#15803d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  cameraBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  galleryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#15803d',
  },
  galleryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#15803d',
  },

  // ── Info Card ─────────────────────────────────────────────────────────────
  infoCard: {
    flexDirection: 'row',
    gap: 10,
    margin: 14,
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
    alignItems: 'flex-start',
  },
  infoTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0369a1',
    marginBottom: 2,
  },
  infoText: {
    fontSize: 11,
    color: '#075985',
    lineHeight: 16,
  },

  // ── Scanning State ────────────────────────────────────────────────────────
  scanWrap: {
    height: 280,
    position: 'relative',
    margin: 14,
    borderRadius: 22,
    overflow: 'hidden',
  },
  scanImage: {
    width: '100%',
    height: '100%',
  },
  scanDarkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.35)',
  },
  scanStatusBadge: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15,23,42,0.75)',
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.4)',
  },
  scanStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6ee7b7',
  },
  scanInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 14,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  scanInfoIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanInfoTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  scanInfoDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
  },

  // ── Error State ───────────────────────────────────────────────────────────
  errorCard: {
    margin: 14,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  errorIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  errorMsg: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#15803d',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 11,
    marginTop: 4,
    shadowColor: '#15803d',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },

  // ── Result State ──────────────────────────────────────────────────────────
  resultImageWrap: {
    height: 230,
    position: 'relative',
  },
  resultImage: {
    width: '100%',
    height: '100%',
  },
  resultImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.4)',
  },
  confBadgeOnImage: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(15,23,42,0.7)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  confBadgeValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#6ee7b7',
  },
  confBadgeLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  resultCardOuter: {
    paddingHorizontal: 14,
    marginTop: -28,
    zIndex: 10,
  },
  resultCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 6,
    gap: 14,
  },

  // Disease header
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    marginBottom: 6,
  },
  riskDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  riskBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  diseaseName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 22,
  },
  rawLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 2,
  },

  // Severity
  severityBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  severityTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  severityLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  severityValue: {
    fontSize: 10,
    fontWeight: '800',
  },
  severityTrack: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 99,
    overflow: 'hidden',
  },
  severityFill: {
    height: '100%',
    borderRadius: 99,
  },

  // Explanation
  explanationBox: {
    backgroundColor: '#f0f9ff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
    gap: 6,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  explanationTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0369a1',
  },
  explanationText: {
    fontSize: 12,
    color: '#1e3a5f',
    lineHeight: 18,
  },

  // Treatment
  treatmentBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    gap: 8,
  },
  treatmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  treatmentTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803d',
  },
  treatmentStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  stepNumBadge: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: '#15803d',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNum: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
  stepText: {
    fontSize: 11,
    color: '#1e3a2f',
    lineHeight: 17,
    flex: 1,
  },

  // Bottom Action Buttons
  scanAnotherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#15803d',
    borderRadius: 16,
    paddingVertical: 13,
    shadowColor: '#15803d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  scanAnotherBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  galleryAnotherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#15803d',
  },
  galleryAnotherBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803d',
  },

  // Disclaimer
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 14,
    marginTop: 12,
    backgroundColor: '#fffbeb',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 10,
    color: '#92400e',
    lineHeight: 15,
    fontWeight: '500',
  },
});
