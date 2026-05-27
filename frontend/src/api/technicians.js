import api from './client'

export const technicianApi = {
  // Profile
  getProfile:      (userId)           => api.get(`/technicians/${userId}/`),
  updateProfile:   (userId, data)     => api.patch(`/technicians/${userId}/`, data),
  setAvailability: (userId, isAvail)  => api.patch(`/technicians/${userId}/availability/`, { is_available: isAvail }),

  // Specializations
  listSpecializations:   (userId)          => api.get(`/technicians/${userId}/specializations/`),
  addSpecialization:     (userId, data)    => api.post(`/technicians/${userId}/specializations/`, data),
  updateSpecialization:  (userId, specId, data) => api.patch(`/technicians/${userId}/specializations/${specId}/`, data),
  deleteSpecialization:  (userId, specId)  => api.delete(`/technicians/${userId}/specializations/${specId}/`),

  // Live location
  pushLocation: (lat, lng) => api.post('/bookings/technician-locations/', { latitude: lat, longitude: lng }),

  // Reviews / Testimonials
  getReviews: (userUuid) => api.get(`/reviews/?technician_user_id=${userUuid}`),

  // Wallet
  getWallet: () => api.get('/payments/wallets/'),

  // Withdrawals
  getWithdrawals:     ()     => api.get('/payments/withdrawals/'),
  requestWithdrawal:  (data) => api.post('/payments/withdrawals/', data),
}
