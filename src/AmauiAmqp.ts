import amqp from 'amqplib';

import merge from '@onesy/utils/merge';
import stringify from '@onesy/utils/stringify';
import parse from '@onesy/utils/parse';
import { OnesyAmqpError, ConnectionError } from '@onesy/errors';
import OnesyLog from '@onesy/log';
import OnesySubscription from '@onesy/subscription';

export interface IExchange {
  name: string;
  type: string;
}

export interface IMessageDataOptions {
  parse?: boolean;
}

export type TSend = amqp.Options.Publish & {
  stringify?: boolean;
};

export interface IOptions {
  uri?: string;
  queues?: Array<string>;
  exchanges?: Array<IExchange>;
}

export const optionsDefault: IOptions = {
  queues: [],
  exchanges: [],
};

class OnesyAmqp {
  public connection_: amqp.Connection;
  public channel_: amqp.Channel;
  public connected = false;
  private amalog: OnesyLog;
  private options_: IOptions = optionsDefault;
  // For listening on amqp events
  public subscription = new OnesySubscription();
  public queues: Record<string, any> = {};
  public exchanges: Record<string, any> = {};
  public sendOptions: amqp.Options.Publish = {
    persistent: true,
  };
  public exchangeOptions: amqp.Options.Publish = {
    persistent: false,
  };

  public get options(): IOptions {
    return this.options_;
  }

  public set options(options: IOptions) {
    this.options_ = merge(options, optionsDefault);
  }

  public constructor(options: IOptions = optionsDefault) {
    this.options = options;

    this.amalog = new OnesyLog({
      arguments: {
        pre: [
          'AMQP'
        ]
      }
    });
  }

  public async get(queue: string, options: amqp.Options.Get = { noAck: false }): Promise<amqp.GetMessage | false> {
    const channel = await this.channel;

    return await channel.get(queue, options);
  }

  public async ack(message: amqp.Message, allUpTo?: boolean): Promise<void> {
    const channel = await this.channel;

    return channel.ack(message, allUpTo);
  }

  public async nack(message: amqp.Message, requeue: boolean = true, allUpTo: boolean = false): Promise<void> {
    const channel = await this.channel;

    return channel.nack(message, allUpTo, requeue);
  }

  public async consume(queue: string, method: (msg: amqp.ConsumeMessage) => any, options: amqp.Options.Consume = { noAck: false }): Promise<amqp.Replies.Consume> {
    const channel = await this.channel;

    return await channel.consume(queue, method, options);
  }

  // Alias for the consume method
  public subscribe = this.consume;

  public messageData(message: amqp.ConsumeMessage, options: IMessageDataOptions = { parse: true }) {
    if (message) {
      const data = message.content.toString();

      return options.parse ? parse(data) : data;
    }
  }

  public async send(queue: string, data_: any = '', options: TSend = { stringify: true }): Promise<boolean> {
    const {
      stringify: stringifyData,

      ...otherOptions
    } = options;

    const channel = await this.channel;

    let data = data_;

    if (stringifyData) data = stringify(data);

    return channel.sendToQueue(queue, Buffer.from(data), { ...this.sendOptions, ...otherOptions });
  }

  public async publish(exchange: string, routingKey: string, data: any = '', options?: amqp.Options.Publish): Promise<boolean> {
    const channel = await this.channel;

    return channel.publish(exchange, routingKey, Buffer.from(data), { ...this.exchangeOptions, ...options });
  }

  public async bindQueue(queue: string, exchange: string, routingKey: string): Promise<amqp.Replies.Empty> {
    const channel = await this.channel;

    try {
      return await channel.bindQueue(queue, exchange, routingKey, undefined);
    }
    catch (error) {
      throw error;
    }
  }

  public async cancel(consumerTag: string): Promise<amqp.Replies.Empty> {
    const channel = await this.channel;

    return await channel.cancel(consumerTag);
  }

  public get connection(): Promise<amqp.Connection> {
    return new Promise(async (resolve, reject) => {
      if (this.connected) return resolve(this.connection_);

      try {
        const connection = await this.connect();

        return resolve(connection);
      }
      catch (error) {
        reject(error);
      }
    });
  }

  public get channel(): Promise<amqp.Channel> {
    return new Promise(async (resolve, reject) => {
      if (this.connected && this.channel_) return resolve(this.channel_);

      try {
        return resolve(await this.createChannel());
      }
      catch (error) {
        throw error;
      }
    });
  }

  public async createChannel(): Promise<amqp.Channel> {
    const connection = await this.connection;

    try {
      const channel = await connection.createChannel();

      this.channel_ = channel;

      this.subscription.emit('channel');

      return channel;
    }
    catch (error) {
      this.amalog.warn(`Channel error`, error);

      this.connected = false;

      this.subscription.emit('channel:error', error);

      throw error;
    }
  }

