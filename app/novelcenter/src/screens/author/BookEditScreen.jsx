import React, { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Screen from '@/components/primitives/Screen';
import NCText from '@/components/primitives/Text';
import IconButton from '@/components/primitives/IconButton';
import Input from '@/components/primitives/Input';
import Button from '@/components/primitives/Button';
import Cover from '@/components/primitives/Cover';
import { useTheme } from '@/theme';
import { api, getAccessToken } from '@/lib/api';
import { API_URL } from '@/config/env';
import { useUiStore } from '@/stores/uiStore';

const STATUSES = ['draft', 'published', 'archived'];

export default function BookEditScreen({ route, navigation }) {
  const t = useTheme();
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
  const [busy, setBusy] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

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
      if (isEdit) {
        const { book: updated } = await api.patch(`/books/${book.id}`, {
          title: title.trim(),
          synopsis: synopsis.trim() || null,
          category: category.trim() || null,
          language: language.trim() || 'en',
          status,
        });
        setBook(updated);
        pushToast({ type: 'success', title: 'Saved' });
      } else {
        const { book: created } = await api.post('/books', {
          title: title.trim(),
          synopsis: synopsis.trim() || null,
          category: category.trim() || null,
          language: language.trim() || 'en',
          status,
        });
        pushToast({ type: 'success', title: 'Book created' });
        navigation.replace('AuthorBookEdit', { mode: 'edit', bookId: created.id });
      }
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not save', message: err.message });
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

  return (
    <Screen padded={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <IconButton name="arrow-back" onPress={() => navigation.goBack()} />
          <NCText variant="uiLabelSm" tone="muted">{isEdit ? 'Edit book' : 'New book'}</NCText>
        </View>
        {isEdit ? (
          <IconButton
            name="menu-book"
            onPress={() => navigation.navigate('AuthorChapters', { bookId: book.id, bookTitle: book.title })}
          />
        ) : null}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48, gap: 24 }}>
          <NCText variant="headlineXl">{isEdit ? 'Edit book' : 'Create book'}</NCText>

          <View style={{ alignItems: 'center', gap: 10 }}>
            <Pressable onPress={onPickCover} style={{ alignItems: 'center', gap: 10 }}>
              <Cover source={coverUrl} width={160} />
              <NCText variant="uiLabelSm" tone="muted">
                {uploadingCover ? 'Uploading…' : isEdit ? 'Tap to change cover' : 'Save book to upload cover'}
              </NCText>
            </Pressable>
          </View>

          <Input label="Title" value={title} onChangeText={setTitle} autoCapitalize="words" autoCorrect />
          <Input
            label="Synopsis"
            value={synopsis}
            onChangeText={setSynopsis}
            multiline
            numberOfLines={6}
            autoCapitalize="sentences"
            autoCorrect
          />
          <Input label="Category" value={category} onChangeText={setCategory} autoCapitalize="words" autoCorrect />
          <Input label="Language" value={language} onChangeText={setLanguage} placeholder="en" />

          <View style={{ gap: 8 }}>
            <NCText variant="uiLabelSm" tone="muted">Status</NCText>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {STATUSES.map((s) => {
                const active = status === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setStatus(s)}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderWidth: 1,
                      borderColor: active ? t.colors.fg : t.colors.containerHigh,
                      backgroundColor: active ? t.colors.surfaceLow : 'transparent',
                      borderRadius: t.radii.sm,
                      alignItems: 'center',
                    }}
                  >
                    <NCText variant="uiLabelXs">{s.toUpperCase()}</NCText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Button label={isEdit ? 'Save changes' : 'Create book'} onPress={onSave} loading={busy} full size="lg" />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
