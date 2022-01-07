#!/bin/bash

# Set the path to the directory where the script is located
cd "$(dirname "$0")"

curl localhost:2019/load \
	-X POST \
	-H "Content-Type: application/json" \
	-d @initial-caddy-config.json