import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SplashScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.logo}>Momento</Text>
        <ActivityIndicator size="small" color="rgba(255,255,255,0.8)" style={styles.spinner} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FF6B6B' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 42, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  spinner: { marginTop: 20 },
});
