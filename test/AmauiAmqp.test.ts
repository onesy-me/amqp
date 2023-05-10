/* tslint:disable: no-shadowed-variable */
import Amqp from 'amqplib';

import { assert } from '@amaui/test';
import { wait } from '@amaui/utils';

import AmauiAmqp from '../src';

import Config from '../utils/js/config';

const options = {
  uri: Config.config.amqp.rabbitmq.uri,
  queues: Config.config.amqp.rabbitmq.queues,
  exchanges: Config.config.amqp.rabbitmq.exchanges.map((name: string) => ({ name, type: 'topic' })),
};

preAll(async () => {
  const amqp = new AmauiAmqp(options);

  await amqp.reset();

  await amqp.disconnect;
});

group('AmauiAmqp', () => {
  let amqp: AmauiAmqp;
  const messages = [];
  const responses = {};
  const queues = {};
  let newQueue: any;

  pre(async () => {
    amqp = new AmauiAmqp(options);

    Object.keys(options.queues).forEach(queue => responses[queue] = []);

    amqp.subscription.subscribe(message => messages.push(message));
  });

  post(async () => {
    await amqp.reset();

    await amqp.disconnect;
  });

  group('connection', () => {
    let connection: Amqp.Connection;

    post(async () => {
      await amqp.connection;
    });

    to('connect', async () => {
      connection = await amqp.connection;

      assert(amqp.connected).eq(true);
      assert(messages.indexOf('connected') > -1).eq(true);
      assert(messages.indexOf('channel:connected') > -1).eq(true);
      assert(connection.connection.serverProperties.product).eq('RabbitMQ');
    });

    to('channel', async () => {
      const channel = await amqp.channel;

      assert(channel.emit).exist;
    });

    to('Asserted queues', async () => {
      for (const queue of options.queues) assert((await amqp.checkQueue(queue)).queue).eq(queue);
    });

    to('Asserted exchanges', async () => {
      for (const exchange of options.exchanges) assert(await amqp.checkExchange(exchange.name)).eql({});
    });

    to('disconnect', async () => {
      await amqp.disconnect;

      assert(amqp.connected).eq(false);
      assert(amqp.channel_).eq(undefined);
      assert(amqp.connection_).eq(undefined);
      assert(messages.indexOf('disconnected') > -1).eq(true);
    });

  });

  group('methods', () => {

    to('bindQueue', async () => {
      const queue = await amqp.assertQueue('', { exclusive: true });

      newQueue = queue;

      responses[newQueue.queue] = [];

      const response = await amqp.bindQueue(newQueue.queue, 'a', 'a.*');

      assert(response).eql({});
    });

    to('consume', async () => {
      const response = await amqp.consume('a', async message => {
        responses['a'].push(message);
      });

      queues['a'] = response;

      assert(response.consumerTag).to.be.a('string');
      assert((await amqp.checkQueue('a')).consumerCount).eq(1);
    });

    to('cancel', async () => {
      const response = await amqp.cancel(queues['a'].consumerTag);

      assert(response).eql({ consumerTag: queues['a'].consumerTag });
      assert((await amqp.checkQueue('a')).consumerCount).eq(0);
    });

    to('send', async () => {
      const response = await amqp.send('a', 'a');

      assert(response).eq(true);

      // Wait for message to update the queue
      await wait(140);

      assert((await amqp.checkQueue('a')).messageCount).eq(1);
    });

    to('publish', async () => {
      const channel = await amqp.channel;

      channel.consume(newQueue.queue, message => responses[newQueue.queue].push(message));

      const response = await amqp.publish('a', 'a.a', 'a');

      await amqp.publish('a', 'b.a', 'a');

      assert(response).eq(true);
      assert((await amqp.checkQueue(newQueue.queue)).messageCount).eq(0);
    });

    to('get', async () => {
      const message = await amqp.get('a');

      assert(message).exist;
    });

    to('ack', async () => {
      await amqp.ack(responses[newQueue.queue][0]);

      // Wait until ack is actually made
      await wait(140);

      assert((await amqp.checkQueue(newQueue.queue)).messageCount).eq(0);
    });

    to('assertQueue', async () => {
      const response = await amqp.assertQueue('a44');

      assert(amqp.queues['a44'].queue).eq('a44');
      assert(response.queue).eq('a44');
    });

    to('assertExchange', async () => {
      const response = await amqp.assertExchange({ name: 'a44', type: 'topic' });

      assert(amqp.exchanges['a44'].exchange).eq('a44');
      assert(response.exchange).eq('a44');
    });

  });

  group('checkQueue', () => {

    to('checkQueue', async () => {
      const response = await amqp.checkQueue('a');

      assert(response.queue).eq('a');
      assert(response.messageCount).eq(0);
    });

    to('checkQueue error', async () => {
      try {
        await amqp.checkQueue('asd');
      }
      catch (error) {
        assert(error).exist;
      }
    });

  });

  group('checkExchange', () => {

    to('checkExchange', async () => {
      const response = await amqp.checkExchange('a');

      assert(response).eql({});
    });

    to('checkExchange error', async () => {
      try {
        await amqp.checkExchange('asd');
      }
      catch (error) {
        assert(error).exist;
      }
    });

  });

  group('removeQueue', () => {

    to('removeQueue', async () => {
      const response = await amqp.removeQueue('a');

      assert(response.messageCount).eq(0);
      assert(amqp.queues['a']).eq(undefined);
    });

    to('removeQueue error', async () => {
      try {
        await amqp.removeQueue('asd');
      }
      catch (error) {
        assert(error).exist;
      }
    });

  });

  group('removeExchange', () => {

    to('removeExchange', async () => {
      const response = await amqp.removeExchange('a');

      assert(response).eql({});
      assert(amqp.exchanges['a']).eq(undefined);
    });

    to('removeExchange error', async () => {
      try {
        await amqp.removeExchange('asd');
      }
      catch (error) {
        assert(error).exist;
      }
    });

  });

  to('reset', async () => {
    await amqp.reset();

    assert(amqp.queues).eql({});
    assert(amqp.exchanges).eql({});
  });

});
