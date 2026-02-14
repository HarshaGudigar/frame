const { Server } = require('socket.io');
const logger = require('./logger');

let io;

/**
 * Socket Service — Alyxnet Frame
 *
 * Central management for WebSocket connections.
 */
module.exports = {
    init: (httpServer) => {
        io = new Server(httpServer, {
            cors: {
                origin: (
                    process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000'
                ).split(','),
                methods: ['GET', 'POST'],
                credentials: true,
            },
        });

        io.on('connection', (socket) => {
            logger.info({ socketId: socket.id }, 'New client connected');

            socket.on('disconnect', () => {
                logger.info({ socketId: socket.id }, 'Client disconnected');
            });
        });

        return io;
    },

    getIO: () => {
        if (!io) {
            throw new Error('Socket.io not initialized');
        }
        return io;
    },

    /**
     * Emit an event to a specific room or all clients
     * @param {string} event
     * @param {object} data
     * @param {string} room (optional)
     */
    emitEvent: (event, data, room = null) => {
        if (!io) {
            logger.warn({ event }, 'Socket not initialized, skipping emit');
            return;
        }

        if (room) {
            io.to(room).emit(event, data);
        } else {
            io.emit(event, data);
        }
    },
};
