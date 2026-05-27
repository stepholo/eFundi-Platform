import api from './client'

export const notificationsApi = {
  list: ()       => api.get('/notifications/'),
  markRead: (id) => api.patch(`/notifications/${id}/mark-read/`),
}
