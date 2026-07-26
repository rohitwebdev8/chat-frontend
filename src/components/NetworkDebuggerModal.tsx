import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { networkMonitor, NetworkLog } from '../services/api/networkMonitor';
import theme from '../constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const NetworkDebuggerModal: React.FC<Props> = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const [logs, setLogs] = useState<NetworkLog[]>([]);
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{
    statusText: string;
    success: boolean;
    latencyMs: number;
  } | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const handlePing = useCallback(async () => {
    setIsPinging(true);
    const result = await networkMonitor.pingBackend();
    setPingResult(result);
    setIsPinging(false);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const unsubscribe = networkMonitor.subscribe((newLogs) => {
      setLogs(newLogs);
    });
    // Auto ping on open
    const timer = setTimeout(() => {
      handlePing();
    }, 0);
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [visible, handlePing]);


  const toggleExpand = (id: string) => {
    setExpandedLogId((prev) => (prev === id ? null : id));
  };

  const handleClear = () => {
    networkMonitor.clearLogs();
  };

  const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://chat-backend-r2cp.onrender.com';


  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
        {/* Top Header Bar */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerIcon}>⚡</Text>
            <View>
              <Text style={styles.headerTitle}>Network Debugger</Text>
              <Text style={styles.headerSubtitle}>Live Backend Monitor</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 24) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Server Overview Card */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>SERVER HEALTH</Text>
            <View style={styles.urlRow}>
              <Text style={styles.urlLabel}>Host URL:</Text>
              <Text style={styles.urlText} numberOfLines={1}>
                {baseUrl}
              </Text>
            </View>

            <View style={styles.statusRow}>
              <View style={styles.statusBadgeRow}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: pingResult?.success
                        ? theme.colors.success
                        : isPinging
                        ? '#F59E0B'
                        : theme.colors.error,
                    },
                  ]}
                />
                <Text style={styles.statusText}>
                  {isPinging
                    ? 'Pinging Server...'
                    : pingResult?.success
                    ? 'ONLINE (200 OK)'
                    : pingResult
                    ? 'OFFLINE / UNREACHABLE'
                    : 'Checking...'}
                </Text>
              </View>

              {pingResult?.latencyMs !== undefined && !isPinging && (
                <Text style={styles.latencyText}>{pingResult.latencyMs} ms</Text>
              )}
            </View>

            {pingResult?.statusText ? (
              <Text style={styles.statusDetailText}>{pingResult.statusText}</Text>
            ) : null}

            <TouchableOpacity
              style={styles.pingBtn}
              onPress={handlePing}
              disabled={isPinging}
            >
              {isPinging ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.pingBtnText}>🔄 Ping Backend Now</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Network Activity Log Header */}
          <View style={styles.logHeaderRow}>
            <Text style={styles.cardSectionTitle}>
              RECENT REQUEST LOGS ({logs.length})
            </Text>
            {logs.length > 0 && (
              <TouchableOpacity onPress={handleClear}>
                <Text style={styles.clearBtnText}>Clear Logs</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Logs List */}
          {logs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No HTTP network calls logged yet.</Text>
              <Text style={styles.emptySubtext}>
                Send a text message, voice note, or tap &quot;Ping Backend Now&quot; to trace live network traffic.
              </Text>
            </View>
          ) : (
            logs.map((log) => {
              const isSuccess = log.status === 200 || log.status === 201;
              const isExpanded = expandedLogId === log.id;

              return (
                <TouchableOpacity
                  key={log.id}
                  style={styles.logCard}
                  onPress={() => toggleExpand(log.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.logCardHeader}>
                    <View style={styles.logMethodRow}>
                      <View
                        style={[
                          styles.methodBadge,
                          log.method === 'POST'
                            ? styles.badgePost
                            : log.method === 'DELETE'
                            ? styles.badgeDelete
                            : styles.badgeGet,
                        ]}
                      >
                        <Text style={styles.methodBadgeText}>{log.method}</Text>
                      </View>

                      <Text style={styles.logEndpoint} numberOfLines={1}>
                        {log.endpoint}
                      </Text>
                    </View>

                    <View style={styles.logMetaRow}>
                      <View
                        style={[
                          styles.statusBadge,
                          isSuccess
                            ? styles.statusBadgeSuccess
                            : styles.statusBadgeError,
                        ]}
                      >
                        <Text style={styles.statusBadgeText}>{log.status}</Text>
                      </View>
                      <Text style={styles.logTime}>{log.timestamp}</Text>
                    </View>
                  </View>

                  <View style={styles.logCardSubrow}>
                    <Text style={styles.durationText}>{log.durationMs} ms</Text>
                    <Text style={styles.expandHint}>
                      {isExpanded ? 'Hide Payload ▲' : 'Inspect Payload ▼'}
                    </Text>
                  </View>

                  {/* Expanded Payload & Response */}
                  {isExpanded && (
                    <View style={styles.expandedContent}>
                      <Text style={styles.jsonLabel}>Request Body:</Text>
                      <View style={styles.codeBlock}>
                        <Text style={styles.codeText}>
                          {log.requestBody
                            ? JSON.stringify(log.requestBody, null, 2)
                            : 'No request body'}
                        </Text>
                      </View>

                      <Text style={styles.jsonLabel}>Response Data:</Text>
                      <View style={styles.codeBlock}>
                        <Text
                          style={[
                            styles.codeText,
                            log.error ? { color: theme.colors.error } : null,
                          ]}
                        >
                          {log.responseBody
                            ? JSON.stringify(log.responseBody, null, 2)
                            : log.error
                            ? `Error: ${log.error}`
                            : 'No response data'}
                        </Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 24,
    marginRight: theme.spacing.sm,
  },
  headerTitle: {
    ...theme.typography.heading2,
    color: theme.colors.text,
  },
  headerSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borders.radiusLg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.soft,
  },
  cardSectionTitle: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.primary,
    letterSpacing: 0.8,
    marginBottom: theme.spacing.sm,
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  urlLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginRight: 6,
  },
  urlText: {
    flex: 1,
    ...theme.typography.body,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    ...theme.typography.heading3,
    fontSize: 15,
    color: theme.colors.text,
  },
  latencyText: {
    ...theme.typography.caption,
    color: theme.colors.success,
    fontWeight: '700',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borders.radiusSm,
  },
  statusDetailText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  pingBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: theme.borders.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  pingBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  logHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  clearBtnText: {
    ...theme.typography.caption,
    color: theme.colors.error,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borders.radiusLg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyText: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  emptySubtext: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  logCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borders.radiusMd,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  logCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  logMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  badgeGet: {
    backgroundColor: '#E0F2FE',
  },
  badgePost: {
    backgroundColor: '#DCFCE7',
  },
  badgeDelete: {
    backgroundColor: '#FEE2E2',
  },
  methodBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.text,
  },
  logEndpoint: {
    ...theme.typography.body,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  logMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  statusBadgeSuccess: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeError: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  logTime: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  logCardSubrow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  durationText: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  expandHint: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  expandedContent: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  jsonLabel: {
    ...theme.typography.caption,
    fontWeight: '700',
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    marginTop: 6,
  },
  codeBlock: {
    backgroundColor: '#1E293B',
    borderRadius: theme.borders.radiusSm,
    padding: 10,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#38BDF8',
  },
});
