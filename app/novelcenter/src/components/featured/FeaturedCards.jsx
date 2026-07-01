import React from 'react';
import { View, Pressable, Image, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import NCText from '@/components/primitives/Text';
import { resolveImageUrl } from '@/lib/image';
import { useAppTheme } from '@/theme/discoverColors';

const CARD_RADIUS = 16;
const BRAND = {
  tealDark: '#14B8A6',
  blue: '#2563EB',
  red: '#DC2626',
};
const TAG_BG = 'rgba(0,0,0,0.55)';

const absoluteFill = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

const COVER_RATIO = 0.667;

function BookMeta({ book }) {
  const { colors: C } = useAppTheme();
  const category = (book?.category || 'Novel').toUpperCase();

  return (
    <View style={{ gap: 6, paddingTop: 10 }}>
      <NCText
        variant="uiLabelSm"
        style={{ color: C.muted, letterSpacing: 1.4, fontSize: 11, textTransform: 'uppercase' }}
      >
        {category}
      </NCText>
      <NCText
        variant="titleLg"
        numberOfLines={2}
        style={{ color: C.white, fontWeight: '700', fontSize: 17, lineHeight: 22 }}
      >
        {book?.title || 'Untitled'}
      </NCText>
      <NCText variant="bodySm" style={{ color: C.muted, fontSize: 14, lineHeight: 18 }}>
        {book?.authorName || 'Unknown author'}
      </NCText>
    </View>
  );
}

function TagPill({ label }) {
  const { colors: C } = useAppTheme();
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: TAG_BG,
      }}
    >
      <NCText variant="uiLabelXs" style={{ color: C.white, fontSize: 10, letterSpacing: 0.5 }}>
        {label}
      </NCText>
    </View>
  );
}

function AddButton() {
  const { colors: C } = useAppTheme();
  return (
    <View
      style={{
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.9)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name="add" size={18} color={C.bg} />
    </View>
  );
}

function CardShell({ children, meta, onPress, imageHeight = 180 }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <View style={{ height: imageHeight, borderRadius: CARD_RADIUS, overflow: 'hidden' }}>{children}</View>
      {meta}
    </Pressable>
  );
}

export function NovelCard({ book, onPress, width }) {
  const { colors: C } = useAppTheme();
  const uri = resolveImageUrl(book?.coverUrl);
  const coverHeight = width / COVER_RATIO;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ width, opacity: pressed ? 0.92 : 1 })}
    >
      <View
        style={{
          width,
          height: coverHeight,
          borderRadius: CARD_RADIUS,
          overflow: 'hidden',
          backgroundColor: C.inputBg,
        }}
      >
        {uri ? (
          <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : null}
      </View>
      <BookMeta book={book} />
    </Pressable>
  );
}

