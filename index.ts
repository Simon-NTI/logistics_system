import { Elysia } from "elysia";
import { MongoClient } from "mongodb";
import mongoose from "mongoose";

import { WarehouseModel, warehouseSchema } from "./schemas/warehouseSchema";
import { WORKER_OCCUPATION, WorkerModel, workerSchema } from "./schemas/workerSchema";
import { ORDER_STATE, OrderModel } from "./schemas/orderSchema";
import { ProductModel } from "./schemas/productSchema";

import { uri } from "./key";

console.log("Attempting to connect Mongoose...");
const mongooseConnection = await mongoose.connect(uri);
console.log("Mongoose Connected");

console.log("Attempting to connect Elysia...")
const app = new Elysia()

    .post("/worker", async ({ body, set }) => {
        const newWorker = new WorkerModel({
            // @ts-ignore
            occupation: body.occupation,
            // @ts-ignore
            weeklySchedule: body.weeklySchedule
        });

        // @ts-ignore
        for (let i = 0; i < body.deployedTo.length; i++) {
            // @ts-ignore
            const warehouse = await WarehouseModel.findById(body.deployedTo);
            if (!warehouse) {
                set.status = 422;
                // @ts-ignore
                return `Warehouse with name ${body.deployedTo[i]} could not be found`;
            }
            newWorker.deployedTo.push(warehouse._id);
        }

        try {
            return await newWorker.save();
        }
        catch (err) {
            set.status = 422;
            return err;
        }
    })

    .get("/worker", async ({ set, query }) => {

        if (!Object.keys(query).length) {
            const result = await WorkerModel.find({});
            if (!result.length) {
                set.status = 404;
                return "No workers found";
            }
            return result;
        }

        let filter = {};

        if (query.orderCount) {
            filter["orders"] = { $size: query.orderCount };
        }

        if (query.day) {
            if (query.day == "today") {
                const date = new Date(Date.now());
                const day = date.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();

                filter[`weeklySchedule.${day}`] = { $exists: true };
            }
            else {
                filter[`weeklySchedule.${query.day}`] = { $exists: true };
            }
        }

        if (query.occupation) {
            filter["occupation"] = query.occupation;
        }

        const result = await WorkerModel.find(filter);
        if (!result.length) {
            set.status = 404;
            return "No workers found";
        }

        return result;
    })

    .post("/worker/:workerId/order", async ({ params, body, set }) => {
        try {
            const worker = await WorkerModel.findById(params.workerId);

            if (!worker) {
                set.status = 404;
                return `Worker with id \"${params.workerId}\" not found`
            }

            for (let i = 0; i < body.orderIds.length; i++) {
                const element = body.orderIds[i];
                const order = await OrderModel.findById(element);

                if (!order) {
                    set.status = 404;
                    return `Order with id \"${element} not found`;
                }

                worker.orders.push(order.id);
            }

            return worker;
        }
        catch (err) {
            set.status = 404;
            return err;
        }
    })

    .delete("/worker/:workerId/order/:orderId", async ({ params, set }) => {
        try {
            const worker = await WorkerModel.findById(params.workerId);

            if (!worker) {
                set.status = 404;
                return `Worker with id \"${params.workerId}\" not found`
            }

            worker.orders.splice(worker.orders.indexOf(params.orderId), 1);

            return worker;
        }
        catch (err) {
            set.status = 404;
            return err;
        }
    })

    .delete("/worker", async ({ set }) => {
        const result = await WorkerModel.deleteMany({});
        if (!result.deletedCount) {
            set.status = 404;
            return "No workers found";
        }
        return result;
    })

    .delete("/worker/:workerId", async ({ params, set }) => {
        const result = await WorkerModel.findByIdAndDelete(params.workerId);
        if (!result) {
            set.status = 404;
            return `Worker with id \"${params.workerId}\" not found`;
        }
        return result;
    })

    .delete("/worker/:workerId/warehouse/:warehouseId", async ({ params, set }) => {
        const worker = await WorkerModel.findByIdAndDelete(params.workerId);
        if (!worker) {
            set.status = 404;
            return `Worker with id \"${params.workerId}\" not found`;
        }

        worker.deployedTo.splice(worker.deployedTo.indexOf(params.warehouseId));
    })

    .post("/worker/:workerId/warehouse", async ({ params, body, set }) => {
        try {
            const worker = await WorkerModel.findById(params.workerId);

            if (!worker) {
                set.status = 404;
                return `Worker with id \"${params.workerId}\" not found`
            }

            for (let i = 0; i < body.warehouseIds.length; i++) {
                const element = body.warehouseIds[i];
                const warehouse = await WarehouseModel.findById(element);

                if (!warehouse) {
                    set.status = 404;
                    return `Order with id \"${element} not found`;
                }

                worker.deployedTo.push(warehouse.id);
            }

            return worker;
        }
        catch (err) {
            set.status = 404;
            return err;
        }
    })





    .delete("/order", async ({ set }) => {
        const result = await OrderModel.deleteMany();

        if (!result.deletedCount) {
            set.status = 404;
            return "No orders found";
        }

        return result;
    })

    .delete("/order/:orderId", async ({ set, params }) => {
        const result = await OrderModel.findByIdAndDelete(params.orderId);

        if (!result) {
            set.status = 404;
            return `Order with id ${params.orderId} not found`;
        }

        return result;
    })

    .get("/order", async ({ set, query }) => {
        // TODO Unable to apply sortDate properly if status = "all"
        let filter = {};
        // query.status
        // query.dateMin
        // query.dateMax

        if (query.status) {
            if (!(query.status == "all")) {
                filter["status"] = query.status;

                if (query.dateMin) {
                    filter[query.status] = { $gte: query.dateMin }
                };

                if (query.dateMax) {
                    filter[query.status] = { $lte: query.dateMax }
                }
            }
            else {
                if (query.dateMin) {
                    if (query.dateMax) {
                        let or = [];
                        for (let i = 0; i < ORDER_STATE.length; i++) {
                            const element = ORDER_STATE[i];
                            or.push({ [element]: { $gte: query.dateMin, $lte: query.dateMax } });
                        }

                        filter["$or"] = or;
                    }
                    else {
                        let or = [];
                        for (let i = 0; i < ORDER_STATE.length; i++) {
                            const element = ORDER_STATE[i];
                            or.push({ [element]: { $gte: query.dateMin } });
                        }

                        filter["$or"] = or;
                    }
                }
                else {
                    if (query.dateMax) {
                        let or = [];
                        for (let i = 0; i < ORDER_STATE.length; i++) {
                            const element = ORDER_STATE[i];
                            or.push({ [element]: { $lte: query.dateMax } });
                        }

                        filter["$or"] = or;
                    }
                }
            }
        }

        try {
            let result = [];

            switch (query.sort) {
                case ("date-ascending"):
                    {
                        result = await OrderModel.find(filter).sort({ [`${query.status}`]: "ascending" });
                        break;
                    }

                case ("date-descending"):
                    {
                        result = await OrderModel.find(filter).sort({ [`${query.status}`]: "descending" });
                        break;
                    }

                case ("date-oldest"):
                    {
                        let resultTemp = await OrderModel.find(filter).sort({ [`${query.status}`]: "ascending" });
                        result.push(resultTemp[0]);
                        break;
                    }

                case ("date-latest"):
                    {
                        let resultTemp = await OrderModel.find(filter).sort({ [`${query.status}`]: "descending" });
                        result.push(resultTemp[0]);
                        break;
                    }

                case ("cost-ascending"):
                    {
                        result = await OrderModel.find(filter).sort({ cost: "ascending" });
                        break;
                    }

                case ("cost-descending"):
                    {
                        result = await OrderModel.find(filter).sort({ cost: "descending" });
                        break;
                    }

                case ("cost-lowest"):
                    {
                        let resultTemp = await OrderModel.find(filter).sort({ cost: "ascending" });
                        result.push(resultTemp[0]);
                        break;
                    }

                case ("cost-highest"):
                    {
                        let resultTemp = await OrderModel.find(filter).sort({ cost: "descending" });
                        result.push(resultTemp[0]);
                        break;
                    }

                default:
                    {
                        console.log(filter);
                        result = await OrderModel.find(filter);
                        break;
                    }
            }

            if (!result.length) {
                set.status = 404;
                return "No orders found";
            }

            if (query.getTotalCost == "true") {
                let runningTotal = 0;
                for (let i = 0; i < result.length; i++) {
                    runningTotal += result[i].cost;
                }

                return { total: runningTotal };
            }

            return result;
        }
        catch (err) {
            set.status = 400;
            return err;
        }
    })

    .post("/order", async ({ body, set }) => {

        for (let i = 0; i < body.products.length; i++) {
            const product = await ProductModel.findById(body.products[i].productRef);
            if (!product) {
                set.status = 404;
                return `Product with id \"${body.products[i].productRef}\" not found`;
            }
        }

        const newOrder = new OrderModel({
            products: body.products,
            status: ORDER_STATE[ORDER_STATE.recieved],
            recieved: Date.now(),
            cost: body.cost
        });

        try {
            return await newOrder.save();
        }
        catch (err) {
            set.status = 400;
            return err;
        }
    })

    .put("/order/:orderId", async ({ body, params, set }) => {
        try {
            const order = await OrderModel.findById(params.orderId);

            if (!order) {
                set.status = 404;
                return `Order with id ${params.orderId} not found`;
            }

            switch (body.status) {
                case (ORDER_STATE[ORDER_STATE.preparing]):
                    {
                        const picker = await WorkerModel.findById(body.workerId);

                        if (!picker) {
                            set.status = 400;
                            return `Worker with id \"${body.workerId}\" found`;
                        }

                        if (picker.occupation != WORKER_OCCUPATION[WORKER_OCCUPATION.picker]) {
                            set.status = 400;
                            return `Worker with id \"${body.workerId}\" is not a picker`;
                        }

                        order.picker = picker.id;
                        order.status = body.status;
                        order.preparing = Date.now();
                        break;
                    }

                case (ORDER_STATE[ORDER_STATE.readyToShip]):
                    {
                        order.status = body.status;
                        order.readyToShip = Date.now();
                        break;
                    }

                case (ORDER_STATE[ORDER_STATE.inShipping]):
                    {
                        const driver = await WorkerModel.findById(body.workerId);

                        if (!driver) {
                            set.status = 400;
                            return `Worker with id \"${body.workerId}\" found`;
                        }

                        if (driver.occupation != WORKER_OCCUPATION[WORKER_OCCUPATION.driver]) {
                            set.status = 400;
                            return `Worker with id \"${body.workerId}\" is not a driver`;
                        }

                        order.driver = driver.id;
                        order.status = body.status;
                        order.inShipping = Date.now();
                        break;
                    }

                case (ORDER_STATE[ORDER_STATE.shipped]):
                    {
                        order.status = body.status;
                        order.shipped = Date.now();
                        break;
                    }

                default:
                    {
                        set.status = 400;
                        return `Status \"${body.status}\" is not a valid status`;
                    }
            }

            return await order.save();
        }
        catch (err) {
            set.status = 400;
            return err;
        }
    })





    .get("/warehouse", async ({ set }) => {
        const result = await WarehouseModel.find({});
        if (!result.length) {
            set.status = 404;
            return "No warehouses found"
        }
        return result;
    })

    .get("/warehouse/:id", async ({ params, set }) => {
        try {
            const warehouse = await WarehouseModel.findById(params.id);
            if (!warehouse) {
                set.status = 404;
                return "NOT_FOUND";
            }
            return warehouse;
        }
        catch (err) {
            return err;
        }
    })

    .post("/warehouse", async ({ set }) => {
        try {
            const newWarehouse = new WarehouseModel({});
            await newWarehouse.save();
            return newWarehouse;
        }
        catch (err) {
            set.status = 400;
            return err;
        }
    })

    .post("/warehouse/:warehouseId/product", async ({ body, set, params }) => {
        try {
            const warehouse = await WarehouseModel.findById(params.warehouseId);

            if (!warehouse) {
                set.status = 404;
                return `Warehouse with id \"${params.warehouseId}\" not found`;
            }

            const duplicateProduct = warehouse.products.find((product) =>
                // @ts-ignore
                product.productRef.toString() == body.productRef
            );

            if (duplicateProduct) {
                set.status = 409;
                return `Product with id \"${body.productRef}\" already exists at warehouse with id \"${params.warehouseId}\"`;
            }

            const product = await ProductModel.findById(body.productRef);
            if (!product) {
                set.status = 404;
                return `Product with id \"${body.productRef}\" not found`;
            }

            warehouse.products.push(body);
            const result = await warehouse.save();
            // const result = await WarehouseModel.findByIdAndUpdate(params.warehouseId, warehouse);
            return result;
        }
        catch (err) {
            set.status = 400;
            return err;
        }
    })

    .delete("/warehouse/:warehouseId", async ({ params, set }) => {
        try {
            const result = await WarehouseModel.findByIdAndDelete(params.warehouseId);
            if (!result) {
                set.status = 404;
                return `Warehouse with id ${params.warehouseId} not found`;
            }
            return result;
        }
        catch (err) {
            set.status = 400;
            return err;
        }
    })

    .delete("/warehouse", async ({ set }) => {
        try {
            const result = await WarehouseModel.deleteMany({});
            if (!result.deletedCount) {
                set.status = 404;
                return `No warehouses found`;
            }
            return result;
        }
        catch (err) {
            set.status = 500;
            return err;
        }
    })

    .delete("/warehouse/:warehouseId/product/:productId", async ({ params, set }) => {
        try {
            const warehouse = await WarehouseModel.findById(params.warehouseId);
            if (!warehouse) {
                set.status = 404;
                return `Warehouse with id \"${params.warehouseId}\" not found`;
            }

            const searchResult = warehouse.products.find((product) => product.productRef.toString() == params.productId);
            if (!searchResult) {
                set.status = 404;
                return `Product with id \"${params.productId}\" not found`;
            }

            return warehouse.products.splice(warehouse.products.indexOf(searchResult), 1);
        }
        catch (err) {
            set.status = 400;
            return err;
        }
    })





    .get("/product", async ({ set, query }) => {
        if (query.name) {
            const product = await ProductModel.findOne({ name: query.name });

            if (!product) {
                set.status = 404;
                return `Product with name ${query.name} not found`;
            }

            const warehouses = await WarehouseModel.find({ products: { $elemMatch: { productRef: product._id } } });

            let filtered_warehouses =
            {
                warehouses: [],
                total: 0
            };

            warehouses.forEach((element) => {
                const result = element.products.find((element) => element.productRef == product.id);
                if (result) {
                    console.log(result);
                    filtered_warehouses.warehouses.push({ id: element.id, count: result.count });
                    filtered_warehouses.total += result.count;
                }
            });

            return filtered_warehouses;
        }

        const result = await ProductModel.find({});

        if (!result.length) {
            set.status = 404;
            return `No products found`;
        }

        return result;
    })

    .post("/product", async ({ body, set }) => {
        const newProduct = new ProductModel(body);
        try {
            await newProduct.save();
        }
        catch (err) {
            set.status = 422;
            return err;
        }
    })

    .delete("/product/:id", async ({ set, params }) => {
        let result;
        try {
            result = await ProductModel.findByIdAndDelete(params.id)
        }
        catch (err) {
            set.status = 400;
            return err;
        }

        if (!result) {
            set.status = 404;
            return `Product with id \"${params.id}\" not found`;
        }
        return result;
    })





    .listen(3031)

console.log(`Elysia connected, live on port ${app.server?.port}`);

for await (const line of console) {
    if (line == "exit") {
        try {
            await app.server?.stop();
            await mongooseConnection.disconnect();
            process.exit(0);
        }
        catch (err) {
            console.log(err);
        }
    }

    if (line == "fetch") {
        const client = new MongoClient(uri);
        console.log("------------------------------------------------\nfetching...");
        try {
            await client.connect();
            const db = client.db();
            const collections = await db.collections();

            for (const collection of collections) {
                const documents = await collection.find().toArray();
                console.log(collection.collectionName);
                console.log(documents);
            }
        }
        catch (err) {
            console.log(err);
        }
        finally {
            client.close();
            console.log("Success...\n------------------------------------------------");
        }
    }
}