import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000'
})

export const uploadCSV = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return api.post<{ task_id: string }>('/upload-csv/', form)
}

export const getTaskStatus = (id: string) =>
  api.get(`/tasks/${id}/status`)

export const getProducts = () =>
  api.get('/products/?limit=10000')

export const deleteAllProducts = () =>
  api.delete('/products/all')


export const getWebhooks = () => api.get('/webhooks/')

export const createWebhook = (data: { url: string; events: string[]; enabled: boolean }) =>
  api.post('/webhooks/', data)

export const updateWebhook = (id: number, data: any) =>
  api.put(`/webhooks/${id}`, data)

export const deleteWebhook = (id: number) => api.delete(`/webhooks/${id}`)

export const testWebhook = (id: number) =>
  api.post(`/webhooks/${id}/test`).then(res => res.data)