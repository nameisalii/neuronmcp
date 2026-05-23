import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PATCH() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await prisma.user.update({
      where: { clerkId: userId },
      data: { onboardingCompleted: true },
    })

    return NextResponse.json({ completed: true })
  } catch (err) {
    console.error('[user/onboarding-complete]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
