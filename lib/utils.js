import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value || 0);
}

export function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value || 0);
}

export function formatPercent(value) {
  return `${parseFloat(value || 0).toFixed(2)}%`;
}

export function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date) {
  if (!date) return '-';
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function paginate(query, page = 1, limit = 20) {
  const skip = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
  return { skip, limit: parseInt(limit) };
}

export function buildLeadsFilter(params, userRole, userId) {
  const filter = {};

  if (userRole === 'sales_member') {
    filter.assignedTo = userId;
  }

  if (params.status) filter.status = params.status;
  if (params.source) filter.source = params.source;
  if (params.campaignId) filter.campaignId = params.campaignId;
  if (params.assignedTo && userRole === 'admin') filter.assignedTo = params.assignedTo;
  if (params.service) filter.service = params.service;

  if (params.startDate || params.endDate) {
    filter.receivedAt = {};
    if (params.startDate) filter.receivedAt.$gte = new Date(params.startDate);
    if (params.endDate) filter.receivedAt.$lte = new Date(params.endDate);
  }

  if (params.search) {
    filter.$or = [
      { name: { $regex: params.search, $options: 'i' } },
      { email: { $regex: params.search, $options: 'i' } },
      { phone: { $regex: params.search, $options: 'i' } },
    ];
  }

  return filter;
}
