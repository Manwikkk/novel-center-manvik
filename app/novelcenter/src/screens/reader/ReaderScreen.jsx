import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, AppState, useWindowDimensions, StatusBar } from 'react-native';
import RenderHTML from 'react-native-render-html';
import NCText from '@/components/primitives/Text';
import Button from '@/components/primitives/Button';
import Spinner from '@/components/primitives/Spinner';
import ErrorView from '@/components/primitives/ErrorView';
import ReaderTopBar from '@/components/reader/ReaderTopBar';
import ReaderBottomBar from '@/components/reader/ReaderBottomBar';
import CommentThread from '@/components/comments/CommentThread';
import { useTheme } from '@/theme';
import { api } from '@/lib/api';
import { readingApi } from '@/lib/reading';
import { useAuthStore } from '@/stores/authStore';
import { useWalletStore } from '@/stores/walletStore';
import { useUiStore } from '@/stores/uiStore';
import { sanitiseHtml } from '@/lib/htmlSafe';
import { minutesFromWords } from '@/lib/minutes';

export default function ReaderScreen({ route, navigation }) {
  const t = useTheme({ readerScope: true });
  const { chapterId } = route.params || {};
  const user = useAuthStore((s) => s.user);
  const balance = useWalletStore((s) => s.balance);
  const refreshWallet = useWalletStore((s) => s.refresh);
  const pushToast = useUiStore((s) => s.pushToast);
  const { width } = useWindowDimensions();

  const [chapter, setChapter] = useState(null);
  const [book, setBook] = useState(null);
  const [siblings, setSiblings] = useState([]);
  const [progress, setProgress] = useState(0);
  const [scrollPos, setScrollPos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unlocking, setUnlocking] = useState(false);
  const scrollRef = useRef(null);

  const fontSize = t.reader.fontSize;
  const fontFamily = t.reader.fontFamily;

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { chapter: c } = await api.get(`/chapters/${chapterId}`);
      setChapter(c);
      // Reset progress on chapter change
      setProgress(0);
      setScrollPos(0);
      const { book: b } = await api.get(`/books/by-id/${c.bookId}`);
      setBook(b);
      const ch = await api.get(`/books/${c.bookId}/chapters`);
      setSiblings(ch?.items || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [chapterId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => { if (user) refreshWallet(); }, [user, refreshWallet]);

  // Throttled progress save: scroll, app background, unmount.
  const lastSaveRef = useRef(0);
  const progressRef = useRef(0);
  const scrollRefVal = useRef(0);
  useEffect(() => { progressRef.current = progress; }, [progress]);
  useEffect(() => { scrollRefVal.current = scrollPos; }, [scrollPos]);

  const saveNow = useCallback(async () => {
    if (!user || !chapter?.id) return;
    const now = Date.now();
    if (now - lastSaveRef.current < 1500) return;
    lastSaveRef.current = now;
    try {
      await readingApi.saveProgress(chapter.id, progressRef.current, Math.round(scrollRefVal.current));
    } catch (_e) { /* swallow — we'll retry on the next scroll */ }
  }, [user, chapter?.id]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') saveNow();
    });
    return () => sub.remove();
  }, [saveNow]);

  useEffect(() => () => { saveNow(); }, [saveNow]);

  const onScroll = (e) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const max = Math.max(1, contentSize.height - layoutMeasurement.height);
    const pct = Math.min(100, Math.max(0, (contentOffset.y / max) * 100));
    setProgress(pct);
    setScrollPos(contentOffset.y);
    if (Date.now() - lastSaveRef.current > 4000) saveNow();
  };

  const cleanHtml = useMemo(() => sanitiseHtml(chapter?.contentHtml || ''), [chapter?.contentHtml]);
  const wordCount = chapter?.wordCount || 0;
  const minutesLeft = useMemo(
    () => minutesFromWords(wordCount, 100 - progress),
    [wordCount, progress],
  );

  const orderedSiblings = useMemo(
    () => [...siblings].sort((a, b) => a.idx - b.idx),
    [siblings],
  );
  const idxInList = orderedSiblings.findIndex((c) => c.id === chapter?.id);
  const prev = idxInList > 0 ? orderedSiblings[idxInList - 1] : null;
  const next = idxInList >= 0 && idxInList < orderedSiblings.length - 1 ? orderedSiblings[idxInList + 1] : null;

  const goPrev = () => prev && navigation.replace('Reader', { chapterId: prev.id });
  const goNext = () => next && navigation.replace('Reader', { chapterId: next.id });
  const goBack = () => {
    if (book?.slug) navigation.navigate('BookDetail', { slug: book.slug, id: book.id });
    else navigation.goBack();
  };

  const onUnlock = async () => {
    if (!chapter?.id) return;
    setUnlocking(true);
    try {
      await api.post(`/chapters/${chapter.id}/unlock`);
      await refreshWallet();
      await load();
      pushToast({ type: 'success', title: 'Unlocked', message: 'Enjoy the chapter.' });
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not unlock', message: err.message });
    } finally {
      setUnlocking(false);
    }
  };

  const isPaid = !!chapter?.isPaid;
  const isUnlocked = !!chapter?.isUnlocked;
  const hasContent = typeof chapter?.contentHtml === 'string' && chapter.contentHtml.length > 0;
  const isLocked = isPaid && !isUnlocked && !hasContent;

  const htmlBaseStyle = {
    color: t.colors.fg,
    fontFamily,
    fontSize,
    lineHeight: fontSize * 1.55,
  };
  const htmlTagsStyles = {
    p: { marginVertical: fontSize * 0.7, color: t.colors.fg, fontFamily, fontSize, lineHeight: fontSize * 1.6 },
    h1: { color: t.colors.fg, fontFamily, fontSize: fontSize * 1.8, lineHeight: fontSize * 2.1, marginTop: 24, marginBottom: 12 },
    h2: { color: t.colors.fg, fontFamily, fontSize: fontSize * 1.4, lineHeight: fontSize * 1.7, marginTop: 20, marginBottom: 10 },
    h3: { color: t.colors.fg, fontFamily, fontSize: fontSize * 1.2, lineHeight: fontSize * 1.5, marginTop: 16, marginBottom: 8 },
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: t.colors.accent,
      paddingLeft: 12,
      color: t.colors.muted,
      fontStyle: 'italic',
      marginVertical: 16,
    },
    a: { color: t.colors.accent, textDecorationLine: 'underline' },
    li: { color: t.colors.fg, fontFamily, fontSize, lineHeight: fontSize * 1.6 },
    strong: { fontWeight: '700' },
    em: { fontStyle: 'italic' },
    code: { fontFamily: 'Courier', backgroundColor: t.colors.surfaceLow, paddingHorizontal: 4, borderRadius: 3 },
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <StatusBar barStyle={t.paletteKey === 'dark' ? 'light-content' : 'dark-content'} />
      <ReaderTopBar
        chapter={chapter}
        book={book}
        progress={progress}
        minutesLeft={minutesLeft}
        onBack={goBack}
      />

      {error ? (
        <ErrorView error={error} onRetry={load} />
      ) : loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Spinner />
        </View>
      ) : isLocked ? (
        <View style={{ flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <NCText variant="headlineMd" align="center" style={{ color: t.colors.fg }}>
            {chapter?.title}
          </NCText>
          <NCText variant="readingBody" align="center" style={{ color: t.colors.muted }}>
            This chapter is paid. Unlock it for {chapter?.tokenPrice} tokens.
          </NCText>
          <NCText variant="uiLabelSm" style={{ color: t.colors.muted }}>
            Wallet: {balance} tokens
          </NCText>
          <Button
            label={`Unlock for ${chapter?.tokenPrice} tokens`}
            onPress={onUnlock}
            loading={unlocking}
          />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          scrollEventThrottle={64}
          contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 24, paddingBottom: 72 }}
        >
          <View style={{ marginBottom: 24, gap: 8 }}>
            <NCText variant="uiLabelSm" style={{ color: t.colors.muted }}>
              {book?.title || ''}
            </NCText>
            <NCText
              variant="headlineXl"
              style={{ color: t.colors.fg, fontFamily, fontSize: Math.max(24, fontSize * 1.5) }}
            >
              {chapter?.title}
            </NCText>
            {chapter?.readingMinutes ? (
              <NCText variant="uiLabelXs" style={{ color: t.colors.muted }}>
                {chapter.readingMinutes} min read · {chapter.wordCount} words
              </NCText>
            ) : null}
          </View>

          <RenderHTML
            contentWidth={width - 44}
            source={{ html: cleanHtml }}
            baseStyle={htmlBaseStyle}
            tagsStyles={htmlTagsStyles}
            renderersProps={{
              a: { onPress: () => {} },
            }}
            defaultTextProps={{ selectable: true }}
          />

          {chapter?.id ? (
            <View style={{ marginTop: 40 }}>
              <CommentThread chapterId={chapter.id} />
            </View>
          ) : null}
        </ScrollView>
      )}

      <ReaderBottomBar prev={prev} next={next} onPrev={goPrev} onNext={goNext} />
    </View>
  );
}
