import { useState } from 'react'
import { Trash2, MessageSquarePlus } from 'lucide-react'
import { KeyResultProgress } from './KeyResultProgress'
import { CheckinForm } from '../checkins/CheckinForm'
import { CheckinHistory } from '../checkins/CheckinHistory'
import type { KeyResult, CreateCheckinInput } from '../../types'

interface KeyResultRowProps {
  keyResult: KeyResult
  onCheckin?: (kr: KeyResult, data: CreateCheckinInput) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  isOwner?: boolean
}

export function KeyResultRow({ keyResult, onCheckin, onDelete, isOwner }: KeyResultRowProps) {
  const [checkinOpen, setCheckinOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  async function handleCheckin(data: CreateCheckinInput) {
    await onCheckin?.(keyResult, data)
  }

  return (
    <>
      <div className="group">
        <div className="flex items-start gap-3 py-2">
          <div className="flex-1 min-w-0">
            <button
              onClick={() => setHistoryOpen((o) => !o)}
              className="text-sm text-gray-700 text-left hover:text-indigo-600 transition-colors font-medium"
            >
              {keyResult.title}
            </button>
            <div className="mt-1.5">
              <KeyResultProgress kr={keyResult} />
            </div>
          </div>
          {isOwner && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setCheckinOpen(true)}
                className="rounded p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                title="Check in"
              >
                <MessageSquarePlus size={14} />
              </button>
              {onDelete && (
                <button
                  onClick={() => onDelete(keyResult.id)}
                  className="rounded p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )}
        </div>
        {historyOpen && (
          <div className="ml-2 mb-2 pl-3 border-l-2 border-gray-100">
            <CheckinHistory keyResult={keyResult} />
          </div>
        )}
      </div>

      <CheckinForm
        open={checkinOpen}
        onClose={() => setCheckinOpen(false)}
        keyResult={keyResult}
        onSubmit={handleCheckin}
      />
    </>
  )
}
