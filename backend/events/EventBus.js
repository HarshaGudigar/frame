const config = require('../config');
const logger = require('../utils/logger');

class EventBus {
    constructor() {
        if (!EventBus.instance) {
            if (config.NODE_ENV === 'test' || config.NODE_ENV === 'development') {
                const EventEmitter = require('events');
                const emitter = new EventEmitter();
                this.redisPub = {
                    on: () => {},
                    publish: async (channel, message) => {
                        setImmediate(() => emitter.emit('message', channel, message));
                        return true;
                    },
                };
                this.redisSub = {
                    on: (event, handler) => {
                        if (event === 'message') emitter.on('message', handler);
                    },
                    subscribe: async () => {},
                };
                logger.info(`EventBus initialized in MEMORY mode (${config.NODE_ENV})`);
            } else {
                const Redis = require('ioredis');
                this.redisPub = new Redis(config.REDIS_URI);
                this.redisSub = new Redis(config.REDIS_URI);
            }
            this.handlers = new Map();
            this.moduleRegistry = []; // Stores manifest arrays for validation

            this.redisSub.on('message', (channel, message) => {
                this._handleMessage(channel, message);
            });

            this.redisPub.on('error', (err) => logger.error({ err }, 'Redis Pub Error'));
            this.redisSub.on('error', (err) => logger.error({ err }, 'Redis Sub Error'));

            EventBus.instance = this;
        }
        return EventBus.instance;
    }

    /**
     * Set registered modules for manifest validation
     */
    setModuleRegistry(modules) {
        this.moduleRegistry = modules;
    }

    /**
     * Publish an event to the bus.
     * Enforces that the publishing module declared it in manifest.events.publishes.
     */
    async publish(moduleSlug, eventName, payload) {
        // Validate against manifest
        const mod = this.moduleRegistry.find((m) => m.slug === moduleSlug);

        // If module exists but doesn't have the event in publishes, warn/reject
        if (mod && mod.slug !== 'core') {
            const publishes = mod.events?.publishes || [];
            if (!publishes.includes(eventName)) {
                logger.warn(
                    { module: moduleSlug, event: eventName },
                    'Module attempted to publish undeclared event',
                );
                return false;
            }
        }

        const enrichedPayload = {
            metadata: {
                busTimestamp: new Date().toISOString(),
                sourceModule: moduleSlug,
                eventName: eventName,
            },
            data: payload,
        };

        try {
            await this.redisPub.publish(eventName, JSON.stringify(enrichedPayload));
            return true;
        } catch (err) {
            logger.error({ err, event: eventName }, 'Failed to publish event');
            return false;
        }
    }

    /**
     * Subscribe to an event on the bus.
     * Enforces that the subscribing module declared it in manifest.events.subscribes.
     */
    subscribe(moduleSlug, eventName, handler) {
        // Validate against manifest
        const mod = this.moduleRegistry.find((m) => m.slug === moduleSlug);

        if (mod && mod.slug !== 'core') {
            const subscribes = mod.events?.subscribes || [];
            if (!subscribes.includes(eventName)) {
                logger.warn(
                    { module: moduleSlug, event: eventName },
                    'Module attempted to subscribe to undeclared event',
                );
                return false;
            }
        }

        if (!this.handlers.has(eventName)) {
            this.handlers.set(eventName, []);
            this.redisSub.subscribe(eventName);
        }

        this.handlers.get(eventName).push({ moduleSlug, handler });
        logger.debug({ module: moduleSlug, event: eventName }, 'Subscribed to event');
        return true;
    }

    _handleMessage(channel, messageStr) {
        try {
            const message = JSON.parse(messageStr);
            const subscribers = this.handlers.get(channel) || [];

            for (const { moduleSlug, handler } of subscribers) {
                // Execute handler with error boundary per module
                try {
                    handler(message.data, message.metadata);
                } catch (handlerErr) {
                    logger.error(
                        { err: handlerErr, module: moduleSlug, event: channel },
                        'Event handler failed',
                    );
                }
            }
        } catch (err) {
            logger.error({ err, channel }, 'Failed to parse event message');
        }
    }
}

// Export a singleton instance
const instance = new EventBus();
module.exports = instance;
