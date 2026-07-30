import React from 'react';
import { View, Text, TouchableOpacity, ImageBackground, StatusBar, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStackParamList';
import { Feather } from '@expo/vector-icons';

type WelcomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Welcome'>;

interface Props {
  navigation: WelcomeScreenNavigationProp;
}

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1000' }}
        style={styles.bg}
        resizeMode="cover"
      >
        {/* Dark gradient overlays */}
        <View style={styles.overlayTop} />
        <View style={styles.overlayBottom} />

        <View style={styles.content}>
          {/* Brand Header */}
          <View>
            <View style={styles.logoBox}>
              <Feather name="feather" size={26} color="white" />
            </View>
            <Text style={styles.brandName}>NatureSync</Text>
            <Text style={styles.brandSub}>Kerala AgTech AI</Text>

            <Text style={styles.headline}>Farming Made{'\n'}Simple, Smarter,{'\n'}and Sustainable</Text>
            <Text style={styles.sub}>AI-powered crop intelligence for Kerala farmers</Text>
          </View>

          {/* Get Started CTA */}
          <View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Main')}
              style={styles.ctaBtn}
              activeOpacity={0.85}
            >
              <View style={styles.ctaIconBox}>
                <Feather name="arrow-right" size={22} color="#15803d" />
              </View>
              <Text style={styles.ctaText}>Get Started</Text>
              <Feather name="chevrons-right" size={20} color="rgba(255,255,255,0.4)" style={{ marginRight: 20 }} />
            </TouchableOpacity>
            <Text style={styles.ctaNote}>Free for all Kerala farmers</Text>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bg: { flex: 1 },
  overlayTop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  overlayBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingBottom: 48,
    paddingTop: 80,
  },
  logoBox: {
    width: 52, height: 52,
    borderRadius: 16,
    backgroundColor: '#15803d',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#15803d',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  brandName: {
    fontSize: 22, fontWeight: '800',
    color: 'white', letterSpacing: -0.5,
  },
  brandSub: {
    fontSize: 11, fontWeight: '700',
    color: '#6ee7b7', letterSpacing: 1.2,
    textTransform: 'uppercase', marginBottom: 24,
  },
  headline: {
    fontSize: 38, fontWeight: '900',
    color: 'white', lineHeight: 44,
    letterSpacing: -1, marginBottom: 12,
  },
  sub: {
    fontSize: 14, color: 'rgba(255,255,255,0.75)',
    fontWeight: '500', lineHeight: 20,
  },
  ctaBtn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 6,
    paddingLeft: 6,
  },
  ctaIconBox: {
    width: 52, height: 52,
    backgroundColor: 'white',
    borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaText: {
    color: 'white', fontSize: 17, fontWeight: '700',
    flex: 1, textAlign: 'center',
  },
  ctaNote: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11, textAlign: 'center',
    marginTop: 12, fontWeight: '600',
  },
});
