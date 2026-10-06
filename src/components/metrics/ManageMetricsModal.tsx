/**
 * ManageMetricsModal.tsx — Add, edit, pin, and manage custom and built-in metrics.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MetricDefinition, MetricAggregation, MetricDirection } from '@/types/metrics';
import theme from '@/constants/theme';

interface Props {
  visible: boolean;
  metrics: MetricDefinition[];
  onSaveMetric: (metric: MetricDefinition) => Promise<void>;
  onDeleteMetric: (id: string) => Promise<void>;
  onClose: () => void;
}

const COMMON_EMOJIS = ['🎯', '⚖️', '👟', '💧', '🔥', '🥩', '💰', '📖', '💻', '🧘', '⏱️', '🚴', '💊', '🛌', '🎸'];

export const ManageMetricsModal: React.FC<Props> = ({
  visible,
  metrics,
  onSaveMetric,
  onDeleteMetric,
  onClose,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [icon, setIcon] = useState('🎯');
  const [aggregation, setAggregation] = useState<MetricAggregation>('sum');
  const [direction, setDirection] = useState<MetricDirection>('increase');
  const [dailyTarget, setDailyTarget] = useState('');
  const [pinned, setPinned] = useState(true);
  const [error, setError] = useState('');

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setUnit('');
    setIcon('🎯');
    setAggregation('sum');
    setDirection('increase');
    setDailyTarget('');
    setPinned(true);
    setError('');
    setIsEditing(true);
  };

  const handleOpenEdit = (m: MetricDefinition) => {
    setEditingId(m.id);
    setName(m.name);
    setUnit(m.unit);
    setIcon(m.icon || '🎯');
    setAggregation(m.aggregation);
    setDirection(m.direction);
    setDailyTarget(m.dailyTarget ? String(m.dailyTarget) : '');
    setPinned(m.pinned);
    setError('');
    setIsEditing(true);
  };

  const handleSaveForm = async () => {
    const cleanName = name.trim();
    const cleanUnit = unit.trim();

    if (!cleanName || cleanName.length < 2) {
      setError('Metric name must be at least 2 characters.');
      return;
    }
    if (!cleanUnit) {
      setError('Unit is required (e.g. kg, steps, pages, hrs).');
      return;
    }

    const id = editingId || `custom_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36)}`;
    const parsedTarget = parseFloat(dailyTarget);

    const metricToSave: MetricDefinition = {
      id,
      name: cleanName,
      unit: cleanUnit,
      icon: icon.trim() || '🎯',
      aggregation,
      direction,
      dailyTarget: !isNaN(parsedTarget) && parsedTarget > 0 ? parsedTarget : undefined,
      pinned,
      builtIn: editingId ? (metrics.find((m) => m.id === editingId)?.builtIn ?? false) : false,
      updatedAt: new Date().toISOString(),
    };

    await onSaveMetric(metricToSave);
    setIsEditing(false);
  };

  const handleArchive = (metric: MetricDefinition) => {
    if (metric.builtIn) {
      Alert.alert('Cannot Archive', 'Built-in standard metrics cannot be archived. You can unpin them instead.');
      return;
    }

    Alert.alert('Archive Metric', `Archive "${metric.name}"? Past logs will still keep their data.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          await onDeleteMetric(metric.id);
          if (editingId === metric.id) setIsEditing(false);
        },
      },
    ]);
  };

  const handleTogglePin = async (metric: MetricDefinition) => {
    await onSaveMetric({
      ...metric,
      pinned: !metric.pinned,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="options" size={20} color={theme.colors.primary} />
              <Text style={styles.title}>{isEditing ? (editingId ? 'Edit Metric' : 'Add Custom Metric') : 'Manage Metrics Registry'}</Text>
            </View>
            <TouchableOpacity onPress={isEditing ? () => setIsEditing(false) : onClose}>
              <Ionicons name="close-circle" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {isEditing ? (
            /* ── FORM VIEW ── */
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScroll}>
              {/* Icon Picker */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Icon Emoji</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiRow}>
                  {COMMON_EMOJIS.map((em) => (
                    <TouchableOpacity
                      key={em}
                      style={[styles.emojiBtn, icon === em && styles.emojiBtnActive]}
                      onPress={() => setIcon(em)}
                    >
                      <Text style={styles.emojiText}>{em}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Name & Unit */}
              <View style={styles.rowTwo}>
                <View style={[styles.fieldGroup, { flex: 2 }]}>
                  <Text style={styles.fieldLabel}>Metric Name *</Text>
                  <TextInput
                    style={[styles.input, !!error && styles.inputError]}
                    placeholder="e.g. Pages Read, Study Hours"
                    placeholderTextColor="#94A3B8"
                    value={name}
                    onChangeText={(t) => { setName(t); setError(''); }}
                  />
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Unit *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="pages / hrs / ₹"
                    placeholderTextColor="#94A3B8"
                    value={unit}
                    onChangeText={(t) => { setUnit(t); setError(''); }}
                  />
                </View>
              </View>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              {/* Aggregation & Direction */}
              <View style={styles.rowTwo}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Calculation</Text>
                  <View style={styles.pillsRow}>
                    {(['sum', 'latest', 'avg'] as MetricAggregation[]).map((agg) => (
                      <TouchableOpacity
                        key={agg}
                        style={[styles.pill, aggregation === agg && styles.pillActive]}
                        onPress={() => setAggregation(agg)}
                      >
                        <Text style={[styles.pillText, aggregation === agg && styles.pillTextActive]}>
                          {agg.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Goal Direction</Text>
                  <View style={styles.pillsRow}>
                    {(['increase', 'decrease'] as MetricDirection[]).map((dir) => (
                      <TouchableOpacity
                        key={dir}
                        style={[styles.pill, direction === dir && styles.pillActive]}
                        onPress={() => setDirection(dir)}
                      >
                        <Text style={[styles.pillText, direction === dir && styles.pillTextActive]}>
                          {dir === 'increase' ? '📈 Up' : '📉 Down'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Optional Daily Target */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Daily Target (Optional default)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="e.g. 20 (pages/day) or 10000 (steps)"
                  placeholderTextColor="#94A3B8"
                  value={dailyTarget}
                  onChangeText={setDailyTarget}
                />
              </View>

              {/* Pin to Today's Dashboard */}
              <TouchableOpacity
                style={styles.pinToggleRow}
                onPress={() => setPinned(!pinned)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={pinned ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={pinned ? theme.colors.primary : theme.colors.textSecondary}
                />
                <Text style={styles.pinToggleText}>Pin this metric to Today's Quick Inputs</Text>
              </TouchableOpacity>

              {/* Form Actions */}
              <View style={styles.modalActions}>
                {editingId && !metrics.find((m) => m.id === editingId)?.builtIn && (
                  <TouchableOpacity
                    style={styles.archiveBtn}
                    onPress={() => {
                      const m = metrics.find((item) => item.id === editingId);
                      if (m) handleArchive(m);
                    }}
                  >
                    <Ionicons name="archive-outline" size={16} color={theme.colors.error} />
                    <Text style={styles.archiveBtnText}>Archive</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveForm}>
                  <Text style={styles.saveBtnText}>Save Metric</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            /* ── LIST VIEW ── */
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listScroll}>
              <TouchableOpacity style={styles.addMetricBar} onPress={handleOpenAdd}>
                <Ionicons name="add-circle" size={20} color="#FFF" />
                <Text style={styles.addMetricBarText}>+ Create New Custom Metric</Text>
              </TouchableOpacity>

              <Text style={styles.subheading}>REGISTERED METRICS</Text>

              {metrics.map((m) => (
                <View key={m.id} style={styles.metricCard}>
                  <View style={styles.metricCardLeft}>
                    <Text style={styles.metricIcon}>{m.icon || '🎯'}</Text>
                    <View>
                      <View style={styles.metricTitleRow}>
                        <Text style={styles.metricName}>{m.name}</Text>
                        <Text style={styles.metricUnit}>({m.unit})</Text>
                        {m.builtIn && <Text style={styles.builtInBadge}>Default</Text>}
                      </View>
                      <Text style={styles.metricMeta}>
                        Type: {m.aggregation} · {m.direction === 'increase' ? 'Higher is better' : 'Lower is better'}
                        {m.dailyTarget ? ` · Target: ${m.dailyTarget} ${m.unit}` : ''}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.metricCardRight}>
                    <TouchableOpacity
                      style={[styles.pinBtn, m.pinned && styles.pinBtnActive]}
                      onPress={() => handleTogglePin(m)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name={m.pinned ? 'pin' : 'pin-outline'}
                        size={16}
                        color={m.pinned ? theme.colors.primary : theme.colors.textSecondary}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => handleOpenEdit(m)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="pencil" size={16} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { ...theme.typography.subtitle, fontWeight: '800', color: theme.colors.textPrimary },
  listScroll: { gap: 10, paddingBottom: 20 },
  formScroll: { gap: 14, paddingBottom: 20 },
  addMetricBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 6,
  },
  addMetricBarText: { ...theme.typography.buttonSmall, color: '#FFF', fontWeight: '700' },
  subheading: { ...theme.typography.captionSmall, fontWeight: '700', color: theme.colors.textSecondary, letterSpacing: 0.5 },
  metricCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  metricCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  metricIcon: { fontSize: 24 },
  metricTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metricName: { ...theme.typography.bodySmall, fontWeight: '700', color: theme.colors.textPrimary },
  metricUnit: { ...theme.typography.captionSmall, color: theme.colors.textSecondary },
  builtInBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  metricMeta: { ...theme.typography.captionSmall, color: theme.colors.textSecondary, marginTop: 2 },
  metricCardRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pinBtn: { padding: 4 },
  pinBtnActive: { backgroundColor: theme.colors.primaryLight, borderRadius: 6 },
  editBtn: { padding: 4 },

  // Form Styles
  fieldGroup: { gap: 6 },
  fieldLabel: { ...theme.typography.captionSmall, fontWeight: '700', color: theme.colors.textSecondary },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...theme.typography.bodySmall,
    color: theme.colors.textPrimary,
  },
  inputError: { borderColor: theme.colors.error },
  errorText: { ...theme.typography.captionSmall, color: theme.colors.error },
  rowTwo: { flexDirection: 'row', gap: 10 },
  emojiRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  emojiBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 6,
  },
  emojiBtnActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  emojiText: { fontSize: 20 },
  pillsRow: { flexDirection: 'row', gap: 6 },
  pill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  pillActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  pillText: { ...theme.typography.captionSmall, color: theme.colors.textSecondary, fontWeight: '600' },
  pillTextActive: { color: '#FFF', fontWeight: '700' },
  pinToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  pinToggleText: { ...theme.typography.bodySmall, color: theme.colors.textPrimary, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  archiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: theme.colors.error + '15',
  },
  archiveBtnText: { ...theme.typography.buttonSmall, color: theme.colors.error, fontWeight: '700' },
  saveBtn: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  saveBtnText: { ...theme.typography.buttonSmall, color: '#FFF', fontWeight: '700' },
});
