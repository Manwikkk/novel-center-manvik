import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthorsListScreen from '@/screens/authors/AuthorsListScreen';
import AuthorProfileScreen from '@/screens/authors/AuthorProfileScreen';
import BookDetailScreen from '@/screens/book/BookDetailScreen';
import ReaderScreen from '@/screens/reader/ReaderScreen';

const Stack = createNativeStackNavigator();

export default function AuthorsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AuthorsList" component={AuthorsListScreen} />
      <Stack.Screen name="AuthorProfile" component={AuthorProfileScreen} />
      <Stack.Screen name="BookDetail" component={BookDetailScreen} />
      <Stack.Screen name="Reader" component={ReaderScreen} />
    </Stack.Navigator>
  );
}
