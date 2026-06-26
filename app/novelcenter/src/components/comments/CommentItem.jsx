import React from 'react';
import { View, Pressable } from 'react-native';
import Avatar from '@/components/primitives/Avatar';
import NCText from '@/components/primitives/Text';
import { useTheme } from '@/theme';
import { formatRelative } from '@/lib/format';

export default function CommentItem({ comment, onReply, depth = 0 }) {
  const t = useTheme();
  const deleted = comment.status === 'deleted';
  return (
    <View style={{ flexDirection: 'row', gap: 10, paddingLeft: depth * 16 }}>
      <Avatar
        name={comment.author?.displayName}
        source={comment.author?.avatarUrl}
        size={32}
      />
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'baseline' }}>
          <NCText variant="titleMd">{comment.author?.displayName || 'Reader'}</NCText>
          <NCText variant="uiLabelXs" tone="muted">{formatRelative(comment.createdAt)}</NCText>
        </View>
        <NCText variant="body" tone={deleted ? 'muted' : 'fg'} style={{ fontStyle: deleted ? 'italic' : 'normal' }}>
          {deleted ? 'Comment removed.' : comment.body}
        </NCText>
        {onReply ? (
          <Pressable hitSlop={8} onPress={() => onReply(comment)}>
            <NCText variant="uiLabelXs" tone="muted">Reply</NCText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
