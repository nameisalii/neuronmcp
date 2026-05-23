import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import DashboardShell from './DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  let user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, email: true, onboardingCompleted: true, workspace: { select: { id: true } } },
  })

  if (!user) {
    const clerkUser = await currentUser()
    if (clerkUser) {
      const email = clerkUser.emailAddresses[0]?.emailAddress ?? ''
      const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null
      user = await prisma.user.create({
        data: {
          clerkId: userId,
          email,
          name,
          workspace: { create: { name: name ? `${name}'s Brain` : 'My Brain' } },
        },
        select: { id: true, email: true, onboardingCompleted: true, workspace: { select: { id: true } } },
      })
    }
  }

  if (user && !user.onboardingCompleted) {
    const workspaceHasItems = user.workspace
      ? (await prisma.knowledgeItem.count({ where: { workspaceId: user.workspace.id } })) > 0
      : false
    if (workspaceHasItems) {
      await prisma.user.update({ where: { id: user.id }, data: { onboardingCompleted: true } })
    } else {
      redirect('/onboarding')
    }
  }

  const workspaceId = user?.workspace?.id
  const [knowledgeCount, decisionCount, ideaCount] = workspaceId
    ? await Promise.all([
        prisma.knowledgeItem.count({ where: { workspaceId } }),
        prisma.decision.count({ where: { workspaceId } }),
        prisma.idea.count({ where: { workspaceId } }),
      ])
    : [0, 0, 0]

  return (
    <DashboardShell counts={{ brain: knowledgeCount, decisions: decisionCount, ideas: ideaCount }}>
      {children}
    </DashboardShell>
  )
}
