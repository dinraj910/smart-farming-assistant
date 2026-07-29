import React from 'react';
import { View, Text, ImageBackground, TouchableOpacity } from 'react-native';
import { FontAwesome, Feather } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStackParamList';

interface Props {
  title: string;
  rating: string;
  location: string;
  imageUri: string;
  onPress: () => void;
}

export default function FieldCard({ title, rating, location, imageUri, onPress }: Props) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} className="mr-4 w-72 h-48 rounded-[32px] overflow-hidden shadow-sm">
      <ImageBackground source={{ uri: imageUri }} className="w-full h-full justify-between p-4" resizeMode="cover">
        <View className="flex-row justify-between items-start">
          <View className="bg-black/40 rounded-full px-3 py-1 flex-row items-center">
            <FontAwesome name="star" size={12} color="#f59e0b" />
            <Text className="text-white text-xs font-semibold ml-1">{rating}</Text>
          </View>
          <View className="w-8 h-8 bg-black/40 rounded-full items-center justify-center">
            <FontAwesome name="heart" size={14} color="#ef4444" />
          </View>
        </View>

        <View className="flex-row justify-between items-end">
          <View>
            <View className="flex-row items-center mb-1">
              <Feather name="map-pin" size={12} color="rgba(255,255,255,0.7)" />
              <Text className="text-white/70 text-xs ml-1">{location}</Text>
            </View>
            <Text className="text-white text-lg font-bold">{title}</Text>
          </View>
          
          <View className="w-10 h-10 bg-white rounded-full items-center justify-center">
            <Feather name="arrow-up-right" size={20} color="#1f2937" />
          </View>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}
