export function ChatLoadingSkeleton() {
  return (
    <div className="chat-loading-shell" aria-hidden="true">
      <div className="chat-loading-scroll">
        <div className="chat-loading-row assistant">
          <span className="chat-loading-line long" />
          <span className="chat-loading-line medium" />
        </div>
        <div className="chat-loading-row user">
          <span className="chat-loading-line short" />
        </div>
        <div className="chat-loading-row assistant">
          <span className="chat-loading-line medium" />
          <span className="chat-loading-line short" />
        </div>
      </div>
      <div className="chat-loading-composer">
        <span className="chat-loading-line full" />
      </div>
    </div>
  )
}
