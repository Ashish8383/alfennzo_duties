import { create } from 'zustand';

const useOrderStore = create((set, get) => ({
  // State
  orders: {
    new: [
      { 
        id: '1', 
        tableNo: '12', 
        items: 'Margherita Pizza, Pasta Alfredo', 
        time: '5 min ago', 
        customer: 'John Doe', 
        quantity: 2, 
        total: '$45.50',
        status: 'new'
      },
      { 
        id: '2', 
        tableNo: '5', 
        items: 'Chicken Burger, French Fries', 
        time: '10 min ago', 
        customer: 'Jane Smith', 
        quantity: 2, 
        total: '$28.00',
        status: 'new'
      },
      { 
        id: '3', 
        tableNo: '8', 
        items: 'Vegetable Spring Rolls', 
        time: '15 min ago', 
        customer: 'Mike Johnson', 
        quantity: 1, 
        total: '$12.50',
        status: 'new'
      },
    ],
    preparing: [
      { 
        id: '4', 
        tableNo: '3', 
        items: 'Caesar Salad, Tomato Soup', 
        time: '20 min ago', 
        customer: 'Sarah Wilson', 
        quantity: 2, 
        total: '$22.00',
        status: 'preparing'
      },
    ],
    ready: [
      { 
        id: '5', 
        tableNo: '10', 
        items: 'Grilled Steak', 
        time: '30 min ago', 
        customer: 'Tom Brown', 
        quantity: 1, 
        total: '$35.00',
        status: 'ready'
      },
    ],
    delivered: [
      { 
        id: '6', 
        tableNo: '7', 
        items: 'Sushi Platter', 
        time: '1 hour ago', 
        customer: 'Emily Davis', 
        quantity: 1, 
        total: '$42.00',
        status: 'delivered'
      },
    ],
  },
  
  orderHistory: [
    { id: '101', table: '12', items: 'Pizza, Pasta', total: '$45.50', date: '2024-01-15', status: 'completed' },
    { id: '102', table: '5', items: 'Burger, Fries', total: '$28.00', date: '2024-01-15', status: 'completed' },
    { id: '103', table: '8', items: 'Sushi Roll', total: '$32.50', date: '2024-01-14', status: 'cancelled' },
    { id: '104', table: '3', items: 'Salad, Soup', total: '$22.00', date: '2024-01-14', status: 'completed' },
    { id: '105', table: '10', items: 'Steak', total: '$35.00', date: '2024-01-13', status: 'completed' },
    { id: '106', table: '7', items: 'Sushi', total: '$42.00', date: '2024-01-13', status: 'cancelled' },
  ],
  
  isLoading: false,
  activeTab: 'new',
  
  // Actions
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  acceptOrder: (orderId) => {
    set((state) => {
      const orderToMove = state.orders.new.find(order => order.id === orderId);
      if (!orderToMove) return state;
      
      return {
        orders: {
          ...state.orders,
          new: state.orders.new.filter(order => order.id !== orderId),
          preparing: [...state.orders.preparing, { ...orderToMove, time: 'Just now', status: 'preparing' }],
        }
      };
    });
  },
  
  updateOrderStatus: (orderId, currentStatus) => {
    set((state) => {
      if (currentStatus === 'preparing') {
        const orderToMove = state.orders.preparing.find(order => order.id === orderId);
        if (!orderToMove) return state;
        
        return {
          orders: {
            ...state.orders,
            preparing: state.orders.preparing.filter(order => order.id !== orderId),
            ready: [...state.orders.ready, { ...orderToMove, time: 'Just now', status: 'ready' }],
          }
        };
      } else if (currentStatus === 'ready') {
        const orderToMove = state.orders.ready.find(order => order.id === orderId);
        if (!orderToMove) return state;
        
        return {
          orders: {
            ...state.orders,
            ready: state.orders.ready.filter(order => order.id !== orderId),
            delivered: [...state.orders.delivered, { ...orderToMove, time: 'Just now', status: 'delivered' }],
          }
        };
      }
      
      return state;
    });
  },
  
  addOrder: (newOrder) => {
    const orderWithId = {
      ...newOrder,
      id: Date.now().toString(),
      time: 'Just now',
      status: 'new'
    };
    set((state) => ({
      orders: {
        ...state.orders,
        new: [orderWithId, ...state.orders.new],
      }
    }));
  },
  
  cancelOrder: (orderId, status) => {
    set((state) => ({
      orders: {
        ...state.orders,
        [status]: state.orders[status].filter(order => order.id !== orderId),
      }
    }));
  },
  
  getOrderStats: () => {
    const state = get();
    return {
      total: Object.values(state.orders).flat().length,
      new: state.orders.new.length,
      preparing: state.orders.preparing.length,
      ready: state.orders.ready.length,
      delivered: state.orders.delivered.length,
    };
  },
  
  getFilteredHistory: (searchDate, filter) => {
    const state = get();
    let filtered = [...state.orderHistory];
    
    if (searchDate) {
      filtered = filtered.filter(order => order.date.includes(searchDate));
    }
    
    if (filter === 'completed') {
      filtered = filtered.filter(order => order.status === 'completed');
    } else if (filter === 'cancelled') {
      filtered = filtered.filter(order => order.status === 'cancelled');
    }
    
    return filtered;
  },
}));

export default useOrderStore;