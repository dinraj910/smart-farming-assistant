import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, Image,
  TouchableOpacity, StyleSheet, ActivityIndicator, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStackParamList';
import { useAuthStore } from '../store/authStore';
import * as Location from 'expo-location';
import apiClient from '../api/client';
import UserAvatar from '../components/UserAvatar';

// ─── Types ────────────────────────────────────────────────────────────────────
interface HourlySlot {
  hour: string;   // "09"
  icon: string;   // feather icon name
  iconColor: string;
  temp: string;   // "28°"
  active: boolean;
}

interface WeatherState {
  temp: number;
  condition: string;
  conditionIcon: string;
  locationName: string;
  humidity: number;
  windSpeed: number;
  hourly: HourlySlot[];
  loading: boolean;
  error: boolean;
}

interface Plot {
  id: string;
  name: string;
  location: string;
  acres: string;
  npk: string;
  status: string;
  image: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function weatherCodeToInfo(code: number): { label: string; icon: string; color: string } {
  if (code === 0)                          return { label: 'Clear sky',       icon: 'sun',        color: '#f59e0b' };
  if (code <= 3)                           return { label: 'Partly cloudy',   icon: 'cloud',      color: '#94a3b8' };
  if (code <= 48)                          return { label: 'Foggy',           icon: 'wind',       color: '#94a3b8' };
  if (code <= 55)                          return { label: 'Drizzle',         icon: 'cloud-drizzle', color: '#38bdf8' };
  if (code <= 65)                          return { label: 'Rain',            icon: 'cloud-rain', color: '#0ea5e9' };
  if (code <= 77)                          return { label: 'Snow',            icon: 'cloud-snow', color: '#bae6fd' };
  if (code <= 82)                          return { label: 'Rain showers',    icon: 'cloud-rain', color: '#0ea5e9' };
  if (code <= 99)                          return { label: 'Thunderstorm',    icon: 'zap',        color: '#a855f7' };
  return                                          { label: 'Cloudy',          icon: 'cloud',      color: '#94a3b8' };
}

function cropAdviceFromWeather(code: number, temp: number): string {
  if (code === 0 && temp > 25 && temp < 35) return 'Great day for Pepper & Palms';
  if (code <= 3)                            return 'Good for most field work';
  if (code <= 55)                           return 'Good for Coconut & Rubber';
  if (code <= 65)                           return 'Avoid spraying today';
  if (code <= 82)                           return 'Avoid field work today';
  return 'Stay indoors — storm risk';
}

function getCurrentDate(): string {
  const now = new Date();
  const days   = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

// ─── Quick Action Grid ────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { id: 'agent',   icon: 'zap',         label: 'Farm Assistant', sub: 'Ask about a field',  bg: '#dcfce7', color: '#15803d', tab: 'AgentSelect' },
  { id: 'doctor',  icon: 'camera',      label: 'Leaf Doctor',    sub: 'Disease Diagnosis',  bg: '#fee2e2', color: '#b91c1c', tab: 'Doctor'      },
  { id: 'weather', icon: 'cloud-rain',  label: 'Rain Forecast',  sub: 'Spraying Radar',     bg: '#e0f2fe', color: '#0369a1', tab: 'Weather'     },
  { id: 'market',  icon: 'trending-up', label: 'Mandi Prices',   sub: 'Rubber & Pepper',    bg: '#fef3c7', color: '#b45309', tab: 'Market'      },
];

// Fallback farm images by index
const FARM_IMAGES = [
  'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1596401057633-54a8fe8ef647?auto=format&fit=crop&w=800&q=80',
];

const HERO_BANNER_IMAGE = require('../../assets/farm_hero_banner.jpg');

// ─── Component ────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuthStore();

  const [weather, setWeather] = useState<WeatherState>({
    temp: 0, condition: 'Loading...', conditionIcon: 'cloud',
    locationName: 'Locating...', humidity: 0, windSpeed: 0,
    hourly: [], loading: true, error: false,
  });

  const [farms, setFarms]           = useState<Plot[]>([]);
  const [farmsLoading, setFarmsLoading] = useState(true);
  const [currentDate]               = useState(getCurrentDate());

  // ── Navigate helpers ────────────────────────────────────────────────────────
  const handleQuickAction = (tab: string) => {
    if (tab === 'AgentSelect') {
      (navigation as any).navigate('Main', { screen: 'Assistant' });
    } else {
      (navigation as any).navigate('Main', { screen: tab });
    }
  };
  const openAgentHub    = () => (navigation as any).navigate('Main', { screen: 'Assistant' });
  const openFieldDetail = (fieldId: string) => (navigation as any).navigate('FieldDetail', { fieldId });

