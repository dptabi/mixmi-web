import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import './Dashboard.css';

interface Order {
  id: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  createdAt: any;
  items: any[];
}

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
  todayOrders: number;
  todayRevenue: number;
  averageOrderValue: number;
  appRevenue: number; // 15% of total revenue
  appRevenuePercentage: number;
  paymentMethodBreakdown: {
    cash_on_delivery: number;
    card: number;
    gcash: number;
    grab_pay: number;
  };
  recentOrders: Order[];
  topProducts: { name: string; count: number; revenue: number }[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0,
    todayOrders: 0,
    todayRevenue: 0,
    averageOrderValue: 0,
    appRevenue: 0,
    appRevenuePercentage: 15,
    paymentMethodBreakdown: {
      cash_on_delivery: 0,
      card: 0,
      gcash: 0,
      grab_pay: 0,
    },
    recentOrders: [],
    topProducts: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('7d'); // 7d, 30d, 90d, 1y

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        // Get all orders
        const ordersQuery = query(
          collection(db, 'orders'),
          orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
          const orders: Order[] = [];
          const paymentMethodCounts = {
            cash_on_delivery: 0,
            card: 0,
            gcash: 0,
            grab_pay: 0,
          };
          const productCounts: { [key: string]: { count: number; revenue: number } } = {};

          let totalRevenue = 0;
          let pendingOrders = 0;
          let completedOrders = 0;
          let todayOrders = 0;
          let todayRevenue = 0;

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          snapshot.forEach((doc) => {
            const order = { id: doc.id, ...doc.data() } as Order;
            orders.push(order);

            // Calculate totals
            totalRevenue += order.total || 0;

            // Count by status - Updated to match payment-aware logic
            // To Pay: Only unpaid orders (not COD, not paid)
            if (order.orderStatus === 'to_pay' || 
                (order.orderStatus === 'pending' && 
                 order.paymentStatus !== 'paid' && 
                 order.paymentMethod !== 'cash_on_delivery')) {
              pendingOrders++; // Orders awaiting payment
            } 
            // Completed: Delivered and completed orders
            else if (order.orderStatus === 'completed' || 
                     order.orderStatus === 'delivered') {
              completedOrders++; // Orders that are completed
            }

            // Count payment methods
            if (order.paymentMethod && paymentMethodCounts.hasOwnProperty(order.paymentMethod)) {
              paymentMethodCounts[order.paymentMethod as keyof typeof paymentMethodCounts]++;
            }

            // Check if order is from today
            const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
            if (orderDate >= today) {
              todayOrders++;
              todayRevenue += order.total || 0;
            }

            // Count products
            if (order.items) {
              order.items.forEach((item: any) => {
                const productName = item.productName || 'Unknown Product';
                if (!productCounts[productName]) {
                  productCounts[productName] = { count: 0, revenue: 0 };
                }
                productCounts[productName].count += item.quantity || 1;
                productCounts[productName].revenue += (item.totalPrice || 0);
              });
            }
          });

          // Get top products
          const topProducts = Object.entries(productCounts)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

          const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
          const appRevenue = totalRevenue * 0.15; // 15% of total revenue

          setStats({
            totalOrders: orders.length,
            totalRevenue,
            pendingOrders,
            completedOrders,
            todayOrders,
            todayRevenue,
            averageOrderValue,
            appRevenue,
            appRevenuePercentage: 15,
            paymentMethodBreakdown: paymentMethodCounts,
            recentOrders: orders.slice(0, 10),
            topProducts,
          });

          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching orders:', error);
        setLoading(false);
      }
    };

    fetchOrders();
  }, [selectedPeriod]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash_on_delivery': return '💰';
      case 'card': return '💳';
      case 'gcash': return '📱';
      case 'grab_pay': return '🚗';
      default: return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'to_pay': return '#f59e0b';        // Orange - needs payment
      case 'to_ship': return '#3b82f6';       // Blue - ready to ship
      case 'to_receive': return '#8b5cf6';    // Purple - shipped, waiting for delivery
      case 'completed': return '#10b981';     // Green - delivered and completed
      case 'returned': return '#f97316';      // Orange - returned items
      case 'cancelled': return '#ef4444';     // Red - cancelled
      // Legacy statuses for backward compatibility
      case 'pending': return '#f59e0b';       // Orange - default to pay
      case 'processing': return '#3b82f6';    // Blue - to ship
      case 'confirmed': return '#3b82f6';     // Blue - to ship (confirmed = ready to ship)
      case 'shipped': return '#8b5cf6';       // Purple - to receive
      case 'delivered': return '#10b981';     // Green - completed
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>📊 Analytics Dashboard</h1>
        <div className="period-selector">
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="period-select"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">📦</div>
          <div className="metric-content">
            <h3>{stats.totalOrders}</h3>
            <p>Total Orders</p>
            <span className="metric-change positive">+{stats.todayOrders} today</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">💰</div>
          <div className="metric-content">
            <h3>{formatCurrency(stats.totalRevenue)}</h3>
            <p>Total Revenue</p>
            <span className="metric-change positive">+{formatCurrency(stats.todayRevenue)} today</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">💳</div>
          <div className="metric-content">
            <h3>{stats.pendingOrders}</h3>
            <p>To Pay Orders</p>
            <span className="metric-change neutral">Awaiting Payment</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">✅</div>
          <div className="metric-content">
            <h3>{stats.completedOrders}</h3>
            <p>Completed Orders</p>
            <span className="metric-change positive">Delivered & Completed</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">📈</div>
          <div className="metric-content">
            <h3>{formatCurrency(stats.averageOrderValue)}</h3>
            <p>Average Order Value</p>
            <span className="metric-change neutral">Per order</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">🎯</div>
          <div className="metric-content">
            <h3>{((stats.completedOrders / stats.totalOrders) * 100).toFixed(1)}%</h3>
            <p>Completion Rate</p>
            <span className="metric-change positive">Success rate</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">💰</div>
          <div className="metric-content">
            <h3>{formatCurrency(stats.appRevenue)}</h3>
            <p>App Revenue ({stats.appRevenuePercentage}%)</p>
            <span className="metric-change positive">Platform fee</span>
          </div>
        </div>
      </div>

      {/* Charts and Analytics */}
      <div className="analytics-grid">
        {/* Payment Methods Breakdown */}
        <div className="analytics-card">
          <h3>💳 Payment Methods</h3>
          <div className="payment-methods">
            {Object.entries(stats.paymentMethodBreakdown).map(([method, count]) => (
              <div key={method} className="payment-method-item">
                <span className="payment-icon">{getPaymentMethodIcon(method)}</span>
                <span className="payment-name">
                  {method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
                <span className="payment-count">{count}</span>
                <div className="payment-bar">
                  <div 
                    className="payment-fill" 
                    style={{ 
                      width: `${(count / stats.totalOrders) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="analytics-card">
          <h3>🏆 Top Products</h3>
          <div className="top-products">
            {stats.topProducts.map((product, index) => (
              <div key={product.name} className="product-item">
                <span className="product-rank">#{index + 1}</span>
                <span className="product-name">{product.name}</span>
                <span className="product-count">{product.count} sold</span>
                <span className="product-revenue">{formatCurrency(product.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="recent-orders-card">
        <h3>📋 Recent Orders</h3>
        <div className="orders-table">
          <div className="table-header">
            <div>Order #</div>
            <div>Customer</div>
            <div>Amount</div>
            <div>Payment</div>
            <div>Status</div>
            <div>Date</div>
          </div>
          {stats.recentOrders.map((order) => (
            <div key={order.id} className="table-row">
              <div className="order-number">{order.orderNumber}</div>
              <div className="customer-info">
                <div className="customer-name">{order.customerName}</div>
                <div className="customer-email">{order.customerEmail}</div>
              </div>
              <div className="order-amount">{formatCurrency(order.total)}</div>
              <div className="payment-method">
                <span className="payment-icon">{getPaymentMethodIcon(order.paymentMethod)}</span>
                {order.paymentMethod?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </div>
              <div className="order-status">
                <span 
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(order.orderStatus) }}
                >
                  {order.orderStatus}
                </span>
              </div>
              <div className="order-date">{formatDate(order.createdAt)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Real-time Indicator */}
      <div className="realtime-indicator">
        <div className="pulse-dot"></div>
        <span>Live data • Last updated: {new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  );
}
