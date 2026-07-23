import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Switch,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RichText, Toolbar, useEditorBridge } from '@10play/tentap-editor';
import NCText from '@/components/primitives/Text';
import Spinner from '@/components/primitives/Spinner';
import AuthorGuard from '@/components/studio/AuthorGuard';
import {
  StudioScreen,
  StudioHeader,
  StudioInput,
  StudioOutlineButton,
  STUDIO_LAYOUT,
  useAppTheme,
} from '@/components/studio/StudioTheme';
import { api } from '@/lib/api';
import { exitAuthorStudioToProfile } from '@/lib/authorNavigation';
import { pricingFromContent } from '@/lib/chapterPricing';
import { useUiStore } from '@/stores/uiStore';

const PUBLISH_MODES = [
  { value: 'draft', label: 'Draft' },
  { value: 'publishNow', label: 'Publish now' },
  { value: 'schedule', label: 'Schedule' },
];

const SERVER_DEBOUNCE_MS = 3000;

function derivePublishMode(chapter) {
  if (!chapter) return 'draft';
  if (chapter.status === 'published') return 'publishNow';
  if (chapter.scheduledPublishAt) return 'schedule';
  return 'draft';
}

function toDatetimeLocalValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function buildPayload({ title, html, idx, isPaid, authorThought, publishMode, scheduleInput }) {
  let status = 'draft';
  let scheduledPublishAt = null;
  if (publishMode === 'publishNow') {
    status = 'published';
  } else if (publishMode === 'schedule') {
    scheduledPublishAt = fromDatetimeLocalValue(scheduleInput);
  }
  return {
    title: title.trim() || 'Untitled chapter',
    contentHtml: html,
    idx: Math.max(1, Math.floor(Number(idx) || 1)),
    status,
    scheduledPublishAt,
    isPaid,
    authorThought: authorThought?.trim() || null,
  };
}

export default function ChapterEditScreen({ route, navigation }) {
  const { chapterId, bookId } = route.params || {};
  return (
    <AuthorGuard navigation={navigation} title="Chapter editor">
      <ChapterEditContent chapterId={chapterId} bookId={bookId} navigation={navigation} />
    </AuthorGuard>
  );
}

