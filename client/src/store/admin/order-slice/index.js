import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

// Base Axios instance
const API = axios.create({
  baseURL: import.meta.env.REACT_APP_API_URL || "http://localhost:5000",
});

const initialState = {
  orderList: [],
  orderDetails: null,
  isLoading: false,
  error: null,
};

// -----------------------------------------
// Async Thunks
// -----------------------------------------

export const getAllOrdersForAdmin = createAsyncThunk(
  "adminOrders/getAll",
  async (_, thunkAPI) => {
    try {
      const response = await API.get("/api/admin/orders/get");
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error?.response?.data || { message: "Failed to fetch orders" });
    }
  }
);

export const getOrderDetailsForAdmin = createAsyncThunk(
  "adminOrders/getDetails",
  async (id, thunkAPI) => {
    try {
      const response = await API.get(`/api/admin/orders/details/${id}`);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error?.response?.data || { message: "Failed to fetch order details" });
    }
  }
);

export const updateOrderStatus = createAsyncThunk(
  "adminOrders/updateStatus",
  async ({ id, orderStatus }, thunkAPI) => {
    try {
      const response = await API.put(`/api/admin/orders/update/${id}`, {
        orderStatus,
      });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error?.response?.data || { message: "Failed to update order status" });
    }
  }
);

// -----------------------------------------
// Slice
// -----------------------------------------

const adminOrderSlice = createSlice({
  name: "adminOrders",
  initialState,
  reducers: {
    resetOrderDetails: (state) => {
      state.orderDetails = null;
    },
    clearOrderError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    const setPending = (state) => {
      state.isLoading = true;
      state.error = null;
    };

    const setRejected = (state, action) => {
      state.isLoading = false;
      state.error = action.payload?.message || "Something went wrong";
    };

    builder
      // Get All Orders
      .addCase(getAllOrdersForAdmin.pending, setPending)
      .addCase(getAllOrdersForAdmin.fulfilled, (state, action) => {
        state.isLoading = false;
        state.orderList = action.payload?.data || [];
      })
      .addCase(getAllOrdersForAdmin.rejected, setRejected)

      // Get Order Details
      .addCase(getOrderDetailsForAdmin.pending, setPending)
      .addCase(getOrderDetailsForAdmin.fulfilled, (state, action) => {
        state.isLoading = false;
        state.orderDetails = action.payload?.data || null;
      })
      .addCase(getOrderDetailsForAdmin.rejected, setRejected)

      // Update Order Status
      .addCase(updateOrderStatus.pending, setPending)
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        state.isLoading = false;

        const updatedOrder = action.payload?.data;
        if (updatedOrder && state.orderList.length > 0) {
          state.orderList = state.orderList.map((order) =>
            order._id === updatedOrder._id ? updatedOrder : order
          );
        }

        // Also update orderDetails if it's the same
        if (state.orderDetails?._id === updatedOrder._id) {
          state.orderDetails = updatedOrder;
        }
      })
      .addCase(updateOrderStatus.rejected, setRejected);
  },
});

export const { resetOrderDetails, clearOrderError } = adminOrderSlice.actions;
export default adminOrderSlice.reducer;
