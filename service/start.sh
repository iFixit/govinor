#!/bin/bash
source ${HOME}/.bashrc

cd ${HOME}/govinor/

docker compose up -d
export NODE_ENV=production
npm start