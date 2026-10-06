import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Goal, GoalCalculatedProgress } from '@/types/goals';
import { GoalTask } from '@/types/tasks';
import { formatIndianNumber } from '@/lib/goals/computeGoalProgress';
import theme from '@/constants/theme';

interface GoalCardProps {
  goal: Goal;
  progress: GoalCalculatedProgress;
  tasks?: GoalTask[];
  onLogValue?: (goalId: string) => void;
  onApplyPaceSuggestion?: (goalId: string, taskId: string, suggestedAmount: number) => void;
  onToggleTask?: (taskId: string, amount?: number) => void;
  onSkipTask?: (taskId: string) => void;
  onPressDetail?: (goal: Goal) => void;
  todayLogDone?: Record<string, boolean | number>;
  todayLogSkipped?: Record<string, boolean>;
  compact?: boolean;
  initiallyCollapsed?: boolean;
}

export const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  progress,
  tasks = [],
  onLogValue,
  onApplyPaceSuggestion,
  onToggleTask,
  onSkipTask,
  onPressDetail,
  todayLogDone = {},
  todayLogSkipped = {},
  compact = false,
  initiallyCollapsed = false,
}) => {
  const [expanded, setExpanded] = useState(!initiallyCollapsed);

  const isCurrency = goal.unit === '₹' || goal.category === 'Finance';
  const formattedCurrent = formatIndianNumber(progress.current, { isCurrency, unit: goal.unit });
  const formattedTarget = formatIndianNumber(progress.targetValue, { isCurrency, unit: goal.unit });

  const hasOnlyOneTask = tasks.length === 1;
  const singleTask = hasOnlyOneTask ? tasks[0] : null;
  const singleTaskDone = singleTask ? Boolean(todayLogDone[singleTask.id]) : false;

  // Render Collapsed Row for Today View
  if (compact && !expanded) {
    return (
      <View style={styles.collapsedCard}>
        <TouchableOpacity
          style={styles.collapsedLeftTouch}
          onPress={() => setExpanded(true)}
          activeOpacity={0.7}
        >
          {/* Status Dot / Category */}
          <View style={[styles.categoryDot, { backgroundColor: progress.statusColor }]} />

          <View style={styles.collapsedInfo}>
            <View style={styles.collapsedTitleRow}>
              <Text style={styles.collapsedTitle} numberOfLines={1}>
                {goal.title}
              </Text>
              {progress.isFuture && (
                <View style={styles.futureBadge}>
                  <Text style={styles.futureBadgeText}>Starts {goal.startDate}</Text>
                </View>
              )}
              {progress.isOffDayToday && (
                <View style={styles.offDayBadge}>
                  <Text style={styles.offDayBadgeText}>Off Day</Text>
                </View>
              )}
            </View>

            {/* Mini Progress Bar + Ratio */}
            <View style={styles.collapsedProgressRow}>
              <View style={styles.miniBarTrack}>
                <View
                  style={[
                    styles.miniBarFill,
                    { width: `${Math.min(100, Math.max(0, progress.valuePct))}%`, backgroundColor: progress.statusColor },
                  ]}
                />
              </View>
              <Text style={styles.collapsedRatioText}>
                {progress.todayDoneCount}/{progress.todayDueCount} today · {progress.valuePct}%
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Quick-Tick for single task goal or Expand Arrow */}
        {hasOnlyOneTask && singleTask && !progress.isFuture && !progress.isOffDayToday ? (
          <TouchableOpacity
            style={styles.quickTickBtn}
            onPress={() => onToggleTask && onToggleTask(singleTask.id, singleTask.plannedAmount)}
          >
            <Ionicons
              name={singleTaskDone ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={singleTaskDone ? theme.colors.success : theme.colors.textMuted}
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.expandArrowBtn} onPress={() => setExpanded(true)}>
            <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Full / Expanded Goal Card
  return (
    <View style={styles.card}>
      {/* Category Badge & Status / Collapse Button */}
      <View style={styles.topRow}>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{goal.category}</Text>
          </View>

          {progress.isFuture ? (
            <View style={styles.futureBadge}>
              <Text style={styles.futureBadgeText}>Starts {goal.startDate}</Text>
            </View>
          ) : progress.isOffDayToday ? (
            <View style={styles.offDayBadge}>
              <Text style={styles.offDayBadgeText}>Off Day Today</Text>
            </View>
          ) : progress.isPausedToday ? (
            <View style={styles.pausedBadge}>
              <Text style={styles.pausedBadgeText}>Paused</Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, { backgroundColor: progress.statusColor + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: progress.statusColor }]} />
              <Text style={[styles.statusText, { color: progress.statusColor }]}>{progress.status}</Text>
            </View>
          )}
        </View>

        <View style={styles.topActionsRow}>
          {compact && (
            <TouchableOpacity style={styles.collapseIconBtn} onPress={() => setExpanded(false)}>
              <Ionicons name="chevron-up" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
          {onPressDetail && (
            <TouchableOpacity style={styles.detailIconBtn} onPress={() => onPressDetail(goal)}>
              <Ionicons name="ellipsis-horizontal" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Goal Title */}
      <Text style={styles.title}>{goal.title}</Text>

      {/* Goal Progress Text */}
      <View style={styles.valRow}>
        <Text style={styles.valText}>
          {formattedCurrent} / <Text style={styles.targetText}>{formattedTarget}</Text>
        </Text>
        <Text style={styles.pctText}>{progress.valuePct}%</Text>
      </View>

      {/* BAR 1: Goal Progress Bar with Timeline Marker (active days basis) */}
      <View style={styles.barContainer}>
        <View
          style={[
            styles.barFill,
            {
              width: `${Math.min(100, Math.max(0, progress.valuePct))}%`,
              backgroundColor: progress.statusColor,
            },
          ]}
        />
        {!progress.isFuture && (
          <View
            style={[
              styles.timelineMarker,
              { left: `${Math.min(98, Math.max(2, progress.timePct))}%` },
            ]}
          />
        )}
      </View>

      <View style={styles.timeInfoRow}>
        <Text style={styles.timeInfoText}>
          {progress.isFuture
            ? `Starts in ${progress.startsInDays} days`
            : `Timeline: ${progress.timePct}% active elapsed`}
        </Text>
        {progress.streakCurrent > 0 && !progress.isFuture && (
          <Text style={styles.streakText}>🔥 {progress.streakCurrent} day streak</Text>
        )}
      </View>

      {/* BAR 2: Task Consistency Bar */}
      {!progress.isFuture && (
        <View style={styles.consistencySection}>
          <View style={styles.consistencyHeader}>
            <Text style={styles.consistencyLabel}>Task Consistency (7d active)</Text>
            <Text style={styles.consistencyPct}>
              {progress.consistencyLast7DaysPct}% ({progress.todayDoneCount}/{progress.todayDueCount} today)
            </Text>
          </View>
          <View style={styles.barContainerSmall}>
            <View
              style={[
                styles.barFillSmall,
                { width: `${Math.min(100, progress.consistencyLast7DaysPct)}%` },
              ]}
            />
          </View>
        </View>
      )}

      {/* Pace Message & One-Tap Catch-up Suggestion */}
      {progress.message ? (
        <View style={styles.paceContainer}>
          <Text style={styles.paceText}>{progress.message}</Text>
          {progress.paceSuggestion && onApplyPaceSuggestion && (
            <TouchableOpacity
              style={styles.suggestionBtn}
              onPress={() =>
                progress.paceSuggestion?.taskId &&
                onApplyPaceSuggestion(goal.id, progress.paceSuggestion.taskId, progress.paceSuggestion.suggestedAmount)
              }
            >
              <Ionicons name="sparkles" size={14} color="#FFF" />
              <Text style={styles.suggestionBtnText}>{progress.paceSuggestion.text}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {/* Today Subtasks List Inline */}
      {compact && tasks.length > 0 && (
        <View style={styles.tasksSection}>
          {tasks.map((t) => {
            const isDone = Boolean(todayLogDone[t.id]);
            const isSkipped = Boolean(todayLogSkipped[t.id]);

            return (
              <View key={t.id} style={[styles.subtaskRow, isSkipped && styles.subtaskRowSkipped]}>
                <TouchableOpacity
                  style={styles.checkboxTouch}
                  onPress={() => !isSkipped && onToggleTask && onToggleTask(t.id)}
                  disabled={isSkipped}
                >
                  <Ionicons
                    name={isSkipped ? 'remove-circle-outline' : isDone ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={isSkipped ? theme.colors.textMuted : isDone ? theme.colors.primary : theme.colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.subtaskTitle,
                      isDone && styles.subtaskTitleDone,
                      isSkipped && styles.subtaskTitleSkipped,
                    ]}
                  >
                    {t.title} {isSkipped ? '(Skipped today)' : ''}
                  </Text>
                </TouchableOpacity>

                <View style={styles.subtaskRightActions}>
                  {t.kind === 'amount' && !isSkipped && (
                    <TouchableOpacity
                      style={styles.amountBadge}
                      onPress={() => onToggleTask && onToggleTask(t.id, t.plannedAmount)}
                    >
                      <Text style={styles.amountBadgeText}>
                        {typeof todayLogDone[t.id] === 'number' ? todayLogDone[t.id] : t.plannedAmount} {t.unit || goal.unit || ''}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {onSkipTask && (
                    <TouchableOpacity
                      style={styles.skipBtn}
                      onPress={() => onSkipTask(t.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name={isSkipped ? 'arrow-undo-outline' : 'play-skip-forward-outline'}
                        size={16}
                        color={theme.colors.textMuted}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Log value button for Reach Number or Limit goal */}
      {(goal.type === 'reach_number' || goal.type === 'limit') && onLogValue && !progress.isFuture && (
        <TouchableOpacity style={styles.logValBtn} onPress={() => onLogValue(goal.id)}>
          <Ionicons name="add-circle-outline" size={16} color={theme.colors.primary} />
          <Text style={styles.logValBtnText}>
            Log {goal.type === 'reach_number' ? "today's value" : 'expense/entry'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  collapsedCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collapsedLeftTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  collapsedInfo: {
    flex: 1,
  },
  collapsedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  collapsedTitle: {
    ...theme.typography.titleSmall,
    color: theme.colors.text,
    fontWeight: '700',
    flexShrink: 1,
  },
  collapsedProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  miniBarTrack: {
    width: 60,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  collapsedRatioText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  quickTickBtn: {
    padding: 4,
  },
  expandArrowBtn: {
    padding: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  collapseIconBtn: {
    padding: 4,
  },
  detailIconBtn: {
    padding: 4,
  },
  badge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  futureBadge: {
    backgroundColor: theme.colors.surfaceSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  futureBadgeText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  offDayBadge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  offDayBadgeText: {
    ...theme.typography.caption,
    color: '#F97316',
    fontWeight: '700',
  },
  pausedBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pausedBadgeText: {
    ...theme.typography.caption,
    color: '#D97706',
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...theme.typography.caption,
    fontWeight: '600',
  },
  title: {
    ...theme.typography.titleMedium,
    color: theme.colors.text,
    fontWeight: '700',
    marginTop: 8,
  },
  valRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  valText: {
    ...theme.typography.titleSmall,
    color: theme.colors.text,
    fontWeight: '700',
  },
  targetText: {
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  pctText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  barContainer: {
    height: 10,
    backgroundColor: theme.colors.border,
    borderRadius: 5,
    marginTop: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
  timelineMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#0F172A',
    opacity: 0.7,
  },
  timeInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeInfoText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  streakText: {
    ...theme.typography.caption,
    color: '#F59E0B',
    fontWeight: '600',
  },
  consistencySection: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border + '60',
  },
  consistencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  consistencyLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  consistencyPct: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: '600',
  },
  barContainerSmall: {
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    marginTop: 4,
    overflow: 'hidden',
  },
  barFillSmall: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  paceContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    gap: 6,
  },
  paceText: {
    ...theme.typography.bodySmall,
    color: theme.colors.text,
    fontWeight: '500',
  },
  suggestionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  suggestionBtnText: {
    ...theme.typography.caption,
    color: '#FFF',
    fontWeight: '700',
  },
  tasksSection: {
    marginTop: 12,
    gap: 8,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  subtaskRowSkipped: {
    opacity: 0.5,
  },
  checkboxTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  subtaskTitle: {
    ...theme.typography.bodySmall,
    color: theme.colors.text,
  },
  subtaskTitleDone: {
    textDecorationLine: 'line-through',
    color: theme.colors.textMuted,
  },
  subtaskTitleSkipped: {
    fontStyle: 'italic',
    color: theme.colors.textMuted,
  },
  subtaskRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  amountBadge: {
    backgroundColor: theme.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  amountBadgeText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  skipBtn: {
    padding: 4,
  },
  logValBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 6,
  },
  logValBtnText: {
    ...theme.typography.bodySmall,
    color: theme.colors.primary,
    fontWeight: '600',
  },
});
