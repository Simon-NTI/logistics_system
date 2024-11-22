import mongoose from "mongoose";

export enum WORKER_OCCUPATION {
    "picker",
    "driver"
}

const TIME_STAMP =
{
    type: String,
    required: true,
    validate: {
        validator: (value: any) => {
            const date = new Date(`1970-01-01T${value}`);
            return date.getTime() === date.getTime();
        },
        message: `{VALUE} is not a valid time. (Required format HH:mm)`
    }
}

const shiftSchema = new mongoose.Schema({
    start: TIME_STAMP,
    end: TIME_STAMP,
    // @ts-ignore
    _id: false
})

export const workerSchema = new mongoose.Schema({
    deployedTo: {
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Warehouse",
            required: true
        }]
    },
    occupation: { type: String, enum: WORKER_OCCUPATION, required: true },
    weeklySchedule: {
        type: {
            monday: shiftSchema,
            tuesday: shiftSchema,
            wednesday: shiftSchema,
            thursday: shiftSchema,
            friday: shiftSchema,
            saturday: shiftSchema,
            sunday: shiftSchema,
        },
        _id: false
        // validate: {
        //     validator: (value) => { return value.length > 0 },
        //     message: "Must contain at least one entry"
        // }
    },
    orders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order"
    }],
});

export const WorkerModel = mongoose.model("Worker", workerSchema);