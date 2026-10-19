import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/common/Card';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/common/Button';
import {
  Bot,
  Send,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Compass,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface ExamplePrompt {
  question: string;
  category: string;
  simulatedAnswer: string;
}

const examplePrompts: ExamplePrompt[] = [
  {
    category: 'Runway & Hiring',
    question: 'Can we afford to hire 2 new operations specialists ($8,000/mo) without dropping below our 3-month runway buffer?',
    simulatedAnswer:
      '[Illustrative Demo Response]\nBased on Apex Supply Chain\'s current 90-day cash velocity and $148,250 operating cash, adding $8,000/mo fixed payroll reduces your projected runway from 5.4 months to 4.1 months.\n\nKey Recommendation: Safe to proceed, provided the $24,500 overdue receivable from Vanguard Retail is collected before next month\'s payroll run.',
  },
  {
    category: 'Receivables Risk',
    question: 'Which unpaid invoices present the highest risk of causing a negative cash balance in the next 30 days?',
    simulatedAnswer:
      '[Illustrative Demo Response]\nInvoice #INV-2041 with Vanguard Retail Corp ($24,500) represents 56% of your total outstanding receivables and is currently 18 days overdue. A 14-day delay in settlement will temporarily compress your operational liquidity margin.',
  },
  {
    category: 'Working Capital',
    question: 'Should we accept a 2% early payment discount from our freight supplier or preserve cash?',
    simulatedAnswer:
      '[Illustrative Demo Response]\nAccepting the 2% 10-net-30 discount yields an annualized return on cash of ~36.7%. Because your current runway exceeds 5 months, capturing this supplier discount is accretive to margins.',
  },
];

export const CopilotPage: React.FC = () => {
  const [selectedPrompt, setSelectedPrompt] = useState<ExamplePrompt>(examplePrompts[0]);
  const [customInput, setCustomInput] = useState('');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              AI Finance Copilot
            </h1>
            <StatusBadge variant="demo" size="md">
              Interactive Preview
            </StatusBadge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Natural language conversational assistant for SME cash flow and strategy simulations
          </p>
        </div>

        <Link to="/dashboard">
          <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
            Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Development Notice */}
      <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-4 text-xs text-indigo-950 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-indigo-900">
            Step 1 Preview & Architectural Blueprint
          </p>
          <p className="text-indigo-800 leading-relaxed">
            The full Gemini AI reasoning pipeline, live bank API connectors, and vector knowledge
            retrieval are scheduled for future development phases. This page provides an interactive
            demonstration of the intended conversational interface and illustrative responses.
          </p>
        </div>
      </div>

      {/* Main Copilot Shell */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Suggested Prompts Column */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Simulated SME Questions
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Click a sample query below to preview how FinPilot AI synthesizes financial data:
            </p>

            <div className="space-y-2">
              {examplePrompts.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedPrompt(item)}
                  className={`w-full text-left p-3 rounded-lg border text-xs transition-all ${
                    selectedPrompt.question === item.question
                      ? 'border-blue-300 bg-blue-50/80 text-blue-900 shadow-subtle'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-blue-600 mb-1">
                    {item.category}
                  </span>
                  <span className="font-medium line-clamp-2">{item.question}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Chat / Simulation Conversation Column */}
        <div className="lg:col-span-2">
          <Card className="flex flex-col h-[520px]">
            <CardHeader className="py-3 px-5 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm">FinPilot Copilot Assistant</CardTitle>
                  <CardDescription className="text-[11px]">
                    Context: Apex Supply Chain Co. (Illustrative Demo Data)
                  </CardDescription>
                </div>
              </div>
              <StatusBadge variant="demo" size="sm">
                Sandbox Mode
              </StatusBadge>
            </CardHeader>

            {/* Conversation Stream */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/30">
              {/* User Message Bubble */}
              <div className="flex justify-end">
                <div className="max-w-md bg-blue-600 text-white rounded-2xl rounded-tr-none px-4 py-3 text-xs shadow-sm leading-relaxed">
                  {selectedPrompt.question}
                </div>
              </div>

              {/* Copilot Response Bubble */}
              <div className="flex justify-start items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0 mt-1">
                  <Compass className="w-3.5 h-3.5" />
                </div>
                <div className="max-w-lg bg-white border border-slate-200/90 rounded-2xl rounded-tl-none p-4 text-xs text-slate-800 shadow-subtle space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      FinPilot Intelligence Engine
                    </span>
                    <StatusBadge variant="demo" size="sm">
                      Demo Preview
                    </StatusBadge>
                  </div>
                  <div className="whitespace-pre-line text-slate-700 leading-relaxed">
                    {selectedPrompt.simulatedAnswer}
                  </div>
                </div>
              </div>
            </div>

            {/* Input bar */}
            <div className="p-3 border-t border-slate-100 bg-white">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!customInput.trim()) return;
                  setSelectedPrompt({
                    category: 'Custom Question',
                    question: customInput,
                    simulatedAnswer: `[Illustrative Demo Response]\nFinPilot AI has parsed your question: "${customInput}".\n\nIn Step 2 with live model integration, this will generate full scenario forecasts with real-time financial citations.`,
                  });
                  setCustomInput('');
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Ask a financial question (e.g. Can I afford payroll this month?)..."
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  className="flex-1 border border-slate-200 rounded-lg px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  leftIcon={<Send className="w-3.5 h-3.5" />}
                >
                  Send
                </Button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
