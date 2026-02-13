// TemplateSkeleton: Skeleton loader for template cards in the TemplateList view.
// Usage: <TemplateSkeleton />
// Styling: Uses TemplateList.module.css for skeleton classes.
import style from './TemplateList.module.css';

export function TemplateSkeleton() {
  return (
    <div className={style['template-card'] + ' ' + style['skeleton']}>
      <div className={style['template-card-top']}>
        <div className={style['template-badge'] + ' ' + style['skeleton-box']} />
        <div className={style['template-card-actions']}>
          <div className={style['template-action'] + ' ' + style['skeleton-box']} style={{ width: 32, height: 32 }} />
          <div className={style['template-action'] + ' ' + style['skeleton-box']} style={{ width: 32, height: 32 }} />
        </div>
      </div>
      <div className={style['template-card-body']}>
        <div className={style['skeleton-box']} style={{ width: '70%', height: 18, marginBottom: 8 }} />
        <div className={style['skeleton-box']} style={{ width: '90%', height: 14 }} />
      </div>
      <div className={style['template-card-footer']}>
        <div className={style['skeleton-box']} style={{ width: 60, height: 12 }} />
        <div className={style['skeleton-box']} style={{ width: 80, height: 12 }} />
      </div>
    </div>
  )
}
