export function TemplateSkeleton() {
  return (
    <div className="template-card skeleton">
      <div className="template-card-top">
        <div className="template-badge skeleton-box" />
        <div className="template-card-actions">
          <div className="template-action skeleton-box" style={{ width: 32, height: 32 }} />
          <div className="template-action skeleton-box" style={{ width: 32, height: 32 }} />
        </div>
      </div>
      <div className="template-card-body">
        <div className="skeleton-box" style={{ width: '70%', height: 18, marginBottom: 8 }} />
        <div className="skeleton-box" style={{ width: '90%', height: 14 }} />
      </div>
      <div className="template-card-footer">
        <div className="skeleton-box" style={{ width: 60, height: 12 }} />
        <div className="skeleton-box" style={{ width: 80, height: 12 }} />
      </div>
    </div>
  )
}
