import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000',
})

export const uploadCSV = (
  file: File,
  onProgress?: (progressEvent: any) => void
) => {
  const form = new FormData()
  form.append('file', file)

  return api.post('/upload-csv/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress,
  })
}

export const getTaskStatus = (taskId: string) =>
  api.get(`/tasks/${taskId}/status`)


export const getProducts = ({ skip = 0, limit = 20, sku, active }: { skip?: number; limit?: number; sku?: string; active?: boolean } = {}) => {
  const params: any = { skip, limit };
  if (sku) params.sku = sku;
  if (active !== undefined) params.active = active;
  return api.get('/products/', { params });
}

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

