import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, TextInputProps, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

interface PasswordInputProps extends Omit<TextInputProps, 'secureTextEntry'> {
  containerStyle?: any;
}

export default function PasswordInput({ containerStyle, style, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        {...props}
        secureTextEntry={!visible}
        style={[styles.input, style]}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TouchableOpacity
        onPress={() => setVisible(v => !v)}
        style={styles.toggle}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={22} color="#888" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', position: 'relative' },
  input: { flex: 1, paddingRight: 44 },
  toggle: { position: 'absolute', right: 12, height: 44, width: 32, justifyContent: 'center', alignItems: 'center' },
});
