import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthorDashboardScreen from '@/screens/author/DashboardScreen';
import AuthorBooksScreen from '@/screens/author/BooksScreen';
import AuthorBookEditScreen from '@/screens/author/BookEditScreen';
import AuthorChaptersScreen from '@/screens/author/ChaptersScreen';
import AuthorChapterEditScreen from '@/screens/author/ChapterEditScreen';
import AuthorEarningsScreen from '@/screens/author/EarningsScreen';
import AuthorSettingsScreen from '@/screens/author/SettingsScreen';

const Stack = createNativeStackNavigator();

export default function AuthorStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AuthorDashboard" component={AuthorDashboardScreen} />
      <Stack.Screen name="AuthorBooks" component={AuthorBooksScreen} />
      <Stack.Screen name="AuthorBookEdit" component={AuthorBookEditScreen} />
      <Stack.Screen name="AuthorChapters" component={AuthorChaptersScreen} />
      <Stack.Screen name="AuthorChapterEdit" component={AuthorChapterEditScreen} />
      <Stack.Screen name="AuthorEarnings" component={AuthorEarningsScreen} />
      <Stack.Screen name="AuthorSettings" component={AuthorSettingsScreen} />
    </Stack.Navigator>
  );
}
