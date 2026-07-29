import React from 'react';
import { View, Text, ImageBackground, Image, TouchableOpacity, StatusBar } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/RootStackParamList';
import { Feather, FontAwesome5 } from '@expo/vector-icons';

type CropDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CropDetail'>;
type CropDetailScreenRouteProp = RouteProp<RootStackParamList, 'CropDetail'>;

interface Props {
  navigation: CropDetailScreenNavigationProp;
  route: CropDetailScreenRouteProp;
}

export default function CropDetailScreen({ navigation, route }: Props) {
  // Using default props if none provided
  const { 
    cropName = 'Wheat Field', 
    yieldData = '8200 Kg/ha', 
    harvestDate = 'Feb 10, 2025',
    imageUri = 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&q=80'
  } = route.params || {};

  return (
    <View className="flex-1 bg-black">
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      {/* Background Top-down field image */}
      <ImageBackground 
        source={{ uri: 'https://images.unsplash.com/photo-1590682680695-43b964a3ae17?q=80&w=1000&auto=format&fit=crop' }} 
        className="flex-1 justify-between pb-8"
        resizeMode="cover"
      >
        {/* Header Actions */}
        <View className="flex-row justify-between items-center px-6 pt-14">
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            className="w-12 h-12 bg-black/40 rounded-full items-center justify-center backdrop-blur-md"
          >
            <Feather name="chevron-left" size={24} color="white" />
          </TouchableOpacity>

          <View className="items-center">
             <View className="bg-black/40 rounded-full px-4 py-2 flex-row items-center backdrop-blur-md">
                <View className="w-6 h-6 rounded-full overflow-hidden mr-2">
                   <Image source={{ uri: imageUri }} className="w-full h-full" />
                </View>
                <View>
                   <Text className="text-white font-bold text-sm">{cropName}</Text>
                   <Text className="text-white/70 text-[10px]">Punjab Valley</Text>
                </View>
             </View>
          </View>

          <View className="bg-black/40 rounded-full p-1 backdrop-blur-md">
            <TouchableOpacity className="w-10 h-10 items-center justify-center rounded-full">
              <Feather name="plus" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity className="w-10 h-10 items-center justify-center rounded-full">
              <Feather name="minus" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Details Card */}
        <View className="px-4">
          <View className="bg-white rounded-[40px] p-4 shadow-xl">
            {/* Header of Bottom Card */}
            <View className="flex-row justify-between items-center mb-4 px-2 pt-2">
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-full overflow-hidden mr-3">
                  <Image source={{ uri: imageUri }} className="w-full h-full" />
                </View>
                <View>
                  <Text className="text-gray-800 text-xl font-bold">{cropName}</Text>
                  <Text className="text-gray-500 text-xs">Harvest On: {harvestDate}</Text>
                </View>
              </View>

              <View className="flex-row items-center bg-green-50 px-3 py-2 rounded-2xl">
                <FontAwesome5 name="seedling" size={16} color="#16a34a" />
                <Text className="text-green-700 font-bold ml-2">{yieldData}</Text>
              </View>
            </View>

            {/* Inner Image */}
            <View className="w-full h-48 rounded-[24px] overflow-hidden">
              <Image 
                source={{ uri: imageUri }} 
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}
