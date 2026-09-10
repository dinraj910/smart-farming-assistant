import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Dimensions, TextInput, ActivityIndicator, RefreshControl,
  Platform, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Weather Data Interfaces ──────────────────────────────────────────────────
interface RainfallDay {
  day: string;
  mm: number;
  isToday: boolean;
  dateStr: string;
}

interface ForecastDay {
  day: string;
  icon: string;
  iconColor: string;
  condition: string;
  high: string;
  low: string;
  rain: string;
  rainPct: number;
}

interface CurrentWeather {
  temp: number;
  apparentTemp: number;
  humidity: number;
  rainRisk: number;
  windSpeed: number;
  weatherCode: number;
  conditionLabel: string;
  icon: string;
  iconColor: string;
  summary: string;
  summaryMl: string;
}

interface Advisory {
  title: string;
  titleMl: string;
  body: string;
  bodyMl: string;
  type: 'danger' | 'warning' | 'success' | 'info';
}

interface LocationTarget {
  name: string;
  district?: string;
  latitude: number;
  longitude: number;
  isGps: boolean;
}

// ─── Preset Kerala Agricultural Hubs ─────────────────────────────────────────
const KERALA_DISTRICTS: { name: string; nameMl: string; lat: number; lon: number }[] = [
  { name: 'Palakkad',   nameMl: 'പാലക്കാട്', lat: 10.7732, lon: 76.6537 },
  { name: 'Wayanad',    nameMl: 'വയനാട്',   lat: 11.6854, lon: 76.1320 },
  { name: 'Idukki',     nameMl: 'ഇടുക്കി',   lat: 9.8494,  lon: 76.9806 },
  { name: 'Kottayam',   nameMl: 'കോട്ടയം',   lat: 9.5916,  lon: 76.5222 },
  { name: 'Thrissur',   nameMl: 'തൃശ്ശൂർ',   lat: 10.5276, lon: 76.2144 },
  { name: 'Kozhikode',  nameMl: 'കോഴിക്കോട്', lat: 11.2588, lon: 75.7804 },
  { name: 'Alappuzha',  nameMl: 'ആലപ്പുഴ',   lat: 9.4981,  lon: 76.3388 },
  { name: 'Ernakulam',  nameMl: 'എറണാകുളം', lat: 9.9816,  lon: 76.2999 },
];

const DEFAULT_LOCATION: LocationTarget = {
  name: 'Palakkad & Wayanad',
  latitude: 10.7732,
  longitude: 76.6537,
  isGps: false,
};

const BAR_MAX_H = 80;

// ─── WMO Code to Feather Icon and Colors ──────────────────────────────────────
function weatherCodeToDetails(code: number, rainProb: number): {
  icon: string;
  iconColor: string;
  labelEn: string;
  labelMl: string;
} {
  if (code === 0) {
    return { icon: 'sun', iconColor: '#f59e0b', labelEn: 'Clear Sky', labelMl: 'തെളിഞ്ഞ ആകാശം' };
  }
  if (code <= 2) {
    return { icon: 'cloud', iconColor: '#38bdf8', labelEn: 'Partly Cloudy', labelMl: 'ഭാഗികമായി മേഘാവൃതം' };
  }
  if (code === 3) {
    return { icon: 'cloud', iconColor: '#94a3b8', labelEn: 'Overcast', labelMl: 'മേഘാവൃതം' };
  }
  if (code <= 48) {
    return { icon: 'wind', iconColor: '#cbd5e1', labelEn: 'Fog & Mist', labelMl: 'മൂടൽമഞ്ഞ്' };
  }
  if (code <= 55) {
    return { icon: 'cloud-drizzle', iconColor: '#38bdf8', labelEn: 'Light Drizzle', labelMl: 'ചെറു ചാറ്റൽമഴ' };
  }
  if (code <= 65) {
    return { icon: 'cloud-rain', iconColor: '#0ea5e9', labelEn: 'Rain Showers', labelMl: 'മഴ' };
  }
  if (code <= 77) {
    return { icon: 'cloud-snow', iconColor: '#bae6fd', labelEn: 'Hail / Snow', labelMl: 'ആലിപ്പഴം' };
  }
  if (code <= 82) {
    return { icon: 'cloud-rain', iconColor: '#0284c7', labelEn: 'Heavy Rainfall', labelMl: 'ശക്തമായ മഴ' };
  }
  if (code <= 99) {
    return { icon: 'cloud-lightning', iconColor: '#fcd34d', labelEn: 'Thunderstorm', labelMl: 'ഇടിമിന്നലോടുകൂടിയ മഴ' };
  }
  return { icon: 'cloud', iconColor: '#94a3b8', labelEn: 'Scattered Clouds', labelMl: 'മേഘങ്ങൾ' };
}

