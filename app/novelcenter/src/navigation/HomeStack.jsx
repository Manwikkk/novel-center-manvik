import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '@/screens/home/HomeScreen';
import BookDetailScreen from '@/screens/book/BookDetailScreen';
import ReaderScreen from '@/screens/reader/ReaderScreen';
import AuthorProfileScreen from '@/screens/authors/AuthorProfileScreen';

const Stack = createNativeStackNavigator();

export default function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="BookDetail" component={BookDetailScreen} />
      <Stack.Screen name="Reader" component={ReaderScreen} />
      <Stack.Screen name="AuthorProfile" component={AuthorProfileScreen} />
    </Stack.Navigator>
  );
}
