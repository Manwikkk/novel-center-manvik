import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, Pressable, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import NCText from '@/components/primitives/Text';
import AuthorGuard from '@/components/studio/AuthorGuard';
import ContentTagPicker from '@/components/studio/ContentTagPicker';
import {
  StudioScreen,
  StudioHeader,
  StudioInput,
  StudioPrimaryButton,
  StudioOutlineButton,
  StudioChipGroup,
  StudioSectionLabel,
  STUDIO_LAYOUT,
  useAppTheme,
} from '@/components/studio/StudioTheme';
import { DarkSurface } from '@/components/discover/DiscoverTheme';
import { api, getAccessToken } from '@/lib/api';
import { catalogApi } from '@/lib/catalog';
import {
  BOOK_TYPES,
  LEADING_GENDERS,
  GENRE_OPTIONS,
  BOOK_LENGTHS,
  WARNING_NOTICES,
  PUBLISH_CHOICES,
  emptyBookForm,
  formToPayload,
  TITLE_MAX,
} from '@/lib/bookFormOptions';
import { API_URL } from '@/config/env';
import { resolveImageUrl } from '@/lib/image';
import { exitAuthorStudioToProfile } from '@/lib/authorNavigation';
import { useUiStore } from '@/stores/uiStore';

const STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archive' },
];

export default function BookEditScreen({ route, navigation }) {
  const { mode, bookId } = route.params || {};
  const isEdit = mode === 'edit' && bookId;

  return (
    <AuthorGuard navigation={navigation} title={isEdit ? 'Edit book' : 'New book'}>
      <BookEditContent route={route} navigation={navigation} isEdit={isEdit} bookId={bookId} />
    </AuthorGuard>
  );
}

