import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { generateWeek1Report } from '@/lib/email/week1-report'
import { renderWeek1Email } from '@/lib/email/templates'
import SendTestButton from './SendTestButton'

export default async function EmailPreviewPage() {
  // TODO: restore NODE_ENV guard before deployment
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { name: true, workspace: { select: { id: true } } },
  })

  if (!user?.workspace) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <p className="text-gray-500">No workspace found.</p>
      </div>
    )
  }

  const data = await generateWeek1Report(user.workspace.id)
  const html = renderWeek1Email(data, user.name ?? '')

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Preview</h1>
          <p className="text-xs text-amber-600 mt-1 font-medium">Development only</p>
        </div>
        <SendTestButton />
      </div>

      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <iframe
          srcDoc={html}
          title="Week 1 email preview"
          className="w-full"
          style={{ height: '700px', border: 'none' }}
        />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Report data</h2>
        <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-700 overflow-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  )
}
