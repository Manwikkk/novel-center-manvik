import React, { useEffect, useState } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView, Pressable, Switch } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RichText, Toolbar, useEditorBridge } from '@10play/tentap-editor';
import Screen from '@/components/primitives/Screen';
import NCText from '@/components/primitives/Text';
import IconButton from '@/components/primitives/IconButton';
import Input from '@/components/primitives/Input';
import Button from '@/components/primitives/Button';
import Spinner from '@/components/primitives/Spinner';
import { useTheme } from '@/theme';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/uiStore';

const STATUSES = ['draft', 'published'];

export default function ChapterEditScreen({ route, navigation }) {
  const t = useTheme();
  const { chapterId } = route.params || {};
  const pushToast = useUiStore((s) => s.pushToast);

  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('draft');
  const [isPaid, setIsPaid] = useState(false);
  const [tokenPrice, setTokenPrice] = useState('0');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [chapter, setChapter] = useState(null);
  const [initialContent, setInitialContent] = useState(null);

  const editor = useEditorBridge({
    autofocus: false,
    avoidIosKeyboard: true,
    initialContent: '',
    theme: {
      webview: { backgroundColor: t.colors.bg },
      toolbar: {
        toolbarBody: { backgroundColor: t.colors.surface, borderTopColor: t.colors.containerHigh },
      },
      colorKeyboard: {
        keyboardRootColor: t.colors.surface,
      },
    },
  });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { chapter: c } = await api.get(`/chapters/${chapterId}`);
        if (!active) return;
        setChapter(c);
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

  // Push initial HTML once we have it.
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
      const { chapter: updated } = await api.patch(`/chapters/${chapterId}`, {
        title: title.trim() || 'Untitled chapter',
        contentHtml: html,
        status,
        isPaid,
        tokenPrice: isPaid ? price : 0,
      });
      setChapter(updated);
      pushToast({ type: 'success', title: 'Saved', message: status === 'published' ? 'Published' : 'Draft saved' });
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not save', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen padded={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <IconButton name="arrow-back" onPress={() => navigation.goBack()} />
          <NCText variant="uiLabelSm" tone="muted">Chapters</NCText>
        </View>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <IconButton name={showPanel ? 'expand-less' : 'tune'} onPress={() => setShowPanel((p) => !p)} />
          <Pressable
            onPress={onSave}
            disabled={busy}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              backgroundColor: t.colors.fg,
              borderRadius: t.radii.sm,
              opacity: busy ? 0.6 : 1,
            }}
          >
            <NCText variant="uiLabelSm" style={{ color: t.colors.cream100 }}>
              {busy ? 'Saving…' : 'Save'}
            </NCText>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Spinner />
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={{ paddingHorizontal: 20, paddingBottom: 12, gap: 8 }}>
            <Input
              label={null}
              value={title}
              onChangeText={setTitle}
              placeholder="Chapter title"
              autoCapitalize="sentences"
              autoCorrect
              inputStyle={{ ...t.typography.headlineSm, paddingVertical: 14, minHeight: 50, backgroundColor: 'transparent', borderWidth: 0 }}
            />
          </View>

          {showPanel ? (
            <ScrollView
              horizontal={false}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 14,
                backgroundColor: t.colors.surfaceLow,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: t.colors.containerHigh,
                maxHeight: 240,
              }}
              contentContainerStyle={{ gap: 14 }}
            >
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
                          paddingVertical: 10,
                          borderRadius: t.radii.sm,
                          borderWidth: 1,
                          borderColor: active ? t.colors.fg : t.colors.containerHigh,
                          backgroundColor: active ? t.colors.surface : 'transparent',
                          alignItems: 'center',
                        }}
                      >
                        <NCText variant="uiLabelXs">{s.toUpperCase()}</NCText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <NCText variant="uiLabelSm" tone="muted">Paid chapter</NCText>
                  <Switch value={isPaid} onValueChange={setIsPaid} />
                </View>
                {isPaid ? (
                  <Input
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

          <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
            <RichText editor={editor} style={{ flex: 1, backgroundColor: t.colors.bg }} />
            <Toolbar editor={editor} />
          </View>
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}
