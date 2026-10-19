import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/common/Card';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/common/Button';
import {
  Bot,
  Send,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Trash2,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFinancial } from '../context/FinancialContext';
import { apiClient, ApiError } from '../services/api';
import {
  ChatMessage,
  CopilotStatusResponseData,
  CopilotGroundingContext,
} from '../types';
import { formatCurrency, formatNumber, formatDate } from '../lib/utils';

const STORAGE_KEY = 'finpilot_copilot_chat_history';

export const CopilotPage: React.FC = () => {
  const { summary, openingBalance } = useFinancial();
  const { t, i18n } = useTranslation(['copilot', 'common', 'nav', 'dashboard']);

  const [copilotStatus, setCopilotStatus] = useState<CopilotStatusResponseData | null>(null);
  const [statusLoading, setStatusLoading] = useState<boolean>(true);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Session storage error fallback
    }
    return [];
  });

  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [latestGrounding, setLatestGrounding] = useState<CopilotGroundingContext | null>(null);
  const [showContextDetails, setShowContextDetails] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const suggestedPrompts = [
    {
      category: t('dashboard:metrics.runway'),
      question: t('copilot:chips.cashBalance'),
    },
    {
      category: t('common:badges.forecast'),
      question: t('copilot:chips.nextMonth'),
    },
    {
      category: t('dashboard:alerts.sectionTitle'),
      question: t('copilot:chips.risks'),
    },
    {
      category: t('nav:items.financing'),
      question: t('copilot:chips.financing'),
    },
  ];

  // Sync messages to session storage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Storage error fallback
    }
  }, [messages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const checkStatus = async () => {
    setStatusLoading(true);
    try {
      const status = await apiClient.getCopilotStatus();
      setCopilotStatus(status);
    } catch {
      setCopilotStatus({
        configured: false,
        model: 'gemini-3.5-flash',
        workspace: 'Apex Supply Chain Co.',
        isSingleWorkspaceDemo: true,
        notice: t('copilot:errors.notConfigured'),
      });
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleClearChat = () => {
    setMessages([]);
    setErrorMessage(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage error fallback
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isSending) return;

    setErrorMessage(null);

    const userMessage: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Build history for backend API (limited to last 6 turns, safely capped to avoid oversized payloads)
    const historyPayload = messages
      .filter((m) => !m.isError)
      .slice(-6)
      .map((m) => ({
        role: m.role,
        content: m.content.length > 5000 ? m.content.substring(0, 5000) : m.content,
      }));

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsSending(true);

    try {
      const activeLang = i18n.language === 'bn' ? 'bn' : 'en';
      const response = await apiClient.sendCopilotMessage({
        message: trimmed,
        history: historyPayload,
        openingBalance: openingBalance !== null ? openingBalance : undefined,
        language: activeLang,
      });

      const assistantMessage: ChatMessage = {
        id: `msg-model-${Date.now()}`,
        role: 'model',
        content: response.message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        groundingContext: response.groundingContext,
      };

      setLatestGrounding(response.groundingContext);
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      const errorText =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : t('copilot:errors.networkError');

      const failedMessage: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        role: 'model',
        content: errorText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };

      setMessages((prev) => [...prev, failedMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const handleRetry = (contentToRetry: string) => {
    handleSendMessage(contentToRetry);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Bot className="w-6 h-6 text-blue-600 shrink-0" />
              {t('copilot:header.title')}
            </h1>

            {statusLoading ? (
              <StatusBadge variant="neutral" size="sm">
                {t('common:status.checking')}
              </StatusBadge>
            ) : copilotStatus?.configured ? (
              <StatusBadge variant="success" size="sm" dot>
                {t('copilot:header.statusConfigured')} ({copilotStatus.model})
              </StatusBadge>
            ) : (
              <StatusBadge variant="warning" size="sm" dot>
                {t('copilot:header.statusNotConfigured')}
              </StatusBadge>
            )}

            <StatusBadge variant="demo" size="sm">
              {t('common:badges.demoWorkspace')}
            </StatusBadge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t('copilot:header.description')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearChat}
              leftIcon={<Trash2 className="w-3.5 h-3.5 text-slate-500" />}
            >
              {t('copilot:chat.clearChat')}
            </Button>
          )}

          <Link to="/dashboard">
            <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              {t('nav:items.dashboard')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-3.5 py-2.5 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700 text-xs font-medium">
            {t('common:buttons.close')}
          </button>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Authoritative Financial Grounding & Suggested Prompts */}
        <div className="lg:col-span-1 space-y-4">
          {/* Grounding Context Panel */}
          <Card className="p-4 shadow-subtle border-slate-200">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  {t('copilot:drawer.title')}
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {formatDate(latestGrounding?.asOfDate || summary?.asOfDate || '2026-10-12')}
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-3">
              {t('copilot:drawer.subtitle')}:
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">
                  {t('copilot:drawer.cashBalance')}
                </span>
                <span className="font-bold text-slate-900 text-sm">
                  {formatCurrency(latestGrounding?.currentCashBalance ?? summary?.currentCashBalance ?? 148250)}
                </span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">
                  {t('copilot:drawer.netCashFlow')}
                </span>
                <span
                  className={`font-bold text-sm ${
                    (latestGrounding?.netCashFlow ?? summary?.netCashFlow ?? 0) >= 0
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  }`}
                >
                  {(latestGrounding?.netCashFlow ?? summary?.netCashFlow ?? 0) >= 0 ? '+' : ''}
                  {formatCurrency(latestGrounding?.netCashFlow ?? summary?.netCashFlow ?? 48250)}
                </span>
              </div>

              <div className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
                <span className="text-[10px] text-blue-700 block uppercase font-medium">
                  {t('copilot:drawer.pendingAr')}
                </span>
                <span className="font-bold text-blue-900 text-xs">
                  {formatCurrency(latestGrounding?.pendingReceivables ?? summary?.pendingReceivables ?? 43700)}
                </span>
              </div>

              <div className="bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
                <span className="text-[10px] text-amber-700 block uppercase font-medium">
                  {t('copilot:drawer.pendingAp')}
                </span>
                <span className="font-bold text-amber-900 text-xs">
                  {formatCurrency(latestGrounding?.pendingPayables ?? summary?.pendingPayables ?? 17400)}
                </span>
              </div>
            </div>

            {/* Toggle Detailed Context */}
            <button
              onClick={() => setShowContextDetails((prev) => !prev)}
              className="mt-3 w-full py-1.5 px-2 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-md transition-colors flex items-center justify-center gap-1.5 border border-slate-200/60"
            >
              <span>{showContextDetails ? t('common:buttons.close') : t('common:buttons.viewDetails')}</span>
              {showContextDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showContextDetails && (
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5 text-[11px]">
                <div className="flex justify-between text-slate-600">
                  <span>{t('copilot:drawer.forecastEnd')}:</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(
                      latestGrounding?.forecastEndingBalance ??
                        summary?.baseline30DayProjection?.projectedEndingBalance ??
                        171280
                    )}
                  </span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>{t('copilot:drawer.runRate')}:</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(
                      latestGrounding?.dailyAverageBurnOrGain ??
                        summary?.baseline30DayProjection?.dailyAverageBurnOrGain ??
                        143
                    )}
                    /day
                  </span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>{t('copilot:drawer.riskLevel')}:</span>
                  <StatusBadge
                    variant={
                      (latestGrounding?.overallRiskLevel ?? summary?.risks?.overallRiskLevel) === 'low'
                        ? 'success'
                        : 'warning'
                    }
                    size="sm"
                  >
                    {t(`common:status.${latestGrounding?.overallRiskLevel ?? summary?.risks?.overallRiskLevel ?? 'moderate'}`)}
                  </StatusBadge>
                </div>

                <div className="text-[10px] text-slate-400 pt-1">
                  {t('nav:workspace.title')} ({t('nav:workspace.subtitle')})
                </div>
              </div>
            )}
          </Card>

          {/* Suggested Starter Questions */}
          <Card className="p-4 shadow-subtle border-slate-200">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                {t('copilot:chips.title')}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              {t('copilot:header.description')}
            </p>

            <div className="space-y-2">
              {suggestedPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt.question)}
                  disabled={isSending}
                  className="w-full text-left p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-blue-50/50 hover:border-blue-200 transition-all text-xs group disabled:opacity-50"
                >
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-blue-600 mb-0.5">
                    {prompt.category}
                  </span>
                  <span className="font-medium text-slate-800 group-hover:text-blue-900 block leading-snug">
                    {prompt.question}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          {/* Compliance & Safety Notice */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] text-slate-500 space-y-1">
            <div className="font-semibold text-slate-700 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              {t('copilot:chat.disclaimer')}
            </div>
          </div>
        </div>

        {/* Right Column: Chat Interface */}
        <div className="lg:col-span-2">
          <Card className="flex flex-col h-[650px] shadow-subtle border-slate-200">
            {/* Chat Header */}
            <CardHeader className="py-3 px-5 bg-slate-50/80 border-b border-slate-100 flex-row items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    {t('copilot:header.title')}
                  </CardTitle>
                  <CardDescription className="text-[11px] text-slate-500">
                    {t('nav:workspace.title')} • {formatNumber(messages.length)} {t('common:units.items')}
                  </CardDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <StatusBadge variant="info" size="sm">
                  {t('common:badges.verifiedLedger')}
                </StatusBadge>
              </div>
            </CardHeader>

            {/* Conversation Stream */}
            <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 bg-slate-50/40">
              {messages.length === 0 ? (
                /* Empty State */
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 mb-1">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-slate-800 text-sm">
                    {t('copilot:header.title')}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                    {t('copilot:header.description')}
                  </p>

                  <div className="flex flex-wrap justify-center gap-2 pt-2 max-w-lg">
                    {suggestedPrompts.slice(0, 2).map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(item.question)}
                        className="text-xs bg-white border border-slate-200 rounded-full px-3.5 py-1.5 text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-900 transition-colors shadow-subtle"
                      >
                        {item.question}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start items-start gap-2.5'}`}
                  >
                    {msg.role === 'model' && (
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 mt-1 shadow-sm ${
                          msg.isError ? 'bg-rose-600' : 'bg-slate-900'
                        }`}
                      >
                        {msg.isError ? <AlertCircle className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] sm:max-w-[80%] rounded-2xl text-xs ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-none px-4 py-3 shadow-sm'
                          : msg.isError
                          ? 'bg-rose-50 border border-rose-200 text-rose-900 rounded-tl-none p-4 shadow-subtle'
                          : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-none p-4 shadow-subtle space-y-2'
                      }`}
                    >
                      {msg.role === 'model' && (
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                          <span className="font-semibold text-slate-900 flex items-center gap-1.5 text-[11px]">
                            {msg.isError ? (
                              <span className="text-rose-700 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {t('common:states.errorOccurred')}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-blue-700">
                                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                                FinPilot Intelligence
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                        </div>
                      )}

                      {/* Content Rendering */}
                      {msg.isError ? (
                        <div className="space-y-2">
                          <p className="leading-relaxed">{msg.content}</p>
                          <div className="pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const msgIndex = messages.findIndex((m) => m.id === msg.id);
                                const lastUserMsg = messages
                                  .slice(0, msgIndex)
                                  .reverse()
                                  .find((m) => m.role === 'user');
                                if (lastUserMsg) {
                                  handleRetry(lastUserMsg.content);
                                }
                              }}
                              leftIcon={<RotateCcw className="w-3 h-3 text-rose-600" />}
                              className="border-rose-200 hover:bg-rose-100/60 text-rose-800"
                            >
                              {t('common:buttons.retry')}
                            </Button>
                          </div>
                        </div>
                      ) : msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      ) : (
                        <div className="prose prose-xs text-slate-800 max-w-none">
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed text-slate-700">{children}</p>,
                              strong: ({ children }) => <strong className="font-semibold text-slate-950">{children}</strong>,
                              ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1 text-slate-700">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1 text-slate-700">{children}</ol>,
                              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                              h1: ({ children }) => <h3 className="text-xs font-bold text-slate-900 mt-2 mb-1 uppercase tracking-wide">{children}</h3>,
                              h2: ({ children }) => <h3 className="text-xs font-bold text-slate-900 mt-2 mb-1 uppercase tracking-wide">{children}</h3>,
                              h3: ({ children }) => <h4 className="text-xs font-semibold text-slate-900 mt-2 mb-1">{children}</h4>,
                              table: ({ children }) => (
                                <div className="overflow-x-auto my-2 border border-slate-200 rounded-lg">
                                  <table className="min-w-full divide-y divide-slate-200 text-[11px]">{children}</table>
                                </div>
                              ),
                              th: ({ children }) => <th className="bg-slate-50 px-2.5 py-1 text-left font-semibold text-slate-700">{children}</th>,
                              td: ({ children }) => <td className="px-2.5 py-1 border-t border-slate-100 text-slate-700">{children}</td>,
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      )}

                      {/* Attached Grounding Snapshot Pill */}
                      {msg.groundingContext && (
                        <div className="pt-2 mt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                          <span className="font-semibold text-slate-600">{t('common:badges.verifiedLedger')}:</span>
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono">
                            {t('dashboard:metrics.currentCash')}: {formatCurrency(msg.groundingContext.currentCashBalance)}
                          </span>
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono">
                            {t('dashboard:metrics.netCashFlow')}: {formatCurrency(msg.groundingContext.netCashFlow)}
                          </span>
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono">
                            {t('dashboard:metrics.pendingReceivables')}: {formatCurrency(msg.groundingContext.pendingReceivables)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {/* Live Loading Indicator */}
              {isSending && (
                <div className="flex justify-start items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center text-white shrink-0 mt-1 shadow-sm">
                    <Bot className="w-3.5 h-3.5 animate-pulse" />
                  </div>
                  <div className="bg-white border border-slate-200/90 rounded-2xl rounded-tl-none p-4 text-xs text-slate-800 shadow-subtle space-y-2">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                      <span className="font-medium text-[11px] text-blue-900">
                        {t('copilot:chat.thinking')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                      <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse delay-75" />
                      <span className="w-2 h-2 rounded-full bg-blue-300 animate-pulse delay-150" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input Form Bar */}
            <div className="p-3.5 border-t border-slate-100 bg-white">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage(inputMessage);
                }}
                className="space-y-2"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={t('copilot:chat.placeholder')}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    disabled={isSending}
                    maxLength={1000}
                    className="flex-1 border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all disabled:opacity-50"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={!inputMessage.trim() || isSending}
                    leftIcon={<Send className="w-3.5 h-3.5" />}
                    className="px-4 py-2.5"
                  >
                    {t('copilot:chat.send')}
                  </Button>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                  <span>
                    {t('copilot:chat.disclaimer')}
                  </span>
                  <span>{formatNumber(inputMessage.length)} / {formatNumber(1000)}</span>
                </div>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
