import api from './client'

export const reviewsApi = {
  listByTechnician:     (technicianId) => api.get(`/reviews/?technician_id=${technicianId}`),
  listByTechnicianUuid: (userUuid)     => api.get(`/reviews/?technician_user_id=${userUuid}`),
  myReviews:            ()             => api.get('/reviews/?my_reviews=true'),
  create:               (data)         => api.post('/reviews/', data),
}
