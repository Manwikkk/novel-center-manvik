import React, { useEffect, useMemo, useState } from 'react';
import { View, Pressable, Image, TextInput, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import NCText from '@/components/primitives/Text';
import Skeleton from '@/components/primitives/Skeleton';
import { DarkSurface } from '@/components/discover/DiscoverTheme';
import {
  StudioStatCard,
  StudioOutlineButton,
  STUDIO_LAYOUT,
  useAppTheme,
} from '@/components/studio/StudioTheme';
import { authorApi } from '@/lib/author';
import { resolveImageUrl } from '@/lib/image';

function StatTile({ label, value, sub }) {
  return (
    <View style={{ width: '48%', flexGrow: 1 }}>
      <StudioStatCard label={label} value={value} sub={sub} />
    </View>
  );
}

export default function BookDashboardPanel({ books = [], loading, navigation }) {
  const { colors: C } = useAppTheme();
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState('');
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return books;
    return books.filter((b) => b.title?.toLowerCase().includes(q));
  }, [books, query]);

  useEffect(() => {
    if (!books.length) {
      setSelectedId(null);
      return;
    }
    setSelectedId((prev) => (prev && books.some((b) => b.id === prev) ? prev : books[0].id));
  }, [books]);

  useEffect(() => {
    if (!selectedId) {
      setStats(null);
      return undefined;
    }
    let active = true;
    setStatsLoading(true);
    authorApi
      .bookStats(selectedId)
      .then((data) => active && setStats(data))
      .catch(() => active && setStats(null))
      .finally(() => active && setStatsLoading(false));
    return () => { active = false; };
  }, [selectedId]);

  const selected = books.find((b) => b.id === selectedId);
  const coverUri = resolveImageUrl(selected?.coverUrl);

  if (loading) {
    return (
      <View style={{ gap: 12 }}>
        <Skeleton width="100%" height={120} radius={12} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Skeleton width="48%" height={88} radius={12} />
          <Skeleton width="48%" height={88} radius={12} />
        </View>
      </View>
    );
  }

  if (!books.length) {
    return (
      <DarkSurface style={{ padding: 24, gap: 12, alignItems: 'center' }}>
        <Icon name="library-books" size={36} color={C.muted} />
        <NCText variant="titleMd" style={{ color: C.white, textAlign: 'center' }}>No books yet</NCText>
        <NCText variant="bodySm" style={{ color: C.muted, textAlign: 'center', lineHeight: 20 }}>
          Create your first novel to see stats and manage chapters here.
        </NCText>
        <StudioOutlineButton
          label="Create book"
          onPress={() => navigation.navigate('AuthorBookEdit', { mode: 'create' })}
        />
      </DarkSurface>
    );
  }

  const s = stats?.stats;

  return (
    <View style={{ gap: 14 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: C.inputBg,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: C.inputBorder,
          paddingHorizontal: 12,
          gap: 8,
        }}
      >
        <Icon name="search" size={18} color={C.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search your books…"
          placeholderTextColor={C.muted}
          style={{ flex: 1, color: C.white, fontSize: 14, paddingVertical: 10 }}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {filtered.map((book) => {
          const active = book.id === selectedId;
          const uri = resolveImageUrl(book.coverUrl);
          return (
            <Pressable
              key={book.id}
              onPress={() => setSelectedId(book.id)}
              style={{
                width: 120,
                padding: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: active ? C.white : C.inputBorder,
                backgroundColor: active ? C.pillBg : C.sheet,
                gap: 8,
              }}
            >
              <View style={{ width: '100%', height: 72, borderRadius: 8, overflow: 'hidden', backgroundColor: C.inputBg }}>
                {uri ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : null}
              </View>
              <NCText variant="uiLabelXs" numberOfLines={2} style={{ color: C.white, fontSize: 11 }}>
                {book.title}
              </NCText>
            </Pressable>
          );
        })}
      </ScrollView>

      {selected ? (
        <DarkSurface style={{ padding: 14, gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={{ width: 48, height: 72, borderRadius: 8, overflow: 'hidden', backgroundColor: C.inputBg }}>
              {coverUri ? <Image source={{ uri: coverUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : null}
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <NCText variant="titleMd" numberOfLines={2} style={{ color: C.white, fontSize: 16 }}>
                {selected.title}
              </NCText>
              <NCText variant="uiLabelXs" style={{ color: C.muted, fontSize: 11, textTransform: 'uppercase' }}>
                {(selected.status || 'draft')} · {selected.chapterCount || 0} chapters
              </NCText>
            </View>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <Pressable
              onPress={() => navigation.navigate('AuthorChapters', { bookId: selected.id, bookTitle: selected.title })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 }}
            >
              <Icon name="menu-book" size={16} color={C.accent} />
              <NCText variant="uiLabelSm" style={{ color: C.accent, fontSize: 12 }}>Chapters</NCText>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('AuthorBookEdit', { mode: 'edit', bookId: selected.id })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 }}
            >
              <Icon name="edit" size={16} color={C.accent} />
              <NCText variant="uiLabelSm" style={{ color: C.accent, fontSize: 12 }}>Edit book</NCText>
            </Pressable>
          </View>
        </DarkSurface>
      ) : null}

      {statsLoading ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <Skeleton width="47%" height={88} radius={12} />
          <Skeleton width="47%" height={88} radius={12} />
        </View>
      ) : s ? (
        <>
          {stats?.dataWindowLabel ? (
            <NCText variant="uiLabelXs" style={{ color: C.muted, fontSize: 10, lineHeight: 16 }}>
              {stats.dataWindowLabel}
            </NCText>
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <StatTile label="In libraries" value={String(s.collections?.value ?? 0)} sub={`${s.collections?.changePercent ?? 0}% day`} />
            <StatTile label="Views" value={String(s.views?.value ?? 0)} sub={`${s.views?.changePercent ?? 0}% day`} />
            <StatTile label="Earnings" value={String(s.earnings?.value ?? 0)} sub={`${s.earnings?.changePercent ?? 0}% · tokens`} />
            <StatTile label="Chapters" value={String(s.chapters?.value ?? 0)} sub={`${s.chapters?.changePercent ?? 0}% week`} />
            <StatTile label="Words" value={String(s.words?.value ?? 0)} sub={`${s.words?.changePercent ?? 0}% week`} />
            <StatTile label="Ranking" value={s.powerRanking?.label || '—'} sub="power rank" />
          </View>
        </>
      ) : null}
    </View>
  );
}
