import React from 'react';
import { View, Text, Image } from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';

export default function WeatherWidget() {
  return (
    <View className="bg-white/80 rounded-[32px] p-5 shadow-lg mt-4">
      {/* Forecast Row */}
      <View className="flex-row justify-between border-b border-gray-200 pb-4 mb-4">
        {[
          { time: '09', temp: '28°', icon: 'cloud', active: false },
          { time: '10', temp: '30°', icon: 'cloud', active: false },
          { time: '11', temp: '32°', icon: 'sun', active: true },
          { time: '12', temp: '36°', icon: 'sun', active: false },
          { time: '13', temp: '35°', icon: 'cloud-rain', active: false },
          { time: '14', temp: '34°', icon: 'cloud', active: false },
        ].map((item, index) => (
          <View 
            key={index} 
            className={`items-center justify-center rounded-full p-2 ${item.active ? 'bg-orange-400 w-12 h-24' : 'w-12'}`}
          >
            <Text className={`text-xs mb-2 ${item.active ? 'text-white' : 'text-gray-500'}`}>{item.time}</Text>
            <Feather name={item.icon as any} size={20} color={item.active ? 'white' : '#6b7280'} />
            <Text className={`text-sm mt-2 font-medium ${item.active ? 'text-white' : 'text-gray-800'}`}>{item.temp}</Text>
          </View>
        ))}
      </View>

      {/* Main Weather Details */}
      <View className="flex-row justify-between items-end">
        <View>
          <Text className="text-gray-500 text-xs mb-1">Monday, 02 Sep 2025</Text>
          <Text className="text-4xl font-bold text-gray-800">
            32°C
          </Text>
          <View className="flex-row items-center mt-1">
            <Feather name="cloud" size={14} color="#6b7280" />
            <Text className="text-gray-500 text-sm ml-1">Weather</Text>
          </View>
        </View>

        <View className="items-end">
          <View className="flex-row items-center mb-2">
            <Feather name="sun" size={16} color="#f97316" />
            <Text className="text-gray-800 text-sm ml-1 font-medium">Bright and Sunny</Text>
          </View>
          <View className="flex-row items-center bg-green-100 px-2 py-1 rounded-full">
            <FontAwesome5 name="seedling" size={12} color="#16a34a" />
            <Text className="text-green-700 text-xs ml-1 font-medium">Stable for plant growth</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