export function CharacterCard({ book, onPress, width }) {
  const { colors: C } = useAppTheme();
  const uri = resolveImageUrl(book?.coverUrl);
  const tags = (book?.synopsis || book?.title || '')
    .split(/[.!?]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 2);

  return (
    <View style={{ width }}>
      <CardShell
        onPress={onPress}
        imageHeight={260}
        meta={<BookMeta book={book} />}
      >
        <View style={{ flex: 1, backgroundColor: BRAND.red }}>
          {uri ? (
            <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : null}
          <View
            style={{
              ...absoluteFill,
              backgroundColor: 'rgba(0,0,0,0.35)',
            }}
          />
          <View style={{ position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
            <TagPill label="Character" />
            <AddButton />
          </View>
          <View style={{ position: 'absolute', left: 10, right: 10, top: 52, gap: 6 }}>
            {tags.map((tag, i) => (
              <View
                key={i}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 4,
                  alignSelf: 'flex-start',
                }}
              >
                <NCText variant="bodySm" style={{ color: C.white, fontSize: 11 }}>
                  #{tag.slice(0, 42)}{tag.length > 42 ? '…' : ''}
                </NCText>
              </View>
            ))}
          </View>
          <View style={{ position: 'absolute', bottom: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View>
              <NCText variant="uiLabelXs" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, letterSpacing: 0 }}>
                {book?.category || 'male lead'}
              </NCText>
              <NCText variant="titleMd" style={{ color: C.white, fontWeight: '700', fontSize: 16 }}>
                {book?.authorName || 'Unknown'}
              </NCText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <NCText variant="uiLabelSm" style={{ color: C.white, fontSize: 12, letterSpacing: 0 }}>
                No.1
              </NCText>
              <Icon name="emoji-events" size={14} color="#FCD34D" />
            </View>
          </View>
        </View>
      </CardShell>
    </View>
  );
}

export function ExcerptCard({ book, onPress, width }) {
  const { colors: C } = useAppTheme();
  const uri = resolveImageUrl(book?.coverUrl);
  const excerpt = (book?.synopsis || 'Two centuries had passed since the Collapse…').slice(0, 160);

  return (
    <View style={{ width }}>
      <CardShell
        onPress={onPress}
        imageHeight={240}
        meta={<BookMeta book={book} />}
      >
        <View style={{ flex: 1, backgroundColor: C.sheet }}>
          {uri ? (
            <Image source={{ uri }} style={{ width: '100%', height: '100%', opacity: 0.55 }} resizeMode="cover" />
          ) : null}
          <View style={absoluteFill} />
          <View style={{ position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
            <TagPill label="Excerpt" />
            <AddButton />
          </View>
          <View style={{ position: 'absolute', top: 48, left: 14, right: 14, bottom: 36 }}>
            <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 36, fontFamily: 'serif', lineHeight: 36, marginBottom: -8 }}>
              "
            </Text>
            <NCText
              variant="readingBody"
              style={{ color: C.white, fontSize: 14, lineHeight: 21 }}
              numberOfLines={6}
            >
              {excerpt}
            </NCText>
            <NCText variant="uiLabelXs" style={{ color: 'rgba(255,255,255,0.65)', marginTop: 10, letterSpacing: 0, fontSize: 10 }}>
              — Ch 1. {book?.title?.slice(0, 28) || 'Opening'}
            </NCText>
          </View>
        </View>
      </CardShell>
    </View>
  );
}

export function TeaserCard({ book, onPress, width }) {
  const { colors: C } = useAppTheme();
  const quote = (book?.synopsis || book?.title || 'He died a virgin, but his new life came with some very interesting benefits…').slice(0, 120);

  return (
    <View style={{ width }}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          width,
          borderRadius: CARD_RADIUS,
          overflow: 'hidden',
          backgroundColor: BRAND.tealDark,
          padding: 18,
          minHeight: 220,
          justifyContent: 'space-between',
          opacity: pressed ? 0.92 : 1,
        })}
      >
        <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 12 }}>
          <NCText
            variant="readingBody"
            style={{ color: C.bg, fontSize: 15, lineHeight: 22, textAlign: 'center' }}
          >
            {quote}
          </NCText>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            backgroundColor: C.white,
            borderRadius: 999,
            paddingVertical: 10,
            paddingHorizontal: 16,
          }}
        >
          <NCText variant="uiLabelSm" style={{ color: C.bg, letterSpacing: 0, fontSize: 12 }}>
            Uncover the Plot
          </NCText>
          <Icon name="arrow-forward" size={16} color={C.bg} />
        </View>
      </Pressable>
    </View>
  );
}

