import { useState, useEffect, useMemo } from 'react'
import { Modal } from '../Modal/Modal'
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog'
import { getArchivedChats, updateChat, deleteChat } from '../../../services/chats'
import type { Chat } from '../../../types/models'
import style from './ArchivedChatsModal.module.css'

type ArchivedChatsModalProps = {
  open: boolean
  onClose: () => void
  onUnarchive: (chat: Chat) => void
  onShowToastr: (options: { title?: string; message?: string; type?: 'success' | 'error' | 'info' }) => void
}

type BulkConfirm = 'delete-all' | null

export function ArchivedChatsModal({ open, onClose, onUnarchive, onShowToastr }: ArchivedChatsModalProps) {
  const [archivedChats, setArchivedChats] = useState<Chat[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [bulkConfirm, setBulkConfirm] = useState<BulkConfirm>(null)

  useEffect(() => {
    if (!open) return
    setSearch('')
    setIsLoading(true)
    getArchivedChats()
      .then(setArchivedChats)
      .catch(() => onShowToastr({ title: 'Error', message: 'Failed to load archived chats.', type: 'error' }))
      .finally(() => setIsLoading(false))
  }, [open])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return archivedChats
    return archivedChats.filter((c) => c.title.toLowerCase().includes(q))
  }, [search, archivedChats])

  const handleUnarchive = async (chat: Chat) => {
    try {
      const updated = await updateChat(chat.id, { archived: false })
      setArchivedChats((prev) => prev.filter((c) => c.id !== chat.id))
      onUnarchive(updated)
      onShowToastr({ title: 'Unarchived', message: `"${chat.title}" moved back to chats.`, type: 'success' })
    } catch {
      onShowToastr({ title: 'Error', message: 'Failed to unarchive chat.', type: 'error' })
    }
  }

  const handleDelete = async (chat: Chat) => {
    try {
      await deleteChat(chat.id)
      setArchivedChats((prev) => prev.filter((c) => c.id !== chat.id))
      onShowToastr({ title: 'Deleted', message: `"${chat.title}" deleted.`, type: 'success' })
    } catch {
      onShowToastr({ title: 'Error', message: 'Failed to delete chat.', type: 'error' })
    }
  }

  const handleUnarchiveAll = async () => {
    const results = await Promise.allSettled(archivedChats.map((c) => updateChat(c.id, { archived: false })))
    const succeeded: Chat[] = []
    results.forEach((r) => {
      if (r.status === 'fulfilled') succeeded.push(r.value)
    })
    succeeded.forEach(onUnarchive)
    setArchivedChats([])
    onShowToastr({ title: 'Unarchived All', message: `${succeeded.length} chat(s) restored.`, type: 'success' })
  }

  const handleDeleteAll = async () => {
    setBulkConfirm(null)
    const results = await Promise.allSettled(archivedChats.map((c) => deleteChat(c.id)))
    const deletedCount = results.filter((r) => r.status === 'fulfilled').length
    setArchivedChats([])
    onShowToastr({ title: 'Deleted', message: `${deletedCount} archived chat(s) deleted.`, type: 'success' })
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title="Archived Chats">
        <input
          className={style['search-input']}
          type="text"
          placeholder="Search archived chats…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className={style.list}>
          {isLoading && <div className={style.loading}>Loading…</div>}
          {!isLoading && filtered.length === 0 && (
            <div className={style['list-empty']}>
              {search ? 'No archived chats match your search.' : 'No archived chats.'}
            </div>
          )}
          {!isLoading &&
            filtered.map((chat) => (
              <div key={chat.id} className={style['chat-row']}>
                <span className={style['chat-title']} title={chat.title}>
                  {chat.title}
                </span>
                <button
                  className={`${style.btn} ${style['btn-unarchive']}`}
                  type="button"
                  onClick={() => void handleUnarchive(chat)}
                >
                  Unarchive
                </button>
                <button
                  className={`${style.btn} ${style['btn-danger']}`}
                  type="button"
                  onClick={() => void handleDelete(chat)}
                >
                  Delete
                </button>
              </div>
            ))}
        </div>

        {!isLoading && archivedChats.length > 0 && (
          <div className={style.footer}>
            <button
              className={`${style['btn-footer']} ${style['btn-footer-secondary']}`}
              type="button"
              onClick={() => void handleUnarchiveAll()}
            >
              Unarchive All
            </button>
            <button
              className={`${style['btn-footer']} ${style['btn-footer-danger']}`}
              type="button"
              onClick={() => setBulkConfirm('delete-all')}
            >
              Delete All Archived
            </button>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={bulkConfirm === 'delete-all'}
        title="Delete All Archived"
        message={`Permanently delete all ${archivedChats.length} archived chat(s)? This cannot be undone.`}
        confirmText="Delete All"
        cancelText="Cancel"
        onConfirm={() => void handleDeleteAll()}
        onCancel={() => setBulkConfirm(null)}
      />
    </>
  )
}
