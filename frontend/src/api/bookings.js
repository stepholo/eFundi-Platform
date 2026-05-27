import api from './client'

export const bookingsApi = {
  list: ()              => api.get('/bookings/'),
  get:  (id)            => api.get(`/bookings/${id}/`),
  create: (data)        => api.post('/bookings/', data),
  cancel: (id)          => api.patch(`/bookings/${id}/cancel/`),
  // Technician actions
  accept: (id, amount)  => api.patch(`/bookings/${id}/accept/`, { amount }),
  decline: (id)         => api.patch(`/bookings/${id}/decline/`),
  start: (id)           => api.patch(`/bookings/${id}/start/`),
  complete: (id)        => api.patch(`/bookings/${id}/complete/`),
  nearbyTechnicians: (lat, lng, radius = 10) =>
    api.get('/bookings/technician-locations/nearby/', { params: { latitude: lat, longitude: lng, radius_km: radius } }),
  trackTechnician: (userUuid) =>
    api.get(`/bookings/technician-locations/track/${userUuid}/`),
}
