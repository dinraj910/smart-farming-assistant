import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from './RootStackParamList';
import FloatingTabBar from '../components/FloatingTabBar';

// Screens
import HomeScreen from '../screens/HomeScreen';
import LeafDoctorScreen from '../screens/LeafDoctorScreen';
import WeatherScreen from '../screens/WeatherScreen';
import MarketScreen from '../screens/MarketScreen';
import FarmsScreen from '../screens/FarmsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home"    component={HomeScreen}       />
      <Tab.Screen name="Doctor"  component={LeafDoctorScreen} />
      <Tab.Screen name="Weather" component={WeatherScreen}    />
      <Tab.Screen name="Market"  component={MarketScreen}     />
      <Tab.Screen name="Farms"   component={FarmsScreen}      />
    </Tab.Navigator>
  );
}
