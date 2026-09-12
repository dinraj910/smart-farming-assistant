import React, { useEffect } from 'react';
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
import EditProfileScreen from './src/screens/EditProfileScreen';

import { useAuthStore } from './src/store/authStore';

import "./global.css";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const { token, isInitializing, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isInitializing) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {token ? (
          <>
            <Stack.Screen name="Main"        component={MainTabNavigator} options={{ animation: 'fade' }} />
            <Stack.Screen name="AgentChat"   component={AgentChatScreen}  />
            <Stack.Screen name="FieldDetail" component={FieldDetailScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Welcome"  component={WelcomeScreen}  />
            <Stack.Screen name="Login"    component={LoginScreen}    />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
