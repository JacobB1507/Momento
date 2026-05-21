import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import {
  getMyTags,
  deleteTag,
  reorderTagUp,
  reorderTagDown,
  ProfileTag,
} from '../lib/tags';
import TagEditorSheet from '../components/TagEditorSheet';
import styles from '../styles/manageTagsStyles';

export default function ManageTagsScreen() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [tags, setTags] = useState<ProfileTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<
    { mode: 'create' } | { mode: 'edit'; tag: ProfileTag } | null
  >(null);
  const [mutatingTagId, setMutatingTagId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const data = await getMyTags(userId);
      setTags(data);
    } catch (e: any) {
      console.warn('[ManageTags] load failed:', e?.message ?? e);
      // Don't show alert — let the empty state render. Pull-to-refresh allows retry.
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const onRefresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    try {
      const data = await getMyTags(userId);
      setTags(data);
    } catch (e) {
      console.warn('[ManageTags] refresh failed:', e);
    } finally {
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDelete = (tag: ProfileTag) => {
    Alert.alert(
      `Delete "${tag.label}"?`,
      "This tag will be removed from any galleries it's applied to. The galleries themselves will not be deleted.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTag(tag.id);
              load();
            } catch (err: any) {
              Alert.alert('Error', err?.message ?? 'Failed to delete tag.');
            }
          },
        },
      ],
    );
  };

  const handleReorder = async (tag: ProfileTag, direction: 'up' | 'down') => {
    if (!userId) return;
    setMutatingTagId(tag.id);
    try {
      if (direction === 'up') await reorderTagUp(tag.id, userId);
      else await reorderTagDown(tag.id, userId);
      await load();
    } catch {
      // silently ignore
    } finally {
      setMutatingTagId(null);
    }
  };

  const renderTag = ({ item, index }: { item: ProfileTag; index: number }) => {
    const isTop = index === 0;
    const isBottom = index === tags.length - 1;
    const isMutating = mutatingTagId === item.id;

    return (
      <Pressable style={styles.tagRow} onPress={() => {
        if (!userId) {
          Alert.alert('Loading...', 'Please wait a moment and try again.');
          return;
        }
        setEditing({ mode: 'edit', tag: item });
      }}>
        <View style={[styles.swatch, { backgroundColor: item.color }]}>
          {item.emoji ? <Text style={{ fontSize: 14 }}>{item.emoji}</Text> : null}
        </View>
        <Text style={styles.tagLabel}>{item.label}</Text>
        <View style={styles.rowActions}>
          <Pressable
            style={[styles.iconButton, { opacity: isTop || isMutating ? 0.3 : 1 }]}
            disabled={isTop || isMutating}
            onPress={() => handleReorder(item, 'up')}
          >
            <Ionicons name="chevron-up" size={20} color="#8E8E93" />
          </Pressable>
          <Pressable
            style={[styles.iconButton, { opacity: isBottom || isMutating ? 0.3 : 1 }]}
            disabled={isBottom || isMutating}
            onPress={() => handleReorder(item, 'down')}
          >
            <Ionicons name="chevron-down" size={20} color="#8E8E93" />
          </Pressable>
          <Pressable style={styles.iconButton} onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Text style={styles.subtitleBanner}>
        You can create up to 10 tags to organize your galleries. Tap any tag to edit it.
      </Text>

      <View style={styles.listContent}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : tags.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No tags yet. Create your first tag below.</Text>
          </View>
        ) : (
          <FlatList
            data={tags}
            keyExtractor={(item) => item.id}
            renderItem={renderTag}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#FF6B6B"
              />
            }
          />
        )}
      </View>

      <Pressable
        style={[styles.bottomButton, { opacity: tags.length >= 10 ? 0.4 : 1 }]}
        disabled={tags.length >= 10}
        onPress={() => {
          if (!userId) {
            Alert.alert('Loading...', 'Please wait a moment and try again.');
            return;
          }
          setEditing({ mode: 'create' });
        }}
      >
        <Text style={styles.bottomButtonText}>
          {tags.length >= 10 ? '10 tag limit reached' : 'Create Tag'}
        </Text>
      </Pressable>

      <TagEditorSheet
        visible={editing !== null}
        mode={editing !== null ? editing.mode : 'create'}
        tag={editing?.mode === 'edit' ? editing.tag : undefined}
        userId={userId!}
        onClose={() => setEditing(null)}
        onSaved={load}
      />
    </SafeAreaView>
  );
}
