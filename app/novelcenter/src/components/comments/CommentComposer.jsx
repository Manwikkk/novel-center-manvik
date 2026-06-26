import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import Input from '@/components/primitives/Input';
import Button from '@/components/primitives/Button';
import NCText from '@/components/primitives/Text';
import { useTheme } from '@/theme';

export default function CommentComposer({ replyingTo, onSubmit, onCancelReply, busy }) {
  const t = useTheme();
  const [text, setText] = useState('');

  const submit = async () => {
    const value = text.trim();
    if (!value) return;
    await onSubmit(value);
    setText('');
  };

  return (
    <View style={{ gap: 10 }}>
      {replyingTo ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <NCText variant="uiLabelXs" tone="muted">
            Replying to {replyingTo.author?.displayName || 'reader'}
          </NCText>
          <Pressable onPress={onCancelReply}>
            <NCText variant="uiLabelXs" style={{ color: t.colors.error }}>Cancel</NCText>
          </Pressable>
        </View>
      ) : null}
      <Input
        value={text}
        onChangeText={setText}
        placeholder={replyingTo ? 'Write a reply...' : 'Share a thought...'}
        multiline
        autoCapitalize="sentences"
      />
      <Button label={busy ? 'Posting...' : 'Post comment'} onPress={submit} loading={busy} />
    </View>
  );
}
