import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Slack } from 'lucide-react'
import Link from 'next/link'
import SyncButton from './SyncButton'

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: { success?: string; error?: string }
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { workspace: { include: { integrations: true } } },
  })

  const slack = user?.workspace?.integrations.find((i) => i.type === 'slack') ?? null

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>

      {searchParams.success === 'slack' && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-md">
          <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
          <p className="text-sm text-green-800">Slack connected successfully.</p>
        </div>
      )}

      {searchParams.error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">
            {searchParams.error === 'slack_failed' && 'Slack connection failed. Please try again.'}
            {searchParams.error === 'no_workspace' && 'No workspace found. Please contact support.'}
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <Link
          href="/dashboard/email-preview"
          className="px-3 py-1.5 rounded-md border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Email Preview
        </Link>
      </div>

      <Card padding="md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#4A154B] flex items-center justify-center shrink-0">
                <Slack className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle>Slack</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  {slack
                    ? `Connected to ${slack.teamName ?? 'your workspace'}`
                    : 'Connect your Slack workspace'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {slack ? (
                <>
                  <SyncButton />
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                    <CheckCircle className="w-3 h-3" />
                    Connected
                  </span>
                </>
              ) : (
                <a
                  href="/api/integrations/slack/connect"
                  className="px-3 py-1.5 rounded-md bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
                >
                  Connect
                </a>
              )}
            </div>
          </div>
        </CardHeader>

        {slack && (
          <div className="mt-4 space-y-3 text-sm text-gray-600">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-md px-3 py-2">
                <p className="text-xs text-gray-400 mb-0.5">Connected</p>
                <p className="font-medium text-gray-700">
                  {slack.createdAt.toLocaleDateString()}
                </p>
              </div>
              <div className="bg-gray-50 rounded-md px-3 py-2">
                <p className="text-xs text-gray-400 mb-0.5">Last synced</p>
                <p className="font-medium text-gray-700">
                  {slack.lastSyncAt
                    ? slack.lastSyncAt.toLocaleDateString()
                    : 'Never'}
                </p>
              </div>
            </div>

            {slack.channels.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-1.5">Monitored channels ({slack.channels.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {slack.channels.map((ch) => (
                    <span
                      key={ch}
                      className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 font-mono"
                    >
                      #{ch}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!slack && (
          <p className="text-sm text-gray-600 mt-1">
            Neuron reads your Slack messages and extracts rules, decisions, processes, and ideas automatically.
          </p>
        )}
      </Card>
    </div>
  )
}
