const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '../../', `.env.${process.env.NODE_ENV === 'test' ? 'test' : 'dev'}`);

dotenv.config({ path: envPath });

class Config {
  default = {
    amqp: {
      rabbitmq: {},
    },
  };

  get config() {
    const onesy_amqp_rabbitmq_queues = (process.env.SERVICE_AMQP_RABBITMQ_QUEUES || '').split(',').filter(Boolean);
    const onesy_amqp_rabbitmq_exchanges = (process.env.SERVICE_AMQP_RABBITMQ_EXCHANGES || '').split(',').filter(Boolean);

    return {
      amqp: {
        rabbitmq: {
          uri: process.env.SERVICE_AMQP_RABBITMQ_URI || this.default.amqp.rabbitmq.uri,
          queues: onesy_amqp_rabbitmq_queues,
          exchanges: onesy_amqp_rabbitmq_exchanges,
        },
      },
    };
  }
}

module.exports = new Config();