  // ── Fetch live weather via Open-Meteo (free, no API key) ───────────────────
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setWeather(w => ({ ...w, loading: false, error: true, locationName: 'Location denied' }));
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude, longitude } = loc.coords;

        // Reverse geocode for district name
        const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
        const place = geo[0];
        const locationName = place?.district || place?.city || place?.subregion || place?.region || 'Your Location';

        // Open-Meteo API — completely free, no key
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}`
          + `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`
          + `&hourly=temperature_2m,weather_code`
          + `&timezone=auto&forecast_days=1`;

        const res = await fetch(url);
        const data = await res.json();

        const currentCode = data.current.weather_code;
        const currentTemp = Math.round(data.current.temperature_2m);
        const info        = weatherCodeToInfo(currentCode);
        const nowHour     = new Date().getHours();

        // Build 6-hour strip centred on current hour (guaranteeing 6 distinct consecutive hours)
        const hourlySlots: HourlySlot[] = [];
        const startHour = Math.max(0, Math.min(18, nowHour - 1));
        for (let i = 0; i < 6; i++) {
          const h = startHour + i;
          const t = Math.round(data.hourly.temperature_2m[h] ?? currentTemp);
          const c = data.hourly.weather_code[h] ?? currentCode;
          const wInfo = weatherCodeToInfo(c);
          hourlySlots.push({
            hour:      String(h).padStart(2, '0'),
            icon:      wInfo.icon,
            iconColor: wInfo.color,
            temp:      `${t}°`,
            active:    h === nowHour,
          });
        }

        setWeather({
          temp: currentTemp,
          condition: info.label,
          conditionIcon: info.icon,
          locationName,
          humidity: data.current.relative_humidity_2m,
          windSpeed: Math.round(data.current.wind_speed_10m),
          hourly: hourlySlots,
          loading: false,
          error: false,
        });
      } catch (e) {
        console.error('Weather fetch error:', e);
        setWeather(w => ({ ...w, loading: false, error: true, locationName: 'Unavailable' }));
      }
    })();
  }, []);

  // ── Fetch real farms from backend, refresh on tab focus ───────────────────────
  const fetchFarms = useCallback(async () => {
    try {
      const res = await apiClient.get('/farms');
      setFarms(res.data || []);
    } catch (e) {
      console.error('Farms fetch error:', e);
    } finally {
      setFarmsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFarms();
  }, []);

  // Re-fetch when the Home tab is focused (e.g. after adding a plot)
  useFocusEffect(
    useCallback(() => {
      fetchFarms();
    }, [])
  );

  // ─────────────────────────────────────────────────────────────────────────────
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
            source={HERO_BANNER_IMAGE}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
          <View style={styles.heroOverlay} />

          <SafeAreaView edges={['top']}>
            <View style={styles.heroContent}>

              {/* Top row — greeting + avatar */}
              <View style={styles.heroTopRow}>
                <View>
                  <Text style={styles.greetingText}>Hello, {user?.name || 'Farmer'} 👋</Text>
                  <Text style={styles.dateText}>{currentDate}</Text>
                </View>
                <TouchableOpacity
                  style={styles.avatarBtn}
                  onPress={() => (navigation as any).navigate('Main', { screen: 'Farms' })}
                  activeOpacity={0.8}
                >
                  <UserAvatar
                    name={user?.name || 'Farmer'}
                    size={42}
                    fontSize={18}
                    showBadge
                  />
                </TouchableOpacity>
              </View>

              {/* Slogan — enlarged now that search bar is removed */}
              <Text style={styles.slogan}>{'Farming Made\nSimple, Smarter,\nand Sustainable'}</Text>

              {/* ── Live Weather Card ───────────────────────── */}
              <View style={styles.weatherCard}>
                {weather.loading ? (
                  <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                    <ActivityIndicator color="#15803d" size="small" />
                    <Text style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>Fetching live weather...</Text>
                  </View>
                ) : weather.error ? (
                  <View style={{ alignItems: 'center', paddingVertical: 14 }}>
                    <Feather name="cloud-off" size={24} color="#94a3b8" />
                    <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Weather unavailable</Text>
                  </View>
                ) : (
                  <>
                    {/* Hourly strip */}
                    <View style={styles.hourlyRow}>
                      {weather.hourly.map((h, idx) => (
                        <View key={`hour-${h.hour}-${idx}`} style={[styles.hourItem, h.active && styles.hourItemActive]}>
                          <Text style={[styles.hourText, h.active && styles.hourTextActive]}>{h.hour}</Text>
                          <Feather
                            name={h.icon as any}
                            size={13}
                            color={h.active ? '#fff' : h.iconColor}
                          />
                          <Text style={[styles.hourTemp, h.active && styles.hourTempActive]}>{h.temp}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Bottom info */}
                    <View style={styles.weatherBottom}>
                      <View>
                        <Text style={styles.weatherDateLabel}>{currentDate}</Text>
                        <Text style={styles.weatherTemp}>{weather.temp}°C</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Feather name="map-pin" size={11} color="#16a34a" />
                          <Text style={styles.weatherLocation}>{weather.locationName}</Text>
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Feather name={weather.conditionIcon as any} size={13} color={weatherCodeToInfo(0).color} />
                          <Text style={styles.weatherCondition}>{weather.condition}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Feather name="droplet" size={11} color="#0369a1" />
                          <Text style={{ fontSize: 9, color: '#334155', fontWeight: '600' }}>{weather.humidity}% humidity</Text>
                        </View>
                        <View style={styles.cropBadge}>
                          <Feather name="droplet" size={10} color="#15803d" />
                          <Text style={styles.cropBadgeText}>{cropAdviceFromWeather(0, weather.temp)}</Text>
                        </View>
                      </View>
                    </View>
                  </>
                )}
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

            {farmsLoading ? (
              <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                <ActivityIndicator color="#15803d" size="small" />
                <Text style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>Loading your fields...</Text>
              </View>
            ) : farms.length === 0 ? (
              <TouchableOpacity
                style={styles.emptyFieldsCard}
                onPress={() => (navigation as any).navigate('Main', { screen: 'Farms' })}
                activeOpacity={0.85}
              >
                <Feather name="plus-circle" size={28} color="#15803d" />
                <Text style={styles.emptyFieldsTitle}>No fields registered yet</Text>
                <Text style={styles.emptyFieldsSub}>Tap to go to My Farms and add your first plot</Text>
              </TouchableOpacity>
            ) : (
              <>
                {/* First farm — large card */}
                <TouchableOpacity
                  style={[styles.fieldCard, { height: 160 }]}
                  onPress={() => openFieldDetail(farms[0].id)}
                  activeOpacity={0.9}
                >
                  <Image
                    source={{ uri: farms[0].image || FARM_IMAGES[0] }}
                    style={StyleSheet.absoluteFillObject}
                    resizeMode="cover"
                  />
                  <View style={styles.fieldGradient} />
                  <View style={styles.fieldTagBadge}>
                    <View style={styles.fieldTagDot} />
                    <Text style={styles.fieldTagText}>
                      {farms[0].location} • {farms[0].acres}
                    </Text>
                  </View>
                  <View style={styles.fieldBottom}>
                    <View>
                      <Text style={styles.fieldName}>{farms[0].name}</Text>
                      <Text style={styles.fieldMonitoring}>
                        Status: {farms[0].status} • {farms[0].npk}
                      </Text>
                    </View>
                    <View style={styles.fieldChevron}>
                      <Feather name="chevron-right" size={16} color="#fff" />
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Remaining farms — compact cards */}
                {farms.slice(1).map((farm, idx) => (
                  <TouchableOpacity
                    key={farm.id}
                    style={[styles.fieldCard, { height: 110, marginTop: 10 }]}
                    onPress={() => openFieldDetail(farm.id)}
                    activeOpacity={0.9}
                  >
                    <Image
                      source={{ uri: farm.image || FARM_IMAGES[(idx + 1) % FARM_IMAGES.length] }}
                      style={StyleSheet.absoluteFillObject}
                      resizeMode="cover"
                    />
                    <View style={styles.fieldGradient} />
                    <View style={styles.fieldBottom}>
                      <View>
                        <View style={styles.fieldSmallTag}>
                          <Text style={styles.fieldSmallTagText}>
                            {farm.location} • {farm.acres}
                          </Text>
                        </View>
                        <Text style={[styles.fieldName, { marginTop: 4 }]}>{farm.name}</Text>
                      </View>
                      <View style={[styles.fieldChevron, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                        <Feather name="chevron-right" size={14} color="#fff" />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Hero ──────────────────────────────────────────────
  hero: {
    minHeight: 460,
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
    fontSize: 15,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    // No overflow:hidden — UserAvatar needs to render its badge outside the circle
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  // Slogan — larger now that search bar is removed
  slogan: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 38,
    letterSpacing: -0.8,
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
  emptyFieldsCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    gap: 8,
  },
  emptyFieldsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptyFieldsSub: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
  },
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
    backgroundColor: 'rgba(0,0,0,0.35)',
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
