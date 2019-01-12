#!/bin/bash

git clone https://github.com/kobim/sqs-insight.git
cd sqs-insight
npm install
cp ../gui-config.json config/config_local.json

npm start
