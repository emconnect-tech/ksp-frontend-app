import { config } from './config';

const API_BASE_URL = 'http://localhost:8080/api/v1';

export const fetchOrders = async () => {
  if (config.USE_MOCK_API) {
    return [];
  }
  const response = await fetch(`${API_BASE_URL}/orders`);
  if (!response.ok) throw new Error('Failed to fetch orders');
  return response.json();
};

export const createOrderAPI = async (orderData: any) => {
  if (config.USE_MOCK_API) {
    return { ...orderData, id: Math.random().toString() };
  }
  const response = await fetch(`${API_BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData),
  });
  if (!response.ok) throw new Error('Failed to create order');
  return response.json();
};

export const updateOrderWeightsAPI = async (orderId: string, orderData: any) => {
  if (config.USE_MOCK_API) {
    return { ...orderData, id: orderId };
  }
  const response = await fetch(`${API_BASE_URL}/orders/${orderId}/weights`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData),
  });
  if (!response.ok) throw new Error('Failed to update order weights');
  return response.json();
};

export const updateOrderStatusAPI = async (orderId: string, statusId: string) => {
  if (config.USE_MOCK_API) {
    return { id: orderId, statusId };
  }
  const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status/${statusId}`, {
    method: 'PUT',
  });
  if (!response.ok) throw new Error('Failed to update order status');
  return response.json();
};
