import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  Platform,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Goal, GoalCategory, GoalCalculatedProgress, GoalPauseRange } from '@/types/goals';
import { GoalTask, formatLocalDate } from '@/types/tasks';
import { QuickLink } from '@/types/links';
import { DailyLog } from '@/types/logs';
import { GoalCard } from '@/components/goals/GoalCard';
import { AddGoalWizardModal } from '@/components/goals/AddGoalWizardModal';
import { BottomSheet } from '@/components/ui/BottomSheet';
import theme from '@/constants/theme';

interface GoalsViewProps {
  goals: Goal[];
  goalProgressList: { goal: Goal; progress: GoalCalculatedProgress; tasks: GoalTask[] }[];
  allLogs: Record<string, DailyLog>;
  links: QuickLink[];
  onSaveGoal: (goal: Goal, tasks?: Partial<GoalTask>[]) => Promise<void>;
  onDeleteGoal: (id: string) => Promise<void>;
  onSaveGoalTask: (task: GoalTask) => Promise<void>;
  onDeleteGoalTask: (goalId: string, taskId: string) => Promise<void>;
  onLogGoalValue: (goalId: string, value: number) => Promise<void>;
  onApplyPaceSuggestion: (goalId: string, taskId: string, suggestedAmount: number) => Promise<void>;
  onSaveLink: (link: QuickLink) => Promise<void>;
  onDeleteLink: (id: string) => Promise<void>;
  scrollPaddingBottom: number;
}

const CATEGORIES: (GoalCategory | 'All')[] = ['All', 'Health', 'Fitness', 'Diet', 'Study', 'Career', 'Finance', 'Personal', 'Custom'];

