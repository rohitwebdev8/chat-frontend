import { DailyLog } from '@/types/tracker';
import { DailySnapshot, TaskSnapshotItem, TaskStatus } from '@/types/calendar';

/**
 * Calculates a complete Daily Snapshot with weighted completion % and partial credit for numeric targets.
 */
export function calculateDailySnapshot(
  dateStr: string,
  log: DailyLog | undefined,
  dayNumber: number = 1
): DailySnapshot {
  if (!log) {
    return {
      date: dateStr,
      dayOfWeek: getDayOfWeek(dateStr),
      dayNumber,
      completionPercent: 0,
      tasksDone: 0,
      tasksTotal: 0,
      tasks: [],
      weight: null,
      isFrozen: false,
    };
  }

  const taskItems: TaskSnapshotItem[] = [];

  // 1. Steps Task (Partial credit supported!)
  const stepsVal = log.steps || 0;
  const stepsTarget = 10000;
  const stepsRatio = Math.min(1.0, stepsVal / stepsTarget);
  let stepsStatus: TaskStatus = 'missed';
  if (stepsRatio >= 1.0) stepsStatus = 'done';
  else if (stepsRatio >= 0.3) stepsStatus = 'partial';

  taskItems.push({
    taskId: `${dateStr}-steps`,
    title: 'Hit 10,000 Steps Goal',
    category: 'Fitness',
    status: stepsStatus,
    actualValue: stepsVal,
    targetValue: stepsTarget,
    unit: 'steps',
    weight: 1.5,
  });

  // 2. Workout Session
  const workoutDone = log.workoutDone || log.gymDone || log.swimmingDone;
  taskItems.push({
    taskId: `${dateStr}-workout`,
    title: 'Daily Workout / Gym / Swim Session',
    category: 'Fitness',
    status: workoutDone ? 'done' : 'missed',
    actualValue: workoutDone ? 1 : 0,
    targetValue: 1,
    unit: 'session',
    weight: 2.0,
  });

  // 3. DSA Questions
  const dsaVal = log.dsaQuestions || 0;
  const dsaTarget = 2;
  const dsaRatio = Math.min(1.0, dsaVal / dsaTarget);
  let dsaStatus: TaskStatus = 'missed';
  if (dsaRatio >= 1.0) dsaStatus = 'done';
  else if (dsaRatio >= 0.5) dsaStatus = 'partial';

  taskItems.push({
    taskId: `${dateStr}-dsa`,
    title: 'Solve 2+ DSA Questions',
    category: 'Study',
    status: dsaStatus,
    actualValue: dsaVal,
    targetValue: dsaTarget,
    unit: 'questions',
    weight: 2.0,
  });

  // 4. Study Hours (React + Backend)
  const studyHours = (log.reactHours || 0) + (log.backendHours || 0);
  const studyTarget = 4;
  const studyRatio = Math.min(1.0, studyHours / studyTarget);
  let studyStatus: TaskStatus = 'missed';
  if (studyRatio >= 1.0) studyStatus = 'done';
  else if (studyRatio >= 0.25) studyStatus = 'partial';

  taskItems.push({
    taskId: `${dateStr}-study`,
    title: 'Code / Study 4+ Hours',
    category: 'Study',
    status: studyStatus,
    actualValue: studyHours,
    targetValue: studyTarget,
    unit: 'hours',
    weight: 2.0,
  });

  // 5. Job Applications
  const appsVal = log.jobApplications ? log.jobApplications.length : 0;
  const appsTarget = 5;
  const appsRatio = Math.min(1.0, appsVal / appsTarget);
  let appsStatus: TaskStatus = 'missed';
  if (appsRatio >= 1.0) appsStatus = 'done';
  else if (appsRatio >= 0.2) appsStatus = 'partial';

  taskItems.push({
    taskId: `${dateStr}-jobs`,
    title: 'Submit 5+ Job Applications',
    category: 'Career',
    status: appsStatus,
    actualValue: appsVal,
    targetValue: appsTarget,
    unit: 'apps',
    weight: 2.0,
  });

  // 6. Food Intake (Junk Food control)
  taskItems.push({
    taskId: `${dateStr}-food`,
    title: 'Zero / Controlled Junk Food',
    category: 'Diet',
    status: !log.hadJunkFood ? 'done' : 'missed',
    actualValue: !log.hadJunkFood ? 1 : 0,
    targetValue: 1,
    unit: 'status',
    weight: 1.0,
  });

  // Include custom todos
  log.todos.forEach((todo) => {
    if (
      !todo.title.toLowerCase().includes('steps') &&
      !todo.title.toLowerCase().includes('workout') &&
      !todo.title.toLowerCase().includes('dsa') &&
      !todo.title.toLowerCase().includes('job')
    ) {
      taskItems.push({
        taskId: todo.id,
        title: todo.title,
        category: todo.category || 'General',
        status: todo.completed ? 'done' : 'missed',
        actualValue: todo.completed ? 1 : 0,
        targetValue: 1,
        weight: 1.0,
      });
    }
  });

  // Weighted Completion Sum
  let totalWeightedScore = 0;
  let totalMaxWeight = 0;
  let doneCount = 0;

  taskItems.forEach((t) => {
    totalMaxWeight += t.weight;
    let taskCredit = 0;
    if (t.status === 'done') {
      taskCredit = 1.0;
      doneCount++;
    } else if (t.status === 'partial') {
      taskCredit = Math.min(1.0, t.actualValue / t.targetValue);
      doneCount += 0.5;
    }
    totalWeightedScore += taskCredit * t.weight;
  });

  const completionPercent = totalMaxWeight > 0 ? Math.round((totalWeightedScore / totalMaxWeight) * 100) : 0;

  return {
    date: dateStr,
    dayOfWeek: log.dayOfWeek || getDayOfWeek(dateStr),
    dayNumber: log.dayNumber || dayNumber,
    completionPercent,
    tasksDone: Math.round(doneCount),
    tasksTotal: taskItems.length,
    tasks: taskItems,
    weight: log.weight,
    moodRating: log.moodRating,
    energyRating: log.energyRating,
    notes: log.notes || log.eveningReflection,
    isFrozen: true,
  };
}

function getDayOfWeek(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return d.toLocaleDateString('en-US', { weekday: 'long' });
  }
  return 'Wednesday';
}
