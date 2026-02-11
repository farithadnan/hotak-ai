import { useEffect, useMemo, useState } from 'react'
import { Pencil, Search, Trash2, Plus } from 'lucide-react'
import { deleteTemplate, getTemplates } from '../services'
import { ConfirmDialog } from './ConfirmDialog'
import { Toastr } from './Toastr'
import type { ToastrType } from './Toastr'
import type { Template } from '../types/models'
import { TemplateSkeleton } from './skeletons/TemplateSkeleton'

type TemplateListProps = {
  onCreate?: () => void
  onEdit?: (template: Template) => void
}

const badgePalette = ['#4C9F9E', '#E88D67', '#7E9CD8', '#D16D8C', '#8FB996', '#D4A373']

const hashString = (value: string) => {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '')
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const getInitials = (name: string) => {
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length === 0) {
    return 'T'
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

const formatDate = (value: string | null) => {
  if (!value) {
    return 'Never edited'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Unknown'
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function TemplateList({ onCreate, onEdit }: TemplateListProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Template | null>(null)
  const [toastrOpen, setToastrOpen] = useState(false)
  const [toastrMsg, setToastrMsg] = useState('')
  const [toastrType, setToastrType] = useState<ToastrType>('info')

  const showToastr = (msg: string, type: ToastrType = 'info') => {
    setToastrMsg(msg)
    setToastrType(type)
    setToastrOpen(true)
  }

  useEffect(() => {
    void loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getTemplates()
      setTemplates(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load templates')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredTemplates = useMemo(() => {
    const query = searchValue.trim().toLowerCase()
    if (!query) {
      return templates
    }
    return templates.filter((template) => {
      const name = template.name.toLowerCase()
      const description = template.description?.toLowerCase() || ''
      return name.includes(query) || description.includes(query)
    })
  }, [searchValue, templates])

  const handleDeleteClick = (template: Template) => {
    setPendingDelete(template)
    setConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return
    setConfirmOpen(false)
    try {
      await deleteTemplate(pendingDelete.id)
      await loadTemplates()
      setPendingDelete(null)
      showToastr('Template deleted', 'success')
    } catch (err: any) {
      setError(err.message || 'Failed to delete template')
      showToastr(err.message || 'Failed to delete template', 'error')
    }
  }

  const handleCancelDelete = () => {
    setConfirmOpen(false)
    setPendingDelete(null)
  }

  return (
    <div className="template-view">
      <div className="template-header">
        <div className="template-header-left">
          <h2>Templates</h2>
          <span className="template-count">{filteredTemplates.length} templates</span>
        </div>
        <div className="template-header-right">
          <label className="template-search" aria-label="Search templates">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search templates"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
            />
          </label>
          <button className="primary-button template-create" type="button" onClick={onCreate}>
            <Plus size={16} />
            <span>New Template</span>
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="template-grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <TemplateSkeleton key={i} />
          ))}
        </div>
      )}
      {error && <div className="template-state is-error">{error}</div>}

      {!isLoading && !error && filteredTemplates.length === 0 && (
        <div className="template-empty">
          <div>
            <h3>No templates yet</h3>
            <p>Create your first knowledge template to reuse across chats.</p>
          </div>
        </div>
      )}

      {!isLoading && !error && filteredTemplates.length > 0 && (
        <div className="template-grid">
          {filteredTemplates.map((template) => {
            const badgeIndex = hashString(template.name) % badgePalette.length
            const badgeColor = badgePalette[badgeIndex]
            const sourceCount = template.source_count ?? template.sources?.length ?? 0
            const updatedLabel = template.updated_at
              ? `Edited ${formatDate(template.updated_at)}`
              : `Created ${formatDate(template.created_at)}`

            return (
              <div key={template.id} className="template-card">
                <div className="template-card-top">
                  <div
                    className="template-badge"
                    style={{
                      backgroundColor: hexToRgba(badgeColor, 0.18),
                      borderColor: hexToRgba(badgeColor, 0.5),
                      color: badgeColor,
                    }}
                  >
                    {getInitials(template.name)}
                  </div>
                  <div className="template-card-actions">
                    <button
                      className="template-action"
                      type="button"
                      title="Edit template"
                      onClick={() => onEdit?.(template)}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="template-action is-danger"
                      type="button"
                      title="Delete template"
                      onClick={() => handleDeleteClick(template)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="template-card-body">
                  <h3>{template.name}</h3>
                  <p>{template.description || 'No description yet.'}</p>
                </div>
                <div className="template-card-footer">
                  <span className="template-meta">{sourceCount} sources</span>
                  <span className="template-meta">{updatedLabel}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Template"
        message={pendingDelete ? `Delete "${pendingDelete.name}"? This cannot be undone.` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
      <Toastr open={toastrOpen} message={toastrMsg} type={toastrType} onClose={() => setToastrOpen(false)} />
    </div>
  )
}

export default TemplateList