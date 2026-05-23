import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { prisma } from '@/lib/db'
import { generateWeek1Report } from '@/lib/email/week1-report'
import { renderWeek1Email } from '@/lib/email/templates'

const resend = new Resend(process.env.RESEND_API_KEY)

function validateCronSecret(incoming: string): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  try {
    const a = Buffer.from(incoming)
    const b = Buffer.from(expected)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  try {
    const secret = req.headers.get('x-cron-secret') ?? ''
    if (!validateCronSecret(secret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000)

    const users = await prisma.user.findMany({
      where: {
        week1ReportSent: false,
        createdAt: { gte: eightDaysAgo, lte: sevenDaysAgo },
        workspace: { knowledgeItems: { some: {} } },
      },
      select: {
        id: true,
        name: true,
        email: true,
        workspace: { select: { id: true } },
      },
    })

    let processed = 0

    for (const user of users) {
      if (!user.workspace) continue
      try {
        const data = await generateWeek1Report(user.workspace.id)
        const html = renderWeek1Email(data, user.name ?? '')

        await resend.emails.send({
          from: 'Neuron <hello@neuron.app>',
          to: user.email,
          subject: "Here's what Neuron learned about how you work",
          html,
        })

        await prisma.user.update({
          where: { id: user.id },
          data: { week1ReportSent: true, week1SentAt: now },
        })

        processed++
      } catch (err) {
        console.error(`[cron/week1] Failed for user ${user.id}`, err)
      }
    }

    return NextResponse.json({ processed })
  } catch (err) {
    console.error('[cron/week1]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
