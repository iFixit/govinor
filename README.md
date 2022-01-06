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

## Deployment

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
