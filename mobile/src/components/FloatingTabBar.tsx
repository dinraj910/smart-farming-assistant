import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';

type TabRoute = 'Home' | 'Doctor' | 'Weather' | 'Market' | 'Farms';

const TAB_CONFIG: Record<TabRoute, { icon: string; label: string; mlLabel: string }> = {
  Home:    { icon: 'home',        label: 'Home',    mlLabel: 'ഹോം'    },
  Doctor:  { icon: 'camera',      label: 'Doctor',  mlLabel: 'രോഗം'   },
  Weather: { icon: 'cloud-rain',  label: 'Weather', mlLabel: 'കാലാവസ്ഥ' },
  Market:  { icon: 'trending-up', label: 'Market',  mlLabel: 'വിപണി'   },
  Farms:   { icon: 'map-pin',     label: 'Farms',   mlLabel: 'തോട്ടം'  },
};

interface FloatingTabBarProps extends BottomTabBarProps {
  lang?: 'en' | 'ml';
}

export default function FloatingTabBar({ state, descriptors, navigation, lang = 'en' }: FloatingTabBarProps) {
  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.container}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const routeName = route.name as TabRoute;
          const config = TAB_CONFIG[routeName];
          if (!config) return null;

          const label = lang === 'ml' ? config.mlLabel : config.label;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.8}
              style={styles.tabItem}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
            >
              <Feather
                name={config.icon as any}
                size={18}
                color={isFocused ? '#15803d' : '#94a3b8'}
              />
              <Text style={[styles.label, isFocused ? styles.labelActive : styles.labelInactive]}>
                {label}
              </Text>
              {isFocused && <View style={styles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    alignItems: 'center',
  },
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.9)',
    width: '100%',
    justifyContent: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: 'relative',
  },
  label: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  labelActive: {
    color: '#15803d',
  },
  labelInactive: {
    color: '#94a3b8',
  },
  activeDot: {
    position: 'absolute',
    bottom: -6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#15803d',
  },
});
