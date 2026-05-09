import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import styles, { AVATAR_SIZE } from '../styles/profileSetupStyles';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileSetupScreen() {
  const navigation = useNavigation<NavProp>();
  const { session } = useAuth();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleChoosePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow photo library access to set a profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const handleSave = async () => {
    if (uploading) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] }); return; }
      const updates: Record<string, any> = {};
      if (displayName.trim()) updates.display_name = displayName.trim();
      if (imageUri) {
        const path = `avatars/${user.id}/avatar.jpg`;
        const formData = new FormData();
        formData.append('file', { uri: imageUri, name: 'avatar.jpg', type: 'image/jpeg' } as any);
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, formData, { upsert: true, contentType: 'image/jpeg' });
        if (uploadError) {
          Alert.alert('Upload failed', uploadError.message);
          setUploading(false);
          return;
        }
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        updates.avatar_url = urlData.publicUrl;
      }
      if (Object.keys(updates).length > 0) {
        await supabase.from('profiles').update(updates).eq('id', user.id);
      }
    } catch {}
    setUploading(false);
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.logo}>Momento</Text>
        <Text style={styles.heading}>Set up your profile</Text>
        <Text style={styles.sub}>Add a photo and display name so friends can find you</Text>
        <Pressable style={styles.avatarWrapper} onPress={handleChoosePhoto}>
          {imageUri
            ? <Image source={{ uri: imageUri }} style={styles.avatar} />
            : <View style={styles.avatarPlaceholder}>
                <MaterialCommunityIcons name="account" size={AVATAR_SIZE * 0.55} color="#9ca3af" />
              </View>
          }
        </Pressable>
        <Pressable onPress={handleChoosePhoto}>
          <Text style={styles.changePhotoText}>{imageUri ? 'Change photo' : 'Add photo'}</Text>
        </Pressable>
        <Text style={styles.inputLabel}>Display name</Text>
        <TextInput
          style={styles.input}
          placeholder="Your name"
          placeholderTextColor="#9ca3af"
          value={displayName}
          onChangeText={setDisplayName}
          autoCorrect={false}
          returnKeyType="done"
        />
        <Pressable
          style={[styles.saveBtn, uploading && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={uploading}
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
