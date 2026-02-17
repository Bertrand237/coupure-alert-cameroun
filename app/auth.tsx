import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-store';

export default function AuthScreen() {
  const { t } = useI18n();
  const { login, register } = useAuth();
  const insets = useSafeAreaInsets();
  const [isRegister, setIsRegister] = useState(true);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!phone.trim() || !password.trim()) {
      setError(t.phoneNumber + ' & ' + t.password + ' requis');
      return;
    }
    if (password.length < 4) {
      setError(t.passwordHint);
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        const result = await register(phone.trim(), password, displayName.trim() || undefined);
        if (!result.success) setError(result.error || '');
      } else {
        const result = await login(phone.trim(), password);
        if (!result.success) setError(result.error || '');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>{t.appName}</Text>
        <Text style={styles.subtitle}>{t.subtitle}</Text>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.formContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>{isRegister ? t.createAccount : t.login}</Text>
          <Text style={styles.authSubtitle}>{t.authSubtitle}</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#E53935" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t.phoneHint}
                placeholderTextColor={Colors.textTertiary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoCapitalize="none"
                testID="phone-input"
              />
            </View>

            {isRegister && (
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t.displayName}
                  placeholderTextColor={Colors.textTertiary}
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                  testID="name-input"
                />
              </View>
            )}

            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder={t.passwordHint}
                placeholderTextColor={Colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                testID="password-input"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
            testID="submit-btn"
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name={isRegister ? "person-add" : "log-in"} size={20} color="#fff" />
                <Text style={styles.submitText}>
                  {isRegister ? t.createAccount : t.login}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchBtn}
            onPress={() => { setIsRegister(!isRegister); setError(''); }}
            testID="switch-auth-mode"
          >
            <Text style={styles.switchText}>
              {isRegister ? t.hasAccount : t.noAccount}{' '}
              <Text style={styles.switchTextBold}>
                {isRegister ? t.login : t.createAccount}
              </Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    alignItems: 'center' as const,
    paddingBottom: 30,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: 12,
  },
  appName: {
    fontSize: 28,
    fontFamily: 'Nunito_800ExtraBold',
    color: Colors.textOnDark,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  formContainer: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: Colors.background,
    overflow: 'hidden' as const,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 32,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text,
    marginBottom: 6,
  },
  authSubtitle: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  errorBox: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'Nunito_600SemiBold',
    color: '#C62828',
    flex: 1,
  },
  inputGroup: {
    gap: 14,
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Nunito_600SemiBold',
    color: Colors.text,
    height: '100%' as any,
  },
  eyeBtn: {
    padding: 6,
  },
  submitBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: Colors.accent,
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitText: {
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
    color: '#fff',
  },
  switchBtn: {
    alignItems: 'center' as const,
    paddingVertical: 16,
  },
  switchText: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: Colors.textSecondary,
  },
  switchTextBold: {
    fontFamily: 'Nunito_700Bold',
    color: Colors.accent,
  },
});
