import React from 'react';
import { View, Text, ScrollView, ImageBackground, Image, TextInput, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStackParamList';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import WeatherWidget from '../components/WeatherWidget';
import FieldCard from '../components/FieldCard';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

const CROPS = [
  { id: '1', name: 'Wheat', image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=200&h=200&fit=crop', active: true },
  { id: '2', name: 'Grapes', image: 'https://images.unsplash.com/photo-1596547609652-9fc5d8d428ce?w=200&h=200&fit=crop', active: false },
  { id: '3', name: 'Potato', image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=200&h=200&fit=crop', active: false },
  { id: '4', name: 'Corn', image: 'https://images.unsplash.com/photo-1444858291040-58f756a3bdd6?w=200&h=200&fit=crop', active: false },
];

const FIELDS = [
  {
    id: '1',
    title: 'Emerald Valley Plot F5',
    location: '40.7128N | 74.0060W',
    rating: '4.5',
    imageUri: 'https://images.unsplash.com/photo-1586771107445-d3af116b47c0?w=800&q=80',
  },
  {
    id: '2',
    title: 'Sunrise Orchard',
    location: '34.0522N | 118.2437W',
    rating: '4.8',
    imageUri: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=800&q=80',
  }
];

export default function HomeScreen({ navigation }: Props) {
  return (
    <ScrollView className="flex-1 bg-gray-50" showsVerticalScrollIndicator={false}>
      {/* Header with Background */}
      <ImageBackground 
        source={{ uri: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1000&q=80' }} 
        className="pt-14 pb-8 rounded-b-[40px] overflow-hidden"
      >
        <View className="absolute w-full h-full bg-black/30" />
        <View className="px-6">
          {/* Top Bar */}
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-white text-lg font-semibold">Hello Jonathan.S</Text>
              <Text className="text-white/80 text-xs">Monday, 02 Sep 2025 ⌄</Text>
            </View>
            <View className="w-12 h-12 rounded-full border-2 border-white overflow-hidden">
              <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1595856754020-00df23223019?w=200&h=200&fit=crop' }} 
                className="w-full h-full"
              />
            </View>
          </View>

          {/* Title */}
          <Text className="text-white text-3xl font-bold leading-tight w-3/4 mb-6">
            Farming Made Simple, Smarter, and Sustainable
          </Text>

          {/* Search & Location */}
          <View className="flex-row items-center mb-4">
            <View className="flex-1 flex-row items-center bg-white/20 rounded-full px-4 py-3 mr-3 backdrop-blur-md border border-white/20">
              <Feather name="search" size={20} color="white" />
              <TextInput 
                placeholder="Search places" 
                placeholderTextColor="rgba(255,255,255,0.7)"
                className="flex-1 ml-2 text-white"
              />
            </View>
            <TouchableOpacity className="w-12 h-12 bg-white rounded-full items-center justify-center shadow-sm">
              <Feather name="map-pin" size={20} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Weather Widget */}
          <WeatherWidget />
        </View>
      </ImageBackground>

      {/* Content Below Header */}
      <View className="px-6 pt-6 pb-20">
        {/* Crops Horizontal List */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-8">
          {CROPS.map((crop) => (
            <TouchableOpacity 
              key={crop.id}
              className={`flex-row items-center rounded-full p-1 pr-4 mr-3 shadow-sm ${crop.active ? 'bg-orange-400' : 'bg-white'}`}
            >
              <View className="w-10 h-10 rounded-full overflow-hidden mr-2">
                <Image source={{ uri: crop.image }} className="w-full h-full" />
              </View>
              <Text className={`font-semibold ${crop.active ? 'text-white' : 'text-gray-700'}`}>
                {crop.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* My Fields Section */}
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-xl font-bold text-gray-800">My Fields</Text>
          <TouchableOpacity>
            <Text className="text-gray-500 font-medium text-sm">See all ❯</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {FIELDS.map((field) => (
            <FieldCard 
              key={field.id}
              {...field}
              onPress={() => navigation.navigate('CropDetail', {
                cropName: 'Wheat Field',
                yieldData: '8200 Kg/ha',
                harvestDate: 'Feb 10, 2025',
                imageUri: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&q=80'
              })}
            />
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
}
