import React, { useEffect, useState } from 'react';
import { View, Pressable, TextInput } from 'react-native';
import NCText from '@/components/primitives/Text';
import { useAppTheme } from '@/components/studio/StudioTheme';
import { catalogApi } from '@/lib/catalog';
import { useUiStore } from '@/stores/uiStore';

const MAX_TAGS = 32;

export default function ContentTagPicker({ tags = [], selectedIds, onChange }) {
  const { colors: C } = useAppTheme();
  const pushToast = useUiStore((s) => s.pushToast);
  const [newTag, setNewTag] = useState('');
  const [creating, setCreating] = useState(false);
  const [localTags, setLocalTags] = useState(tags);

  useEffect(() => {
    setLocalTags(tags);
  }, [tags]);

  const options = localTags.map((t) => ({ value: String(t.id), label: t.label || t.name }));

  const toggleTag = (idStr) => {
    const id = Number(idStr);
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else if (next.size < MAX_TAGS) {
      next.add(id);
    } else {
      pushToast({ type: 'info', title: 'Tag limit', message: `You can select up to ${MAX_TAGS} tags.` });
      return;
    }
    onChange(next);
  };

  const onCreateTag = async () => {
    const label = newTag.trim();
    if (!label) return;
    setCreating(true);
    try {
      const data = await catalogApi.createContentTag(label);
      const tag = data?.tag || data;
      if (tag?.id) {
        setLocalTags((prev) => [...prev, tag]);
        const next = new Set(selectedIds);
        if (next.size < MAX_TAGS) next.add(tag.id);
        onChange(next);
        setNewTag('');
        pushToast({ type: 'success', title: 'Tag created' });
      }
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not create tag', message: err.message });
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={{ gap: 10 }}>
      <NCText variant="uiLabelSm" style={{ color: C.muted, fontSize: 11, letterSpacing: 0.8 }}>
        Content tags ({selectedIds.size}/{MAX_TAGS})
      </NCText>
      {options.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {options.map((opt) => {
            const active = selectedIds.has(Number(opt.value));
            return (
              <Pressable
                key={opt.value}
                onPress={() => toggleTag(opt.value)}
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
                  {opt.label}
                </NCText>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <NCText variant="bodySm" style={{ color: C.muted, fontSize: 12 }}>No tags loaded yet.</NCText>
      )}
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <TextInput
          value={newTag}
          onChangeText={setNewTag}
          placeholder="New tag name"
          placeholderTextColor={C.muted}
          style={{
            flex: 1,
            color: C.white,
            fontSize: 14,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: C.inputBorder,
            borderRadius: 10,
            backgroundColor: C.inputBg,
          }}
        />
        <Pressable
          onPress={onCreateTag}
          disabled={creating || !newTag.trim()}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 10,
            backgroundColor: C.white,
            opacity: creating || !newTag.trim() ? 0.5 : 1,
          }}
        >
          <NCText variant="uiLabelSm" style={{ color: C.bg, fontWeight: '700', fontSize: 11 }}>Add</NCText>
        </Pressable>
      </View>
    </View>
  );
}
