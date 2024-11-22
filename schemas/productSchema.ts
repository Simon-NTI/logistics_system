import mongoose from "mongoose";

export const productSchema = new mongoose.Schema({
    name: { type: String, required: true, minlength: 1, maxlength: 30 },
    price: { type: Number, required: true, min: 0 },
    weight: { type: Number, required: true, min: 0 }
});

export const ProductModel = mongoose.model("Product", productSchema);