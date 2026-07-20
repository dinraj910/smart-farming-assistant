import { StatusBar } from 'expo-status-bar';
import { Text, View, SafeAreaView, TouchableOpacity } from 'react-native';
import "./global.css";

export default function App() {
  return (
    <SafeAreaView className="flex-1 bg-green-50">
      <View className="flex-1 px-6 justify-center items-center">
        {/* Header Icon / Logo area */}
        <View className="w-24 h-24 bg-green-500 rounded-full items-center justify-center mb-8 shadow-md">
          <Text className="text-white text-4xl">🌱</Text>
        </View>

        {/* Title & Description */}
        <Text className="text-3xl font-bold text-gray-800 text-center mb-4">
          Smart Farming
        </Text>
        <Text className="text-base text-gray-600 text-center mb-10 leading-6 px-4">
          Your personal assistant for crop management, weather updates, and smart agricultural insights.
        </Text>

        {/* Action Button */}
        <TouchableOpacity className="bg-green-600 w-full py-4 rounded-2xl shadow-lg active:bg-green-700">
          <Text className="text-white text-center text-lg font-semibold">
            Get Started
          </Text>
        </TouchableOpacity>
      </View>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}
