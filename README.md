
</br>
</br>

<p align='center'>
  <a target='_blank' rel='noopener noreferrer' href='#'>
    <img width='auto' height='84' src='https://raw.githubusercontent.com/onesy-me/onesy/refs/heads/main/utils/images/logo.png' alt='onesy logo' />
  </a>
</p>

<h1 align='center'>onesy AMQP</h1>

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

### Add

```sh
yarn add @onesy/amqp
```

Add `amqplib` peer dependency.

```sh
yarn add amqplib
```

### Use

```javascript
  import OnesyAmqp from '@onesy/amqp';
  // Make if you wanna a config file and
  // inside of it add all the process.env related props
  import Config from './config';

  // Make a new amqp instance
  const onesyAmqp = new OnesyAmqp({
    uri: Config.amqp.rabbitmq.uri,
    queues: Config.amqp.rabbitmq.queues,
    exchanges: Config.amqp.rabbitmq.exchanges,
  });

  // Await for a channel
  await onesyAmqp.channel;

  // Send to a queue
  await onesyAmqp.send('a', 'a');

  // Check a queue
  await onesyAmqp.checkQueue();

  // { queue: 'a', messageCount: 1, etc. }
```

### Dev


Install

```sh
yarn
```

Test

```sh
yarn test
```

One time local setup

Install docker and docker-compose

  - https://docs.docker.com/get-docker
  - https://docs.docker.com/compose/install

Make docker containers

```sh
yarn docker
```

### Prod

Build

```sh
yarn build
```
