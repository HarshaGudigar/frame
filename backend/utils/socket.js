const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../config');
const logger = require('./logger');

let io;

/**
 * Socket Service — Alyxnet Frame
 *
 * Central management for WebSocket connections with JWT authentication.
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

        // JWT Authentication Middleware
        io.use(async (socket, next) => {
            const token = socket.handshake.auth?.token;

            if (!token) {
                return next(new Error('Authentication required'));
            }

            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                const user = await User.findById(decoded.userId || decoded.id);

                if (!user || !user.isActive) {
                    return next(new Error('User not found or inactive'));
                }

                socket.user = {
                    _id: user._id,
                    email: user.email,
                    role: user.role,
                    firstName: user.firstName,
                };

                next();
            } catch (_err) {
                return next(new Error('Invalid or expired token'));
            }
        });

        io.on('connection', (socket) => {
            logger.info(
                { socketId: socket.id, userId: socket.user._id },
                'Authenticated client connected',
            );

            // Auto-join user-specific room
            socket.join(`user:${socket.user._id}`);

            // Join admin room if superuser or admin
            if (socket.user.role === 'superuser' || socket.user.role === 'admin') {
                socket.join('admin');
            }

            socket.on('disconnect', () => {
                logger.info(
                    { socketId: socket.id, userId: socket.user._id },
                    'Client disconnected',
                );
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