function ChapterEditContent({ chapterId, bookId, navigation }) {
  const { colors: C } = useAppTheme();
  const pushToast = useUiStore((s) => s.pushToast);

  const [title, setTitle] = useState('');
  const [idx, setIdx] = useState('1');
  const [authorThought, setAuthorThought] = useState('');
  const [publishMode, setPublishMode] = useState('draft');
  const [scheduleInput, setScheduleInput] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [pricingPreview, setPricingPreview] = useState({ wordCount: 0, tokenPrice: 0, pricingNote: null });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [initialContent, setInitialContent] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved');
  const autosaveTimer = useRef(null);

  const editor = useEditorBridge({
    autofocus: false,
    avoidIosKeyboard: true,
    initialContent: '',
    theme: {
      webview: { backgroundColor: C.bg },
      toolbar: {
        toolbarBody: { backgroundColor: C.sheet, borderTopColor: C.inputBorder },
      },
      colorKeyboard: {
        keyboardRootColor: C.sheet,
      },
    },
  });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { chapter: c } = await api.get(`/chapters/${chapterId}`);
        if (!active) return;
        setTitle(c.title || '');
        setIdx(String(c.idx || 1));
        setAuthorThought(c.authorThought || '');
        setPublishMode(derivePublishMode(c));
        setScheduleInput(toDatetimeLocalValue(c.scheduledPublishAt));
        setIsPaid(!!c.isPaid);
        setInitialContent(c.contentHtml || '<p></p>');
        setPricingPreview(pricingFromContent(!!c.isPaid, c.contentHtml || ''));
      } catch (err) {
        pushToast({ type: 'error', title: 'Could not load chapter', message: err.message });
        navigation.goBack();
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [chapterId, navigation, pushToast]);

  useEffect(() => {
    if (initialContent != null && editor?.setContent) {
      editor.setContent(initialContent);
    }
  }, [initialContent, editor]);

  const refreshPricingPreview = useCallback(async () => {
    if (!isPaid) {
      setPricingPreview({ wordCount: 0, tokenPrice: 0, pricingNote: null });
      return;
    }
    let html = '';
    try {
      html = await editor.getHTML();
    } catch (_e) {
      html = initialContent || '';
    }
    setPricingPreview(pricingFromContent(true, html));
  }, [editor, initialContent, isPaid]);

  useEffect(() => {
    if (showPanel) refreshPricingPreview();
  }, [showPanel, isPaid, refreshPricingPreview]);

  const persist = useCallback(async ({ silent = false, andNew = false } = {}) => {
    if (busy && !silent) return null;
    if (!silent) setBusy(true);
    setSaveStatus('saving');
    try {
      let html = '';
      try {
        html = await editor.getHTML();
      } catch (_e) {
        html = initialContent || '';
      }
      const payload = buildPayload({
        title,
        html,
        idx,
        isPaid,
        authorThought,
        publishMode,
        scheduleInput,
      });
      const saved = await api.patch(`/chapters/${chapterId}`, payload);
      if (saved?.chapter) {
        setPricingPreview(pricingFromContent(!!saved.chapter.isPaid, html));
      }
      setSaveStatus('saved');
      if (!silent) {
        pushToast({ type: 'success', title: 'Saved', message: payload.status === 'published' ? 'Published' : 'Draft saved' });
      }
      if (andNew && bookId) {
        const { chapter } = await api.post(`/books/${bookId}/chapters`, {
          title: 'Untitled chapter',
          contentHtml: '<p>Start writing here…</p>',
          status: 'draft',
          isPaid: false,
        });
        navigation.replace('AuthorChapterEdit', { chapterId: chapter.id, bookId });
      }
      return true;
    } catch (err) {
      setSaveStatus('error');
      if (!silent) pushToast({ type: 'error', title: 'Could not save', message: err.message });
      return false;
    } finally {
      if (!silent) setBusy(false);
    }
  }, [
    authorThought,
    bookId,
    busy,
    chapterId,
    editor,
    idx,
    initialContent,
    isPaid,
    navigation,
    publishMode,
    pushToast,
    scheduleInput,
    title,
  ]);

  const queueAutosave = useCallback(() => {
    setSaveStatus('dirty');
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      persist({ silent: true });
    }, SERVER_DEBOUNCE_MS);
  }, [persist]);

  useEffect(() => () => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
  }, []);

  const onSave = () => persist({ silent: false });
  const onSaveAndNew = () => persist({ silent: false, andNew: true });

  const statusLabel =
    saveStatus === 'saving' ? 'Saving…'
      : saveStatus === 'dirty' ? 'Unsaved changes'
        : saveStatus === 'error' ? 'Save failed'
          : 'Saved';

  return (
    <StudioScreen>
      <StudioHeader
        breadcrumb="Chapters"
        title="Chapter editor"
        onBack={() => exitAuthorStudioToProfile(navigation)}
        right={(
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Pressable onPress={() => setShowPanel((p) => !p)} hitSlop={8} style={{ padding: 6 }}>
              <Icon name={showPanel ? 'expand-less' : 'tune'} size={22} color={C.white} />
            </Pressable>
            <Pressable
              onPress={onSave}
              disabled={busy}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                backgroundColor: C.white,
                borderRadius: 999,
                opacity: busy ? 0.6 : 1,
              }}
            >
              <NCText variant="uiLabelSm" style={{ color: C.bg, fontWeight: '700' }}>
                {busy ? 'Saving…' : 'Save'}
              </NCText>
            </Pressable>
          </View>
        )}
      />

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Spinner />
        </View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: STUDIO_LAYOUT.hPadding, paddingBottom: 4, gap: 4 }}>
            <TextInput
              value={title}
              onChangeText={(v) => { setTitle(v); queueAutosave(); }}
              placeholder="Chapter title"
              placeholderTextColor={C.muted}
              style={{
                color: C.white,
                fontSize: 20,
                fontWeight: '700',
                paddingVertical: 10,
              }}
            />
            <NCText variant="uiLabelXs" style={{ color: C.muted, fontSize: 10 }}>{statusLabel}</NCText>
          </View>

          {showPanel ? (
            <ScrollView
              style={{
                paddingHorizontal: STUDIO_LAYOUT.hPadding,
                paddingVertical: 14,
                backgroundColor: C.sheet,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: C.inputBorder,
                maxHeight: 360,
              }}
              contentContainerStyle={{ gap: 16 }}
            >
              <StudioInput
                label="Chapter order"
                value={String(idx)}
                onChangeText={(v) => { setIdx(v); queueAutosave(); }}
                keyboardType="number-pad"
                placeholder="1"
              />

              <View style={{ gap: 8 }}>
                <NCText variant="uiLabelSm" style={{ color: C.muted, fontSize: 11, letterSpacing: 0.8 }}>
                  Publish
                </NCText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {PUBLISH_MODES.map((mode) => {
                    const active = publishMode === mode.value;
                    return (
                      <Pressable
                        key={mode.value}
                        onPress={() => { setPublishMode(mode.value); queueAutosave(); }}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: active ? C.white : C.inputBorder,
                          backgroundColor: active ? C.pillBg : 'transparent',
                        }}
                      >
                        <NCText variant="uiLabelXs" style={{ color: active ? C.white : C.muted, fontSize: 11 }}>
                          {mode.label}
                        </NCText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {publishMode === 'schedule' ? (
                <StudioInput
                  label="Schedule (YYYY-MM-DDTHH:mm)"
                  value={scheduleInput}
                  onChangeText={(v) => { setScheduleInput(v); queueAutosave(); }}
                  placeholder="2026-07-15T09:00"
                  autoCapitalize="none"
                />
              ) : null}

              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <NCText variant="uiLabelSm" style={{ color: C.muted, fontSize: 11, letterSpacing: 0.8 }}>
                    Paid chapter
                  </NCText>
                  <Switch
                    value={isPaid}
                    onValueChange={(v) => { setIsPaid(v); queueAutosave(); }}
                    trackColor={{ false: C.inputBorder, true: C.pillBg }}
                    thumbColor={C.white}
                  />
                </View>
                {isPaid ? (
                  <View style={{ gap: 6 }}>
                    <NCText variant="bodySm" style={{ color: C.white, fontWeight: '600' }}>
                      {`${pricingPreview.tokenPrice} coins (based on ${pricingPreview.wordCount.toLocaleString()} words)`}
                    </NCText>
                    <NCText variant="bodySm" style={{ color: C.muted, fontSize: 11, lineHeight: 16 }}>
                      Price is calculated automatically from word count when you save.
                    </NCText>
                    {pricingPreview.pricingNote ? (
                      <NCText variant="bodySm" style={{ color: '#d97706', fontSize: 11, lineHeight: 16 }}>
                        {pricingPreview.pricingNote}
                      </NCText>
                    ) : null}
                  </View>
                ) : null}
              </View>

              <StudioInput
                label="Author's thought"
                value={authorThought}
                onChangeText={(v) => { setAuthorThought(v); queueAutosave(); }}
                multiline
                numberOfLines={4}
                placeholder="A short note for readers…"
                autoCapitalize="sentences"
              />

              {bookId ? (
                <StudioOutlineButton label="Save & new chapter" onPress={onSaveAndNew} />
              ) : null}
            </ScrollView>
          ) : null}

          <View style={{ flex: 1, backgroundColor: C.bg }}>
            <RichText editor={editor} style={{ flex: 1, backgroundColor: C.bg }} />
            <Toolbar editor={editor} />
          </View>
        </KeyboardAvoidingView>
      )}
    </StudioScreen>
  );
}
