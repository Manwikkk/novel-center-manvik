import React, { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import NCText from '@/components/primitives/Text';
import {
  StudioScreen,
  StudioHeader,
  StudioInput,
  StudioPrimaryButton,
  StudioOutlineButton,
  StudioChipGroup,
  STUDIO_LAYOUT,
  useAppTheme,
} from '@/components/studio/StudioTheme';
import { DarkSurface } from '@/components/discover/DiscoverTheme';
import { api, getAccessToken } from '@/lib/api';
import { catalogApi } from '@/lib/catalog';
import { API_URL } from '@/config/env';
import { resolveImageUrl } from '@/lib/image';
import { useUiStore } from '@/stores/uiStore';

const STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archive' },
];

export default function BookEditScreen({ route, navigation }) {
  const { colors: C } = useAppTheme();
  const { mode, bookId } = route.params || {};
  const isEdit = mode === 'edit' && bookId;
  const pushToast = useUiStore((s) => s.pushToast);

  const [title, setTitle] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [category, setCategory] = useState('');
  const [language, setLanguage] = useState('en');
  const [status, setStatus] = useState('draft');
  const [coverUrl, setCoverUrl] = useState(null);
  const [book, setBook] = useState(null);
  const [categories, setCategories] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => {
    Promise.all([
      catalogApi.categories().catch(() => ({ items: [] })),
      catalogApi.languages().catch(() => ({ items: [] })),
    ]).then(([cats, langs]) => {
      setCategories(cats?.items || []);
      setLanguages(langs?.items || []);
    });
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const { book: b } = await api.get(`/books/by-id/${bookId}`);
        setBook(b);
        setTitle(b.title || '');
        setSynopsis(b.synopsis || '');
        setCategory(b.category || '');
        setLanguage(b.language || 'en');
        setStatus(b.status || 'draft');
        setCoverUrl(b.coverUrl || null);
      } catch (err) {
        pushToast({ type: 'error', title: 'Could not load book', message: err.message });
        navigation.goBack();
      }
    })();
  }, [isEdit, bookId, navigation, pushToast]);

  const onSave = async () => {
    if (!title.trim()) {
      pushToast({ type: 'error', title: 'Title is required' });
      return;
    }
    setBusy(true);
    try {
      const payload = {
        title: title.trim(),
        synopsis: synopsis.trim() || null,
        category: category.trim() || null,
        language: language.trim() || 'en',
        status,
      };
      if (isEdit) {
        const { book: updated } = await api.patch(`/books/${book.id}`, payload);
        setBook(updated);
        pushToast({ type: 'success', title: 'Saved' });
      } else {
        const { book: created } = await api.post('/books', payload);
        pushToast({ type: 'success', title: 'Book created' });
        navigation.replace('AuthorBookEdit', { mode: 'edit', bookId: created.id });
      }
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not save', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  const onPublishToggle = async () => {
    if (!book?.id) return;
    const next = status === 'published' ? 'draft' : 'published';
    setBusy(true);
    try {
      const { book: updated } = await api.patch(`/books/${book.id}`, { status: next });
      setBook(updated);
      setStatus(updated.status);
      pushToast({
        type: 'success',
        title: next === 'published' ? 'Published' : 'Unpublished',
        message: next === 'published' ? 'Your book is live.' : 'Book moved to draft.',
      });
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not update', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  const onPickCover = async () => {
    if (!isEdit || !book?.id) {
      pushToast({ type: 'info', title: 'Save the book first', message: 'Create the book before uploading a cover.' });
      return;
    }
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.9,
      includeBase64: false,
      selectionLimit: 1,
    });
    if (result.didCancel || !result.assets?.length) return;
    const asset = result.assets[0];

    setUploadingCover(true);
    try {
      const fd = new FormData();
      fd.append('cover', {
        uri: asset.uri,
        name: asset.fileName || `cover-${Date.now()}.jpg`,
        type: asset.type || 'image/jpeg',
      });
      const token = await getAccessToken();
      const res = await fetch(`${API_URL}/books/${book.id}/cover`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Upload failed');
      setCoverUrl(data.book.coverUrl);
      setBook(data.book);
      pushToast({ type: 'success', title: 'Cover updated' });
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not upload cover', message: err.message });
    } finally {
      setUploadingCover(false);
    }
  };

  const coverUri = resolveImageUrl(coverUrl);
  const categoryOptions = categories.length
    ? categories.map((c) => ({ value: c.label, label: c.label }))
    : category
      ? [{ value: category, label: category }]
      : [];
  const languageOptions = languages.length
    ? languages.map((l) => ({ value: l.code, label: l.name || l.label || l.code }))
    : [{ value: 'en', label: 'English' }];

  return (
    <StudioScreen>
      <StudioHeader
        breadcrumb="Author Studio"
        title={isEdit ? 'Edit book' : 'New book'}
        onBack={() => navigation.goBack()}
        right={
          isEdit ? (
            <Pressable
              onPress={() => navigation.navigate('AuthorChapters', { bookId: book.id, bookTitle: book.title })}
              hitSlop={8}
              style={{ padding: 6 }}
            >
              <Icon name="menu-book" size={22} color={C.white} />
            </Pressable>
          ) : null
        }
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: STUDIO_LAYOUT.hPadding, paddingBottom: 48, gap: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {isEdit ? (
            <DarkSurface style={{ padding: 14, gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ gap: 4 }}>
                  <NCText variant="uiLabelSm" style={{ color: C.muted, fontSize: 10, letterSpacing: 1 }}>
                    VISIBILITY
                  </NCText>
                  <NCText variant="titleMd" style={{ color: C.white, textTransform: 'capitalize' }}>
                    {status}
                  </NCText>
                </View>
                <StudioOutlineButton
                  label={status === 'published' ? 'Unpublish' : 'Publish now'}
                  onPress={onPublishToggle}
                />
              </View>
              {book?.slug && status === 'published' ? (
                <Pressable
                  onPress={() => navigation.getParent()?.getParent()?.navigate('DiscoverTab', {
                    screen: 'BookDetail',
                    params: { slug: book.slug, id: book.id },
                  })}
                >
                  <NCText variant="uiLabelSm" style={{ color: C.accent, fontSize: 12 }}>
                    View public page →
                  </NCText>
                </Pressable>
              ) : null}
            </DarkSurface>
          ) : null}

          <Pressable onPress={onPickCover} style={{ alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 140,
                height: 210,
                borderRadius: 12,
                overflow: 'hidden',
                backgroundColor: C.inputBg,
                borderWidth: 1,
                borderColor: C.inputBorder,
              }}
            >
              {coverUri ? (
                <Image source={{ uri: coverUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="image" size={32} color={C.muted} />
                </View>
              )}
            </View>
            <NCText variant="uiLabelSm" style={{ color: C.muted, fontSize: 12 }}>
              {uploadingCover ? 'Uploading…' : isEdit ? 'Tap to change cover' : 'Save book to upload cover'}
            </NCText>
          </Pressable>

          <StudioInput label="Title" value={title} onChangeText={setTitle} autoCapitalize="words" placeholder="Book title" />
          <StudioInput
            label="Synopsis"
            value={synopsis}
            onChangeText={setSynopsis}
            multiline
            numberOfLines={6}
            autoCapitalize="sentences"
            placeholder="Tell readers what this story is about…"
          />

          {categoryOptions.length ? (
            <View style={{ gap: 8 }}>
              <NCText variant="uiLabelSm" style={{ color: C.muted, fontSize: 11, letterSpacing: 0.8 }}>
                Category
              </NCText>
              <StudioChipGroup
                options={categoryOptions}
                value={category}
                onChange={setCategory}
              />
            </View>
          ) : (
            <StudioInput label="Category" value={category} onChangeText={setCategory} autoCapitalize="words" />
          )}

          <View style={{ gap: 8 }}>
            <NCText variant="uiLabelSm" style={{ color: C.muted, fontSize: 11, letterSpacing: 0.8 }}>
              Language
            </NCText>
            <StudioChipGroup options={languageOptions} value={language} onChange={setLanguage} />
          </View>

          <View style={{ gap: 8 }}>
            <NCText variant="uiLabelSm" style={{ color: C.muted, fontSize: 11, letterSpacing: 0.8 }}>
              Status
            </NCText>
            <StudioChipGroup options={STATUSES} value={status} onChange={setStatus} />
          </View>

          <StudioPrimaryButton
            label={isEdit ? 'Save changes' : 'Create book'}
            onPress={onSave}
            loading={busy}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </StudioScreen>
  );
}
