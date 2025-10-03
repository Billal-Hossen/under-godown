import axios from "axios";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const initialState = {
    categoriesWithIcon: [],
    isLoading: false,
};

export const fetchCategoryItems = createAsyncThunk(
    "shop/categories/list",
    async () => {
        const response = await axios.get(
            `http://localhost:5000/api/shop/categories/list`
        );

        return response.data;
    }
);

const categorySlice = createSlice({
    name: "category",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchCategoryItems.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchCategoryItems.fulfilled, (state, action) => {
                console.log("catewgory", action.payload);
                state.isLoading = false;
                state.categoriesWithIcon = action.payload.data;
            })
            .addCase(fetchCategoryItems.rejected, (state) => {
                state.isLoading = false;
                state.categoriesWithIcon = [];
            })
    },
});

export default categorySlice.reducer;
