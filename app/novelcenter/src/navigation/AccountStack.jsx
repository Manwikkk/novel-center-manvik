import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AccountScreen from '@/screens/account/AccountScreen';
import WalletScreen from '@/screens/account/WalletScreen';
import ReaderPrefsScreen from '@/screens/account/ReaderPrefsScreen';
import AuthorStack from '@/navigation/AuthorStack';

const Stack = createNativeStackNavigator();

export default function AccountStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Account" component={AccountScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="ReaderPrefs" component={ReaderPrefsScreen} />
      <Stack.Screen name="AuthorStudio" component={AuthorStack} />
    </Stack.Navigator>
  );
}
