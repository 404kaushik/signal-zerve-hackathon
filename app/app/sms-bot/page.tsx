'use client'

import { useMemo, useState } from 'react'
import { MessageSquare, Radio, Send, Smartphone } from 'lucide-react'
import { TerminalPanel, MetricBox } from '@/components/worldlens/terminal-panel'
import { useAPI } from '@/hooks/use-api'
import { connectSmsBot, getSmsBotStatus, sendSmsBotTest } from '@/lib/api'

export default function SmsBotPage() {
  const { data: status, loading, error, refetch } = useAPI(getSmsBotStatus)
  const [telegramUserId, setTelegramUserId] = useState('')
  const [telegramChatId, setTelegramChatId] = useState('')
  const [username, setUsername] = useState('')
  const [connectBusy, setConnectBusy] = useState(false)
  const [testBusy, setTestBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const transportReady = useMemo(() => {
    if (!status) return false
    if (!status.grok_configured) return false
    return status.telegram_configured
  }, [status])

  const readiness = useMemo(() => {
    if (!status) return 'UNKNOWN'
    if (!transportReady) return 'OFFLINE'
    return 'READY'
  }, [status, transportReady])

  const onConnect = async () => {
    try {
      setConnectBusy(true)
      setErr(null)
      setNotice(null)
      const uid = Number(telegramUserId.trim())
      const cid = Number(telegramChatId.trim())
      if (!Number.isFinite(uid) || !Number.isFinite(cid)) {
        setErr('telegram_user_id and telegram_chat_id must be numbers')
        return
      }
      const connected = await connectSmsBot({
        telegram_user_id: uid,
        telegram_chat_id: cid,
        username: username.trim() || undefined,
      })
      setNotice(
        `Linked Telegram user ${connected.telegram_user_id} (chat ${connected.telegram_chat_id}).`,
      )
      await refetch()
    } catch (e: any) {
      setErr(e?.message || 'Connection failed')
    } finally {
      setConnectBusy(false)
    }
  }

  const onSendTest = async () => {
    try {
      setTestBusy(true)
      setErr(null)
      setNotice(null)
      const raw = telegramChatId.trim() || String(status?.latest_user?.telegram_chat_id ?? '')
      const cid = Number(raw)
      if (!Number.isFinite(cid)) {
        setErr('Enter telegram_chat_id or link a user first')
        return
      }
      const res = await sendSmsBotTest({ telegram_chat_id: cid })
      const id = res.sent.sid ?? 'n/a'
      setNotice(`Test sent (Telegram message id ${id}).`)
      await refetch()
    } catch (e: any) {
      setErr(e?.message || 'Test send failed')
    } finally {
      setTestBusy(false)
    }
  }

  const canSubmitIds = Boolean(telegramUserId.trim() && telegramChatId.trim())
  const canSendTest = Boolean((telegramChatId.trim() || status?.latest_user?.telegram_chat_id) && transportReady)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[9px] tracking-[0.3em] text-[#555555] mb-1">INTELLIGENCE LAYERS</div>
          <h1 className="text-xl tracking-[0.15em] font-light">TELEGRAM BOT</h1>
        </div>
        <div className="text-[9px] tracking-[0.2em] text-[#666666] animate-pulse">LIVE LINK</div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricBox label="Bot Status" value={readiness} />
        <MetricBox label="Telegram" value={status?.telegram_configured ? 'READY' : 'OFFLINE'} />
        <MetricBox label="Grok" value={status?.grok_configured ? 'ONLINE' : 'OFFLINE'} />
        <MetricBox label="Linked Chats" value={status?.connected_users ?? (loading ? '...' : 0)} />
      </div>

      <TerminalPanel
        title="TELEGRAM LINK"
        subtitle="Same Grok + live market stack as before; free Telegram transport"
        status={readiness === 'READY' ? 'active' : 'alert'}
        headerRight={
          <div className="text-[9px] tracking-[0.12em] text-[#666666] flex items-center gap-2">
            <Radio className="h-3 w-3" />
            {status?.timestamp ? `UPDATED ${new Date(status.timestamp).toLocaleTimeString()}` : 'WAITING'}
          </div>
        }
      >
        <div className="space-y-4">
          {!transportReady && status && (
            <div className="text-[10px] text-[#888888] border border-[#1a1a1a] bg-[#050505] px-3 py-2">
              Set TELEGRAM_BOT_TOKEN and Grok (GROK_API_KEY or XAI_API_KEY) on the API. Conversation memory is
              in-process and resets on backend restart.
            </div>
          )}

          <div className="text-[10px] text-[#666666] leading-relaxed">
            Message your bot in Telegram (DM). Webhook must point to{' '}
            <span className="text-[#888888]">POST /api/sms-bot/webhook/telegram</span> on your public API URL.
            For private chats, <span className="text-[#888888]">telegram_user_id</span> and{' '}
            <span className="text-[#888888]">telegram_chat_id</span> are usually the same (open @userinfobot to
            confirm). Optional: set TELEGRAM_WEBHOOK_SECRET and pass it as{' '}
            <span className="text-[#888888]">secret_token</span> in setWebhook.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="border border-[#1a1a1a] bg-[#050505] px-3 py-2 flex items-center gap-2">
              <Smartphone className="h-3.5 w-3.5 text-[#666666]" />
              <input
                type="text"
                value={telegramUserId}
                onChange={(e) => setTelegramUserId(e.target.value)}
                placeholder="telegram_user_id"
                className="w-full bg-transparent text-[11px] text-[#dddddd] placeholder:text-[#555555] focus:outline-none"
              />
            </div>
            <div className="border border-[#1a1a1a] bg-[#050505] px-3 py-2 flex items-center gap-2">
              <Smartphone className="h-3.5 w-3.5 text-[#666666]" />
              <input
                type="text"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="telegram_chat_id"
                className="w-full bg-transparent text-[11px] text-[#dddddd] placeholder:text-[#555555] focus:outline-none"
              />
            </div>
            <div className="border border-[#1a1a1a] bg-[#050505] px-3 py-2 flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5 text-[#666666]" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="@username (optional)"
                className="w-full bg-transparent text-[11px] text-[#dddddd] placeholder:text-[#555555] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={loading || connectBusy || testBusy}
              className="px-4 py-2 border border-[#2a2a2a] text-[10px] tracking-[0.15em] text-[#cccccc] disabled:opacity-40 disabled:pointer-events-none hover:border-[#4a4a4a]"
            >
              {loading ? 'REFRESHING...' : 'REFRESH STATUS'}
            </button>
            <button
              type="button"
              onClick={() => void onConnect()}
              disabled={connectBusy || !canSubmitIds || !transportReady}
              className="px-4 py-2 border border-[#2a2a2a] text-[10px] tracking-[0.15em] text-[#cccccc] disabled:opacity-40 disabled:pointer-events-none hover:border-[#4a4a4a]"
            >
              {connectBusy ? 'LINKING...' : 'LINK (OPTIONAL)'}
            </button>
            <button
              type="button"
              onClick={() => void onSendTest()}
              disabled={testBusy || !canSendTest}
              className="px-4 py-2 border border-[#2a2a2a] text-[10px] tracking-[0.15em] text-[#cccccc] disabled:opacity-40 disabled:pointer-events-none hover:border-[#4a4a4a] flex items-center gap-2"
            >
              <Send className="h-3 w-3" />
              {testBusy ? 'SENDING...' : 'SEND TEST'}
            </button>
          </div>

          {status?.latest_user?.telegram_user_id != null && (
            <div className="text-[10px] text-[#777777] border-t border-[#111111] pt-3">
              Last linked: user {status.latest_user.telegram_user_id} / chat {status.latest_user.telegram_chat_id}
              {status.latest_user.username ? ` (@${status.latest_user.username})` : ''} at{' '}
              {new Date(status.latest_user.updated_at).toLocaleString()}
            </div>
          )}
          {notice && <div className="text-[10px] text-[#bbbbbb]">{notice}</div>}
          {(err || error) && <div className="text-[10px] text-[#c45050]">{err || error}</div>}
        </div>
      </TerminalPanel>

      <TerminalPanel title="OPERATOR NOTES" subtitle="Webhook setup" status="active">
        <div className="text-[10px] text-[#666666] space-y-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-3 w-3" />
            Telegram setWebhook:{' '}
            <span className="text-[#888888] break-all">https://api.telegram.org/bot&lt;TOKEN&gt;/setWebhook</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-3 w-3" />
            Webhook URL path: <span className="text-[#888888]">/api/sms-bot/webhook/telegram</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-3 w-3" />
            Conversation memory is process-local per Telegram user id (<span className="text-[#888888]">tg:&lt;id&gt;</span>).
          </div>
        </div>
      </TerminalPanel>
    </div>
  )
}
