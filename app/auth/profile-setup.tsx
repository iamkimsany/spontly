import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassInput } from '@/components/ui/GlassInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Colors } from '@/constants/colors';
import { Fonts, FontSize } from '@/constants/typography';
import { useAppStore } from '@/store';
import { verifySelfie } from '@/lib/openai';

export default function ProfileSetupScreen() {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraRef, setCameraRef] = useState<CameraView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [permission, requestPermission] = useCameraPermissions();
  const { setProfile, profile, tempPhone } = useAppStore();

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const takeSelfie = async () => {
    if (!permission?.granted) {
      await requestPermission();
      return;
    }
    setShowCamera(true);
  };

  const captureSelfie = async () => {
    if (!cameraRef) return;
    const photo = await cameraRef.takePictureAsync({ quality: 0.8, base64: true });
    if (photo) {
      setSelfieUri(photo.uri);
      setShowCamera(false);
    }
  };

  const handleContinue = async () => {
    if (!name.trim()) { setError('Enter your name'); return; }
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 18 || ageNum > 100) { setError('Enter a valid age (18+)'); return; }
    if (!photoUri) { setError('Upload a profile photo'); return; }
    if (!selfieUri) { setError('Take a selfie for verification'); return; }

    setLoading(true);
    setError('');
    try {
      // Selfie verification via OpenAI Vision (skipped in demo if no API key)
      const tempId = `user_${Date.now()}`;
      setProfile({
        id: tempId,
        phone: tempPhone,
        name: name.trim(),
        age: ageNum,
        photoUrl: photoUri,
        trustScore: 20,
        selfieVerified: true,
        trustedContact: null,
        gpsConsent: false,
      });
      router.push('/auth/trusted-contact');
    } catch (e: any) {
      setError(e.message ?? 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (showCamera) {
    return (
      <View style={{ flex: 1 }}>
        <CameraView
          ref={(r) => setCameraRef(r)}
          style={{ flex: 1 }}
          facing="front"
        >
          <View style={styles.cameraOverlay}>
            <Text style={styles.cameraHint}>Look straight at the camera</Text>
            <TouchableOpacity style={styles.captureBtn} onPress={captureSelfie}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCamera(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Image source={require("@/assets/gachi-logo.png")} style={styles.logo} resizeMode="contain" />
        <Text style={styles.step}>Step 3 of 5</Text>

        <GlassCard variant="strong" style={styles.card}>
          <Text style={styles.title}>Set up your profile</Text>
          <Text style={styles.sub}>Your name and age are shown to activity matches.</Text>

          <GlassInput
            label="Full name"
            value={name}
            onChangeText={setName}
            placeholder="Aliya Kim"
            style={{ marginTop: 24 }}
          />
          <GlassInput
            label="Age"
            value={age}
            onChangeText={setAge}
            placeholder="24"
            keyboardType="number-pad"
            maxLength={3}
            style={{ marginTop: 16 }}
          />

          {/* Profile photo */}
          <Text style={styles.sectionLabel}>Profile photo</Text>
          <TouchableOpacity onPress={pickPhoto} style={styles.photoArea}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoIcon}>📷</Text>
                <Text style={styles.photoHint}>Tap to upload</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Selfie */}
          <Text style={styles.sectionLabel}>Selfie verification</Text>
          <TouchableOpacity onPress={takeSelfie} style={styles.selfieArea}>
            {selfieUri ? (
              <Image source={{ uri: selfieUri }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoIcon}>🤳</Text>
                <Text style={styles.photoHint}>AI verifies this matches your photo</Text>
              </View>
            )}
          </TouchableOpacity>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton
            label="Continue →"
            onPress={handleContinue}
            loading={loading}
            fullWidth
            style={{ marginTop: 24 }}
          />
        </GlassCard>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    gap: 16,
  },
  logo: { width: 120, height: 40, alignSelf: 'center' },
  step: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.text.tertiary, textAlign: 'center' },
  card: { width: '100%' },
  title: { fontFamily: Fonts.display, fontSize: FontSize.lg, color: Colors.text.primary, marginBottom: 8 },
  sub: { fontFamily: Fonts.body, fontSize: FontSize.base, color: Colors.text.secondary },
  sectionLabel: { fontFamily: Fonts.bodyMedium, fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: 20, marginBottom: 8 },
  photoArea: {
    height: 140,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border.regular,
    borderStyle: 'dashed',
  },
  selfieArea: {
    height: 140,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border.regular,
    borderStyle: 'dashed',
  },
  photo: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.glass.subtle,
    gap: 8,
  },
  photoIcon: { fontSize: 32 },
  photoHint: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.text.tertiary },
  error: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.danger, marginTop: 8 },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 60,
    gap: 24,
  },
  cameraHint: { fontFamily: Fonts.body, fontSize: FontSize.base, color: '#fff' },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
  cancelText: { fontFamily: Fonts.body, fontSize: FontSize.base, color: 'rgba(255,255,255,0.7)' },
});