  public async assertQueue(name: string = '', options?: amqp.Options.AssertQueue): Promise<amqp.Replies.AssertQueue> {
    if (this.connected) {
      const channel = await this.channel;

      try {
        const response = await channel.assertQueue(name, options);

        this.queues[response.queue] = response;

        return response;
      }
      catch (error) {
        throw error;
      }
    }
  }

  public async assertExchange(exchange: IExchange, options?: amqp.Options.AssertExchange): Promise<amqp.Replies.AssertExchange> {
    if (this.connected) {
      const channel = await this.channel;

      try {
        const response = await channel.assertExchange(exchange.name, exchange.type, options);

        this.exchanges[exchange.name] = response;

        return response;
      }
      catch (error) {
        throw error;
      }
    }
  }

  public async assertQueues(): Promise<any> {
    if (this.connected) {
      // Create a needed queues if they don't exist
      for (const queue of this.options.queues) await this.assertQueue(queue, { durable: true });
    }
  }

  public async assertExhanges(): Promise<any> {
    if (this.connected) {
      // Create a needed exchanges if they don't exist
      for (const exchange of this.options.exchanges) await this.assertExchange(exchange, { durable: false });
    }
  }

  public async checkQueue(name: string): Promise<amqp.Replies.AssertQueue> {
    if (!this.queues[name]) throw new OnesyAmqpError('No queue');

    if (this.connected) {
      const channel = await this.channel;

      try {
        const queue = await channel.checkQueue(name);

        if (!queue) throw new OnesyAmqpError('No queue');

        return queue;
      }
      catch (error) {
        throw error;
      }
    }
  }

  public async checkExchange(name: string): Promise<amqp.Replies.Empty> {
    if (!this.exchanges[name]) throw new OnesyAmqpError('No exchange');

    if (this.connected) {
      const channel = await this.channel;

      try {
        const exchange = await channel.checkExchange(name);

        if (!exchange) throw new OnesyAmqpError('No exchange');

        return exchange;
      }
      catch (error) {
        throw error;
      }
    }
  }

  public async removeQueue(name: string, options?: amqp.Options.DeleteQueue): Promise<amqp.Replies.DeleteQueue> {
    if (!this.queues[name]) throw new OnesyAmqpError('No queue');

    if (this.connected) {
      const channel = await this.channel;

      try {
        const queue = await channel.checkQueue(name);

        if (!queue) throw new OnesyAmqpError('No queue');

        const response = await channel.deleteQueue(name, options);

        delete this.queues[name];

        return response;
      }
      catch (error) {
        throw error;
      }
    }
  }

  public async removeExchange(name: string, options?: amqp.Options.DeleteQueue): Promise<amqp.Options.DeleteExchange> {
    if (!this.exchanges[name]) throw new OnesyAmqpError('No exchange');

    if (this.connected) {
      const channel = await this.channel;

      try {
        const exchange = await channel.checkExchange(name);

        if (!exchange) throw new OnesyAmqpError('No exchange');

        const response = await channel.deleteExchange(name, options);

        delete this.exchanges[name];

        return response;
      }
      catch (error) {
        throw error;
      }
    }
  }

  public get disconnect(): Promise<void> {
    return new Promise(async resolve => {
      const connection = this.connected && await this.connection;

      if (this.connected) {
        try {
          await connection.close();

          this.amalog.important(`Disconnected`);

          this.connected = false;
          this.connection_ = undefined;
          this.channel_ = undefined;
          this.queues = {};
          this.exchanges = {};

          this.subscription.emit('disconnected');

          return resolve();
        }
        catch (error) {
          this.amalog.warn(`Connection close error`, error);

          this.subscription.emit('disconnect:error', error);

          throw new ConnectionError(error);
        }
      }

      return resolve();
    });
  }

  public async connect(): Promise<amqp.Connection | undefined> {
    const { uri } = this.options;

    try {
      const connection = await amqp.connect(uri);

      this.amalog.info(`Connected`);

      this.connection_ = connection;

      this.connected = true;

      this.subscription.emit('connected');

      // Create a channel
      const channel = await this.channel;

      channel.on('error', event => this.amalog.error(event));
      channel.on('close', () => this.amalog.important('Channel closed'));

      // Assert queues
      await this.assertQueues();
      // Assert exchanges
      await this.assertExhanges();

      return connection;
    }
    catch (error) {
      this.amalog.warn(`Connection error`, error);

      this.connected = false;

      this.subscription.emit('connect:error', error);

      throw new ConnectionError(error);
    }
  }

  // Be very careful with this one,
  // it removes all queues and exchanges from options,
  // usually used for testing only
  public async reset(): Promise<void> {
    // All queues remove
    for (const queue of Object.keys(this.queues)) {
      try {
        if (queue) if (queue) await this.removeQueue(queue);
      }
      catch (error) { }
    }

    // All exchanges remove
    for (const exchange of Object.keys(this.exchanges)) {
      try {
        if (exchange) await this.removeExchange(exchange);
      }
      catch (error) { }
    }

    this.amalog.important(`All cleaned`);

    this.subscription.emit('reset');
  }

}

export default OnesyAmqp;
