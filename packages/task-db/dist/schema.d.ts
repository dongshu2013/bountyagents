export declare const tasks: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "tasks";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "tasks";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        title: import("drizzle-orm/pg-core").PgColumn<{
            name: "title";
            tableName: "tasks";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        content: import("drizzle-orm/pg-core").PgColumn<{
            name: "content";
            tableName: "tasks";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        owner: import("drizzle-orm/pg-core").PgColumn<{
            name: "owner";
            tableName: "tasks";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        created_at: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "tasks";
            dataType: "number";
            columnType: "PgBigInt53";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        status: import("drizzle-orm/pg-core").PgColumn<{
            name: "status";
            tableName: "tasks";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        price: import("drizzle-orm/pg-core").PgColumn<{
            name: "price";
            tableName: "tasks";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        token: import("drizzle-orm/pg-core").PgColumn<{
            name: "token";
            tableName: "tasks";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        withdraw_signature: import("drizzle-orm/pg-core").PgColumn<{
            name: "withdraw_signature";
            tableName: "tasks";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export declare const responses: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "responses";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "responses";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        task_id: import("drizzle-orm/pg-core").PgColumn<{
            name: "task_id";
            tableName: "responses";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        payload: import("drizzle-orm/pg-core").PgColumn<{
            name: "payload";
            tableName: "responses";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        worker: import("drizzle-orm/pg-core").PgColumn<{
            name: "worker";
            tableName: "responses";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        status: import("drizzle-orm/pg-core").PgColumn<{
            name: "status";
            tableName: "responses";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        created_at: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "responses";
            dataType: "number";
            columnType: "PgBigInt53";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        settlement: import("drizzle-orm/pg-core").PgColumn<{
            name: "settlement";
            tableName: "responses";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        settlement_signature: import("drizzle-orm/pg-core").PgColumn<{
            name: "settlement_signature";
            tableName: "responses";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export declare const schema: {
    tasks: import("drizzle-orm/pg-core").PgTableWithColumns<{
        name: "tasks";
        schema: undefined;
        columns: {
            id: import("drizzle-orm/pg-core").PgColumn<{
                name: "id";
                tableName: "tasks";
                dataType: "string";
                columnType: "PgUUID";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                enumValues: undefined;
                baseColumn: never;
            }, {}, {}>;
            title: import("drizzle-orm/pg-core").PgColumn<{
                name: "title";
                tableName: "tasks";
                dataType: "string";
                columnType: "PgVarchar";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
            }, {}, {}>;
            content: import("drizzle-orm/pg-core").PgColumn<{
                name: "content";
                tableName: "tasks";
                dataType: "string";
                columnType: "PgText";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
            }, {}, {}>;
            owner: import("drizzle-orm/pg-core").PgColumn<{
                name: "owner";
                tableName: "tasks";
                dataType: "string";
                columnType: "PgVarchar";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
            }, {}, {}>;
            created_at: import("drizzle-orm/pg-core").PgColumn<{
                name: "created_at";
                tableName: "tasks";
                dataType: "number";
                columnType: "PgBigInt53";
                data: number;
                driverParam: string | number;
                notNull: true;
                hasDefault: false;
                enumValues: undefined;
                baseColumn: never;
            }, {}, {}>;
            status: import("drizzle-orm/pg-core").PgColumn<{
                name: "status";
                tableName: "tasks";
                dataType: "string";
                columnType: "PgVarchar";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: true;
                enumValues: [string, ...string[]];
                baseColumn: never;
            }, {}, {}>;
            price: import("drizzle-orm/pg-core").PgColumn<{
                name: "price";
                tableName: "tasks";
                dataType: "string";
                columnType: "PgVarchar";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: true;
                enumValues: [string, ...string[]];
                baseColumn: never;
            }, {}, {}>;
            token: import("drizzle-orm/pg-core").PgColumn<{
                name: "token";
                tableName: "tasks";
                dataType: "string";
                columnType: "PgVarchar";
                data: string;
                driverParam: string;
                notNull: false;
                hasDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
            }, {}, {}>;
            withdraw_signature: import("drizzle-orm/pg-core").PgColumn<{
                name: "withdraw_signature";
                tableName: "tasks";
                dataType: "string";
                columnType: "PgText";
                data: string;
                driverParam: string;
                notNull: false;
                hasDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
            }, {}, {}>;
        };
        dialect: "pg";
    }>;
    responses: import("drizzle-orm/pg-core").PgTableWithColumns<{
        name: "responses";
        schema: undefined;
        columns: {
            id: import("drizzle-orm/pg-core").PgColumn<{
                name: "id";
                tableName: "responses";
                dataType: "string";
                columnType: "PgUUID";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                enumValues: undefined;
                baseColumn: never;
            }, {}, {}>;
            task_id: import("drizzle-orm/pg-core").PgColumn<{
                name: "task_id";
                tableName: "responses";
                dataType: "string";
                columnType: "PgUUID";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                enumValues: undefined;
                baseColumn: never;
            }, {}, {}>;
            payload: import("drizzle-orm/pg-core").PgColumn<{
                name: "payload";
                tableName: "responses";
                dataType: "string";
                columnType: "PgText";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
            }, {}, {}>;
            worker: import("drizzle-orm/pg-core").PgColumn<{
                name: "worker";
                tableName: "responses";
                dataType: "string";
                columnType: "PgVarchar";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
            }, {}, {}>;
            status: import("drizzle-orm/pg-core").PgColumn<{
                name: "status";
                tableName: "responses";
                dataType: "string";
                columnType: "PgVarchar";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: true;
                enumValues: [string, ...string[]];
                baseColumn: never;
            }, {}, {}>;
            created_at: import("drizzle-orm/pg-core").PgColumn<{
                name: "created_at";
                tableName: "responses";
                dataType: "number";
                columnType: "PgBigInt53";
                data: number;
                driverParam: string | number;
                notNull: true;
                hasDefault: false;
                enumValues: undefined;
                baseColumn: never;
            }, {}, {}>;
            settlement: import("drizzle-orm/pg-core").PgColumn<{
                name: "settlement";
                tableName: "responses";
                dataType: "string";
                columnType: "PgText";
                data: string;
                driverParam: string;
                notNull: false;
                hasDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
            }, {}, {}>;
            settlement_signature: import("drizzle-orm/pg-core").PgColumn<{
                name: "settlement_signature";
                tableName: "responses";
                dataType: "string";
                columnType: "PgText";
                data: string;
                driverParam: string;
                notNull: false;
                hasDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
            }, {}, {}>;
        };
        dialect: "pg";
    }>;
};
