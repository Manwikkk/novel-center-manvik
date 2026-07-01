import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Pressable,
  RefreshControl,
  Image,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import NCText from '@/components/primitives/Text';
import SignInModal from '@/components/featured/SignInModal';
import Skeleton from '@/components/primitives/Skeleton';
import EmptyState from '@/components/primitives/EmptyState';
import ErrorView from '@/components/primitives/ErrorView';
import { api } from '@/lib/api';
import { libraryApi } from '@/lib/library';
import { resolveImageUrl } from '@/lib/image';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { useAppTheme, DISCOVER_LAYOUT } from '@/theme/discoverColors';
import { useReaderPreferences } from '@/hooks/useReaderPreferences';

const COVER_WIDTH = 200;

function DarkPill({ label }) {
  const { colors: C } = useAppTheme();
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: C.inputBorder,
        backgroundColor: C.inputBg,
      }}
    >
      <NCText variant="uiLabelXs" style={{ color: C.muted, letterSpacing: 0.8, fontSize: 10 }}>
        {label}
      </NCText>
    </View>
  );
}

export default function BookDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { colors: C, statusBarStyle } = useAppTheme();
  const { slug, id } = route.params || {};
  const user = useAuthStore((s) => s.user);
  const pushToast = useUiStore((s) => s.pushToast);
  const readerPrefs = useReaderPreferences();

  const [book, setBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [inLibrary, setInLibrary] = useState(false);
  const [savingLibrary, setSavingLibrary] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [signInOpen, setSignInOpen] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const path = slug ? `/books/${slug}` : `/books/by-id/${id}`;
      const { book: realBook } = await api.get(path);
      setBook(realBook);
      const ch = await api.get(`/books/${realBook.id}/chapters`);
      setChapters(ch?.items || []);
      if (user) {
        try {
          const lib = await libraryApi.contains([realBook.id]);
          setInLibrary(!!lib?.items?.[realBook.id]);
        } catch (_e) {
          setInLibrary(false);
        }
      } else {
        setInLibrary(false);
      }
    } catch (err) {
      setError(err);
    }
  }, [slug, id, user]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    load().finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const onToggleLibrary = async () => {
    if (!user) {
      setSignInOpen(true);
      return;
    }
    setSavingLibrary(true);
    try {
      if (inLibrary) {
        await libraryApi.remove(book.id);
        setInLibrary(false);
        pushToast({ type: 'success', title: 'Removed', message: `${book.title} removed from your library.` });
      } else {
        await libraryApi.add(book.id);
        setInLibrary(true);
        pushToast({ type: 'success', title: 'Saved', message: `${book.title} added to your library.` });
      }
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not update library', message: err.message });
    } finally {
      setSavingLibrary(false);
    }
  };

  const goReader = (chapterId) => navigation.navigate('Reader', { chapterId });
  const firstReadable = chapters[0];
  const coverUri = resolveImageUrl(book?.coverUrl);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    const tabNav = navigation.getParent();
    if (tabNav?.getState?.()?.type === 'tab') {
      tabNav.navigate('HomeTab', { screen: 'Home' });
      return;
    }
    navigation.popToTop();
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <StatusBar barStyle={statusBarStyle} backgroundColor={C.bg} />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: DISCOVER_LAYOUT.hPadding,
          paddingTop: 4,
          paddingBottom: 8,
        }}
      >
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingVertical: 6,
            paddingRight: 10,
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: C.pillBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="arrow-back" size={18} color={C.white} />
          </View>
          <NCText variant="uiLabelSm" style={{ color: C.muted, letterSpacing: 0, fontSize: 13 }}>
            Back
          </NCText>
        </Pressable>
      </View>

      {error ? (
        <ErrorView error={error} onRetry={onRefresh} />
      ) : loading || !book ? (
        <View style={{ paddingHorizontal: DISCOVER_LAYOUT.hPadding, paddingTop: 16, gap: 16 }}>
          <Skeleton width="100%" height={260} radius={DISCOVER_LAYOUT.cardRadius} />
          <Skeleton height={28} width="80%" />
          <Skeleton height={14} width="60%" />
          <Skeleton height={14} width="40%" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: DISCOVER_LAYOUT.hPadding,
            paddingBottom: Math.max(insets.bottom, 24) + (user ? 64 : 0),
            gap: 24,
          }}
          refreshControl={
            <RefreshControl tintColor={C.white} refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: 'center', gap: 16, marginTop: 4 }}>
            <View
              style={{
                width: COVER_WIDTH,
                height: COVER_WIDTH / 0.667,
                borderRadius: DISCOVER_LAYOUT.cardRadius,
                overflow: 'hidden',
                backgroundColor: C.inputBg,
              }}
            >
              {coverUri ? (
                <Image source={{ uri: coverUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : null}
            </View>

            <View style={{ alignItems: 'center', gap: 8, width: '100%' }}>
              {book.category ? (
                <NCText
                  variant="uiLabelSm"
                  style={{ color: C.muted, textTransform: 'uppercase', letterSpacing: 1.4, fontSize: 11 }}
                >
                  {book.category}
                </NCText>
              ) : null}
              <NCText
                variant="headlineXl"
                align="center"
                style={{ color: C.white, fontWeight: '700', fontSize: 26, lineHeight: 32 }}
              >
                {book.title}
              </NCText>
              <Pressable
                onPress={() => book.authorId && navigation.navigate('AuthorProfile', { id: book.authorId })}
                style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
              >
                <NCText variant="bodySm" style={{ color: C.muted, fontSize: 15 }}>
                  {book.authorName || 'Unknown author'}
                </NCText>
              </Pressable>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {book.language ? <DarkPill label={book.language.toUpperCase()} /> : null}
                <DarkPill label={`${book.chapterCount || chapters.length || 0} chapters`} />
                {book.status ? <DarkPill label={book.status} /> : null}
              </View>
            </View>
          </View>

          {book.synopsis ? (
            <View style={{ gap: 10 }}>
              <NCText variant="uiLabelSm" style={{ color: C.muted, letterSpacing: 1.2, fontSize: 10 }}>
                ABOUT
              </NCText>
              <View
                style={{
                  borderRadius: DISCOVER_LAYOUT.cardRadius,
                  borderWidth: 1,
                  borderColor: readerPrefs.colors.rule,
                  backgroundColor: readerPrefs.colors.bg,
                  padding: 16,
                }}
              >
                <NCText reading>
                  {book.synopsis}
                </NCText>
              </View>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={() => firstReadable && goReader(firstReadable.id)}
              disabled={!firstReadable}
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: C.white,
                borderRadius: 999,
                paddingVertical: 14,
                alignItems: 'center',
                opacity: !firstReadable ? 0.45 : pressed ? 0.88 : 1,
              })}
            >
              <NCText variant="uiLabelSm" style={{ color: C.bg, fontWeight: '700', letterSpacing: 0.5, fontSize: 13 }}>
                Start reading
              </NCText>
            </Pressable>
            <Pressable
              onPress={onToggleLibrary}
              disabled={savingLibrary}
              style={({ pressed }) => ({
                flex: 1,
                borderRadius: 999,
                paddingVertical: 14,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: C.inputBorder,
                backgroundColor: C.inputBg,
                opacity: savingLibrary ? 0.6 : pressed ? 0.88 : 1,
              })}
            >
              {savingLibrary ? (
                <ActivityIndicator color={C.white} size="small" />
              ) : (
                <NCText variant="uiLabelSm" style={{ color: C.white, letterSpacing: 0.5, fontSize: 13 }}>
                  {inLibrary ? 'In library' : 'Add to library'}
                </NCText>
              )}
            </Pressable>
          </View>

          <View style={{ gap: 10 }}>
            <NCText variant="uiLabelSm" style={{ color: C.muted, letterSpacing: 1.2, fontSize: 10 }}>
              CHAPTERS
            </NCText>
            {chapters.length === 0 ? (
              <View
                style={{
                  borderRadius: DISCOVER_LAYOUT.cardRadius,
                  borderWidth: 1,
                  borderColor: C.inputBorder,
                  backgroundColor: C.sheet,
                  padding: 20,
                }}
              >
                <EmptyState
                  icon="bookmark-border"
                  title="No chapters published yet"
                  description="Check back soon — the author is still polishing."
                />
              </View>
            ) : (
              <View
                style={{
                  borderRadius: DISCOVER_LAYOUT.cardRadius,
                  borderWidth: 1,
                  borderColor: C.inputBorder,
                  backgroundColor: C.sheet,
                  overflow: 'hidden',
                }}
              >
                {chapters.map((ch, i) => {
                  const locked = ch.isPaid && !ch.isUnlocked;
                  return (
                    <Pressable
                      key={ch.id}
                      onPress={() => goReader(ch.id)}
                      style={({ pressed }) => ({
                        paddingVertical: 14,
                        paddingHorizontal: 14,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        borderTopWidth: i === 0 ? 0 : 1,
                        borderTopColor: C.inputBorder,
                        opacity: pressed ? 0.85 : 1,
                      })}
                    >
                      <NCText variant="uiLabelSm" style={{ color: C.muted, width: 32, letterSpacing: 0, fontSize: 12 }}>
                        {String(ch.idx).padStart(2, '0')}
                      </NCText>
                      <View style={{ flex: 1, gap: 4 }}>
                        <NCText variant="titleMd" numberOfLines={2} style={{ color: C.white, fontSize: 15 }}>
                          {ch.title}
                        </NCText>
                        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                          <NCText variant="uiLabelXs" style={{ color: C.muted, letterSpacing: 0, fontSize: 10 }}>
                            {ch.readingMinutes || 0} min
                          </NCText>
                          {locked ? (
                            <NCText variant="uiLabelXs" style={{ color: C.accent, letterSpacing: 0, fontSize: 10 }}>
                              Paid · {ch.tokenPrice} tokens
                            </NCText>
                          ) : null}
                          {ch.status === 'draft' ? (
                            <NCText variant="uiLabelXs" style={{ color: C.muted, letterSpacing: 0, fontSize: 10 }}>
                              Draft
                            </NCText>
                          ) : null}
                        </View>
                      </View>
                      <Icon name={locked ? 'lock' : 'chevron-right'} size={20} color={C.muted} />
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      <SignInModal visible={signInOpen} onClose={() => setSignInOpen(false)} />
    </View>
  );
}
