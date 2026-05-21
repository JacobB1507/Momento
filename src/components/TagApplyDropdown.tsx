import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import {
  getMyTags,
  getMyTagsAppliedToGallery,
  applyTagToGallery,
  removeTagFromGallery,
  ProfileTag,
} from '../lib/tags';

type Props = {
  visible: boolean;
  viewerId: string;
  galleryId: string;
  onClose: () => void;
  onChanged: () => void;
};

export default function TagApplyDropdown({
  visible,
  viewerId,
  galleryId,
  onClose,
  onChanged,
}: Props) {
  const navigation = useNavigation<any>();
  const [allTags, setAllTags] = useState<ProfileTag[]>([]);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) {
      setLoading(true);
      setAllTags([]);
      setAppliedIds(new Set());
      setToggling(new Set());
      Promise.all([
        getMyTags(viewerId),
        getMyTagsAppliedToGallery(galleryId, viewerId),
      ])
        .then(([tags, applied]) => {
          setAllTags(tags);
          setAppliedIds(new Set(applied.map((a) => a.tag_id)));
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    } else {
      setAllTags([]);
      setAppliedIds(new Set());
      setLoading(true);
    }
  }, [visible]);

  async function handleToggle(tagId: string) {
    if (toggling.has(tagId)) return;
    if (!galleryId || !viewerId) {
      console.warn('[TagApplyDropdown] toggle aborted: missing ids', { galleryId, viewerId });
      Alert.alert('Not ready', 'Please wait for the gallery to fully load.');
      return;
    }
    const newApplied = !appliedIds.has(tagId);
    setToggling((prev) => new Set([...prev, tagId]));
    setAppliedIds((prev) => {
      const next = new Set(prev);
      if (newApplied) next.add(tagId);
      else next.delete(tagId);
      return next;
    });
    try {
      if (newApplied) {
        await applyTagToGallery(galleryId, tagId);
      } else {
        await removeTagFromGallery(galleryId, tagId);
      }
      onChanged();
    } catch (e: any) {
      console.warn('[TagApplyDropdown] toggle failed:', e?.message ?? e, e);
      setAppliedIds((prev) => {
        const next = new Set(prev);
        if (newApplied) next.delete(tagId);
        else next.add(tagId);
        return next;
      });
      Alert.alert("Couldn't update tag", e?.message ?? 'Unknown error. Please try again.');
    } finally {
      setToggling((prev) => {
        const next = new Set(prev);
        next.delete(tagId);
        return next;
      });
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Your tags</Text>
            <Text style={styles.subtitle}>Tap to apply or remove on this gallery.</Text>
          </View>
          <View style={styles.divider} />
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="small" color="#FF6B6B" />
            </View>
          ) : allTags.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>You haven't created any tags.</Text>
              <Pressable
                onPress={() => {
                  onClose();
                  navigation.navigate('ManageTags');
                }}
                hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
              >
                <Text style={styles.createLink}>Create tags →</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <ScrollView bounces={false} showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
                {allTags.map((tag) => {
                  const applied = appliedIds.has(tag.id);
                  const inFlight = toggling.has(tag.id);
                  return (
                    <Pressable
                      key={tag.id}
                      style={[styles.row, inFlight && styles.rowDisabled]}
                      onPress={() => handleToggle(tag.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
                    >
                      <Text style={styles.tagLabel}>
                        {tag.emoji ? `${tag.emoji} ` : ''}
                        {tag.label}
                      </Text>
                      <View style={[styles.check, applied ? styles.checkFilled : styles.checkEmpty]}>
                        {applied && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <View style={{
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: '#E5E5EA',
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}>
                <Pressable
                  onPress={onClose}
                  style={({ pressed }) => ({
                    backgroundColor: '#FF6B6B',
                    paddingVertical: 12,
                    borderRadius: 10,
                    alignItems: 'center',
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>Done</Text>
                </Pressable>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  card: {
    marginTop: 80,
    width: 280,
    maxHeight: 400,
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
  },
  header: {
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
  },
  centered: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  createLink: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowDisabled: {
    opacity: 0.4,
  },
  tagLabel: {
    fontSize: 15,
    color: '#1C1C1E',
    flex: 1,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkFilled: {
    backgroundColor: '#FF6B6B',
  },
  checkEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#C6C6C8',
  },
});