export function RankingCard({ books, onPressBook, onPressAll, width }) {
  const { colors: C } = useAppTheme();
  const top = (books || []).slice(0, 3);

  return (
    <View style={{ width }}>
      <View
        style={{
          borderRadius: CARD_RADIUS,
          overflow: 'hidden',
          backgroundColor: BRAND.blue,
          padding: 16,
          minHeight: 280,
          justifyContent: 'space-between',
        }}
      >
        <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 14 }}>
          <Icon name="emoji-events" size={14} color={C.white} />
          <NCText variant="uiLabelSm" style={{ color: C.white, letterSpacing: 1, fontSize: 12 }}>
            Golden Ranking
          </NCText>
          <Icon name="emoji-events" size={14} color={C.white} />
        </View>

        <View style={{ gap: 12, flex: 1 }}>
          {top.map((book, i) => (
            <Pressable
              key={book?.id ?? i}
              onPress={() => onPressBook?.(book)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <View style={{ position: 'relative' }}>
                <Image
                  source={{ uri: resolveImageUrl(book?.coverUrl) }}
                  style={{ width: 36, height: 50, borderRadius: 4, backgroundColor: '#1e3a8a' }}
                  resizeMode="cover"
                />
                <View
                  style={{
                    position: 'absolute',
                    top: -4,
                    left: -4,
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    backgroundColor: C.white,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <NCText variant="uiLabelXs" style={{ color: C.bg, fontSize: 10, letterSpacing: 0 }}>
                    {i + 1}
                  </NCText>
                </View>
              </View>
              <NCText
                variant="titleMd"
                numberOfLines={2}
                style={{ color: C.white, flex: 1, fontSize: 13, lineHeight: 17 }}
              >
                {book?.title || 'Untitled'}
              </NCText>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={onPressAll}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            backgroundColor: C.white,
            borderRadius: 999,
            paddingVertical: 10,
            marginTop: 14,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <NCText variant="uiLabelSm" style={{ color: C.bg, letterSpacing: 0, fontSize: 12 }}>
            Full Rankings
          </NCText>
          <Icon name="arrow-forward" size={16} color={C.bg} />
        </Pressable>
      </View>
    </View>
  );
}

export const CARD_HEIGHTS = {
  novel: 340,
  character: 400,
  excerpt: 380,
  teaser: 220,
  ranking: 280,
};

export function FeaturedCard({ item, width, onPressBook, onPressAllRankings }) {
  const go = () => onPressBook?.(item.book);

  switch (item.type) {
    case 'character':
      return <CharacterCard book={item.book} onPress={go} width={width} />;
    case 'excerpt':
      return <ExcerptCard book={item.book} onPress={go} width={width} />;
    case 'teaser':
      return <TeaserCard book={item.book} onPress={go} width={width} />;
    case 'ranking':
      return (
        <RankingCard
          books={item.books}
          onPressBook={onPressBook}
          onPressAll={onPressAllRankings}
          width={width}
        />
      );
    default:
      return <NovelCard book={item.book} onPress={go} width={width} />;
  }
}

export function buildFeaturedItems(books) {
  if (!books?.length) return [];

  const items = [];
  const rankingBooks = books.slice(0, 3);

  books.forEach((book, index) => {
    if (index === 2 && books[1]) {
      items.push({ type: 'teaser', book: books[1], id: `teaser-${books[1].id}` });
    }
    if (index === 4 && rankingBooks.length >= 3) {
      items.push({ type: 'ranking', books: rankingBooks, id: 'ranking-block' });
    }

    if (index % 6 === 0) {
      items.push({ type: 'character', book, id: `char-${book.id}` });
    } else if (index % 4 === 1 && book.synopsis) {
      items.push({ type: 'excerpt', book, id: `excerpt-${book.id}` });
    } else {
      items.push({ type: 'novel', book, id: `novel-${book.id}` });
    }
  });

  return items;
}

export function splitMasonryColumns(items) {
  const left = [];
  const right = [];
  let leftH = 0;
  let rightH = 0;

  items.forEach((item) => {
    const h = CARD_HEIGHTS[item.type] || CARD_HEIGHTS.novel;
    if (leftH <= rightH) {
      left.push(item);
      leftH += h + 12;
    } else {
      right.push(item);
      rightH += h + 12;
    }
  });

  return { left, right };
}
