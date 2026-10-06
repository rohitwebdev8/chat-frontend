import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DailyLog, JobApplicationEntry, ApplicationStatus, TodoItem } from '@/types/tracker';
import {
  getTodayDateString,
  getDayNumber,
  createDefaultLog,
  loadAllLogs,
  saveDailyLog,
  formatLogForChat,
} from '@/services/tracker/trackerService';

interface Props {
  visible: boolean;
  onClose: () => void;
  onShareToChat?: (formattedMessage: string) => void;
}

type TabType = 'todos' | 'weight' | 'food' | 'study' | 'jobs' | 'notes';

export const DailyTrackerModal: React.FC<Props> = ({ visible, onClose, onShareToChat }) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>('todos');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [currentLog, setCurrentLog] = useState<DailyLog | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // New Job App Form State
  const [newCompany, setNewCompany] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newJobUrl, setNewJobUrl] = useState('');
  const [newAppStatus, setNewAppStatus] = useState<ApplicationStatus>('Applied');
  const [showAddJobForm, setShowAddJobForm] = useState(false);

  // Custom Todo Form State
  const [newTodoTitle, setNewTodoTitle] = useState('');

  // Load log data whenever modal becomes visible or date changes
  const loadDataForDate = useCallback(async (dateStr: string) => {
    setLoading(true);
    try {
      const logs = await loadAllLogs();
      if (logs[dateStr]) {
        setCurrentLog(logs[dateStr]);
      } else {
        const dayNum = await getDayNumber(dateStr);
        const defaultLog = createDefaultLog(dateStr, dayNum);
        setCurrentLog(defaultLog);
      }
    } catch (error) {
      console.error('Failed to load log:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadDataForDate(selectedDate);
    }
  }, [visible, selectedDate, loadDataForDate]);

  const handleSave = async (logToSave?: DailyLog) => {
    const target = logToSave || currentLog;
    if (!target) return;
    setSaving(true);
    try {
      const { updatedLog } = await saveDailyLog(target);
      setCurrentLog(updatedLog);
    } catch (error) {
      Alert.alert('Error', 'Failed to save daily log.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTodo = (todoId: string) => {
    if (!currentLog) return;
    const updatedTodos = currentLog.todos.map((t) =>
      t.id === todoId ? { ...t, completed: !t.completed } : t
    );
    const updated = { ...currentLog, todos: updatedTodos };
    // Recalculate %
    const total = updatedTodos.length;
    const done = updatedTodos.filter((t) => t.completed).length;
    updated.dailyCompletionPct = total > 0 ? Math.round((done / total) * 100) : 0;
    setCurrentLog(updated);
    handleSave(updated);
  };

  const handleAddCustomTodo = () => {
    if (!newTodoTitle.trim() || !currentLog) return;
    const newTodo: TodoItem = {
      id: `${currentLog.date}-custom-${Date.now()}`,
      title: newTodoTitle.trim(),
      category: 'general',
      completed: false,
    };
    const updated = {
      ...currentLog,
      todos: [...currentLog.todos, newTodo],
    };
    setCurrentLog(updated);
    setNewTodoTitle('');
    handleSave(updated);
  };

  const handleAddJobApplication = () => {
    if (!newCompany.trim() || !newPosition.trim() || !currentLog) {
      Alert.alert('Required Fields', 'Please enter Company name and Position.');
      return;
    }
    const newApp: JobApplicationEntry = {
      id: `job-${Date.now()}`,
      company: newCompany.trim(),
      position: newPosition.trim(),
      location: newLocation.trim() || 'Remote',
      jobUrl: newJobUrl.trim(),
      status: newAppStatus,
      appliedDate: currentLog.date,
    };

    const updatedApps = [...currentLog.jobApplications, newApp];
    const updated = { ...currentLog, jobApplications: updatedApps };

    // Auto-mark job app todo as done
    const updatedTodos = updated.todos.map(t =>
      t.category === 'job' ? { ...t, completed: true } : t
    );
    updated.todos = updatedTodos;

    setCurrentLog(updated);
    setNewCompany('');
    setNewPosition('');
    setNewLocation('');
    setNewJobUrl('');
    setShowAddJobForm(false);
    handleSave(updated);
  };

  const handleDeleteJobApp = (id: string) => {
    if (!currentLog) return;
    const updatedApps = currentLog.jobApplications.filter((j) => j.id !== id);
    const updated = { ...currentLog, jobApplications: updatedApps };
    setCurrentLog(updated);
    handleSave(updated);
  };

  const handleShareLog = () => {
    if (!currentLog) return;
    const formatted = formatLogForChat(currentLog);
    if (onShareToChat) {
      onShareToChat(formatted);
      onClose();
    } else {
      Alert.alert('Daily Log Summary', formatted);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>📊 Daily Habit & Life Tracker</Text>
            <Text style={styles.headerSubtitle}>
              Day #{currentLog?.dayNumber ?? 1} • {currentLog?.dayOfWeek ?? ''} ({selectedDate})
            </Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Progress & Quick Stats Card */}
        {currentLog && (
          <View style={styles.progressCard}>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>Daily Completion Goal</Text>
              <Text style={styles.progressPercent}>{currentLog.dailyCompletionPct}%</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(100, currentLog.dailyCompletionPct)}%` },
                ]}
              />
            </View>
            <View style={styles.quickMetricsRow}>
              <View style={styles.quickMetricItem}>
                <Text style={styles.quickMetricVal}>
                  {currentLog.weight ? `${currentLog.weight}kg` : '--'}
                </Text>
                <Text style={styles.quickMetricLbl}>Weight</Text>
              </View>
              <View style={styles.quickMetricDivider} />
              <View style={styles.quickMetricItem}>
                <Text style={styles.quickMetricVal}>{currentLog.steps.toLocaleString()}</Text>
                <Text style={styles.quickMetricLbl}>Steps</Text>
              </View>
              <View style={styles.quickMetricDivider} />
              <View style={styles.quickMetricItem}>
                <Text style={styles.quickMetricVal}>{currentLog.jobApplications.length}</Text>
                <Text style={styles.quickMetricLbl}>Job Apps</Text>
              </View>
              <View style={styles.quickMetricDivider} />
              <View style={styles.quickMetricItem}>
                <Text style={styles.quickMetricVal}>
                  {currentLog.dsaQuestions} Q / {currentLog.reactHours + currentLog.backendHours}h
                </Text>
                <Text style={styles.quickMetricLbl}>Study</Text>
              </View>
            </View>
          </View>
        )}

        {/* Navigation Tabs */}
        <View style={styles.tabBarWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'todos' && styles.tabItemActive]}
              onPress={() => setActiveTab('todos')}
            >
              <Text style={[styles.tabText, activeTab === 'todos' && styles.tabTextActive]}>
                📌 Checklist ({currentLog?.todos.filter((t) => t.completed).length ?? 0}/{currentLog?.todos.length ?? 0})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'weight' && styles.tabItemActive]}
              onPress={() => setActiveTab('weight')}
            >
              <Text style={[styles.tabText, activeTab === 'weight' && styles.tabTextActive]}>
                ⚖️ Weight & Health
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'food' && styles.tabItemActive]}
              onPress={() => setActiveTab('food')}
            >
              <Text style={[styles.tabText, activeTab === 'food' && styles.tabTextActive]}>
                🥗 Food Intake
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'study' && styles.tabItemActive]}
              onPress={() => setActiveTab('study')}
            >
              <Text style={[styles.tabText, activeTab === 'study' && styles.tabTextActive]}>
                📚 Study & DSA
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'jobs' && styles.tabItemActive]}
              onPress={() => setActiveTab('jobs')}
            >
              <Text style={[styles.tabText, activeTab === 'jobs' && styles.tabTextActive]}>
                💼 Job Apps ({currentLog?.jobApplications.length ?? 0})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'notes' && styles.tabItemActive]}
              onPress={() => setActiveTab('notes')}
            >
              <Text style={[styles.tabText, activeTab === 'notes' && styles.tabTextActive]}>
                📝 Reflection & Notes
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Main Content Area */}
        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading Daily Log...</Text>
          </View>
        ) : currentLog ? (
          <ScrollView style={styles.contentScrollView} contentContainerStyle={styles.contentContainer}>
            {/* TAB 1: TODOS CHECKLIST */}
            {activeTab === 'todos' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Daily Priority Checklist</Text>
                <Text style={styles.sectionSubtitle}>
                  Check off items to increase your daily completion score!
                </Text>

                {currentLog.todos.map((todo) => (
                  <TouchableOpacity
                    key={todo.id}
                    style={styles.todoRow}
                    activeOpacity={0.7}
                    onPress={() => handleToggleTodo(todo.id)}
                  >
                    <View style={[styles.checkbox, todo.completed && styles.checkboxChecked]}>
                      {todo.completed && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={[styles.todoText, todo.completed && styles.todoTextDone]}>
                      {todo.title}
                    </Text>
                  </TouchableOpacity>
                ))}

                {/* Add Custom Todo */}
                <View style={styles.addTodoBox}>
                  <TextInput
                    style={styles.inputField}
                    placeholder="Add custom todo item..."
                    value={newTodoTitle}
                    onChangeText={setNewTodoTitle}
                  />
                  <TouchableOpacity style={styles.addBtn} onPress={handleAddCustomTodo}>
                    <Text style={styles.addBtnText}>+ Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* TAB 2: WEIGHT & HEALTH */}
            {activeTab === 'weight' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Physical Health & Weight Loss</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Current Weight (kg)</Text>
                  <TextInput
                    style={styles.inputField}
                    keyboardType="decimal-pad"
                    placeholder="e.g. 74.5"
                    value={currentLog.weight !== null ? String(currentLog.weight) : ''}
                    onChangeText={(val) => {
                      const num = parseFloat(val);
                      setCurrentLog({
                        ...currentLog,
                        weight: isNaN(num) ? null : num,
                      });
                    }}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Target Weight Goal (kg)</Text>
                  <TextInput
                    style={styles.inputField}
                    keyboardType="decimal-pad"
                    placeholder="e.g. 70.0"
                    value={currentLog.targetWeight !== null ? String(currentLog.targetWeight) : ''}
                    onChangeText={(val) => {
                      const num = parseFloat(val);
                      setCurrentLog({
                        ...currentLog,
                        targetWeight: isNaN(num) ? null : num,
                      });
                    }}
                  />
                </View>

                {/* Moving Averages display */}
                <View style={styles.movingAvgBox}>
                  <Text style={styles.movingAvgTitle}>Weight Moving Averages</Text>
                  <View style={styles.movingAvgGrid}>
                    <View style={styles.movingAvgCard}>
                      <Text style={styles.movingAvgVal}>
                        {currentLog.movingAvg7d ? `${currentLog.movingAvg7d} kg` : '--'}
                      </Text>
                      <Text style={styles.movingAvgLbl}>7-Day Avg</Text>
                    </View>
                    <View style={styles.movingAvgCard}>
                      <Text style={styles.movingAvgVal}>
                        {currentLog.movingAvg14d ? `${currentLog.movingAvg14d} kg` : '--'}
                      </Text>
                      <Text style={styles.movingAvgLbl}>14-Day Avg</Text>
                    </View>
                    <View style={styles.movingAvgCard}>
                      <Text style={styles.movingAvgVal}>
                        {currentLog.movingAvg30d ? `${currentLog.movingAvg30d} kg` : '--'}
                      </Text>
                      <Text style={styles.movingAvgLbl}>30-Day Avg</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Steps Taken Today</Text>
                  <TextInput
                    style={styles.inputField}
                    keyboardType="number-pad"
                    placeholder="e.g. 8500"
                    value={String(currentLog.steps || '')}
                    onChangeText={(val) => {
                      const num = parseInt(val, 10);
                      setCurrentLog({
                        ...currentLog,
                        steps: isNaN(num) ? 0 : num,
                      });
                    }}
                  />
                </View>

                {/* Workout Switches */}
                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Workouts Completed</Text>

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>🏋️ Daily Workout Session</Text>
                  <Switch
                    value={currentLog.workoutDone}
                    onValueChange={(val) =>
                      setCurrentLog({ ...currentLog, workoutDone: val })
                    }
                  />
                </View>

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>💪 Gym Session</Text>
                  <Switch
                    value={currentLog.gymDone}
                    onValueChange={(val) => setCurrentLog({ ...currentLog, gymDone: val })}
                  />
                </View>

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>🏊 Swimming Session</Text>
                  <Switch
                    value={currentLog.swimmingDone}
                    onValueChange={(val) =>
                      setCurrentLog({ ...currentLog, swimmingDone: val })
                    }
                  />
                </View>
              </View>
            )}

            {/* TAB 3: FOOD INTAKE */}
            {activeTab === 'food' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Food & Drink Intake Log</Text>

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>🍔 Had Junk / Processed Food?</Text>
                  <Switch
                    value={currentLog.hadJunkFood}
                    onValueChange={(val) =>
                      setCurrentLog({ ...currentLog, hadJunkFood: val })
                    }
                  />
                </View>

                {currentLog.hadJunkFood && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Junk Food Details</Text>
                    <TextInput
                      style={styles.inputField}
                      placeholder="e.g. 1 slice pizza, soda..."
                      value={currentLog.junkFoodDetails}
                      onChangeText={(val) =>
                        setCurrentLog({ ...currentLog, junkFoodDetails: val })
                      }
                    />
                  </View>
                )}

                <View style={styles.counterRow}>
                  <View style={styles.counterInfo}>
                    <Text style={styles.counterTitle}>🫖 Tea Consumed</Text>
                    <Text style={styles.counterValue}>{currentLog.teaConsumed} Cups</Text>
                  </View>
                  <View style={styles.counterBtns}>
                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={() =>
                        setCurrentLog({
                          ...currentLog,
                          teaConsumed: Math.max(0, currentLog.teaConsumed - 1),
                        })
                      }
                    >
                      <Text style={styles.counterBtnText}>-</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={() =>
                        setCurrentLog({
                          ...currentLog,
                          teaConsumed: currentLog.teaConsumed + 1,
                        })
                      }
                    >
                      <Text style={styles.counterBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.counterRow}>
                  <View style={styles.counterInfo}>
                    <Text style={styles.counterTitle}>☕ Black Coffee Consumed</Text>
                    <Text style={styles.counterValue}>
                      {currentLog.blackCoffeeConsumed} Cups
                    </Text>
                  </View>
                  <View style={styles.counterBtns}>
                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={() =>
                        setCurrentLog({
                          ...currentLog,
                          blackCoffeeConsumed: Math.max(
                            0,
                            currentLog.blackCoffeeConsumed - 1
                          ),
                        })
                      }
                    >
                      <Text style={styles.counterBtnText}>-</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={() =>
                        setCurrentLog({
                          ...currentLog,
                          blackCoffeeConsumed: currentLog.blackCoffeeConsumed + 1,
                        })
                      }
                    >
                      <Text style={styles.counterBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* TAB 4: STUDY & DSA */}
            {activeTab === 'study' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Study & Tech Prep Tracker</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>DSA Questions Solved Today</Text>
                  <TextInput
                    style={styles.inputField}
                    keyboardType="number-pad"
                    placeholder="e.g. 3"
                    value={String(currentLog.dsaQuestions || '')}
                    onChangeText={(val) => {
                      const num = parseInt(val, 10);
                      setCurrentLog({
                        ...currentLog,
                        dsaQuestions: isNaN(num) ? 0 : num,
                      });
                    }}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>React / Frontend Hours</Text>
                  <TextInput
                    style={styles.inputField}
                    keyboardType="decimal-pad"
                    placeholder="e.g. 2.5"
                    value={String(currentLog.reactHours || '')}
                    onChangeText={(val) => {
                      const num = parseFloat(val);
                      setCurrentLog({
                        ...currentLog,
                        reactHours: isNaN(num) ? 0 : num,
                      });
                    }}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Backend / Node.js Hours</Text>
                  <TextInput
                    style={styles.inputField}
                    keyboardType="decimal-pad"
                    placeholder="e.g. 2.0"
                    value={String(currentLog.backendHours || '')}
                    onChangeText={(val) => {
                      const num = parseFloat(val);
                      setCurrentLog({
                        ...currentLog,
                        backendHours: isNaN(num) ? 0 : num,
                      });
                    }}
                  />
                </View>
              </View>
            )}

            {/* TAB 5: JOB APPLICATIONS */}
            {activeTab === 'jobs' && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Job Applications Sent</Text>
                  <TouchableOpacity
                    style={styles.smallAddBtn}
                    onPress={() => setShowAddJobForm(!showAddJobForm)}
                  >
                    <Text style={styles.smallAddBtnText}>
                      {showAddJobForm ? 'Cancel' : '+ Add Job'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {showAddJobForm && (
                  <View style={styles.addJobCard}>
                    <Text style={styles.addJobTitle}>Log New Application</Text>
                    <TextInput
                      style={styles.inputField}
                      placeholder="Company Name (e.g. Google)"
                      value={newCompany}
                      onChangeText={setNewCompany}
                    />
                    <TextInput
                      style={[styles.inputField, { marginTop: 8 }]}
                      placeholder="Position (e.g. Full Stack Developer)"
                      value={newPosition}
                      onChangeText={setNewPosition}
                    />
                    <TextInput
                      style={[styles.inputField, { marginTop: 8 }]}
                      placeholder="Location (e.g. Remote / Bangalore)"
                      value={newLocation}
                      onChangeText={setNewLocation}
                    />
                    <TextInput
                      style={[styles.inputField, { marginTop: 8 }]}
                      placeholder="Job URL (optional)"
                      value={newJobUrl}
                      onChangeText={setNewJobUrl}
                    />

                    {/* Status Pill Selector */}
                    <Text style={[styles.inputLabel, { marginTop: 8 }]}>Status</Text>
                    <View style={styles.statusPillsRow}>
                      {(['Applied', 'Interview', 'Offer', 'Rejected'] as ApplicationStatus[]).map(
                        (st) => (
                          <TouchableOpacity
                            key={st}
                            style={[
                              styles.statusPill,
                              newAppStatus === st && styles.statusPillActive,
                            ]}
                            onPress={() => setNewAppStatus(st)}
                          >
                            <Text
                              style={[
                                styles.statusPillText,
                                newAppStatus === st && styles.statusPillTextActive,
                              ]}
                            >
                              {st}
                            </Text>
                          </TouchableOpacity>
                        )
                      )}
                    </View>

                    <TouchableOpacity
                      style={styles.submitJobBtn}
                      onPress={handleAddJobApplication}
                    >
                      <Text style={styles.submitJobBtnText}>Save Application</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* List of Applications */}
                {currentLog.jobApplications.length === 0 ? (
                  <Text style={styles.emptyText}>
                    No job applications logged for today yet. Tap "+ Add Job" above!
                  </Text>
                ) : (
                  currentLog.jobApplications.map((app) => (
                    <View key={app.id} style={styles.jobItemCard}>
                      <View style={styles.jobItemHeader}>
                        <Text style={styles.jobCompany}>{app.company}</Text>
                        <View style={styles.jobStatusBadge}>
                          <Text style={styles.jobStatusText}>{app.status}</Text>
                        </View>
                      </View>
                      <Text style={styles.jobPosition}>{app.position}</Text>
                      <Text style={styles.jobMeta}>
                        📍 {app.location} {app.jobUrl ? `• 🔗 ${app.jobUrl}` : ''}
                      </Text>
                      <TouchableOpacity
                        style={styles.deleteJobBtn}
                        onPress={() => handleDeleteJobApp(app.id)}
                      >
                        <Text style={styles.deleteJobText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* TAB 6: NOTES & REFLECTION */}
            {activeTab === 'notes' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Daily Reflection & Notes</Text>
                <TextInput
                  style={[styles.inputField, styles.textArea]}
                  multiline
                  numberOfLines={4}
                  placeholder="Record your achievements, learnings, or reflections for today..."
                  value={currentLog.notes}
                  onChangeText={(val) => setCurrentLog({ ...currentLog, notes: val })}
                />
              </View>
            )}
          </ScrollView>
        ) : null}

        {/* Footer Action Buttons */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleShareLog}
            activeOpacity={0.8}
          >
            <Text style={styles.shareBtnText}>📤 Share Log to Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={() => {
              handleSave();
              onClose();
            }}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Save & Close</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212529',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6C757D',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F3F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
  },
  progressCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#343A40',
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#E9ECEF',
    borderRadius: 4,
    marginVertical: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  quickMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F5',
  },
  quickMetricItem: {
    alignItems: 'center',
  },
  quickMetricVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#212529',
  },
  quickMetricLbl: {
    fontSize: 11,
    color: '#868E96',
    marginTop: 2,
  },
  quickMetricDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E9ECEF',
  },
  tabBarWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    marginTop: 10,
  },
  tabBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F3F5',
    marginRight: 4,
  },
  tabItemActive: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  contentScrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#6C757D',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#868E96',
    marginBottom: 14,
  },
  todoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ADB5BD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  todoText: {
    fontSize: 14,
    color: '#343A40',
    flex: 1,
  },
  todoTextDone: {
    textDecorationLine: 'line-through',
    color: '#ADB5BD',
  },
  addTodoBox: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 8,
  },
  inputField: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#212529',
    flex: 1,
  },
  addBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 6,
  },
  movingAvgBox: {
    backgroundColor: '#EBF5FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  movingAvgTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0055B3',
    marginBottom: 8,
  },
  movingAvgGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  movingAvgCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 3,
  },
  movingAvgVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0055B3',
  },
  movingAvgLbl: {
    fontSize: 10,
    color: '#6C757D',
    marginTop: 2,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  switchLabel: {
    fontSize: 14,
    color: '#343A40',
    fontWeight: '500',
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  counterInfo: {},
  counterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#343A40',
  },
  counterValue: {
    fontSize: 12,
    color: '#6C757D',
    marginTop: 2,
  },
  counterBtns: {
    flexDirection: 'row',
    gap: 10,
  },
  counterBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F3F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
  },
  smallAddBtn: {
    backgroundColor: '#E7F5FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  smallAddBtnText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 12,
  },
  addJobCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DEE2E6',
  },
  addJobTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#343A40',
    marginBottom: 10,
  },
  statusPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#E9ECEF',
  },
  statusPillActive: {
    backgroundColor: '#007AFF',
  },
  statusPillText: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '500',
  },
  statusPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  submitJobBtn: {
    backgroundColor: '#28A745',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  submitJobBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  jobItemCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  jobItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobCompany: {
    fontSize: 15,
    fontWeight: '700',
    color: '#212529',
  },
  jobStatusBadge: {
    backgroundColor: '#D0EBFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  jobStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1864AB',
  },
  jobPosition: {
    fontSize: 13,
    color: '#495057',
    marginTop: 2,
    fontWeight: '500',
  },
  jobMeta: {
    fontSize: 11,
    color: '#868E96',
    marginTop: 4,
  },
  deleteJobBtn: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  deleteJobText: {
    fontSize: 11,
    color: '#FA5252',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 13,
    color: '#868E96',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 20,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    gap: 12,
  },
  shareBtn: {
    flex: 1,
    backgroundColor: '#E7F5FF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtnText: {
    color: '#007AFF',
    fontWeight: '700',
    fontSize: 14,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
