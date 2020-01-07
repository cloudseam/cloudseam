
# CloudSeam

This repo contains the two functions for the state machine and task satisfier. 


## Configuration

The available configuration options for the functions are specified in the [docs](https://docs.cloudseam.app).


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

## Developing Integrations

Both the state machine and task satisfier components are available as Docker images. By running local SQS
and DynamoDB containers, you can simulate an AWS-based environment and develop other integrations by either
reading data from the DynamoDB table (or streams), etc. The following compose file can be used as a starting 
point. It includes `traefik` to provide access to the DyanmoDB console (at dynamodb.localhost)
and SQS console (at sqs.localhost).

This example uses the local `samples` directory, which contains a sample state machine definition. You will most 
likely want to create your own machine and tasks, rather than rely on the sample one.

You will also need to create SQS definitions, which are found in the `local-sqs` directory. You are welcome to reuse
the ones in this repo as well.

```yaml
version: "3.7"

services:
  proxy:
    image: traefik:1.7
    command: --api --docker
    ports:
      - 80:80
      - 8080:8080
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock

  state-machine:
    image: cloudseam/state-machine
    volumes:
      - ./samples/machines:/machines
    environment:
      LOCAL_MODE: "true"
      MACHINE_LOCATOR: LOCAL_FS
      MACHINE_SPEC_DIR: /machines
      DYNAMODB_TABLE: Stacks
      SQS_EVENT_QUEUE_URL: http://sqs:9324/queue/stack-events
      SQS_TASK_QUEUE_URL: http://sqs:9324/queue/stack-tasks
      AWS_DEFAULT_REGION: us-east-1
      AWS_ACCESS_KEY_ID: dummy-key
      AWS_SECRET_ACCESS_KEY: dummy-secret-key
  
  task-satisfier:
    image: cloudseam/task-satisfier
    volumes:
      - ./samples:/samples:cached
    environment:
      LOCAL_MODE: "true"
      SKIP_TASK_EXECUTION: "true"
      SQS_EVENT_QUEUE_URL: http://sqs:9324/queue/stack-events
      SQS_TASK_QUEUE_URL: http://sqs:9324/queue/stack-tasks
      AWS_DEFAULT_REGION: us-east-1
      AWS_ACCESS_KEY_ID: dummy-key
      AWS_SECRET_ACCESS_KEY: dummy-secret-key

  dynamodb:
    image: amazon/dynamodb-local

  dynamodb-viewer:
    image: aaronshaf/dynamodb-admin
    labels:
      traefik.backend: dynamodb-viewer
      traefik.frontend.priority: 10
      traefik.frontend.rule: Host:dynamodb.localhost
      traefik.port: 8001
    environment:
      DYNAMO_ENDPOINT: http://dynamodb:8000
      AWS_DEFAULT_REGION: us-east-1
      AWS_ACCESS_KEY_ID: dummy-key
      AWS_SECRET_ACCESS_KEY: dummy-secret-key

  dynamodb-table-creator:
    image: mikesir87/aws-cli
    command: sh -c "sleep 2 & aws --endpoint=http://dynamodb:8000 dynamodb create-table --table-name Stacks --key-schema AttributeName=id,KeyType=HASH --attribute-definitions AttributeName=id,AttributeType=S --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5"
    depends_on:
      - dynamodb
    environment:
      AWS_DEFAULT_REGION: us-east-1
      AWS_ACCESS_KEY_ID: dummy-key
      AWS_SECRET_ACCESS_KEY: dummy-secret-key

  sqs:
    image: softwaremill/elasticmq
    ports:
      - 9324:9324
    volumes:
      - ./local-sqs/elasticmq.conf:/opt/elasticmq.conf

  sqs-gui:
    image: realies/sqs-insight@sha256:0c22e544911f51b500ac67b5e3f948a54fd88d77fcef317a738209d7542ef084
    volumes:
      - ./local-sqs/gui-config.json:/sqs-insight/config/config_local.json
    labels:
      traefik.backend: sqs-gui
      traefik.frontend.priority: 10
      traefik.frontend.rule: Host:sqs.localhost
      traefik.port: 3000
```
