import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DiscoverScreen from '@/screens/discover/DiscoverScreen';
import BookDetailScreen from '@/screens/book/BookDetailScreen';
import ReaderScreen from '@/screens/reader/ReaderScreen';
import AuthorProfileScreen from '@/screens/authors/AuthorProfileScreen';

const Stack = createNativeStackNavigator();

export default function DiscoverStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Discover" component={DiscoverScreen} />
      <Stack.Screen name="BookDetail" component={BookDetailScreen} />
      <Stack.Screen name="Reader" component={ReaderScreen} />
      <Stack.Screen name="AuthorProfile" component={AuthorProfileScreen} />
    </Stack.Navigator>
  );
}
