import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import type { GalleryTagInfo } from '../lib/tags';

type Props = {
  visible: boolean;
  tags: GalleryTagInfo[];
  onClose: () => void;
};

export default function TagsPopover({ visible, tags, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onPress={onClose}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View
            style={{
              maxWidth: 280,
              backgroundColor: 'white',
              borderRadius: 14,
              padding: 16,
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: '600',
                color: '#1C1C1E',
                marginBottom: 12,
                textAlign: 'center',
              }}
            >
              Tags
            </Text>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 6,
                justifyContent: 'center',
              }}
            >
              {tags.map((tag) => {
                const chipLabel = tag.emoji ? `${tag.emoji} ${tag.label}` : tag.label;
                return (
                  <View
                    key={tag.tag_id}
                    style={{
                      height: 28,
                      paddingHorizontal: 10,
                      borderRadius: 14,
                      backgroundColor: tag.color,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: 'white', fontSize: 13 }}>{chipLabel}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
