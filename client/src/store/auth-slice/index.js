import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

// Set base URL from env or fallback
const API_BASE_URL =  import.meta.env.VITE_API_BASE_URL 

// Axios instance (reusable)
export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Initial auth state
const initialState = {
  isAuthenticated: false,
  isLoading: false,
  user: null,
  error: null,
};

// -------------------
// Async Thunks
// -------------------

export const registerUser = createAsyncThunk(
  "auth/register",
  async (formData, thunkAPI) => {
    try {
      const res = await axiosInstance.post("/api/auth/register", formData);
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err?.response?.data || { message: "Registration failed" });
    }
  }
);

export const loginUser = createAsyncThunk(
  "auth/login",
  async (formData, thunkAPI) => {
    try {
      const res = await axiosInstance.post("/api/auth/login", formData);
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err?.response?.data || { message: "Login failed" });
    }
  }
);

export const logoutUser = createAsyncThunk(
  "auth/logout",
  async (_, thunkAPI) => {
    try {
      const res = await axiosInstance.post("/api/auth/logout");
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err?.response?.data || { message: "Logout failed" });
    }
  }
);

export const checkAuth = createAsyncThunk(
  "auth/checkAuth",
  async (_, thunkAPI) => {
    try {
      const res = await axiosInstance.get("/api/auth/check-auth", {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      });
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err?.response?.data || { message: "Auth check failed" });
    }
  }
);

// -------------------
// Slice
// -------------------

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
  },
  extraReducers: (builder) => {
    const setPending = (state) => {
      state.isLoading = true;
      state.error = null;
    };

    const setRejected = (state, action) => {
      state.isLoading = false;
      state.user = null;
      state.isAuthenticated = false;
      state.error = action.payload?.message || "Something went wrong";
    };

    builder
      // Register
      .addCase(registerUser.pending, setPending)
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = null; // Optional: or directly log in user
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(registerUser.rejected, setRejected)

      // Login
      .addCase(loginUser.pending, setPending)
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user || null;
        state.isAuthenticated = action.payload.success;
        state.error = null;
      })
      .addCase(loginUser.rejected, setRejected)

      // Logout
      .addCase(logoutUser.pending, setPending)
      .addCase(logoutUser.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logoutUser.rejected, setRejected)

      // Check Auth
      .addCase(checkAuth.pending, setPending)
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user || null;
        state.isAuthenticated = action.payload.success;
        state.error = null;
      })
      .addCase(checkAuth.rejected, setRejected);
  },
});

// -------------------
// Exports
// -------------------

export const { setUser } = authSlice.actions;
export default authSlice.reducer;
