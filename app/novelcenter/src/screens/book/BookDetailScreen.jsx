import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, Pressable, RefreshControl } from 'react-native';
import Screen from '@/components/primitives/Screen';
import NCText from '@/components/primitives/Text';
import IconButton from '@/components/primitives/IconButton';
import Button from '@/components/primitives/Button';
import Cover from '@/components/primitives/Cover';
import Pill from '@/components/primitives/Pill';
import Skeleton from '@/components/primitives/Skeleton';
import EmptyState from '@/components/primitives/EmptyState';
import ErrorView from '@/components/primitives/ErrorView';
import Avatar from '@/components/primitives/Avatar';
import { useTheme } from '@/theme';
import { api } from '@/lib/api';
import { libraryApi } from '@/lib/library';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';

export default function BookDetailScreen({ route, navigation }) {
  const t = useTheme();
  const { slug, id } = route.params || {};
  const user = useAuthStore((s) => s.user);
  const pushToast = useUiStore((s) => s.pushToast);

  const [book, setBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [inLibrary, setInLibrary] = useState(false);
  const [savingLibrary, setSavingLibrary] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

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
          const c = await libraryApi.contains([realBook.id]);
          setInLibrary(!!c?.items?.[realBook.id]);
        } catch (_e) {
          setInLibrary(false);
        }
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
      pushToast({ type: 'info', title: 'Sign in needed', message: 'Add to library after signing in.' });
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

  return (
    <Screen padded={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 4 }}>
        <IconButton name="arrow-back" onPress={() => navigation.goBack()} />
        <NCText variant="uiLabelSm" tone="muted">Back</NCText>
      </View>
      {error ? (
        <ErrorView error={error} onRetry={onRefresh} />
      ) : loading || !book ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 16 }}>
          <Skeleton width="100%" height={260} radius={t.radii.lg} />
          <Skeleton height={28} width="80%" />
          <Skeleton height={14} width="60%" />
          <Skeleton height={14} width="40%" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 64, gap: 24 }}
          refreshControl={<RefreshControl tintColor={t.colors.fg} refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={{ alignItems: 'center', gap: 14, marginTop: 8 }}>
            <Cover source={book.coverUrl} width={200} />
            <View style={{ alignItems: 'center', gap: 8 }}>
              <NCText variant="headlineXl" align="center">{book.title}</NCText>
              <Pressable
                onPress={() => book.authorId && navigation.navigate('AuthorProfile', { id: book.authorId })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Avatar name={book.authorName} size={28} />
                  <NCText variant="uiLabelSm" tone="muted">{book.authorName || 'Unknown author'}</NCText>
                </View>
              </Pressable>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {book.category ? <Pill label={book.category} /> : null}
                {book.language ? <Pill label={book.language.toUpperCase()} /> : null}
                <Pill label={`${book.chapterCount || 0} chapters`} />
              </View>
            </View>
          </View>

          {book.synopsis ? (
            <View style={{ gap: 8 }}>
              <NCText variant="uiLabelSm" tone="muted">About</NCText>
              <NCText variant="readingBody">{book.synopsis}</NCText>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'stretch' }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              {chapters.length > 0 && firstReadable ? (
                <Button
                  label="Start reading"
                  onPress={() => goReader(firstReadable.id)}
                  full
                  size="md"
                  labelVariant="uiLabelSm"
                  labelNumberOfLines={1}
                />
              ) : (
                <Button label="No chapters yet" disabled full size="md" labelVariant="uiLabelSm" labelNumberOfLines={1} />
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Button
                label={inLibrary ? 'In library' : 'Add to library'}
                variant="secondary"
                loading={savingLibrary}
                onPress={onToggleLibrary}
                icon={null}
                full
                size="md"
                labelVariant="uiLabelSm"
                labelNumberOfLines={1}
              />
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <NCText variant="uiLabelSm" tone="muted">Chapters</NCText>
            {chapters.length === 0 ? (
              <EmptyState
                icon="bookmark-border"
                title="No chapters published yet"
                description="Check back soon — the author is still polishing."
              />
            ) : (
              <View>
                {chapters.map((ch, i) => {
                  const locked = ch.isPaid && !ch.isUnlocked;
                  return (
                    <Pressable
                      key={ch.id}
                      onPress={() => goReader(ch.id)}
                      style={{
                        paddingVertical: 14,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        borderTopWidth: i === 0 ? 0 : 1,
                        borderTopColor: t.colors.containerHigh,
                      }}
                    >
                      <NCText variant="uiLabelSm" tone="muted" style={{ width: 32 }}>
                        {String(ch.idx).padStart(2, '0')}
                      </NCText>
                      <View style={{ flex: 1, gap: 2 }}>
                        <NCText variant="titleLg" numberOfLines={2}>{ch.title}</NCText>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <NCText variant="uiLabelXs" tone="muted">
                            {ch.readingMinutes || 0} min
                          </NCText>
                          {locked ? (
                            <NCText variant="uiLabelXs" style={{ color: t.colors.accent }}>
                              Paid · {ch.tokenPrice} tokens
                            </NCText>
                          ) : null}
                          {ch.status === 'draft' ? (
                            <NCText variant="uiLabelXs" tone="muted">Draft</NCText>
                          ) : null}
                        </View>
                      </View>
                      <NCText variant="titleLg" tone="muted">{locked ? '🔒' : '›'}</NCText>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}
