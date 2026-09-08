import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  TextInput, Platform, Keyboard, KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStackParamList';
import { useChatStore, ChatMessage } from '../store/chatStore';

// ─── Tool label mapping ───────────────────────────────────────────────────────
const TOOL_LABELS: Record<string, string> = {
  crop_recommendation_model: '🌱 Soil Model',
  yield_prediction_model:    '📊 Yield Model',
  crop_calendar_lookup:      '📅 Planting Calendar',
  companion_rules_lookup:    '🌿 Companion Crops',
  kau_knowledge_search:      '📚 KAU Records',
  weather_lookup:            '🌦️ Weather',
  market_price_lookup:       '💰 Mandi Prices',
};

const QUICK_PROMPTS = [
  { id: 'intercrop', icon: '🌾', label: 'What should I plant?' },
  { id: 'monsoon',   icon: '🌧️', label: 'Rain risk this week?' },
  { id: 'mandi',     icon: '📈', label: 'Best time to sell?' },
];

type RouteParams = {
  fieldId: string;
  fieldName: string;
  district: string;
  crop?: string;
  acres?: number;
  farmId?: string;
};

// ─── Lightweight Markdown renderer ───────────────────────────────────────────
// Handles: ### headings, **bold**, *italic*, bullet lists, horizontal rules, tables
function MarkdownText({ text, color = '#1e293b' }: { text: string; color?: string }) {
  const lines = text.split('\n');

  const renderInline = (raw: string, key: string | number) => {
    // Split by bold (**text**) and italic (*text*)
    const parts = raw.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <Text key={i} style={{ fontWeight: '700', color }}>{part.slice(2, -2)}</Text>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <Text key={i} style={{ fontStyle: 'italic', color }}>{part.slice(1, -1)}</Text>;
      }
      return <Text key={i} style={{ color }}>{part}</Text>;
    });
  };

  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      elements.push(<View key={i} style={mdStyles.hr} />);
      i++;
      continue;
    }

    // H3 (###)
    if (line.startsWith('### ')) {
      elements.push(
        <Text key={i} style={mdStyles.h3}>{line.slice(4).replace(/\*\*/g, '')}</Text>
      );
      i++;
      continue;
    }

    // H2 (##)
    if (line.startsWith('## ')) {
      elements.push(
        <Text key={i} style={mdStyles.h2}>{line.slice(3).replace(/\*\*/g, '')}</Text>
      );
      i++;
      continue;
    }

    // H1 (#)
    if (line.startsWith('# ') && !line.startsWith('## ')) {
      elements.push(
        <Text key={i} style={mdStyles.h1}>{line.slice(2).replace(/\*\*/g, '')}</Text>
      );
      i++;
      continue;
    }

    // Table row (starts with |)
    if (line.trim().startsWith('|')) {
      // collect all consecutive table lines
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      // Filter out separator row (|---|---|)
      const dataRows = tableLines.filter(l => !/^\|[\s\-:|]+\|/.test(l.trim()));
      elements.push(
        <View key={`table-${i}`} style={mdStyles.table}>
          {dataRows.map((row, ri) => {
            const cells = row.split('|').filter(c => c.trim() !== '');
            return (
              <View key={ri} style={[mdStyles.tableRow, ri === 0 && mdStyles.tableHeaderRow]}>
                {cells.map((cell, ci) => (
                  <View key={ci} style={mdStyles.tableCell}>
                    <Text style={[mdStyles.tableCellText, ri === 0 && mdStyles.tableHeaderText]}>
                      {cell.trim().replace(/\*\*/g, '')}
                    </Text>
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      );
      continue;
    }

    // Bullet list (- or * or numbered 1.)
    if (/^(\s*[-*]|\s*\d+\.) /.test(line)) {
      const indent = line.match(/^(\s*)/)?.[1].length || 0;
      const isNumbered = /^\s*\d+\./.test(line);
      const content = line.replace(/^\s*[-*]\s*/, '').replace(/^\s*\d+\.\s*/, '');
      const bullet = isNumbered ? line.match(/^\s*(\d+)\./)?.[1] + '.' : '•';
      elements.push(
        <View key={i} style={[mdStyles.listItem, { paddingLeft: 8 + indent * 8 }]}>
          <Text style={mdStyles.bullet}>{bullet}</Text>
          <Text style={[mdStyles.listText, { color }]}>{renderInline(content, `${i}-c`)}</Text>
        </View>
      );
      i++;
      continue;
    }

    // Empty line — small spacer
    if (line.trim() === '') {
      elements.push(<View key={i} style={{ height: 4 }} />);
      i++;
      continue;
    }

    // Normal paragraph text
    elements.push(
      <Text key={i} style={[mdStyles.paragraph, { color }]}>
        {renderInline(line, i)}
      </Text>
    );
    i++;
  }

  return <View>{elements}</View>;
}

const mdStyles = StyleSheet.create({
  h1: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 6, marginTop: 8 },
  h2: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 4, marginTop: 8 },
  h3: { fontSize: 13, fontWeight: '700', color: '#1e293b', marginBottom: 3, marginTop: 6 },
  paragraph: { fontSize: 13, lineHeight: 20, marginBottom: 2 },
  hr: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 8 },
  listItem: { flexDirection: 'row', gap: 6, marginBottom: 3, alignItems: 'flex-start' },
  bullet: { fontSize: 13, color: '#16a34a', fontWeight: '700', marginTop: 1, minWidth: 14 },
  listText: { fontSize: 13, lineHeight: 19, flex: 1 },
  table: { borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0', marginVertical: 6 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tableHeaderRow: { backgroundColor: '#f1f5f9' },
  tableCell: { flex: 1, paddingHorizontal: 8, paddingVertical: 6 },
  tableCellText: { fontSize: 11, color: '#334155', lineHeight: 16 },
  tableHeaderText: { fontWeight: '700', color: '#0f172a' },
});

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AgentChatScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<any>();
  const params: RouteParams = route.params ?? { fieldId: 'F1', fieldName: 'My Field', district: 'Kerala' };
  const { fieldId, fieldName, district, crop, acres, farmId } = params;

  const {
    sessions, messages: allMessages,
    isInitializingSession, isSending, error,
    initSession, send, retry, clearError,
  } = useChatStore();

  const messages = allMessages[fieldId] || [];
  const sessionId = sessions[fieldId];
  const flatListRef = useRef<FlatList>(null);
  const [inputText, setInputText] = React.useState('');
  const [expandedSources, setExpandedSources] = React.useState<Record<string, boolean>>({});

  useEffect(() => {
    initSession(fieldId, farmId);
    return () => clearError();
  }, [fieldId]);

  useEffect(() => {
    if (sessionId && messages.length === 0) {
      useChatStore.setState(state => ({
        messages: {
          ...state.messages,
          [fieldId]: [{
            id: 'init',
            role: 'assistant',
            text: `Hello! I'm your AI farming assistant for **${fieldName}**.\n\nI can help you with:\n- **Crop recommendations** based on your soil and weather\n- **Planting calendars** with traditional Kerala wisdom\n- **Fertilizer schedules** from KAU Package of Practices\n- **Live mandi prices** and market outlook\n\nWhat would you like to know?`,
            status: 'sent',
            createdAt: new Date().toISOString(),
          }],
        },
      }));
    }
  }, [sessionId]);

  const scrollToBottom = () =>
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

  const buildContextMsg = (userText: string) =>
    `${userText} (My field: "${fieldName}" in ${district}, Kerala${crop ? `, currently growing ${crop}` : ''}${acres ? `, ${acres} acres` : ''}.)`

  const handleSend = async (text?: string) => {
    const msg = (text || inputText).trim();
    if (!msg || isSending) return;
    setInputText('');
    Keyboard.dismiss();
    scrollToBottom();
    await send(fieldId, buildContextMsg(msg), farmId);
    scrollToBottom();
  };

  const handleRetry = async (msgId: string) => {
    clearError();
    await retry(fieldId, msgId, farmId);
    scrollToBottom();
  };

  const formatTime = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // ─── Render: Thinking indicator ─────────────────────────────────────────────
  const renderThinking = () => (
    <View style={styles.assistantRow}>
      <View style={styles.assistantAvatar}>
        <Text style={{ fontSize: 12 }}>🌾</Text>
      </View>
      <View style={styles.thinkingBubble}>
        <ActivityIndicator size="small" color="#16a34a" />
        <View style={{ marginLeft: 10, gap: 2 }}>
          <Text style={styles.thinkingTitle}>Consulting farm data...</Text>
          <Text style={styles.thinkingSubtitle}>Running AI tools & checking KAU records</Text>
        </View>
      </View>
    </View>
  );

  // ─── Render: User message ────────────────────────────────────────────────────
  const renderUserMsg = (item: ChatMessage) => (
    <View style={styles.userRow}>
      <View style={[styles.userBubble, item.status === 'failed' && styles.userBubbleFailed]}>
        <Text style={styles.userBubbleText}>{item.text.replace(/ \(My field:.*$/, '').trim()}</Text>
        <View style={styles.bubbleMeta}>
          {item.createdAt && <Text style={styles.timeUser}>{formatTime(item.createdAt)}</Text>}
          {item.status === 'sent' && <Feather name="check" size={10} color="#94a3b8" />}
          {item.status === 'failed' && (
            <TouchableOpacity onPress={() => handleRetry(item.id)} style={styles.retryBtn}>
              <Feather name="refresh-cw" size={10} color="#dc2626" />
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  // ─── Render: Assistant message ───────────────────────────────────────────────
  const renderAssistantMsg = (item: ChatMessage) => {
    const sourceNames = [...new Set((item.trace || []).map(t => TOOL_LABELS[t.tool] || t.tool))];
    const isExpanded = expandedSources[item.id];

    return (
      <View style={styles.assistantRow}>
        <View style={styles.assistantAvatar}>
          <Text style={{ fontSize: 12 }}>🌾</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={styles.assistantBubble}>
            <MarkdownText text={item.text} color="#1e293b" />
            <View style={styles.bubbleMetaAsst}>
              {item.createdAt && <Text style={styles.timeAsst}>{formatTime(item.createdAt)}</Text>}
            </View>
          </View>

          {sourceNames.length > 0 && (
            <TouchableOpacity
              style={styles.sourcesBtn}
              onPress={() => setExpandedSources(prev => ({ ...prev, [item.id]: !isExpanded }))}
            >
              <Feather name="zap" size={11} color="#16a34a" />
              <Text style={styles.sourcesBtnText}>
                {sourceNames.length} source{sourceNames.length > 1 ? 's' : ''} checked
              </Text>
              <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={11} color="#94a3b8" />
            </TouchableOpacity>
          )}
          {isExpanded && (
            <View style={styles.sourceChips}>
              {sourceNames.map(name => (
                <View key={name} style={styles.sourceChip}>
                  <Text style={styles.sourceChipText}>{name}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    if (item.isThinking) return renderThinking();
    if (item.role === 'user') return renderUserMsg(item);
    return renderAssistantMsg(item);
  };

  // ─── Loading state ───────────────────────────────────────────────────────────
  if (isInitializingSession) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.centeredText}>Starting session...</Text>
      </View>
    );
  }

  // ─── Main render ─────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f8fafc' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={18} color="#374151" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={styles.headerAvatarWrap}>
              <Text style={{ fontSize: 16 }}>🌾</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>{fieldName}</Text>
              <View style={styles.headerStatusRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.headerSub}>{district} · AI Farming Advisor</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => { useChatStore.setState(s => ({ messages: { ...s.messages, [fieldId]: [] }, sessions: { ...s.sessions, [fieldId]: undefined as any } })); initSession(fieldId, farmId); }}
          >
            <Feather name="refresh-cw" size={16} color="#374151" />
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Feather name="alert-circle" size={13} color="#dc2626" />
            <Text style={styles.errorText} numberOfLines={2}>{error}</Text>
            <TouchableOpacity onPress={clearError}>
              <Feather name="x" size={14} color="#dc2626" />
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>

      {/* ── Message list ────────────────────────────────────────────────────── */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={m => m.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={scrollToBottom}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🌱</Text>
            <Text style={styles.emptyTitle}>Ask your farming advisor</Text>
            <Text style={styles.emptySub}>Get ML-verified crop advice, weather insights, KAU Package of Practices & live mandi prices</Text>
          </View>
        ) : null}
        ListFooterComponent={(
          <View style={styles.quickPromptsRow}>
            {QUICK_PROMPTS.map(p => (
              <TouchableOpacity
                key={p.id}
                style={styles.quickBtn}
                onPress={() => handleSend(p.label)}
                disabled={isSending}
              >
                <Text style={styles.quickBtnIcon}>{p.icon}</Text>
                <Text style={styles.quickBtnLabel}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      />

      {/* ── Input Bar ───────────────────────────────────────────────────────── */}
      <View style={styles.inputBar}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            placeholder={`Ask about ${fieldName.split(' ')[0]}...`}
            placeholderTextColor="#9ca3af"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleSend()}
            multiline
            returnKeyType="send"
            editable={!isSending}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || isSending) && styles.sendBtnDisabled]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isSending}
          >
            {isSending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Feather name="send" size={16} color="#fff" />
            }
          </TouchableOpacity>
        </View>
        <Text style={styles.inputFooter}>AI advice — always verify with a local agronomist</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', gap: 12 },
  centeredText: { fontSize: 14, color: '#64748b', fontWeight: '500' },

  // Header
  headerSafe: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  headerBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  headerAvatarWrap: {
    width: 38, height: 38, borderRadius: 14,
    backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#86efac',
  },
  headerTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  headerStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  headerSub: { fontSize: 11, color: '#64748b', fontWeight: '500' },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fef2f2', paddingHorizontal: 14, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: '#fecaca',
  },
  errorText: { flex: 1, fontSize: 11, color: '#dc2626', fontWeight: '500' },

  // Chat
  chatContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 130, gap: 16 },

  emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19 },

  quickPromptsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 8 },
  quickBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  quickBtnIcon: { fontSize: 13 },
  quickBtnLabel: { fontSize: 12, fontWeight: '600', color: '#334155' },

  // User bubble
  userRow: { alignItems: 'flex-end', paddingLeft: 48 },
  userBubble: {
    backgroundColor: '#16a34a', borderRadius: 18, borderBottomRightRadius: 5,
    paddingHorizontal: 14, paddingVertical: 10, maxWidth: '90%',
    shadowColor: '#16a34a', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3,
  },
  userBubbleFailed: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5' },
  userBubbleText: { fontSize: 14, color: '#fff', lineHeight: 20, fontWeight: '500' },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, justifyContent: 'flex-end' },
  timeUser: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },

  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  retryBtnText: { fontSize: 10, color: '#dc2626', fontWeight: '600' },

  // Assistant bubble
  assistantRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingRight: 24 },
  assistantAvatar: {
    width: 34, height: 34, borderRadius: 12, flexShrink: 0,
    backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#86efac', marginTop: 2,
  },
  assistantBubble: {
    backgroundColor: '#fff', borderRadius: 18, borderTopLeftRadius: 5,
    borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14, paddingVertical: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  bubbleMetaAsst: { flexDirection: 'row', marginTop: 6, justifyContent: 'flex-end' },
  timeAsst: { fontSize: 10, color: '#94a3b8' },

  // Thinking
  thinkingBubble: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0',
    paddingHorizontal: 14, paddingVertical: 10, gap: 0,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  thinkingTitle: { fontSize: 13, fontWeight: '600', color: '#16a34a' },
  thinkingSubtitle: { fontSize: 11, color: '#64748b' },

  // Sources
  sourcesBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingLeft: 4, paddingTop: 2,
  },
  sourcesBtnText: { fontSize: 11, fontWeight: '600', color: '#64748b', flex: 1 },
  sourceChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, paddingLeft: 4, marginTop: 2 },
  sourceChip: {
    backgroundColor: '#f0fdf4', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  sourceChipText: { fontSize: 10, fontWeight: '600', color: '#16a34a' },

  // Input
  inputBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9',
    paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    paddingHorizontal: 12,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    backgroundColor: '#f8fafc', borderRadius: 24, borderWidth: 1.5, borderColor: '#e2e8f0',
    paddingLeft: 16, paddingRight: 6, paddingVertical: 6,
  },
  textInput: {
    flex: 1, fontSize: 14, color: '#0f172a', fontWeight: '500',
    paddingVertical: 6, maxHeight: 100, lineHeight: 20,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#16a34a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.35, shadowRadius: 4, elevation: 3,
  },
  sendBtnDisabled: { backgroundColor: '#86efac', shadowOpacity: 0 },
  inputFooter: { fontSize: 10, color: '#9ca3af', textAlign: 'center', marginTop: 6, fontWeight: '500' },
});
