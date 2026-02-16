/**
 * Default Hotel Module Settings
 */
const DEFAULT_HOTEL_SETTINGS = {
    roomType: {
        type: 'roomType',
        options: [
            { label: 'Single', value: 'Single', isActive: true },
            { label: 'Double', value: 'Double', isActive: true },
            { label: 'Suite', value: 'Suite', isActive: true },
            { label: 'Deluxe', value: 'Deluxe', isActive: true },
        ],
    },
};

module.exports = {
    DEFAULT_HOTEL_SETTINGS,
};
