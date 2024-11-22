import mongoose, { Schema } from "mongoose";

export const warehouseSchema = new mongoose.Schema({

    workers: [{
        type: Schema.Types.ObjectId,
        ref: "Worker"
    }],
    // orders: [{
    //     type: Schema.Types.ObjectId,
    //     ref: "Order"
    // }],
    products: [{
        productRef: { type: mongoose.Schema.ObjectId, required: true },
        count: { type: Number, required: true, min: 0, max: Number.MAX_SAFE_INTEGER },
        shelfNumber: { type: Number, required: true, min: 0, max: Number.MAX_SAFE_INTEGER },
        _id: false
    }]
});

export const WarehouseModel = mongoose.model("Warehouse", warehouseSchema);