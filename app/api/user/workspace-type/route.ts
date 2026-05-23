import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const BodySchema = z.object({
  workspaceType: z.enum(['solo_founder', 'freelancer', 'team_member']),
})

export async function PATCH(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid workspaceType' }, { status: 400 })
    }

    await prisma.user.update({
      where: { clerkId: userId },
      data: { workspaceType: parsed.data.workspaceType },
    })

    return NextResponse.json({ updated: true })
  } catch (err) {
    console.error('[user/workspace-type]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
