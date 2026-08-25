import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './src/navigation/RootStackParamList';

// Screens
import WelcomeScreen     from './src/screens/WelcomeScreen';
import LoginScreen       from './src/screens/Auth/LoginScreen';
import RegisterScreen    from './src/screens/Auth/RegisterScreen';
import MainTabNavigator  from './src/navigation/MainTabNavigator';
import AgentChatScreen   from './src/screens/AgentChatScreen';
import FieldDetailScreen from './src/screens/FieldDetailScreen';

import "./global.css";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Welcome"   component={WelcomeScreen}    />
        <Stack.Screen name="Login"     component={LoginScreen}      />
        <Stack.Screen name="Register"  component={RegisterScreen}   />
        <Stack.Screen name="Main"      component={MainTabNavigator} options={{ animation: 'fade' }} />
        <Stack.Screen name="AgentChat" component={AgentChatScreen}  />
        <Stack.Screen name="FieldDetail" component={FieldDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
