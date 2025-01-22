const winston = require('winston');

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YY-MM-DD HH:mm:ss' }),
    winston.format.printf((info) => {
      const message =
        typeof info.message === 'object'
          ? JSON.stringify(info.message, null, 2) // Properly format objects
          : info.message;
      return `${info.timestamp}  ${info.level}: ${message}`;
    })
  ),
  defaultMeta: { service: 'application' },
  transports: [
    // Only log `error` level messages in 'log-error.log'
    new winston.transports.File({ filename: 'log-error.log', level: 'error' }),
    // Only log `warn` level messages in 'log-warning.log'
    new winston.transports.File({
      filename: 'log-warning.log',
      level: 'warn',
      // Filter out messages above `warn`
      format: winston.format((info) => (info.level === 'warn' ? info : false))(),
    }),
    // Only log `info` level messages in 'logs-actions.log'
    new winston.transports.File({
      filename: 'logs-actions.log',
      level: 'info',
      // Filter out messages above `info`
      format: winston.format((info) => (info.level === 'info' ? info : false))(),
    }),
  ],
});

// Add colored console logging in development
if (process.env.NODE_ENV === 'development') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf((info) => {
          const message =
            typeof info.message === 'object'
              ? JSON.stringify(info.message, null, 2)
              : info.message;
          return `${info.timestamp}  ${info.level}: ${message}`;
        })
      ),
    })
  );
}

module.exports = logger;
