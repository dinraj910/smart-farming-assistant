import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  TextInput, Platform, Keyboard, KeyboardAvoidingView,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStackParamList';
import { useChatStore, ChatMessage } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';

/** Map of tool IDs to display names */
const TOOL_LABELS: Record<string, string> = {
  crop_recommendation_model: 'Soil Model',
  yield_prediction_model:    'Yield Model',
  crop_calendar_lookup:      'Planting Calendar',
  companion_rules_lookup:    'Companion Crops',
  kau_knowledge_search:      'KAU Records',
  weather_lookup:            'Weather',
  market_price_lookup:       'Mandi Prices',
};

const QUICK_PROMPTS = [
  { id: 'intercrop', icon: 'droplet',     label: 'What should I plant?' },
  { id: 'monsoon',   icon: 'cloud-rain',  label: 'Any rain risk this week?' },
  { id: 'mandi',     icon: 'trending-up', label: 'Sell or hold pepper?' },
];

type RouteParams = {
  fieldId: string;
  fieldName: string;
  district: string;
  crop?: string;
  acres?: number;
  farmId?: string; // DB farm UUID (if available)
};

export default function AgentChatScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<any>();
  const params: RouteParams = route.params ?? { fieldId: 'F1', fieldName: 'My Field', district: 'Kerala' };

  const { fieldId, fieldName, district, crop, acres, farmId } = params;

  const { user } = useAuthStore();

  const {
    sessions,
    messages: allMessages,
    isInitializingSession,
    isSending,
    error,
    initSession,
    send,
    retry,
    clearError,
  } = useChatStore();

  const messages = allMessages[fieldId] || [];
  const sessionId = sessions[fieldId];

  const flatListRef = useRef<FlatList>(null);
  const [inputText, setInputText] = React.useState('');
  const [expandedSources, setExpandedSources] = React.useState<Record<string, boolean>>({});

  // Initialise session on mount
  useEffect(() => {
    initSession(fieldId, farmId);
    return () => clearError();
  }, [fieldId]);

  // Greet user once session is ready and no history exists
  useEffect(() => {
    if (sessionId && messages.length === 0) {
      useChatStore.setState(state => ({
        messages: {
          ...state.messages,
          [fieldId]: [{
            id: 'init',
            role: 'assistant',
            text: `Ask me anything about **${fieldName}** — planting, weather, pests, or today's prices.`,
            status: 'sent',
          }],
        },
      }));
    }
  }, [sessionId]);

  const scrollToBottom = () => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

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

  const runScenario = (type: string) => {
    const prompts: Record<string, string> = {
      intercrop: 'What should I plant here, and what pairs well with it?',
      monsoon:   'Is there any rain risk this week I should plan around?',
      mandi:     'Should I sell my pepper now or wait for a better price?',
    };
    handleSend(prompts[type] || '');
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Render helpers
  // ──────────────────────────────────────────────────────────────────────────

  const renderThinking = () => (
    <View style={styles.assistantRow}>
      <View style={styles.assistantAvatar}>
        <Feather name="activity" size={14} color="#fff" />
      </View>
      <View style={styles.thinkingBubble}>
        <ActivityIndicator size="small" color="#16a34a" style={{ marginRight: 6 }} />
        <Text style={styles.thinkingText}>Checking your farm records...</Text>
      </View>
    </View>
  );

  const renderUserMsg = (item: ChatMessage) => (
    <View style={styles.userRow}>
      <View style={[styles.userBubble, item.status === 'failed' && styles.userBubbleFailed]}>
        <Text style={styles.userBubbleText}>{item.text}</Text>
        {item.status === 'failed' && (
          <TouchableOpacity onPress={() => handleRetry(item.id)} style={styles.retryBtn}>
            <Feather name="refresh-cw" size={11} color="#dc2626" />
            <Text style={styles.retryBtnText}>Tap to retry</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderAssistantMsg = (item: ChatMessage) => {
    const sourceNames = [...new Set((item.trace || []).map(t => TOOL_LABELS[t.tool] || t.tool))];
    const isExpanded = expandedSources[item.id];
    return (
      <View style={styles.assistantRow}>
        <View style={styles.assistantAvatar}>
          <Feather name="activity" size={14} color="#fff" />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={styles.assistantBubble}>
            <Text style={styles.assistantBubbleText}>{item.text}</Text>
          </View>
          {sourceNames.length > 0 && (
            <View>
              <TouchableOpacity
                style={styles.sourcesBtn}
                onPress={() => setExpandedSources(prev => ({ ...prev, [item.id]: !isExpanded }))}
              >
                <Feather name="check-circle" size={12} color="#22c55e" />
                <Text style={styles.sourcesBtnText}>
                  Checked {sourceNames.length} source{sourceNames.length > 1 ? 's' : ''}
                </Text>
                <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={12} color="#94a3b8" />
              </TouchableOpacity>
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

  // ──────────────────────────────────────────────────────────────────────────
  // Loading state while session initialises
  // ──────────────────────────────────────────────────────────────────────────
  if (isInitializingSession) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#15803d" />
        <Text style={styles.centeredText}>Starting session...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#fff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff' }}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Feather name="arrow-left" size={16} color="#475569" />
            </TouchableOpacity>
            <View style={styles.agentIconWrap}>
              <Feather name="activity" size={16} color="#fff" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.headerFieldName} numberOfLines={1}>{fieldName}</Text>
              <Text style={styles.headerFieldMeta}>
                {district}{acres ? ` • ${acres} acres` : ''}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Feather name="repeat" size={16} color="#475569" />
          </TouchableOpacity>
        </View>

        {/* Global error banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Feather name="alert-circle" size={13} color="#dc2626" />
            <Text style={styles.errorBannerText} numberOfLines={2}>{error}</Text>
            <TouchableOpacity onPress={clearError}>
              <Feather name="x" size={14} color="#dc2626" />
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToBottom}
        ListHeaderComponent={
          <View style={styles.quickPromptsWrap}>
            <Text style={styles.quickPromptsLabel}>Suggested Questions</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
              {QUICK_PROMPTS.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.quickPromptBtn}
                  onPress={() => runScenario(p.id)}
                  activeOpacity={0.8}
                  disabled={isSending}
                >
                  <Feather name={p.icon as any} size={13} color="#16a34a" />
                  <Text style={styles.quickPromptText}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        }
      />

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            placeholder="Ask about this field (English/Malayalam)..."
            placeholderTextColor="#94a3b8"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleSend()}
            multiline
            returnKeyType="send"
            editable={!isSending}
          />
          <TouchableOpacity
            style={[styles.sendBtn, isSending && styles.sendBtnDisabled]}
            onPress={() => handleSend()}
            disabled={isSending}
          >
            {isSending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Feather name="arrow-up" size={16} color="#fff" />
            }
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', gap: 12 },
  centeredText: { fontSize: 13, color: '#64748b', fontWeight: '500' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
    backgroundColor: 'rgba(255,255,255,0.97)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  backBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  agentIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#15803d', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  headerFieldName: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  headerFieldMeta:  { fontSize: 10, color: '#64748b', marginTop: 1 },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fef2f2', borderTopWidth: 1, borderTopColor: '#fecaca',
    paddingHorizontal: 14, paddingVertical: 8,
  },
  errorBannerText: { flex: 1, fontSize: 11, color: '#dc2626', fontWeight: '500' },

  chatContent: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 120, gap: 20 },

  quickPromptsWrap: { marginBottom: 16 },
  quickPromptsLabel: {
    fontSize: 10, fontWeight: '800', color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  quickPromptBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, marginRight: 8,
  },
  quickPromptText: { fontSize: 11, fontWeight: '600', color: '#334155' },

  // User
  userRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 },
  userBubble: {
    backgroundColor: '#1e293b', borderRadius: 18, borderTopRightRadius: 4,
    paddingHorizontal: 14, paddingVertical: 10, maxWidth: '85%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  userBubbleFailed: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5' },
  userBubbleText: { fontSize: 12, color: '#fff', lineHeight: 18 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  retryBtnText: { fontSize: 10, color: '#dc2626', fontWeight: '600' },

  // Assistant
  assistantRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 4 },
  assistantAvatar: {
    width: 28, height: 28, borderRadius: 10,
    backgroundColor: '#15803d', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
  },
  assistantBubble: {
    backgroundColor: '#fff', borderRadius: 18, borderTopLeftRadius: 4,
    borderWidth: 1, borderColor: '#e2e8f0',
    paddingHorizontal: 14, paddingVertical: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  assistantBubbleText: { fontSize: 12, color: '#1e293b', lineHeight: 18 },

  // Thinking
  thinkingBubble: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  thinkingText: { fontSize: 12, color: '#64748b', fontWeight: '500' },

  // Sources
  sourcesBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 4, paddingTop: 2 },
  sourcesBtnText: { fontSize: 10, fontWeight: '600', color: '#94a3b8', flex: 1 },
  sourceChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4, paddingLeft: 4 },
  sourceChip: { backgroundColor: '#f1f5f9', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  sourceChipText: { fontSize: 9, fontWeight: '600', color: '#64748b' },

  // Input Bar
  inputBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopWidth: 1, borderTopColor: '#f1f5f9',
    padding: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f1f5f9', borderRadius: 18,
    borderWidth: 1, borderColor: '#e2e8f0',
    paddingHorizontal: 12, paddingVertical: 6,
  },
  textInput: { flex: 1, fontSize: 12, color: '#0f172a', fontWeight: '500', paddingVertical: 6, maxHeight: 80 },
  sendBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#15803d', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    shadowColor: '#15803d', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3,
  },
  sendBtnDisabled: { backgroundColor: '#86efac', shadowOpacity: 0 },
});
