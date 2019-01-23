const TableName = 'stacks';
const pgClientFactory = require('./clientFactory');
const Stack = require('../../stack');

class PostgresStackRepo {
    constructor(clientFactory = pgClientFactory) {
        this.pgClientFactory = clientFactory;
        this.initVerified = false;
    }

    async findStack(stackName) {
        if (!this.initVerified) {
            await this.setup();
            this.initVerified = true;
        }

        return this.pgClientFactory
            .withClient(async client =>
                client.query('SELECT * FROM stacks WHERE id=$1', [stackName]),
            )
            .then(result =>
                result.rowCount === 0
                    ? undefined
                    : Stack.fromJson(result.rows[0].data),
            );
    }

    async saveStack(stack) {
        await this.pgClientFactory.withClient(
            async client =>
                await client.query(
                    'INSERT INTO stacks (id, data, creation_time, last_updated_time) VALUES ($1, $2, $3, $3) ON CONFLICT(id) DO UPDATE SET data=$2, last_updated_time=$3',
                    [stack.id, JSON.stringify(stack), new Date()],
                ),
        );
    }

    async removeStack(stack) {
        await this.pgClientFactory.withClient(async client =>
            client.query('DELETE FROM stacks WHERE id=$1', [stack.id]),
        );
    }

    async setup() {
        return this.pgClientFactory.withClient(async client => {
            const result = await client.query(
                "SELECT to_regclass('public.stacks') AS name",
            );
            if (result.rows[0].name !== 'stacks') {
                return client.query(
                    'CREATE TABLE "stacks" ("id" VARCHAR(30) NOT NULL UNIQUE, "data" TEXT NOT NULL, creation_time TIMESTAMP NOT NULL, last_updated_time TIMESTAMP NOT NULL, CONSTRAINT stacks_pk PRIMARY KEY ("id"))',
                );
            }
        });
    }
}

module.exports = PostgresStackRepo;
