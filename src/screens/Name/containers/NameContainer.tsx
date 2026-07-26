import React, { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { setName } from '../../../store/slices/userSlice';
import { NameForm } from '../components/NameForm';

const MIN_NAME_LENGTH = 3;

export const NameContainer = () => {
  const [localName, setLocalName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);
  const dispatch = useDispatch();

  const trimmedName = localName.trim();
  const isValid = trimmedName.length >= MIN_NAME_LENGTH;

  const handleChangeName = useCallback((text: string) => {
    setLocalName(text);
    if (!touched && text.length > 0) {
      setTouched(true);
    }
  }, [touched]);

  const handleContinue = useCallback(async () => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await AsyncStorage.setItem('displayName', trimmedName);
      dispatch(setName(trimmedName));
      router.replace('/rooms');
    } catch (error) {
      console.error('Failed to save display name:', error);
      setIsSubmitting(false);
    }
  }, [isValid, isSubmitting, trimmedName, dispatch]);

  return (
    <NameForm
      name={localName}
      isValid={isValid}
      isSubmitting={isSubmitting}
      showError={touched && trimmedName.length > 0 && !isValid}
      onChangeName={handleChangeName}
      onContinue={handleContinue}
    />
  );
};

