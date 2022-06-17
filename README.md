
</br >
</br >

<p align='center'>
  <a target='_blank' rel='noopener noreferrer' href='#'>
    <img src='utils/images/logo.svg' alt='AMAUI logo' />
  </a>
</p>

<h1 align='center'>AMAUI AMQP</h1>

<p align='center'>
  AMQP
</p>

<br />

<h3 align='center'>
  <sub>MIT license&nbsp;&nbsp;&nbsp;&nbsp;</sub>
  <sub>Production ready&nbsp;&nbsp;&nbsp;&nbsp;</sub>
  <sub>100% test cov&nbsp;&nbsp;&nbsp;&nbsp;</sub>
  <sub>Nodejs</sub>
</h3>

<p align='center'>
    <sub>Very simple code&nbsp;&nbsp;&nbsp;&nbsp;</sub>
    <sub>Modern code&nbsp;&nbsp;&nbsp;&nbsp;</sub>
    <sub>Junior friendly&nbsp;&nbsp;&nbsp;&nbsp;</sub>
    <sub>Typescript&nbsp;&nbsp;&nbsp;&nbsp;</sub>
    <sub>Made with :yellow_heart:</sub>
</p>

<br />

## Getting started

### Add

```sh
  // yarn
  yarn add @amaui/amqp

  // npm
  npm install @amaui/amqp
```

### Use

```javascript
  import AmauiAmqp from '@amaui/amqp';

  // Make a new amqp instance
  const amauiAmqp = new AmauiAmqp({
    uri: process.env.amqp.rabbitmq.uri,
    queues: process.env.amqp.rabbitmq.queues,
    exchanges: process.env.amqp.rabbitmq.exchanges,
  });

  // Await for a channel
  await amauiAmqp.channel;

  // Send to a queue
  await amauiAmqp.send('a', 'a');

  // Check a queue
  await amauiAmqp.checkQueue();

  // { queue: 'a', messageCount: 1, etc. }
```

### Dev

#### One time local setup

Install docker and docker-compose

  - https://docs.docker.com/get-docker
  - https://docs.docker.com/compose/install

Make docker containers

```sh
  yarn docker
```

Install

```sh
  yarn
```

Test

```sh
  yarn test
```

### Prod

Build

```sh
  yarn build
```

### Docs

Might be soon...
