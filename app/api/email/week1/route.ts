import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { prisma } from '@/lib/db'
import { generateWeek1Report } from '@/lib/email/week1-report'
import { renderWeek1Email } from '@/lib/email/templates'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const preview = req.nextUrl.searchParams.get('preview') === 'true'
    if (!preview) return NextResponse.json({ error: 'Bad request' }, { status: 400 })

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { name: true, workspace: { select: { id: true } } },
    })
    if (!user?.workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    const data = await generateWeek1Report(user.workspace.id)
    const html = renderWeek1Email(data, user.name ?? '')

    return NextResponse.json({ html, data })
  } catch (err) {
    console.error('[email/week1 GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { name: true, email: true, workspace: { select: { id: true } } },
    })
    if (!user?.workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    const data = await generateWeek1Report(user.workspace.id)
    const html = renderWeek1Email(data, user.name ?? '')

    await resend.emails.send({
      from: 'Neuron <hello@neuron.app>',
      to: user.email,
      subject: "Here's what Neuron learned about how you work",
      html,
    })

    return NextResponse.json({ sent: true, preview: data })
  } catch (err) {
    console.error('[email/week1 POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
