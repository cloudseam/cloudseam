terraform {
    backend "s3" {
        bucket = "summit-terraform-state"
        key    = "env-state-manager"
        region = "us-east-1"
    }
}

provider "aws" {
    region = "us-east-1"
}

variable "s3_key_zipfile" {
    description = "S3 key for the zip file for the Lambda function"
}

data "aws_caller_identity" "current" {}

data "aws_sqs_queue" "event_queue" {
    name = "stack-events"
}

data "aws_sqs_queue" "tasks_queue" {
  name = "stack-tasks"
}

data "aws_vpc" "qa_vpc" {
    tags = {
        Name = "crest-qa-vpc"
    }
}

data "aws_subnet_ids" "private_subnets" {
    vpc_id = "${data.aws_vpc.qa_vpc.id}"
    tags   = {
        Type = "private"
    }
}

data "aws_security_group" "env_state_management" {
    vpc_id = "${data.aws_vpc.qa_vpc.id}"
    name   = "qa-state-management"
}

data "aws_iam_role" "lambda" {
    name = "qa-lambda"
}



resource "aws_lambda_function" "env_stack_manager" {
    s3_bucket     = "summit-lambda-staging"
    s3_key        = "${var.s3_key_zipfile}"
    function_name = "env-state-manager"
    role          = "${data.aws_iam_role.lambda.arn}"
    handler       = "src/index.lambdaHandler"
    runtime       = "nodejs8.10"
    timeout       = 30
    reserved_concurrent_executions = 1
    vpc_config    = {
        subnet_ids         = [ "${data.aws_subnet_ids.private_subnets.ids}" ]
        security_group_ids = [ "${data.aws_security_group.env_state_management.id}" ]
    }
    environment   = {
        variables = {
            POSTGRES_CONNECTION_SECRET = "stack-machine/db"
            SQS_EVENT_QUEUE_URL = "${data.aws_sqs_queue.event_queue.url}"
            SQS_TASK_QUEUE_URL  = "${data.aws_sqs_queue.tasks_queue.url}"
            MACHINE_LOCATOR     = "S3"
            MACHINE_S3_BUCKET   = "summit-stack-machines"
            MACHINE_S3_KEY      = "qa"
        }
    }
}

resource "aws_lambda_event_source_mapping" "sqs_mapping" {
    event_source_arn = "${data.aws_sqs_queue.event_queue.arn}"
    enabled          = true
    function_name    = "${aws_lambda_function.env_stack_manager.arn}"
    batch_size       = 1
}
