import api from './client'

export const paymentsApi = {
  list:           ()       => api.get('/payments/'),
  stkPush:        (data)   => api.post('/payments/stk-push/', data),
  getByBooking:   (bookingId) => api.get(`/payments/?booking_id=${bookingId}`),
}
