#!/bin/bash
source ${HOME}/.bashrc

cd ${HOME}/deploy.ink/

docker compose up -d
export NODE_ENV=production
npm start