function BookEditContent({ route, navigation, isEdit, bookId }) {
  const { colors: C } = useAppTheme();
  const pushToast = useUiStore((s) => s.pushToast);

  const [form, setForm] = useState(emptyBookForm());
  const [book, setBook] = useState(null);
  const [coverUrl, setCoverUrl] = useState(null);
  const [categories, setCategories] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [contentTags, setContentTags] = useState([]);
  const [status, setStatus] = useState('draft');
  const [busy, setBusy] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    Promise.all([
      catalogApi.categories().catch(() => ({ items: [] })),
      catalogApi.languages().catch(() => ({ items: [] })),
      catalogApi.contentTags().catch(() => ({ items: [] })),
    ]).then(([cats, langs, tags]) => {
      setCategories(cats?.items || []);
      setLanguages(langs?.items || []);
      setContentTags(tags?.items || []);
      if (!isEdit) {
        const en = (langs?.items || []).find((l) => l.code === 'en');
        if (en) setForm((f) => ({ ...f, languageId: String(en.id) }));
      }
    }).finally(() => setCatalogLoading(false));
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const { book: b } = await api.get(`/books/by-id/${bookId}`);
        setBook(b);
        setForm(emptyBookForm(b));
        setStatus(b.status || 'draft');
        setCoverUrl(b.coverUrl || null);
      } catch (err) {
        pushToast({ type: 'error', title: 'Could not load book', message: err.message });
        navigation.goBack();
      }
    })();
  }, [isEdit, bookId, navigation, pushToast]);

  const genreOptions = useMemo(
    () => GENRE_OPTIONS[form.leadingGender] || GENRE_OPTIONS.male,
    [form.leadingGender],
  );

  const categoryOptions = categories.map((c) => ({
    value: String(c.id),
    label: c.label || c.name,
  }));

  const languageOptions = languages.map((l) => ({
    value: String(l.id),
    label: l.name || l.label || l.code,
  }));

  const validate = () => {
    if (!form.title.trim()) return 'Title is required.';
    if (form.title.trim().length > TITLE_MAX) return `Title must be ${TITLE_MAX} characters or fewer.`;
    if (!form.synopsis.trim()) return 'Synopsis is required.';
    if (!form.genre) return 'Genre is required.';
    if (!form.languageId) return 'Language is required.';
    if (!form.bookLength) return 'Book length is required.';
    if (!form.warningNotice) return 'Warning notice is required.';
    return null;
  };

  const onSave = async () => {
    const err = validate();
    if (err) {
      pushToast({ type: 'error', title: 'Missing fields', message: err });
      return;
    }
    setBusy(true);
    try {
      const payload = formToPayload(form, { includeStatus: !isEdit });
      if (isEdit) {
        const { book: updated } = await api.patch(`/books/${book.id}`, { ...payload, status });
        setBook(updated);
        setStatus(updated.status);
        pushToast({ type: 'success', title: 'Saved' });
      } else {
        const { book: created } = await api.post('/books', payload);
        pushToast({ type: 'success', title: created.status === 'published' ? 'Published' : 'Draft saved' });
        navigation.replace('AuthorBookEdit', { mode: 'edit', bookId: created.id });
      }
    } catch (e) {
      pushToast({ type: 'error', title: 'Could not save', message: e.message });
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
      setField('publishChoice', updated.status === 'published' ? 'published' : 'draft');
      pushToast({
        type: 'success',
        title: next === 'published' ? 'Published' : 'Unpublished',
      });
    } catch (e) {
      pushToast({ type: 'error', title: 'Could not update', message: e.message });
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
    } catch (e) {
      pushToast({ type: 'error', title: 'Could not upload cover', message: e.message });
    } finally {
      setUploadingCover(false);
    }
  };

  const coverUri = resolveImageUrl(coverUrl);

  return (
    <StudioScreen edges={['top', 'bottom']}>
      <StudioHeader
        breadcrumb="Author Studio"
        title={isEdit ? 'Edit book' : 'New book'}
        onBack={() => exitAuthorStudioToProfile(navigation)}
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
                  onPress={() =>
                    navigation.getParent()?.getParent()?.navigate('DiscoverTab', {
                      screen: 'BookDetail',
                      params: { slug: book.slug, id: book.id },
                    })
                  }
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

          <StudioSectionLabel>NOVEL INFORMATION</StudioSectionLabel>
          <StudioInput
            label={`Title (${form.title.length}/${TITLE_MAX})`}
            value={form.title}
            onChangeText={(v) => setField('title', v.slice(0, TITLE_MAX))}
            autoCapitalize="words"
            placeholder="Book title"
          />
          <StudioInput
            label="Synopsis"
            value={form.synopsis}
            onChangeText={(v) => setField('synopsis', v)}
            multiline
            numberOfLines={6}
            autoCapitalize="sentences"
            placeholder="Tell readers what this story is about…"
          />

          <View style={{ gap: 8 }}>
            <NCText variant="uiLabelSm" style={{ color: C.muted, fontSize: 11, letterSpacing: 0.8 }}>
              Book type
            </NCText>
            <StudioChipGroup options={BOOK_TYPES} value={form.bookType} onChange={(v) => setField('bookType', v)} />
          </View>

          <View style={{ gap: 8 }}>
            <NCText variant="uiLabelSm" style={{ color: C.muted, fontSize: 11, letterSpacing: 0.8 }}>
              Leading gender
            </NCText>
            <StudioChipGroup
              options={LEADING_GENDERS}
              value={form.leadingGender}
              onChange={(v) => {
                setField('leadingGender', v);
                setField('genre', '');
              }}
            />
          </View>

          <View style={{ gap: 8 }}>
            <NCText variant="uiLabelSm" style={{ color: C.muted, fontSize: 11, letterSpacing: 0.8 }}>
              Genre
            </NCText>
            <StudioChipGroup options={genreOptions} value={form.genre} onChange={(v) => setField('genre', v)} />
          </View>

          {categoryOptions.length ? (
            <View style={{ gap: 8 }}>
              <NCText variant="uiLabelSm" style={{ color: C.muted, fontSize: 11, letterSpacing: 0.8 }}>
                Category
              </NCText>
              <StudioChipGroup
                options={categoryOptions}
                value={form.categoryId}
                onChange={(v) => setField('categoryId', v)}
              />
            </View>
          ) : null}

          {languageOptions.length ? (
            <View style={{ gap: 8 }}>
              <NCText variant="uiLabelSm" style={{ color: C.muted, fontSize: 11, letterSpacing: 0.8 }}>
                Language
              </NCText>
              <StudioChipGroup
                options={languageOptions}
                value={form.languageId}
                onChange={(v) => setField('languageId', v)}
              />
            </View>
          ) : null}

          <StudioSectionLabel>STORY DETAILS</StudioSectionLabel>

          <View style={{ gap: 8 }}>
            <NCText variant="uiLabelSm" style={{ color: C.muted, fontSize: 11, letterSpacing: 0.8 }}>
              Book length
            </NCText>
            <StudioChipGroup options={BOOK_LENGTHS} value={form.bookLength} onChange={(v) => setField('bookLength', v)} />
          </View>

          <View style={{ gap: 8 }}>
            <NCText variant="uiLabelSm" style={{ color: C.muted, fontSize: 11, letterSpacing: 0.8 }}>
              Warning notice
            </NCText>
            <StudioChipGroup
              options={WARNING_NOTICES}
              value={form.warningNotice}
              onChange={(v) => setField('warningNotice', v)}
            />
          </View>

          <ContentTagPicker
            tags={contentTags}
            selectedIds={form.contentTagIds}
            onChange={(ids) => setField('contentTagIds', ids)}
          />

          {!isEdit ? (
            <View style={{ gap: 8 }}>
              <NCText variant="uiLabelSm" style={{ color: C.muted, fontSize: 11, letterSpacing: 0.8 }}>
                On create
              </NCText>
              <StudioChipGroup
                options={PUBLISH_CHOICES}
                value={form.publishChoice}
                onChange={(v) => setField('publishChoice', v)}
              />
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              <NCText variant="uiLabelSm" style={{ color: C.muted, fontSize: 11, letterSpacing: 0.8 }}>
                Archive status
              </NCText>
              <StudioChipGroup options={STATUSES} value={status} onChange={setStatus} />
            </View>
          )}

          <StudioPrimaryButton
            label={isEdit ? 'Save changes' : 'Create book'}
            onPress={onSave}
            loading={busy || catalogLoading}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </StudioScreen>
  );
}
