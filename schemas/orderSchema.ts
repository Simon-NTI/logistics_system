import mongoose, { mongo } from "mongoose";
import { workerSchema } from "./workerSchema";

export enum ORDER_STATE {
    "recieved",
    "preparing",
    "readyToShip",
    "inShipping",
    "shipped"
}

export const orderSchema = new mongoose.Schema({
    products: [{
        productRef: { type: mongoose.Schema.ObjectId, ref: "Product", required: true },
        count: { type: Number, required: true },
        _id: false
    }],
    status: { type: String, required: true, enum: ORDER_STATE },
    driver: { type: mongoose.Schema.ObjectId, ref: "Driver" },
    picker: { type: mongoose.Schema.ObjectId, ref: "Picker" },

    dateRecieved: { type: Date, required: true },
    datePreparing: Date,
    dateReadyToShip: Date,
    dateinShipping: Date,
    dateShipped: Date,

    price: Number
});

export const OrderModel = mongoose.model("Order", orderSchema);