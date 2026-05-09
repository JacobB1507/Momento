import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import styles, { AVATAR_SIZE } from '../styles/profilePhotoSetupStyles';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProfilePhotoSetupScreen() {
  const navigation = useNavigation<NavProp>();
  const { session } = useAuth();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileName = `${user.id}/avatar.jpg`;
      const formData = new FormData();
      formData.append('file', { uri: imageUri, name: 'avatar.jpg', type: 'image/jpeg' } as any);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, formData, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', user.id);

      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (err: any) {
      Alert.alert('Upload failed', err.message || 'Could not upload your photo. Please try again.');
    } finally {
      setUploading(false);
    }
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
      </View>
    </SafeAreaView>
  );
}