export const GoalsView: React.FC<GoalsViewProps> = ({
  goals,
  goalProgressList,
  allLogs,
  links,
  onSaveGoal,
  onDeleteGoal,
  onSaveGoalTask,
  onDeleteGoalTask,
  onLogGoalValue,
  onApplyPaceSuggestion,
  onSaveLink,
  onDeleteLink,
  scrollPaddingBottom,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<GoalCategory | 'All'>('All');
  const [showAddWizard, setShowAddWizard] = useState(false);

  // Selected Goal Detail Modal State
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  // Quick Link Add Modal State
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [linkName, setLinkName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  // Pause Goal Range state inside Detail
  const [showPauseSection, setShowPauseSection] = useState(false);
  const [pauseStart, setPauseStart] = useState(formatLocalDate(new Date()));
  const [pauseEnd, setPauseEnd] = useState(formatLocalDate(new Date(Date.now() + 5 * 86400000)));
  const [pauseReason, setPauseReason] = useState('');
  const [extendDeadline, setExtendDeadline] = useState(true);

  // New Goal Task inside Detail modal
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const selectedGoalDetail = goalProgressList.find((g) => g.goal.id === selectedGoalId);

  const filteredGoals = goalProgressList.filter((item) => {
    if (selectedCategory === 'All') return true;
    return item.goal.category === selectedCategory;
  });

  const isCareerActive = selectedCategory === 'Career' || filteredGoals.some((g) => g.goal.category === 'Career');

  const handleOpenLink = (url: string) => {
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open URL.'));
    }
  };

  const handleSaveQuickLink = async () => {
    if (!linkName.trim() || !linkUrl.trim()) return;
    let url = linkUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    const newLink: QuickLink = {
      id: `link-${Date.now()}`,
      name: linkName.trim(),
      url,
      createdAt: new Date().toISOString(),
    };
    await onSaveLink(newLink);
    setShowAddLinkModal(false);
    setLinkName('');
    setLinkUrl('');
  };

  const handleDeleteGoalConfirm = (goalId: string, title: string) => {
    Alert.alert('Delete Goal', `Are you sure you want to delete "${title}"? This will delete all its tasks.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await onDeleteGoal(goalId);
          setSelectedGoalId(null);
        },
      },
    ]);
  };

  const handleAddSubtaskToGoal = async () => {
    if (!selectedGoalDetail || !newSubtaskTitle.trim()) return;
    const newTask: GoalTask = {
      id: `gtask-${Date.now()}`,
      goalId: selectedGoalDetail.goal.id,
      title: newSubtaskTitle.trim(),
      kind: 'check',
      repeat: { type: 'daily' },
      active: true,
      createdAt: new Date().toISOString(),
    };
    await onSaveGoalTask(newTask);
    setNewSubtaskTitle('');
  };

  const handleAddPauseRange = async () => {
    if (!selectedGoalDetail || !pauseStart || !pauseEnd) return;
    if (pauseEnd < pauseStart) {
      Alert.alert('Invalid Range', 'End date must be on or after start date.');
      return;
    }

    const newRange: GoalPauseRange = {
      id: `pause-${Date.now()}`,
      startDate: pauseStart,
      endDate: pauseEnd,
      reason: pauseReason.trim() || undefined,
    };

    const existingRanges = selectedGoalDetail.goal.pauseRanges || [];
    let updatedEndDate = selectedGoalDetail.goal.endDate;

    if (extendDeadline && selectedGoalDetail.goal.endDate) {
      const [sY, sM, sD] = pauseStart.split('-').map(Number);
      const [eY, eM, eD] = pauseEnd.split('-').map(Number);
      const daysCount = Math.max(1, Math.round((new Date(eY, eM - 1, eD).getTime() - new Date(sY, sM - 1, sD).getTime()) / 86400000) + 1);

      const [curEY, curEM, curED] = selectedGoalDetail.goal.endDate.split('-').map(Number);
      const newEndDt = new Date(new Date(curEY, curEM - 1, curED).getTime() + daysCount * 86400000);
      updatedEndDate = formatLocalDate(newEndDt);
    }

    await onSaveGoal({
      ...selectedGoalDetail.goal,
      endDate: updatedEndDate,
      pauseRanges: [...existingRanges, newRange],
      updatedAt: new Date().toISOString(),
    });

    setShowPauseSection(false);
    setPauseReason('');
  };

  const handleRemovePauseRange = async (rangeId: string) => {
    if (!selectedGoalDetail) return;
    const updatedRanges = (selectedGoalDetail.goal.pauseRanges || []).filter(
      (r) => (r.id ? r.id !== rangeId : `${r.startDate}-${r.endDate}` !== rangeId)
    );
    await onSaveGoal({
      ...selectedGoalDetail.goal,
      pauseRanges: updatedRanges,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <View style={styles.outerContainer}>
      {/* Sticky Header with Title & Category Filter Chips */}
      <View style={styles.stickyHeader}>
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.headerTitle}>Goals</Text>
            <Text style={styles.headerSubtitle}>{goals.length} total goals tracked</Text>
          </View>

          <TouchableOpacity style={styles.addGoalBtn} onPress={() => setShowAddWizard(true)}>
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={styles.addGoalBtnText}>Add Goal</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.catChip, selectedCategory === cat && styles.catChipActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.catChipText, selectedCategory === cat && styles.catChipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: scrollPaddingBottom }]}>
        {/* CAREER QUICK LINKS ROW (Show when Career category selected or present) */}
        {isCareerActive && (
          <View style={styles.quickLinksContainer}>
            <View style={styles.quickLinksHeader}>
              <Text style={styles.quickLinksTitle}>💼 Career Quick Links</Text>
              <TouchableOpacity onPress={() => setShowAddLinkModal(true)}>
                <Text style={styles.addLinkText}>+ Add Link</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.linksRow}>
              {links.map((lk) => (
                <TouchableOpacity
                  key={lk.id}
                  style={styles.linkChip}
                  onPress={() => handleOpenLink(lk.url)}
                  onLongPress={() => {
                    Alert.alert('Remove Link', `Remove "${lk.name}"?`, [
                      { text: 'Cancel' },
                      { text: 'Remove', style: 'destructive', onPress: () => onDeleteLink(lk.id) },
                    ]);
                  }}
                >
                  <Ionicons name="open-outline" size={14} color={theme.colors.primary} />
                  <Text style={styles.linkChipText}>{lk.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Goal Cards List */}
        {filteredGoals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="flag-outline" size={40} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No goals in {selectedCategory === 'All' ? 'any category' : selectedCategory}.</Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setShowAddWizard(true)}>
              <Text style={styles.emptyAddBtnText}>+ Create Goal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredGoals.map(({ goal, progress, tasks }) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              progress={progress}
              tasks={tasks}
              compact={false}
              onLogValue={() => onLogGoalValue(goal.id, progress.current)}
              onApplyPaceSuggestion={onApplyPaceSuggestion}
              onPressDetail={() => setSelectedGoalId(goal.id)}
            />
          ))
        )}
      </ScrollView>

      {/* ADD GOAL WIZARD MODAL */}
      <AddGoalWizardModal
        visible={showAddWizard}
        onClose={() => setShowAddWizard(false)}
        onSave={onSaveGoal}
      />

      {/* GOAL DETAIL BOTTOM SHEET */}
      <BottomSheet
        visible={Boolean(selectedGoalDetail)}
        title={selectedGoalDetail?.goal.title || 'Goal Detail'}
        subtitle={`${selectedGoalDetail?.goal.category || ''} • ${selectedGoalDetail?.goal.type || ''}`}
        onClose={() => setSelectedGoalId(null)}
        footer={
          <TouchableOpacity style={styles.sheetDoneBtn} onPress={() => setSelectedGoalId(null)}>
            <Text style={styles.sheetDoneBtnText}>Done</Text>
          </TouchableOpacity>
        }
      >
        {selectedGoalDetail && (
          <View style={styles.detailContent}>
            {/* Full Goal Card Preview */}
            <GoalCard
              goal={selectedGoalDetail.goal}
              progress={selectedGoalDetail.progress}
              tasks={selectedGoalDetail.tasks}
              onApplyPaceSuggestion={onApplyPaceSuggestion}
            />

            {/* Pause Goal Date Range Management */}
            <View style={styles.detailSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.detailSectionTitle}>⏸️ Pause Dates (Travel / Rest)</Text>
                <TouchableOpacity onPress={() => setShowPauseSection(!showPauseSection)}>
                  <Text style={styles.actionToggleText}>{showPauseSection ? 'Cancel' : '+ Add Pause'}</Text>
                </TouchableOpacity>
              </View>

              {showPauseSection && (
                <View style={styles.pauseFormContainer}>
                  <View style={styles.formRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>From (YYYY-MM-DD)</Text>
                      <TextInput
                        style={styles.input}
                        value={pauseStart}
                        onChangeText={setPauseStart}
                        placeholder="2026-10-10"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>To (YYYY-MM-DD)</Text>
                      <TextInput
                        style={styles.input}
                        value={pauseEnd}
                        onChangeText={setPauseEnd}
                        placeholder="2026-10-15"
                      />
                    </View>
                  </View>

                  <Text style={[styles.fieldLabel, { marginTop: 8 }]}>Reason (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={pauseReason}
                    onChangeText={setPauseReason}
                    placeholder="e.g. Travel, Vacation, Sick"
                  />

                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Extend goal deadline by paused days</Text>
                    <Switch
                      value={extendDeadline}
                      onValueChange={setExtendDeadline}
                      trackColor={{ false: '#767577', true: theme.colors.primary }}
                    />
                  </View>

                  <TouchableOpacity style={styles.savePauseBtn} onPress={handleAddPauseRange}>
                    <Text style={styles.savePauseBtnText}>Confirm Pause Range</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Existing Pause Ranges */}
              {selectedGoalDetail.goal.pauseRanges && selectedGoalDetail.goal.pauseRanges.length > 0 ? (
                selectedGoalDetail.goal.pauseRanges.map((r, idx) => (
                  <View key={r.id || `${r.startDate}-${idx}`} style={styles.pauseRangeChip}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pauseRangeDates}>{r.startDate} → {r.endDate}</Text>
                      {r.reason && <Text style={styles.pauseRangeReason}>{r.reason}</Text>}
                    </View>
                    <TouchableOpacity onPress={() => handleRemovePauseRange(r.id || `${r.startDate}-${r.endDate}`)}>
                      <Ionicons name="close-circle" size={20} color={theme.colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <Text style={styles.emptySubtext}>No pause dates scheduled. Goal runs every active day.</Text>
              )}
            </View>

            {/* Tasks List inside Goal */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Goal Tasks</Text>
              {selectedGoalDetail.tasks.length === 0 ? (
                <Text style={styles.emptySubtext}>No tasks added to this goal yet.</Text>
              ) : (
                selectedGoalDetail.tasks.map((gt) => (
                  <View key={gt.id} style={styles.subtaskDetailRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subtaskDetailTitle}>{gt.title}</Text>
                      <Text style={styles.subtaskDetailMeta}>
                        {gt.kind} {gt.plannedAmount ? `(${gt.plannedAmount} ${gt.unit || ''})` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => onDeleteGoalTask(selectedGoalDetail.goal.id, gt.id)}>
                      <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))
              )}

              {/* Add Subtask Form */}
              <View style={styles.addSubtaskRow}>
                <TextInput
                  style={styles.addSubtaskInput}
                  placeholder="+ Add subtask to goal..."
                  placeholderTextColor={theme.colors.textMuted}
                  value={newSubtaskTitle}
                  onChangeText={setNewSubtaskTitle}
                />
                <TouchableOpacity style={styles.addSubtaskBtn} onPress={handleAddSubtaskToGoal}>
                  <Text style={styles.addSubtaskBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Delete Goal Button */}
            <TouchableOpacity
              style={styles.deleteGoalBtn}
              onPress={() => handleDeleteGoalConfirm(selectedGoalDetail.goal.id, selectedGoalDetail.goal.title)}
            >
              <Ionicons name="trash-outline" size={18} color="#FFF" />
              <Text style={styles.deleteGoalBtnText}>Delete Goal</Text>
            </TouchableOpacity>
          </View>
        )}
      </BottomSheet>

      {/* QUICK LINK BOTTOM SHEET */}
      <BottomSheet
        visible={showAddLinkModal}
        title="Add Quick Link"
        subtitle="Quick launcher for Career & Work links"
        onClose={() => setShowAddLinkModal(false)}
        footer={
          <View style={styles.sheetActionRow}>
            <TouchableOpacity style={styles.sheetCancelBtn} onPress={() => setShowAddLinkModal(false)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetSaveBtn} onPress={handleSaveQuickLink}>
              <Text style={styles.sheetSaveText}>Save Link</Text>
            </TouchableOpacity>
          </View>
        }
      >
        <View style={{ paddingVertical: 8 }}>
          <Text style={styles.fieldLabel}>Link Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. GitHub Dashboard"
            placeholderTextColor={theme.colors.textMuted}
            value={linkName}
            onChangeText={setLinkName}
          />

          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>URL</Text>
          <TextInput
            style={styles.input}
            placeholder="https://github.com/..."
            placeholderTextColor={theme.colors.textMuted}
            value={linkUrl}
            onChangeText={setLinkUrl}
            autoCapitalize="none"
          />
        </View>
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: theme.colors.background },
  stickyHeader: {
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 10,
  },
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerTitle: { ...theme.typography.titleLarge, color: theme.colors.text, fontWeight: '800' },
  headerSubtitle: { ...theme.typography.bodySmall, color: theme.colors.textSecondary },
  addGoalBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.primary, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  addGoalBtnText: { ...theme.typography.button, color: '#FFF', fontWeight: '700', fontSize: 13 },
  catScroll: { flexDirection: 'row' },
  catChip: { paddingHorizontal: 13, paddingVertical: 6, borderRadius: 16, backgroundColor: theme.colors.cardBackground, marginRight: 8, borderWidth: 1, borderColor: theme.colors.border },
  catChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  catChipText: { ...theme.typography.bodySmall, color: theme.colors.textSecondary, fontSize: 12 },
  catChipTextActive: { color: '#FFF', fontWeight: '600' },
  container: { padding: 16 },
  quickLinksContainer: { backgroundColor: theme.colors.cardBackground, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 16 },
  quickLinksHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  quickLinksTitle: { ...theme.typography.titleSmall, color: theme.colors.text, fontWeight: '700' },
  addLinkText: { ...theme.typography.caption, color: theme.colors.primary, fontWeight: '700' },
  linksRow: { flexDirection: 'row' },
  linkChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8 },
  linkChipText: { ...theme.typography.bodySmall, color: theme.colors.primary, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { ...theme.typography.bodyMedium, color: theme.colors.textMuted, fontStyle: 'italic', marginTop: 10, textAlign: 'center' },
  emptyAddBtn: { marginTop: 14, backgroundColor: theme.colors.primaryLight, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  emptyAddBtnText: { ...theme.typography.button, color: theme.colors.primary, fontWeight: '700' },
  detailContent: { paddingVertical: 4 },
  detailSection: { backgroundColor: theme.colors.cardBackground, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, marginTop: 14 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  detailSectionTitle: { ...theme.typography.titleSmall, color: theme.colors.text, fontWeight: '700' },
  actionToggleText: { ...theme.typography.caption, color: theme.colors.primary, fontWeight: '700' },
  emptySubtext: { ...theme.typography.caption, color: theme.colors.textMuted, fontStyle: 'italic', marginTop: 4 },
  pauseFormContainer: { backgroundColor: theme.colors.background, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, marginTop: 8, marginBottom: 8 },
  formRow: { flexDirection: 'row', gap: 10 },
  fieldLabel: { ...theme.typography.caption, color: theme.colors.textSecondary, fontWeight: '600', marginBottom: 4 },
  input: { backgroundColor: theme.colors.cardBackground, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, color: theme.colors.text, ...theme.typography.bodySmall },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  switchLabel: { ...theme.typography.bodySmall, color: theme.colors.text, flex: 1, marginRight: 10 },
  savePauseBtn: { backgroundColor: theme.colors.primary, paddingVertical: 9, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  savePauseBtnText: { ...theme.typography.button, color: '#FFF', fontWeight: '700', fontSize: 13 },
  pauseRangeChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.background, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, marginTop: 6 },
  pauseRangeDates: { ...theme.typography.bodySmall, color: theme.colors.text, fontWeight: '600' },
  pauseRangeReason: { ...theme.typography.caption, color: theme.colors.textSecondary },
  subtaskDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border + '40' },
  subtaskDetailTitle: { ...theme.typography.bodyMedium, color: theme.colors.text },
  subtaskDetailMeta: { ...theme.typography.caption, color: theme.colors.textSecondary },
  addSubtaskRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  addSubtaskInput: { flex: 1, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, color: theme.colors.text },
  addSubtaskBtn: { backgroundColor: theme.colors.primary, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 8 },
  addSubtaskBtnText: { ...theme.typography.caption, color: '#FFF', fontWeight: '700' },
  deleteGoalBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: theme.colors.danger, paddingVertical: 12, borderRadius: 10, marginTop: 16 },
  deleteGoalBtnText: { ...theme.typography.button, color: '#FFF', fontWeight: '700' },
  sheetDoneBtn: { backgroundColor: theme.colors.primary, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  sheetDoneBtnText: { ...theme.typography.button, color: '#FFF', fontWeight: '700' },
  sheetActionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  sheetCancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  sheetCancelText: { ...theme.typography.bodyMedium, color: theme.colors.textSecondary },
  sheetSaveBtn: { backgroundColor: theme.colors.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  sheetSaveText: { ...theme.typography.button, color: '#FFF', fontWeight: '700' },
});

