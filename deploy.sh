#!/bin/bash
npm run build
npm run db:migrate-deploy
sudo systemctl restart govinor