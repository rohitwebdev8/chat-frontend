/**
 * SetupScreen — One-time name + email entry for PACE.
 * No password, no Firebase Auth. Sets up local profile.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { setupProfile } from '@/services/firebase/authService';
import theme from '@/constants/theme';

export const AuthScreen: React.FC = () => {
  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) {
      errs.name = 'Name must be at least 2 characters.';
    }
    if (email.trim() && !/\S+@\S+\.\S+/.test(email)) {
      errs.email = 'Enter a valid email address.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleStart = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await setupProfile(name, email);
      // _layout.tsx re-renders automatically because isProfileSet() changes
    } catch (err) {
      setErrors({ name: 'Something went wrong. Try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Brand */}
        <View style={styles.brand}>
          <View style={styles.logoBadge}>
            <Ionicons name="flash-sharp" size={36} color={theme.colors.primary} />
          </View>
          <Text style={styles.logoTitle}>PACE</Text>
          <Text style={styles.logoTagline}>Personal Action & Consistency Engine</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome — let's set you up</Text>
          <Text style={styles.cardSub}>
            Your name and email are stored only on this device.
          </Text>

          {/* Name */}
          <View style={styles.field}>
            <Text style={styles.label}>Your Name *</Text>
            <TextInput
              style={[styles.input, !!errors.name && styles.inputError]}
              placeholder="e.g. Alex"
              placeholderTextColor="#666"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="next"
            />
            {errors.name ? <Text style={styles.err}>{errors.name}</Text> : null}
          </View>

          {/* Email (optional) */}
          <View style={styles.field}>
            <Text style={styles.label}>Email <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={[styles.input, !!errors.email && styles.inputError]}
              placeholder="alex@example.com"
              placeholderTextColor="#666"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleStart}
            />
            {errors.email ? <Text style={styles.err}>{errors.email}</Text> : null}
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleStart}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.btnText}>Start Tracking →</Text>
            }
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 24,
  },
  brand: {
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: 3,
  },
  logoTagline: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 22,
    gap: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  cardSub: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 19,
    marginTop: -8,
  },
  field: { gap: 5 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  optional: {
    fontWeight: '400',
    color: theme.colors.textSecondary,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  inputError: { borderColor: theme.colors.error },
  err: {
    fontSize: 12,
    color: theme.colors.error,
    marginTop: 2,
  },
  btn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
