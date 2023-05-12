# [Govinor](https://govinor.com)

A platform for creating and managing Docker containers that integrates with Github to offer branch preview links.

> **Note:** This is a work in progress. The current focus is to deploy Strapi containers.

## How does it work?

Govinor listens to Github webhooks of a repo of your choice and creates and manages Docker containers with preview links.

## Development

From your terminal:

```sh
npm run dev
```

This starts your app in development mode, rebuilding assets on file changes.

> :warning: **Note**: Govinor carries out a lot of work using shell commands that won't probably work on your local machine.
> The target OS is Ubuntu 20.04. These functionalities needs to be mocked in order to be tested locally, so for now dev
> mode is only meant for testing UI changes to the Govinor dashboard.

## Deployment

If you need to setup a new server read the instructions below on "Setup AWS resources" and "Install Govinor on the server".

When you need to deploy a new version of govinor, run the following commands:

```sh
cd ~/govinor;
git pull;
npm install;
npm run deploy;
```

### Setup AWS resources

First, create an AWS account and create an IAM user with these permissions:

- `AmazonEC2FullAccess`
- `AmazonRDSFullAccess`
- `AmazonS3FullAccess`

#### Launch an EC2 instance

1. Choose AMI: `Ubuntu Server 20.04 LTS (x86)`
2. Choose instance type: `t3.medium`
3. Configure instance: -
4. Add Storage: Select 50GB
5. Add tags: -
6. Configure security groups: Create a new group named `govinor` with description `govinor instance security settings` and add the following rules:

- Type: `SSH`, Protocol: `TCP`, Port: `22`, Source: `0.0.0.0/0`
- Type: `SSH`, Protocol: `TCP`, Port: `22`, Source: `::/0`
- Type: `HTTP`, Protocol: `TCP`, Port: `80`, Source: `0.0.0.0/0, ::/0`
- Type: `HTTPS`, Protocol: `TCP`, Port: `443`, Source: `0.0.0.0/0, ::/0`

Finally hit "Launch" and create a new key pair (e.g. `govinor-key-pair`) and save it to your computer.

#### Install Docker

Follow the instructions on [How To Install and Use Docker on Ubuntu 20.04](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-docker-on-ubuntu-20-04) to install Docker for Ubuntu 20.04.

> :warning: **Important**: Make sure to follow Step 2 to enable docker execution without the sudo command

#### Install Docker Compose

Follow the instructions ["Install on Linux"](https://docs.docker.com/compose/cli-command/#install-on-linux) to install Docker Compose.

#### Install Caddy Server

Follow the instructions for ["Ubuntu"](https://caddyserver.com/docs/install#debian-ubuntu-raspbian) to install Caddy.

#### Install Node.js

To make it easier to manage and upgrade Node versions, we recommend using [Node Version Manager](https://github.com/nvm-sh/nvm#installing-and-updating).

To install Node.js, run the following command:

```sh
nvm install 14
```

### Install govinor on the server

#### Prerequisites

You need to have a Github webhook configured for the repo you want to deploy.
Head to your repo settings and add a webhook that points to the following settings:

- Payload URL: https://govinor.com/github/webhook
- Content type: `application/json`

Select also "Send me everything".

#### Install

To install govinor, you need to SSH into your EC2 instance and run the following commands:

1. Create deployment folder: `mkdir -p ~/deployments`
2. Clone this repo
3. cd into the repo: `cd govinor`
4. Add .env file `cp .env.example .env` and
5. Edit .env: change `ADMIN_USERNAME`, `ADMIN_PASSWORD` and set `GITHUB_WEBHOOK_SECRET`
6. Install dependencies: `npm install`
7. Build app: `npm run build`
8. Create systemd service: `sudo cp -i ~/govinor/service/govinor.service /etc/systemd/system`
9. Enable govinor systemd service: `sudo systemctl enable govinor.service`
10. Start govinor systemd service: `sudo systemctl start govinor`

Check that govinor service is running by running the following command:

```sh
sudo systemctl status govinor
```

Finally as the last step initialize the Caddy config:

```sh
./scripts/init-caddy.sh
```

### Scale up Govinor

If Govinor runs out of memory, to scale it up follow the following steps:

1. Stop the running EC2 instance and wait for it to stop (it can take a few minutes)
2. Change the instance type appropriately
3. Start the instance again and wait for it to start (it can take a few minutes)
4. ssh into the ec2 instance (using the new machine IP)
5. Initialize the Caddy config:
   ```sh
   cd ~/govinor
   ./scripts/init-caddy.sh
   ```

### Troubleshooting

For convenience here a few useful commands for diagnosing problems:

```sh
# Check govinor service status
systemctl status govinor

# Look up service logs
journalctl -u govinor -b -r

# Restart govinor service (you may need to run this with sudo)
systemctl restart govinor

# Reload Systemd when you change service configuration
sudo systemctl daemon-reload

# View the process running govinor
lsof -i tcp:3000

# View what routes are exposed by govinor - shows the Caddy config
curl -X GET http://localhost:2019/config/ | jq
```
