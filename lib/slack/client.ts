import { WebClient } from '@slack/web-api'

export function createSlackClient(token: string): WebClient {
  return new WebClient(token)
}

export interface SlackMessage {
  ts: string
  text: string
  user: string
  channel: string
}

export async function fetchChannelMessages(
  client: WebClient,
  channelId: string,
  oldest?: string
): Promise<SlackMessage[]> {
  const result = await client.conversations.history({
    channel: channelId,
    oldest,
    limit: 200,
  })

  return (result.messages ?? [])
    .filter((m) => m.text && m.user)
    .map((m) => ({
      ts: m.ts ?? '',
      text: m.text ?? '',
      user: m.user ?? '',
      channel: channelId,
    }))
}
