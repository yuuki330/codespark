export type Notification = {
  id: string
  type: 'success' | 'error'
  message: string
}

type NotificationCenterProps = {
  notifications: Notification[]
}

export function NotificationCenter({ notifications }: NotificationCenterProps) {
  if (notifications.length === 0) {
    return null
  }

  return (
    <div className='toast-stack' role='status' aria-live='polite'>
      {notifications.map(notification => (
        <div key={notification.id} className={`toast toast--${notification.type}`}>
          {notification.message}
        </div>
      ))}
    </div>
  )
}
