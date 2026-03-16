type SidebarChatListSkeletonProps = {
  rows?: number
}

export function SidebarChatListSkeleton({ rows = 6 }: SidebarChatListSkeletonProps) {
  return (
    <div className="sidebar-chat-skeleton" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={`sidebar-skeleton-${index}`} className="sidebar-chat-skeleton-row">
          <span className="sidebar-chat-skeleton-line" />
        </div>
      ))}
    </div>
  )
}
