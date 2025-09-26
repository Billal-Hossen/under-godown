import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

// ✅ Optional: use environment variable
const API_BASE_URL = import.meta.env.REACT_APP_API_URL || "http://localhost:5000";

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const initialState = {
  isLoading: false,
  productList: [],
  error: null,
};

// -------------------
// Async Thunks
// -------------------

export const fetchAllProducts = createAsyncThunk(
  "adminProducts/fetchAll",
  async (_, thunkAPI) => {
    try {
      const res = await axiosInstance.get("/api/admin/products/get");
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err?.response?.data || { message: "Failed to fetch products" });
    }
  }
);

export const addNewProduct = createAsyncThunk(
  "adminProducts/add",
  async (formData, thunkAPI) => {
    try {
      const res = await axiosInstance.post("/api/admin/products/add", formData);
      return res.data;
    } catch (err) {
      console.log("Error in addNewProduct:", err);
      return thunkAPI.rejectWithValue(err?.response?.data || { message: "Failed to add product" });
    }
  }
);

export const editProduct = createAsyncThunk(
  "adminProducts/edit",
  async ({ id, formData }, thunkAPI) => {
    try {
      const res = await axiosInstance.put(`/api/admin/products/edit/${id}`, formData);
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err?.response?.data || { message: "Failed to edit product" });
    }
  }
);

export const deleteProduct = createAsyncThunk(
  "adminProducts/delete",
  async (id, thunkAPI) => {
    try {
      const res = await axiosInstance.delete(`/api/admin/products/delete/${id}`);
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err?.response?.data || { message: "Failed to delete product" });
    }
  }
);

// -------------------
// Slice
// -------------------

const adminProductsSlice = createSlice({
  name: "adminProducts",
  initialState,
  reducers: {},
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
      // Fetch All Products
      .addCase(fetchAllProducts.pending, setPending)
      .addCase(fetchAllProducts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.productList = action.payload?.data || [];
        state.error = null;
      })
      .addCase(fetchAllProducts.rejected, setRejected)

      // Add Product
      .addCase(addNewProduct.pending, setPending)
      .addCase(addNewProduct.fulfilled, (state, action) => {
        state.isLoading = false;
        state.productList.push(action.payload?.data);
        state.error = null;
      })
      .addCase(addNewProduct.rejected, setRejected)

      // Edit Product
      .addCase(editProduct.pending, setPending)
      .addCase(editProduct.fulfilled, (state, action) => {
        state.isLoading = false;
        const updatedProduct = action.payload?.data;
        state.productList = state.productList.map((prod) =>
          prod._id === updatedProduct._id ? updatedProduct : prod
        );
        state.error = null;
      })
      .addCase(editProduct.rejected, setRejected)

      // Delete Product
      .addCase(deleteProduct.pending, setPending)
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.isLoading = false;
        const deletedId = action.payload?.data?._id || action.meta.arg;
        state.productList = state.productList.filter((prod) => prod._id !== deletedId);
        state.error = null;
      })
      .addCase(deleteProduct.rejected, setRejected);
  },
});

export default adminProductsSlice.reducer;
