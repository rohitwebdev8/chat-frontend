import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { ScreenWrapper } from '../../../components';
import theme from '../../../constants/theme';

interface Props {
  name: string;
  isValid: boolean;
  isSubmitting: boolean;
  showError: boolean;
  onChangeName: (name: string) => void;
  onContinue: () => void;
}

export const NameForm: React.FC<Props> = React.memo(({
  name,
  isValid,
  isSubmitting,
  showError,
  onChangeName,
  onContinue,
}) => {
  const trimmedLength = name.trim().length;

  return (
    <ScreenWrapper style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.brandIconContainer}>
              <Text style={styles.brandIcon}>💬</Text>
            </View>
            <View style={styles.header}>
              <Text style={styles.title}>Welcome to ChatApp</Text>
              <Text style={styles.subtitle}>Enter your display name to start communicating in rooms.</Text>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Display Name</Text>
                <Text style={[styles.counter, showError && styles.counterError]}>
                  {trimmedLength} / 3 min chars
                </Text>
              </View>
              <TextInput
                style={[
                  styles.input,
                  showError && styles.inputError,
                  isValid && styles.inputValid,
                ]}
                value={name}
                onChangeText={onChangeName}
                placeholder="e.g. Rahul Sharma"
                placeholderTextColor={theme.colors.textSecondary}
                autoFocus
                maxLength={30}
                autoCorrect={false}
                accessibilityLabel="Display Name Input"
              />
              {showError && (
                <Text style={styles.errorText}>
                  ⚠️ Name must be at least 3 characters long.
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.button, (!isValid || isSubmitting) && styles.buttonDisabled]}
              onPress={onContinue}
              disabled={!isValid || isSubmitting}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Continue"
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.buttonText}>Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
});

NameForm.displayName = 'NameForm';

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  content: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.borders.radiusXl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.medium,
  },

  brandIconContainer: {
    width: 64,
    height: 64,
    borderRadius: theme.borders.radiusLg,
    backgroundColor: theme.colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: theme.spacing.md,
  },
  brandIcon: {
    fontSize: 30,
  },
  header: {
    marginBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.subtitle,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: theme.spacing.lg,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  counter: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  counterError: {
    color: theme.colors.error,
    fontWeight: '600',
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borders.radiusMd,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.colors.text,
  },
  inputValid: {
    borderColor: theme.colors.primary,
  },
  inputError: {
    borderColor: theme.colors.error,
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 13,
    marginTop: 6,
    fontWeight: '500',
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: theme.borders.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#FFFFFF',
    ...theme.typography.button,
  },
});


