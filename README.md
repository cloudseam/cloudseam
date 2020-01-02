
# CloudSeam

This repo contains the two functions for the state machine and task satisfier. 


## Configuration

The available configuration options for the functions are specified in the docs.


## Development

To get started with development, simply run `docker-compose up -d`. This will start the following:

- A container for the state machine
- A container for the task satisfier
- An [ElasticMQ](https://github.com/adamw/elasticmq) container (SQS-compatible), configured with the following queues:
  - An events queue
  - A task queue
  - An error queue (deadletter queue)
  - Replicas of the queues above for the SQS GUI to pull messages from without consuming them
- A web-based SQS console, leveraging [kobim/sqs-insight](https://github.com/kobim/sqs-insight.git)
- A DynamoDB database for state management persistence (used by default)
- A DynamoDB viewer to view the content in the DynamoDB instance (leveraging [aaronshaf/dynamodb-admin](https://github.com/aaronshaf/dynamodb-admin))
- A PostgreSQL database for state management persistence
- A [Traefik](https://traefik.io) container to serve as a reverse-proxy

Once started, you can access the additional tools/consoles using the links below:

- [http://sqs.localhost](http://sqs.localhost) - a console to show SQS events going through the system
- [http://dynamodb.localhost/](http://dynamodb.localhost/) - a console to view the local DynamoDB instance state

Once started, you can access the SQS client at [http://sqs.localhost](http://sqs.localhost).

Each of the app containers are configured to run tests and Prettier upon every file change.


### Sending SQS Messages to the Local Queues

To send messages into the event queue, you simply need to inform the AWS CLI to send messages locally instead of AWS. Use the `--endpoint` parameter to do so.

```bash
aws --endpoint-url=http://localhost:9324 sqs send-message --queue-url http://localhost:9324/queue/stack-events --message-body '{"stackId":"master","machine":"v1-sample","event":"LAUNCH"}'
```

The queue URLS are: (for the most part, you should _only_ send messages to the Event Queue)

- Event Queue - http://localhost:9324/queue/stack-events
- Task Queue - http://localhost:9324/queue/task-events


### Cleaning Local State

The following commands can be used to purge all SQS queues. The easiest way to purge all Dynamo entries is to use the "Purge" button in the DynamoDB console (see link above).

```bash
aws --endpoint-url=http://localhost:9324 sqs purge-queue --queue-url http://localhost:9324/queue/stack-events
aws --endpoint-url=http://localhost:9324 sqs purge-queue --queue-url http://localhost:9324/queue/stack-tasks
aws --endpoint-url=http://localhost:9324 sqs purge-queue --queue-url http://localhost:9324/queue/events-replica
aws --endpoint-url=http://localhost:9324 sqs purge-queue --queue-url http://localhost:9324/queue/tasks-replica
```
