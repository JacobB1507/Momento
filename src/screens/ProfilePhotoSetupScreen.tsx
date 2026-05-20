import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { uploadAvatarFile, setProfileAvatarUrl } from '../lib/galleries';
import { reportError } from '../lib/errorReport';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/profilePhotoSetupStyles';

function describeUploadError(e: any): string {
  if (!e) return '';
  if (typeof e === 'string') return e;
  const parts: string[] = [];
  if (e.message) parts.push(String(e.message));
  if (e.error && e.error !== e.message) parts.push(String(e.error));
  if (e.statusCode) parts.push(`(${e.statusCode})`);
  else if (e.code) parts.push(`(${e.code})`);
  return parts.join(' ').trim();
}

export default function ProfilePhotoSetupScreen() {
  const { session, refreshProfile } = useAuth();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [skipping, setSkipping] = useState(false);

  const handleChoosePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow photo library access to set a profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const handleSave = async () => {
    if (!imageUri) return;
    setUploading(true);
    try {
      const { publicUrl, displayUrl } = await uploadAvatarFile({
        uri: imageUri,
        mimeType: 'image/jpeg',
      });
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      await setProfileAvatarUrl(user.id, publicUrl);
      await refreshProfile();
    } catch (err: any) {
      console.log('[ProfilePhotoSetupScreen] avatar upload caught error:', err);
      try {
        Alert.alert('Upload failed', err?.message ?? 'Upload failed. Please try again.');
      } catch {
        Alert.alert('Upload failed', 'Unknown error.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSkip = async () => {
    const userId = session?.user?.id;
    if (!userId) return;
    setSkipping(true);
    const { error } = await supabase.from('profiles').update({ skipped_avatar_setup: true }).eq('id', userId);
    setSkipping(false);
    if (error) { Alert.alert('Error', 'Could not skip setup. Please try again.'); return; }
    await refreshProfile();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.logo}>Momento</Text>
        <Text style={styles.heading}>Add a profile photo</Text>
        <Text style={styles.sub}>Help friends recognize you</Text>
        <Pressable style={styles.avatarWrapper} onPress={handleChoosePhoto}>
          {imageUri ? (
            <View style={{ alignItems: 'center' }}>
              <View style={{
                width: 200,
                height: 200,
                borderRadius: 100,
                overflow: 'hidden',
                borderWidth: 3,
                borderColor: '#ffffff',
                alignSelf: 'center',
              }}>
                <Image source={{ uri: imageUri }} style={{ width: 200, height: 200 }} />
              </View>
              <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 10, textAlign: 'center' }}>
                This is how your photo will appear
              </Text>
            </View>
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>👤</Text>
            </View>
          )}
        </Pressable>
        <Pressable style={styles.chooseBtn} onPress={handleChoosePhoto}>
          <Text style={styles.chooseBtnText}>{imageUri ? 'Change Photo' : 'Choose Photo'}</Text>
        </Pressable>
        <Pressable
          style={[styles.saveBtn, (!imageUri || uploading) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!imageUri || uploading}
        >
          {uploading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>Save &amp; Continue</Text>
          }
        </Pressable>
        <TouchableOpacity
          onPress={handleSkip}
          disabled={skipping}
          style={{ paddingVertical: 12, alignItems: 'center' }}
        >
          {skipping
            ? <ActivityIndicator size="small" color="#9CA3AF" />
            : <Text style={{ fontSize: 14, color: '#9CA3AF' }}>Skip for now</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
