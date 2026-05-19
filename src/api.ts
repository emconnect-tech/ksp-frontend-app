import { config } from './config';

const getBaseUrl = () => import.meta.env.VITE_API_URL || '';
const getHeaders = () => {
  const token = localStorage.getItem('ksp_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const fetchOrders = async () => {
  if (config.USE_MOCK_API) {
    return [];
  }
  const response = await fetch(`${getBaseUrl()}/api/v1/orders`, {
    headers: getHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch orders');
  return response.json();
};

export const createOrderAPI = async (orderData: any) => {
  if (config.USE_MOCK_API) {
    return { ...orderData, id: Math.random().toString() };
  }
  const response = await fetch(`${getBaseUrl()}/api/v1/orders`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(orderData),
  });
  if (!response.ok) throw new Error('Failed to create order');
  return response.json();
};

export const updateOrderWeightsAPI = async (orderId: string, orderData: any) => {
  if (config.USE_MOCK_API) {
    return { ...orderData, id: orderId };
  }
  const response = await fetch(`${getBaseUrl()}/api/v1/orders/${orderId}/weights`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(orderData),
  });
  if (!response.ok) throw new Error('Failed to update order weights');
  return response.json();
};

export const fetchOrderByIdAPI = async (orderId: string) => {
  if (config.USE_MOCK_API) return null;
  const response = await fetch(`${getBaseUrl()}/api/v1/orders/${orderId}`, {
    headers: getHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch order');
  return response.json();
};

export const updateOrderStatusAPI = async (orderId: string, statusId: string) => {
  if (config.USE_MOCK_API) {
    return { id: orderId, statusId };
  }
  const response = await fetch(`${getBaseUrl()}/api/v1/orders/${orderId}/status/${statusId}`, {
    method: 'PUT',
    headers: getHeaders()
  });
  if (!response.ok) throw new Error('Failed to update order status');
  return response.json();
};
