'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/button'

type Step = 1 | 2 | 3 | 4
type WorkspaceType = 'solo_founder' | 'freelancer' | 'team_member'

const PERSONAS: Array<{ value: WorkspaceType; label: string; description: string }> = [
  { value: 'solo_founder', label: 'Solo founder', description: 'Building something, making decisions daily' },
  { value: 'freelancer', label: 'Freelancer', description: 'Working with multiple clients' },
  { value: 'team_member', label: 'Team member', description: 'Part of a growing company' },
]

const PREFILLED_QUESTIONS: Record<WorkspaceType, string> = {
  solo_founder: 'What decisions have I made this week?',
  freelancer: 'What have I agreed to with my clients?',
  team_member: 'How do we deploy to production?',
}

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {([1, 2, 3, 4] as Step[]).map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={clsx(
              'w-2 h-2 rounded-full transition-colors',
              s === current ? 'bg-gray-900' : s < current ? 'bg-gray-400' : 'bg-gray-200'
            )}
          />
        </div>
      ))}
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType>('solo_founder')
  const [slackConnected, setSlackConnected] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncCount, setSyncCount] = useState<number | null>(null)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [querying, setQuerying] = useState(false)
  const [completing, setCompleting] = useState(false)

  async function handlePersonaSelect(type: WorkspaceType) {
    setWorkspaceType(type)
    await fetch('/api/user/workspace-type', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceType: type }),
    })
    setStep(2)
  }

  async function handleStep3Enter() {
    if (!slackConnected) {
      setStep(3)
      return
    }
    setStep(3)
    setSyncing(true)
    try {
      const res = await fetch('/api/integrations/slack/sync', { method: 'POST' })
      const data = await res.json()
      setSyncCount(data.extracted ?? 0)
    } catch {
      setSyncCount(0)
    } finally {
      setSyncing(false)
    }
  }

  async function handleQuery() {
    if (!question.trim()) return
    setQuerying(true)
    setAnswer('')
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      const data = await res.json()
      setAnswer(data.answer ?? '')
    } catch {
      setAnswer('Could not get an answer right now.')
    } finally {
      setQuerying(false)
    }
  }

  async function handleFinish() {
    setCompleting(true)
    await fetch('/api/user/onboarding-complete', { method: 'PATCH' })
    router.push('/dashboard')
  }

  return (
    <div className="w-full max-w-lg">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
        <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-6">
          Neuron — Setup
        </p>
        <StepIndicator current={step} />

        {/* Step 1 — Persona */}
        {step === 1 && (
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">What describes you best?</h1>
            <p className="text-sm text-gray-500 mb-6">
              This helps Neuron tailor what it captures for you.
            </p>
            <div className="space-y-3">
              {PERSONAS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => handlePersonaSelect(p.value)}
                  className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-colors group"
                >
                  <p className="font-semibold text-gray-900 text-sm group-hover:text-gray-900">
                    {p.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{p.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — Connect Slack */}
        {step === 2 && (
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Connect your first tool</h1>
            <p className="text-sm text-gray-500 mb-6">
              Neuron reads your Slack and extracts knowledge automatically.
            </p>
            {slackConnected ? (
              <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-lg mb-4">
                <span className="text-emerald-600 font-semibold text-sm">✓ Slack connected</span>
              </div>
            ) : (
              <a
                href="/api/integrations/slack/connect"
                className="flex items-center justify-center gap-3 w-full p-4 bg-[#4A154B] text-white rounded-lg font-semibold text-sm hover:bg-[#3b1040] transition-colors mb-4"
                onClick={() => setSlackConnected(true)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.687 8.834a2.528 2.528 0 0 1-2.521 2.521 2.527 2.527 0 0 1-2.521-2.521V2.522A2.527 2.527 0 0 1 15.166 0a2.528 2.528 0 0 1 2.521 2.522v6.312zM15.166 18.956a2.528 2.528 0 0 1 2.521 2.522A2.528 2.528 0 0 1 15.166 24a2.527 2.527 0 0 1-2.521-2.522v-2.522h2.521zM15.166 17.687a2.527 2.527 0 0 1-2.521-2.521 2.526 2.526 0 0 1 2.521-2.521h6.313A2.527 2.527 0 0 1 24 15.166a2.528 2.528 0 0 1-2.521 2.521h-6.313z"/>
                </svg>
                Connect Slack
              </a>
            )}
            <button
              onClick={handleStep3Enter}
              className="text-sm text-gray-400 hover:text-gray-600 w-full text-center transition-colors"
            >
              Skip for now →
            </button>
          </div>
        )}

        {/* Step 3 — Sync */}
        {step === 3 && (
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Let Neuron read for a bit</h1>
            {slackConnected ? (
              <div>
                {syncing ? (
                  <div className="space-y-4 py-4">
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gray-900 rounded-full animate-pulse w-3/4" />
                    </div>
                    <p className="text-sm text-gray-500">Extracting knowledge from your workspace…</p>
                  </div>
                ) : syncCount !== null ? (
                  <div className="py-4">
                    <p className="text-2xl font-bold text-gray-900 mb-1">
                      Found {syncCount} knowledge item{syncCount !== 1 ? 's' : ''}!
                    </p>
                    <p className="text-sm text-gray-500">Neuron has started building your company brain.</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 py-4">Starting sync…</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-4">
                You can connect Slack anytime from the Integrations page.
              </p>
            )}
            <Button
              onClick={() => {
                setQuestion(PREFILLED_QUESTIONS[workspaceType])
                setStep(4)
              }}
              disabled={slackConnected && syncing}
              className="mt-4 w-full justify-center"
            >
              Continue →
            </Button>
          </div>
        )}

        {/* Step 4 — First query */}
        {step === 4 && (
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Ask your first question</h1>
            <p className="text-sm text-gray-500 mb-4">
              Try asking Neuron something. It will answer from what it learned.
            </p>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-gray-900 mb-3"
            />
            <Button
              onClick={handleQuery}
              disabled={querying || !question.trim()}
              className="w-full justify-center mb-4"
            >
              {querying ? 'Thinking…' : 'Ask →'}
            </Button>
            {answer && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4">
                <p className="text-sm text-gray-700 leading-relaxed">{answer}</p>
              </div>
            )}
            <Button
              variant="secondary"
              onClick={handleFinish}
              disabled={completing}
              className="w-full justify-center"
            >
              {completing ? 'Setting up…' : 'Go to your brain →'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