// ─── Generate Real Agricultural Advisory ──────────────────────────────────────
function computeAdvisory(current: {
  rainRisk: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
}): Advisory {
  const isRainy = current.rainRisk >= 60 || current.weatherCode >= 51;
  const isHighWind = current.windSpeed >= 25;
  const isHumid = current.humidity >= 85;

  if (current.weatherCode >= 95) {
    return {
      title: 'Severe Thunderstorm Warning',
      titleMl: 'ഇടിമിന്നൽ ജാഗ്രതാ നിർദ്ദേശം',
      body: 'Stay away from open paddy fields and tall coconut trees. Disconnect electric farm pumps.',
      bodyMl: 'തുറസ്സായ പാടങ്ങളിലും ഉയർന്ന തെങ്ങുകൾക്കടുത്തും നിൽക്കരുത്. പമ്പ് മോട്ടോറുകൾ വിച്ഛേദിക്കുക.',
      type: 'danger',
    };
  }

  if (isRainy) {
    return {
      title: 'Hold Spraying Fertilizers Today',
      titleMl: 'ഇന്ന് വളം തളിക്കുന്നത് ഒഴിവാക്കുക',
      body: 'Rainfall will wash away Bordeaux mixture & foliar nutrients. Reschedule spray operations to a dry window.',
      bodyMl: 'മഴ കാരണം ബോർഡോ മിശ്രിതവും ഇലവളങ്ങളും കഴുകിപ്പോകാൻ സാധ്യതയുണ്ട്. തെളിഞ്ഞ ദിവസങ്ങളിലേക്ക് മാറ്റുക.',
      type: 'warning',
    };
  }

  if (isHighWind) {
    return {
      title: 'Provide Crop Staking Support',
      titleMl: 'വാഴകൾക്കും കുരുമുളകിനും താങ്ങ് നൽകുക',
      body: `Strong gusts (${current.windSpeed} km/h) recorded. Secure propping for banana bunches and young pepper vines.`,
      bodyMl: `ശക്തമായ കാറ്റ് (${current.windSpeed} km/h) വീശുന്നു. കുലച്ച വാഴകൾക്ക് മുട്ടുകൊടുക്കുക.`,
      type: 'warning',
    };
  }

  if (isHumid) {
    return {
      title: 'Inspect for Fungal Disease Signs',
      titleMl: 'ഫംഗസ് രോഗലക്ഷണങ്ങൾ നിരീക്ഷിക്കുക',
      body: 'High ambient humidity favors quick wilt & leaf rot. Ensure adequate plot trench drainage.',
      bodyMl: 'ഉയർന്ന അന്തരീക്ഷ ഈർപ്പം കുമിൾരോഗങ്ങൾക്ക് കാരണമാകും. തോട്ടത്തിൽ നീർവാർച്ച ഉറപ്പാക്കുക.',
      type: 'warning',
    };
  }

  return {
    title: 'Favorable Weather for Field Operations',
    titleMl: 'തോട്ടം പണികൾക്ക് അനുകൂലമായ കാലാവസ്ഥ',
    body: 'Mild wind and dry canopy. Optimal window for fertilizer application, weeding, and spice harvesting.',
    bodyMl: 'അനുകൂലമായ കാലാവസ്ഥ. വളപ്രയോഗം, കളനിവാരണം, കുരുമുളക്/റബ്ബർ വിളവെടുപ്പ് എന്നിവ നടത്താം.',
    type: 'success',
  };
}

