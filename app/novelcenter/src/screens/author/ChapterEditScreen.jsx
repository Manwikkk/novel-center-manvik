import React, { useEffect, useState } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView, Pressable, Switch, TextInput } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RichText, Toolbar, useEditorBridge } from '@10play/tentap-editor';
import NCText from '@/components/primitives/Text';
import Spinner from '@/components/primitives/Spinner';
import {
  StudioScreen,
  StudioHeader,
  StudioInput,
  StudioChipGroup,
  STUDIO_LAYOUT,
  useAppTheme,
} from '@/components/studio/StudioTheme';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/uiStore';

const STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
];

export default function ChapterEditScreen({ route, navigation }) {
  const { colors: C } = useAppTheme();
  const { chapterId } = route.params || {};
  const pushToast = useUiStore((s) => s.pushToast);

  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('draft');
  const [isPaid, setIsPaid] = useState(false);
  const [tokenPrice, setTokenPrice] = useState('0');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [initialContent, setInitialContent] = useState(null);

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
        setStatus(c.status || 'draft');
        setIsPaid(!!c.isPaid);
        setTokenPrice(String(c.tokenPrice ?? 0));
        setInitialContent(c.contentHtml || '<p></p>');
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

  const onSave = async () => {
    setBusy(true);
    try {
      let html = '';
      try {
        html = await editor.getHTML();
      } catch (_e) {
        html = initialContent || '';
      }
      const price = Math.max(0, Math.floor(Number(tokenPrice) || 0));
      await api.patch(`/chapters/${chapterId}`, {
        title: title.trim() || 'Untitled chapter',
        contentHtml: html,
        status,
        isPaid,
        tokenPrice: isPaid ? price : 0,
      });
      pushToast({ type: 'success', title: 'Saved', message: status === 'published' ? 'Published' : 'Draft saved' });
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not save', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <StudioScreen>
      <StudioHeader
          breadcrumb="Chapters"
          title="Chapter editor"
          onBack={() => navigation.goBack()}
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
          <View style={{ paddingHorizontal: STUDIO_LAYOUT.hPadding, paddingBottom: 8 }}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Chapter title"
              placeholderTextColor={C.muted}
              style={{
                color: C.white,
                fontSize: 20,
                fontWeight: '700',
                paddingVertical: 10,
              }}
            />
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
                maxHeight: 260,
              }}
              contentContainerStyle={{ gap: 16 }}
            >
              <View style={{ gap: 8 }}>
                <NCText variant="uiLabelSm" style={{ color: C.muted, fontSize: 11, letterSpacing: 0.8 }}>
                  Status
                </NCText>
                <StudioChipGroup options={STATUSES} value={status} onChange={setStatus} />
              </View>

              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <NCText variant="uiLabelSm" style={{ color: C.muted, fontSize: 11, letterSpacing: 0.8 }}>
                    Paid chapter
                  </NCText>
                  <Switch
                    value={isPaid}
                    onValueChange={setIsPaid}
                    trackColor={{ false: C.inputBorder, true: C.pillBg }}
                    thumbColor={C.white}
                  />
                </View>
                {isPaid ? (
                  <StudioInput
                    label="Token price"
                    value={String(tokenPrice)}
                    onChangeText={setTokenPrice}
                    keyboardType="number-pad"
                    placeholder="e.g. 5"
                  />
                ) : null}
              </View>
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
