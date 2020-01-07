const TableName = process.env.DYNAMODB_TABLE
    ? process.env.DYNAMODB_TABLE
    : 'Stacks';
const Stack = require('../../stack');
const DefaultDynamoClient = require('../../aws').dynamoClient;

class DynamoStackRepo {
    constructor(dynamoClient = DefaultDynamoClient) {
        this.dynamoClient = dynamoClient;
    }

    async findStack(stackName) {
        const params = {
            TableName,
            Key: {
                id: stackName,
            },
        };

        const result = await this.dynamoClient.get(params).promise();
        return result.Item ? Stack.from(result.Item) : undefined;
    }

    async saveStack(stack) {
        if (!stack.createdAt)
            stack.createdAt = Date.now();
        stack.updatedAt = Date.now();

        const params = {
            TableName,
            Item: stack,
        };

        return this.dynamoClient.put(params).promise();
    }

    async removeStack(stack) {
        const params = {
            TableName,
            Key: {
                id: stack.id,
            },
        };

        return this.dynamoClient.delete(params).promise();
    }

    async setup() {
        // Nothing to do here
    }
}

module.exports = DynamoStackRepo;