export default function WeatherScreen() {
  const [langMl, setLangMl] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active Location
  const [location, setLocation] = useState<LocationTarget>(DEFAULT_LOCATION);
  const [locationName, setLocationName] = useState('Palakkad & Wayanad');

  // Search Bar State
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Weather Data States
  const [current, setCurrent] = useState<CurrentWeather>({
    temp: 29,
    apparentTemp: 31,
    humidity: 88,
    rainRisk: 92,
    windSpeed: 24,
    weatherCode: 65,
    conditionLabel: 'Rain Showers',
    icon: 'cloud-lightning',
    iconColor: '#fcd34d',
    summary: 'Monsoon rain showers expected today',
    summaryMl: 'ഇന്ന് ശക്തമായ മഴയ്ക്ക് സാധ്യതയുണ്ട്',
  });

  const [rainfall, setRainfall] = useState<RainfallDay[]>([
    { day: 'Mon', mm: 18, isToday: true,  dateStr: '' },
    { day: 'Tue', mm: 52, isToday: false, dateStr: '' },
    { day: 'Wed', mm: 35, isToday: false, dateStr: '' },
    { day: 'Thu', mm: 10, isToday: false, dateStr: '' },
    { day: 'Fri', mm: 70, isToday: false, dateStr: '' },
    { day: 'Sat', mm: 42, isToday: false, dateStr: '' },
    { day: 'Sun', mm: 15, isToday: false, dateStr: '' },
  ]);

  const [forecast, setForecast] = useState<ForecastDay[]>([
    { day: 'Mon', icon: 'cloud-rain', iconColor: '#0ea5e9', condition: 'Rain', high: '32°', low: '24°', rain: '92%', rainPct: 92 },
    { day: 'Tue', icon: 'cloud-rain', iconColor: '#0ea5e9', condition: 'Rain', high: '30°', low: '23°', rain: '88%', rainPct: 88 },
    { day: 'Wed', icon: 'cloud',      iconColor: '#94a3b8', condition: 'Cloudy', high: '33°', low: '25°', rain: '60%', rainPct: 60 },
    { day: 'Thu', icon: 'sun',        iconColor: '#f59e0b', condition: 'Sunny', high: '36°', low: '27°', rain: '15%', rainPct: 15 },
    { day: 'Fri', icon: 'cloud-rain', iconColor: '#0ea5e9', condition: 'Rain', high: '29°', low: '22°', rain: '95%', rainPct: 95 },
  ]);

  const [advisory, setAdvisory] = useState<Advisory>({
    title: 'Hold Spraying Fertilizers Today',
    titleMl: 'ഇന്ന് വളം തളിക്കുന്നത് ഒഴിവാക്കുക',
    body: 'Monsoon rainfall will wash away Bordeaux sprays. Reschedule for Friday morning.',
    bodyMl: 'മഴ കാരണം ബോർഡോ മിശ്രിതം കഴുകിപ്പോകാൻ സാധ്യതയുണ്ട്. വെള്ളിയാഴ്ചത്തേക്ക് മാറ്റുക.',
    type: 'warning',
  });

  // Calculate dynamic bar chart height
  const maxRainMm = Math.max(15, ...rainfall.map(d => d.mm));

  // ─── Fetch Live Weather Data from Open-Meteo ─────────────────────────────────
  const fetchWeather = useCallback(async (lat: number, lon: number, locLabel?: string) => {
    try {
      setLoading(true);
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max` +
        `&timezone=auto&forecast_days=7`;

      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Failed to fetch Open-Meteo weather');
      const data = await resp.json();

      const cur = data.current;
      const daily = data.daily;

      // 1. Current Weather
      const curCode = cur.weather_code ?? 0;
      const curTemp = Math.round(cur.temperature_2m ?? 28);
      const appTemp = Math.round(cur.apparent_temperature ?? curTemp);
      const curHumid = Math.round(cur.relative_humidity_2m ?? 80);
      const curWind = Math.round(cur.wind_speed_10m ?? 12);
      const todayRainProb = daily?.precipitation_probability_max?.[0] ?? Math.round(cur.precipitation > 0 ? 90 : 20);

      const details = weatherCodeToDetails(curCode, todayRainProb);

      let summary = `${details.labelEn} • Humidity ${curHumid}%`;
      let summaryMl = `${details.labelMl} • ആർദ്രത ${curHumid}%`;
      if (todayRainProb > 70) {
        summary = `Heavy rain probability (${todayRainProb}%) today`;
        summaryMl = `ഇന്ന് ${todayRainProb}% കനത്ത മഴയ്ക്ക് സാധ്യതയുണ്ട്`;
      } else if (todayRainProb > 40) {
        summary = `Passing showers expected (${todayRainProb}% risk)`;
        summaryMl = `ചാറ്റൽമഴയ്ക്ക് സാധ്യത (${todayRainProb}%)`;
      } else if (curTemp > 34) {
        summary = `High heat index (${appTemp}°C feels like)`;
        summaryMl = `ഉയർന്ന ചൂട് അനുഭവപ്പെടും (${appTemp}°C)`;
      }

      setCurrent({
        temp: curTemp,
        apparentTemp: appTemp,
        humidity: curHumid,
        rainRisk: todayRainProb,
        windSpeed: curWind,
        weatherCode: curCode,
        conditionLabel: details.labelEn,
        icon: details.icon,
        iconColor: details.iconColor,
        summary,
        summaryMl,
      });

      // 2. Agricultural Advisory
      setAdvisory(
        computeAdvisory({
          rainRisk: todayRainProb,
          humidity: curHumid,
          windSpeed: curWind,
          weatherCode: curCode,
        })
      );

      // 3. 7-Day Rainfall Forecast (mm)
      if (daily?.time && daily?.precipitation_sum) {
        const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const rainList: RainfallDay[] = daily.time.slice(0, 7).map((tStr: string, idx: number) => {
          const dObj = new Date(tStr);
          const dayName = idx === 0 ? (langMl ? 'ഇന്ന്' : 'Today') : daysShort[dObj.getDay()];
          const mmVal = parseFloat((daily.precipitation_sum[idx] ?? 0).toFixed(1));
          return {
            day: dayName,
            mm: mmVal,
            isToday: idx === 0,
            dateStr: tStr,
          };
        });
        setRainfall(rainList);
      }

      // 4. 7-Day / 5-Day Forecast List
      if (daily?.time && daily?.weather_code) {
        const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const fList: ForecastDay[] = daily.time.slice(0, 7).map((tStr: string, idx: number) => {
          const dObj = new Date(tStr);
          const dayName = idx === 0 ? 'Today' : daysShort[dObj.getDay()];
          const cCode = daily.weather_code[idx] ?? 0;
          const rProb = daily.precipitation_probability_max?.[idx] ?? 0;
          const wDet = weatherCodeToDetails(cCode, rProb);
          const maxT = Math.round(daily.temperature_2m_max?.[idx] ?? 30);
          const minT = Math.round(daily.temperature_2m_min?.[idx] ?? 22);

          return {
            day: dayName,
            icon: wDet.icon,
            iconColor: wDet.iconColor,
            condition: wDet.labelEn,
            high: `${maxT}°`,
            low: `${minT}°`,
            rain: `${rProb}%`,
            rainPct: rProb,
          };
        });
        setForecast(fList);
      }

      if (locLabel) {
        setLocationName(locLabel);
      }
    } catch (err) {
      console.error('Open-Meteo fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [langMl]);

  // ─── Locate with GPS ────────────────────────────────────────────────────────
  const detectDeviceLocation = useCallback(async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        // Fallback to Palakkad
        fetchWeather(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude, 'Palakkad & Wayanad');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = loc.coords;

      // Reverse geocode
      let placeName = 'My Farm Location';
      try {
        const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geo && geo.length > 0) {
          const p = geo[0];
          const dist = p.district || p.subregion || p.city || p.region || 'Kerala';
          const locTitle = p.city ? `${p.city}, ${dist}` : dist;
          placeName = locTitle;
        }
      } catch (_) {}

      setLocation({
        name: placeName,
        latitude,
        longitude,
        isGps: true,
      });
      setLocationName(placeName);
      await fetchWeather(latitude, longitude, placeName);
    } catch (e) {
      console.warn('GPS location failed:', e);
      fetchWeather(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude, 'Palakkad & Wayanad');
    }
  }, [fetchWeather]);

  // Initial load
  useEffect(() => {
    detectDeviceLocation();
  }, []);

  // ─── Search Locations via Open-Meteo Geocoding ──────────────────────────────
  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (!text.trim() || text.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      setIsSearching(true);
      const queryEnc = encodeURIComponent(text.trim());
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${queryEnc}&count=6&language=en&format=json`;
      const res = await fetch(geoUrl);
      const json = await res.json();
      if (json.results && json.results.length > 0) {
        setSearchResults(json.results);
      } else {
        setSearchResults([]);
      }
    } catch (e) {
      console.error('Geocoding error:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const selectPreset = (district: typeof KERALA_DISTRICTS[0]) => {
    const label = langMl ? district.nameMl : `${district.name}, Kerala`;
    setLocation({
      name: label,
      latitude: district.lat,
      longitude: district.lon,
      isGps: false,
    });
    setLocationName(label);
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    Keyboard.dismiss();
    fetchWeather(district.lat, district.lon, label);
  };

  const selectSearchResult = (item: any) => {
    const parts = [item.name, item.admin1, item.country].filter(Boolean);
    const label = parts.slice(0, 2).join(', ');
    setLocation({
      name: label,
      latitude: item.latitude,
      longitude: item.longitude,
      isGps: false,
    });
    setLocationName(label);
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    Keyboard.dismiss();
    fetchWeather(item.latitude, item.longitude, label);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchWeather(location.latitude, location.longitude, locationName);
  }, [fetchWeather, location, locationName]);

  // ─── Bilingual Labels ───────────────────────────────────────────────────────
  const labels = {
    title: langMl ? 'കാലാവസ്ഥ റഡാർ' : 'Weather Radar',
    radarPill: langMl ? 'തത്സമയ റഡാർ' : 'LIVE DOPPLER RADAR',
    chart: langMl ? '7 ദിവസത്തെ മഴ നിലവാരം (mm)' : '7-Day Rainfall Forecast (mm)',
    forecast: langMl ? '7 ദിവസ പ്രവചനം' : '7-Day Forecast',
    humidity: langMl ? 'ആർദ്രത' : 'Humidity',
    rainRisk: langMl ? 'മഴ സാധ്യത' : 'Rain Risk',
    wind: langMl ? 'കാറ്റ്' : 'Wind',
    searchTip: langMl ? 'ജില്ല അല്ലെങ്കിൽ സ്ഥലം തിരഞ്ഞെടുക്കുക:' : 'Quick Kerala Agricultural Districts:',
    searchPlaceholder: langMl ? 'സ്ഥലം തിരയുക (ഉദാ: Munnar, Palakkad)...' : 'Search city or district (e.g. Munnar)...',
    locateMe: langMl ? 'ജി.പി.എസ് സ്ഥാനം' : 'My GPS Location',
  };

  return (
    <View style={S.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#15803d']}
            tintColor="#15803d"
          />
        }
      >
        <SafeAreaView edges={['top']}>

          {/* ── Page Header ─────────────────────────────────────────────── */}
          <View style={S.header}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <TouchableOpacity
                onPress={() => setSearchOpen(v => !v)}
                activeOpacity={0.7}
                style={S.regionRow}
              >
                <Feather
                  name={location.isGps ? 'navigation' : 'map-pin'}
                  size={12}
                  color="#15803d"
                  style={{ marginRight: 4 }}
                />
                <Text style={S.regionText} numberOfLines={1}>
                  {locationName}
                </Text>
                <Feather name={searchOpen ? 'chevron-up' : 'chevron-down'} size={12} color="#64748b" style={{ marginLeft: 2 }} />
              </TouchableOpacity>

              <Text style={S.titleText}>{labels.title}</Text>
            </View>

            <View style={S.headerRight}>
              {/* GPS Locate Me Button */}
              <TouchableOpacity
                style={[S.iconBtn, location.isGps && S.iconBtnActive]}
                onPress={detectDeviceLocation}
                activeOpacity={0.8}
              >
                <Feather name="crosshair" size={15} color={location.isGps ? '#15803d' : '#0369a1'} />
              </TouchableOpacity>

              {/* Search Toggle Button */}
              <TouchableOpacity
                style={[S.iconBtn, searchOpen && S.iconBtnActive]}
                onPress={() => setSearchOpen(v => !v)}
                activeOpacity={0.8}
              >
                <Feather name="search" size={15} color={searchOpen ? '#15803d' : '#475569'} />
              </TouchableOpacity>

              {/* Language Switch */}
              <TouchableOpacity onPress={() => setLangMl(v => !v)} style={S.langBtn} activeOpacity={0.8}>
                <Feather name="globe" size={12} color="#6ee7b7" />
                <Text style={S.langBtnText}>{langMl ? 'EN' : 'ML'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Interactive Location Search Drawer ────────────────────────── */}
          {searchOpen && (
            <View style={S.searchContainer}>
              <View style={S.searchInputWrap}>
                <Feather name="search" size={14} color="#94a3b8" style={{ marginRight: 8 }} />
                <TextInput
                  value={searchQuery}
                  onChangeText={handleSearch}
                  placeholder={labels.searchPlaceholder}
                  placeholderTextColor="#94a3b8"
                  style={S.searchInput}
                  autoFocus
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => handleSearch('')} style={{ padding: 4 }}>
                    <Feather name="x" size={14} color="#64748b" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Autocomplete Dropdown */}
              {isSearching && (
                <View style={S.searchLoading}>
                  <ActivityIndicator size="small" color="#15803d" />
                </View>
              )}

              {searchResults.length > 0 && (
                <View style={S.dropdownList}>
                  {searchResults.map((item, idx) => (
                    <TouchableOpacity
                      key={`${item.id || idx}`}
                      style={[S.dropdownItem, idx < searchResults.length - 1 && S.dropdownItemBorder]}
                      onPress={() => selectSearchResult(item)}
                      activeOpacity={0.7}
                    >
                      <Feather name="map-pin" size={13} color="#15803d" style={{ marginRight: 8 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={S.dropdownTitle}>{item.name}</Text>
                        <Text style={S.dropdownSub}>
                          {[item.admin1, item.country].filter(Boolean).join(', ')}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Quick District Presets */}
              <Text style={S.presetLabel}>{labels.searchTip}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={S.presetRow}
              >
                {KERALA_DISTRICTS.map(dist => {
                  const isSelected = location.name.includes(dist.name);
                  return (
                    <TouchableOpacity
                      key={dist.name}
                      style={[S.presetChip, isSelected && S.presetChipActive]}
                      onPress={() => selectPreset(dist)}
                      activeOpacity={0.8}
                    >
                      <Text style={[S.presetChipText, isSelected && S.presetChipTextActive]}>
                        {langMl ? dist.nameMl : dist.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ── Hero Dark Weather Card ───────────────────────────────────── */}
          <View style={S.heroCard}>
            <View style={S.heroTop}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <View style={S.radarBadgeRow}>
                  <View style={S.pulsingDot} />
                  <Text style={S.heroRegion}>{labels.radarPill}</Text>
                </View>

                {loading ? (
                  <ActivityIndicator size="small" color="#6ee7b7" style={{ marginVertical: 8, alignSelf: 'flex-start' }} />
                ) : (
                  <Text style={S.heroTemp}>{current.temp}°C</Text>
                )}

                <Text style={S.heroSub} numberOfLines={2}>
                  {langMl ? current.summaryMl : current.summary}
                </Text>
              </View>

              <View style={S.heroIconBox}>
                <Feather
                  name={current.icon as any}
                  size={38}
                  color={current.iconColor}
                />
              </View>
            </View>

            {/* Stats row */}
            <View style={S.statsRow}>
              {[
                { label: labels.humidity, value: `${current.humidity}%`, color: 'white' },
                { label: labels.rainRisk, value: `${current.rainRisk}%`, color: '#7dd3fc' },
                { label: labels.wind,     value: `${current.windSpeed} km/h`, color: 'white' },
              ].map(stat => (
                <View key={stat.label} style={S.statBox}>
                  <Text style={S.statLabel}>{stat.label}</Text>
                  <Text style={[S.statValue, { color: stat.color }]}>{stat.value}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Dynamic Agricultural Advisory Box ────────────────────────── */}
          <View style={[
            S.advisoryBox,
            advisory.type === 'danger' && S.advisoryDanger,
            advisory.type === 'success' && S.advisorySuccess,
          ]}>
            <Feather
              name={advisory.type === 'danger' ? 'alert-triangle' : advisory.type === 'success' ? 'check-circle' : 'alert-circle'}
              size={16}
              color={advisory.type === 'danger' ? '#dc2626' : advisory.type === 'success' ? '#16a34a' : '#d97706'}
              style={{ marginTop: 2 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={[
                S.advisoryTitle,
                advisory.type === 'danger' && { color: '#991b1b' },
                advisory.type === 'success' && { color: '#166534' },
              ]}>
                {langMl ? advisory.titleMl : advisory.title}
              </Text>
              <Text style={[
                S.advisoryBody,
                advisory.type === 'danger' && { color: '#7f1d1d' },
                advisory.type === 'success' && { color: '#14532d' },
              ]}>
                {langMl ? advisory.bodyMl : advisory.body}
              </Text>
            </View>
          </View>

          {/* ── 7-Day Rainfall Bar Chart (mm) ────────────────────────────── */}
          <View style={S.chartCard}>
            <View style={S.chartHeaderRow}>
              <Text style={S.chartTitle}>{labels.chart}</Text>
              <View style={S.rainSumBadge}>
                <Feather name="cloud-drizzle" size={10} color="#0369a1" />
                <Text style={S.rainSumBadgeText}>
                  {rainfall.reduce((acc, cur) => acc + cur.mm, 0).toFixed(0)} mm total
                </Text>
              </View>
            </View>

            <View style={S.barChart}>
              {rainfall.map((d, i) => {
                const barH = maxRainMm > 0 ? (d.mm / maxRainMm) * BAR_MAX_H : 0;
                return (
                  <View key={`rain-${i}`} style={S.barCol}>
                    <Text style={S.barValue}>{d.mm > 0 ? d.mm : '0'}</Text>
                    <View style={S.barTrack}>
                      <View style={[
                        S.barFill,
                        {
                          height: Math.max(3, barH),
                          backgroundColor: d.isToday ? '#15803d' : '#86efac',
                        },
                      ]} />
                    </View>
                    <Text style={[S.barDay, d.isToday && { color: '#15803d', fontWeight: '800' }]}>
                      {d.day}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* ── 7-Day Weather Forecast ───────────────────────────────────── */}
          <View style={S.forecastCard}>
            <View style={S.forecastHeaderRow}>
              <Text style={S.sectionTitle}>{labels.forecast}</Text>
              <Text style={S.forecastSub}>{locationName}</Text>
            </View>

            {forecast.map((f, i) => (
              <View key={`fc-${i}`} style={[S.forecastRow, i < forecast.length - 1 && S.forecastRowBorder]}>
                <Text style={[S.forecastDay, i === 0 && { color: '#15803d', fontWeight: '800' }]}>
                  {f.day}
                </Text>
                <Feather
                  name={f.icon as any}
                  size={18}
                  color={f.iconColor || (f.icon.includes('sun') ? '#f59e0b' : f.icon.includes('rain') ? '#0ea5e9' : '#64748b')}
                />
                <View style={S.forecastRight}>
                  <Text style={S.forecastHigh}>{f.high}</Text>
                  <Text style={S.forecastLow}>{f.low}</Text>
                </View>
                <View style={[
                  S.rainChance,
                  { backgroundColor: f.rainPct > 70 ? '#e0f2fe' : f.rainPct > 30 ? '#f0f9ff' : '#f0fdf4' },
                ]}>
                  <Feather
                    name="droplet"
                    size={10}
                    color={f.rainPct > 70 ? '#0369a1' : f.rainPct > 30 ? '#0284c7' : '#15803d'}
                  />
                  <Text style={[
                    S.rainChanceText,
                    { color: f.rainPct > 70 ? '#0369a1' : f.rainPct > 30 ? '#0284c7' : '#15803d' },
                  ]}>
                    {f.rain}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={{ height: 100 }} />
        </SafeAreaView>
      </ScrollView>
    </View>
  );
}

// ─── Cohesive Design System Styles ────────────────────────────────────────────
const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f1f5f9' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
  },
  regionRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 2,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  regionText: {
    fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, maxWidth: 160,
  },
  titleText: { fontSize: 20, fontWeight: '800', color: '#0f172a', letterSpacing: -0.5 },

  iconBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  iconBtnActive: {
    borderColor: '#86efac', backgroundColor: '#f0fdf4',
  },
  langBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#0a2e18', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(21,128,61,0.4)',
  },
  langBtnText: { fontSize: 10, fontWeight: '800', color: '#6ee7b7' },

  // Search Container
  searchContainer: {
    marginHorizontal: 16, marginTop: 8, marginBottom: 4,
    backgroundColor: 'white', borderRadius: 18, padding: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3,
  },
  searchInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8fafc', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1, fontSize: 13, color: '#0f172a', fontWeight: '500',
  },
  searchLoading: {
    paddingVertical: 10, alignItems: 'center',
  },
  dropdownList: {
    marginTop: 8, borderRadius: 10, backgroundColor: '#f8fafc', overflow: 'hidden',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 12,
  },
  dropdownItemBorder: {
    borderBottomWidth: 1, borderBottomColor: '#edf2f7',
  },
  dropdownTitle: { fontSize: 12, fontWeight: '700', color: '#1e293b' },
  dropdownSub: { fontSize: 10, color: '#64748b' },

  presetLabel: {
    fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6,
    marginTop: 10, marginBottom: 6,
  },
  presetRow: {
    gap: 6, paddingVertical: 2,
  },
  presetChip: {
    backgroundColor: '#f1f5f9', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  presetChipActive: {
    backgroundColor: '#dcfce7', borderColor: '#86efac',
  },
  presetChipText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  presetChipTextActive: { color: '#15803d', fontWeight: '700' },

  // Hero card
  heroCard: {
    marginHorizontal: 16, marginTop: 10,
    backgroundColor: '#0f172a',
    borderRadius: 24, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 14, elevation: 8,
    gap: 14,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  radarBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  pulsingDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e',
  },
  heroRegion: { fontSize: 9, fontWeight: '800', color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: 1 },
  heroTemp: { fontSize: 34, fontWeight: '900', color: 'white', lineHeight: 38 },
  heroSub: { fontSize: 11, color: '#94a3b8', marginTop: 4, lineHeight: 16 },
  heroIconBox: {
    width: 58, height: 58, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  statsRow: {
    flexDirection: 'row', gap: 8,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 12,
  },
  statBox: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 10, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
  },
  statLabel: { fontSize: 9, color: '#94a3b8', marginBottom: 4 },
  statValue: { fontSize: 12, fontWeight: '700' },

  // Advisory
  advisoryBox: {
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: '#fffbeb', borderRadius: 20, padding: 13,
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    borderWidth: 1, borderColor: '#fde68a',
  },
  advisoryDanger: {
    backgroundColor: '#fef2f2', borderColor: '#fecaca',
  },
  advisorySuccess: {
    backgroundColor: '#f0fdf4', borderColor: '#bbf7d0',
  },
  advisoryTitle: { fontSize: 12, fontWeight: '700', color: '#92400e' },
  advisoryBody: { fontSize: 10, color: '#78350f', marginTop: 4, lineHeight: 16 },

  // Chart
  chartCard: {
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: 'white', borderRadius: 22, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  chartHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  chartTitle: { fontSize: 11, fontWeight: '800', color: '#0f172a' },
  rainSumBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f0f9ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12,
  },
  rainSumBadgeText: { fontSize: 9, fontWeight: '700', color: '#0369a1' },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: BAR_MAX_H + 40 },
  barCol: { alignItems: 'center', gap: 4, flex: 1 },
  barValue: { fontSize: 8, fontWeight: '700', color: '#64748b' },
  barTrack: {
    width: 22, height: BAR_MAX_H,
    backgroundColor: '#f1f5f9', borderRadius: 6,
    justifyContent: 'flex-end', overflow: 'hidden',
  },
  barFill: { width: '100%', borderRadius: 6 },
  barDay: { fontSize: 9, fontWeight: '600', color: '#94a3b8' },

  // Forecast
  forecastCard: {
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: 'white', borderRadius: 22, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  forecastHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.8 },
  forecastSub: { fontSize: 10, fontWeight: '600', color: '#94a3b8' },
  forecastRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  forecastRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  forecastDay: { fontSize: 12, fontWeight: '700', color: '#334155', width: 44 },
  forecastRight: { flex: 1, flexDirection: 'row', gap: 8 },
  forecastHigh: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  forecastLow: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  rainChance: {
    flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 4,
  },
  rainChanceText: { fontSize: 10, fontWeight: '700' },
});
