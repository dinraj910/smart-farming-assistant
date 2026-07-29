import React from 'react';
import { View, Text, TouchableOpacity, ImageBackground, StatusBar } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStackParamList';
import { FontAwesome5, Feather } from '@expo/vector-icons';

type WelcomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Welcome'>;

interface Props {
  navigation: WelcomeScreenNavigationProp;
}

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <View className="flex-1">
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1628187315539-7815b3c3758b?auto=format&fit=crop&q=80&w=1000' }}
        className="flex-1"
        resizeMode="cover"
      >
        {/* Soft overlay gradient replacement (white at top to transparent to black at bottom) */}
        <View className="absolute top-0 w-full h-1/2 bg-white/60" style={{ opacity: 0.8 }} />
        <View className="absolute bottom-0 w-full h-1/2 bg-black/60" style={{ opacity: 0.8 }} />

        <View className="flex-1 justify-between px-6 pb-12 pt-16">
          {/* Header Section */}
          <View>
            <View className="w-12 h-12 bg-green-500 rounded-full items-center justify-center mb-4">
              <FontAwesome5 name="leaf" size={24} color="white" />
            </View>
            
            <Text className="text-4xl font-semibold text-gray-800 leading-tight">
              Smart Solutions
            </Text>
            <Text className="text-4xl font-bold text-green-700 leading-tight mb-4">
              Modern Farmers
            </Text>
            
            <Text className="text-base text-gray-700 leading-relaxed max-w-[80%] font-medium">
              Empowering farmers with smart tools for better yields and decisions
            </Text>
          </View>

          {/* Action Button Section */}
          <View>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Home')}
              className="bg-white/20 border border-white/30 backdrop-blur-md rounded-[40px] flex-row items-center justify-between p-2 pl-6"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
            >
              <View className="w-12 h-12 bg-white rounded-full items-center justify-center">
                <Feather name="arrow-right" size={24} color="#16a34a" />
              </View>
              <Text className="text-white text-lg font-medium pr-12">
                Get Started
              </Text>
              <View className="pr-6">
                <Feather name="chevrons-right" size={24} color="rgba(255,255,255,0.4)" />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}
